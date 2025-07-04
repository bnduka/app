
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess, canManageUser, isSameOrganization } from '@/lib/rbac';
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
    const { organizationId } = body;

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

    // Check if current user can manage the target user
    if (!canManageUser(currentUser!.role as UserRole, targetUser.role)) {
      return NextResponse.json(
        { error: 'Cannot manage this user - insufficient permissions' },
        { status: 403 }
      );
    }

    // Only ADMIN can assign users to organizations they're not in
    if (currentUser!.role !== 'ADMIN') {
      if (!isSameOrganization(currentUser!.organizationId, targetUser.organizationId, currentUser!.role as UserRole)) {
        return NextResponse.json(
          { error: 'Cannot manage users outside your organization' },
          { status: 403 }
        );
      }
    }

    // Verify organization exists if organizationId is provided
    let organization = null;
    if (organizationId) {
      organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
    }

    // Update user organization
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { organizationId: organizationId || null },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    await logActivity({
      userId: currentUser!.id,
      action: 'ADMIN_ASSIGN_USER_TO_ORG',
      status: 'SUCCESS',
      description: `Assigned user to organization: ${targetUser.email}`,
      details: JSON.stringify({ 
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        oldOrganizationId: targetUser.organizationId,
        newOrganizationId: organizationId,
        organizationName: organization?.name
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
    console.error('Error updating user organization:', error);
    
    const validation = await validateApiAccess(request, 'MANAGE_ORG_USERS');
    await logActivity({
      userId: validation.user?.id || 'unknown',
      action: 'ADMIN_ASSIGN_USER_TO_ORG',
      status: 'FAILED',
      description: 'Failed to assign user to organization',
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
