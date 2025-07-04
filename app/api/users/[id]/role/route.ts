
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess, canAssignRole, canManageUser, isSameOrganization } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';
import { UserRole } from '@prisma/client';

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const validation = await validateApiAccess(request, 'MANAGE_ORG_USERS');
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const body = await request.json();
    const { role: newRole, organizationId } = body;

    if (!newRole || !Object.values(['USER', 'ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_USER']).includes(newRole)) {
      return NextResponse.json(
        { error: 'Valid role is required' },
        { status: 400 }
      );
    }

    const { user: currentUser } = validation;

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if current user can assign the new role
    if (!canAssignRole(currentUser!.role as UserRole, newRole as UserRole)) {
      return NextResponse.json(
        { error: 'Cannot assign this role - insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if current user can manage the target user
    if (!canManageUser(currentUser!.role as UserRole, targetUser.role)) {
      return NextResponse.json(
        { error: 'Cannot manage this user - insufficient permissions' },
        { status: 403 }
      );
    }

    // Check organization constraints
    if (currentUser!.role !== 'ADMIN') {
      if (!isSameOrganization(currentUser!.organizationId, targetUser.organizationId, currentUser!.role as UserRole)) {
        return NextResponse.json(
          { error: 'Cannot manage users outside your organization' },
          { status: 403 }
        );
      }
    }

    // Prevent self-role changes that could lock out access
    if (currentUser!.id === targetUser.id && currentUser!.role === 'ADMIN' && newRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove your own admin privileges' },
        { status: 400 }
      );
    }

    // Handle organization assignment for role changes
    let updateData: any = { role: newRole };

    // If assigning BUSINESS_ADMIN or BUSINESS_USER, ensure they have an organization
    if ((newRole === 'BUSINESS_ADMIN' || newRole === 'BUSINESS_USER') && organizationId) {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      updateData.organizationId = organizationId;
    }

    // Update user role (and organization if specified)
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    const actionType = currentUser!.role === 'ADMIN' ? 'ADMIN_CHANGE_USER_ROLE' : 
                     (newRole === 'BUSINESS_USER' ? 'BUSINESS_ADMIN_DEMOTE_USER' : 'BUSINESS_ADMIN_PROMOTE_USER');

    await logActivity({
      userId: currentUser!.id,
      action: actionType,
      status: 'SUCCESS',
      description: `Changed user role: ${targetUser.email} from ${targetUser.role} to ${newRole}`,
      details: JSON.stringify({ 
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        oldRole: targetUser.role,
        newRole,
        organizationId: updatedUser.organizationId
      })
    });

    return NextResponse.json({ 
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
        organization: updatedUser.organization,
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    
    const validation = await validateApiAccess(request, 'MANAGE_ORG_USERS');
    await logActivity({
      userId: validation.user?.id || 'unknown',
      action: 'ADMIN_CHANGE_USER_ROLE',
      status: 'FAILED',
      description: 'Failed to change user role',
      details: JSON.stringify({ 
        targetUserId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
