
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess, canManageUser, isSameOrganization } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';
import { UserRole, BillingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/admin/users/[id] - Get specific user details
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const validation = await validateApiAccess(request, 'VIEW_ORG_USERS');
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { user: currentUser } = validation;
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found in session' },
        { status: 401 }
      );
    }

    const targetUserId = params.id;

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            threatModels: true,
            findings: true,
            reports: true
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (currentUser.role !== 'ADMIN') {
      if (!isSameOrganization(currentUser.organizationId, targetUser.organizationId, currentUser.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access user from different organization' },
          { status: 403 }
        );
      }
    }

    // Remove sensitive data
    const safeUser = {
      id: targetUser.id,
      name: targetUser.name,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email,
      role: targetUser.role,
      billingStatus: targetUser.billingStatus,
      emailVerified: targetUser.emailVerified,
      lastLoginAt: targetUser.lastLoginAt,
      lastActiveAt: targetUser.lastActiveAt,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
      organization: targetUser.organization,
      createdBy: targetUser.createdBy,
      stats: targetUser._count
    };

    return NextResponse.json({ user: safeUser });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user details
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

    const { user: currentUser } = validation;
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found in session' },
        { status: 401 }
      );
    }

    const targetUserId = params.id;
    const body = await request.json();

    const { 
      role, 
      organizationId, 
      billingStatus, 
      name, 
      firstName, 
      lastName 
    } = body;

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        organization: true
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (currentUser.role !== 'ADMIN') {
      // Business Admin can only manage users in their organization
      if (!isSameOrganization(currentUser.organizationId, targetUser.organizationId, currentUser.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot modify user from different organization' },
          { status: 403 }
        );
      }

      // Business Admin cannot manage other admins
      if (!canManageUser(currentUser.role, targetUser.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot manage user with equal or higher role' },
          { status: 403 }
        );
      }
    }

    // Validate role assignment if changing role
    if (role && role !== targetUser.role) {
      if (currentUser.role !== 'ADMIN') {
        // Business Admin can only assign BUSINESS_USER role
        if (role !== 'BUSINESS_USER') {
          return NextResponse.json(
            { error: 'Forbidden - Cannot assign this role' },
            { status: 403 }
          );
        }
      }
    }

    // Build update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role as UserRole;
    if (billingStatus !== undefined) updateData.billingStatus = billingStatus as BillingStatus;
    
    // Handle organization assignment (Admin only)
    if (organizationId !== undefined && currentUser.role === 'ADMIN') {
      updateData.organizationId = organizationId || null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Log activity
    await logActivity({
      userId: currentUser.id,
      action: 'ADMIN_UPDATE_USER',
      status: 'SUCCESS',
      description: `Updated user: ${updatedUser.email}`,
      details: JSON.stringify({
        targetUserId: targetUserId,
        changes: updateData,
        role: currentUser.role
      }),
      entityType: 'user',
      entityId: targetUserId
    });

    // Remove sensitive data
    const safeUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role,
      billingStatus: updatedUser.billingStatus,
      emailVerified: updatedUser.emailVerified,
      lastLoginAt: updatedUser.lastLoginAt,
      lastActiveAt: updatedUser.lastActiveAt,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      organization: updatedUser.organization,
      createdBy: updatedUser.createdBy
    };

    return NextResponse.json({ 
      user: safeUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user (soft delete with data transfer)
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const validation = await validateApiAccess(request, 'MANAGE_ORG_USERS');
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { user: currentUser } = validation;
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found in session' },
        { status: 401 }
      );
    }

    const targetUserId = params.id;
    const body = await request.json();
    const { confirmationText } = body;

    // Require confirmation
    if (confirmationText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Invalid confirmation text' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (targetUserId === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        organization: true,
        _count: {
          select: {
            threatModels: true,
            findings: true,
            reports: true
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (currentUser.role !== 'ADMIN') {
      // Business Admin can only delete users in their organization
      if (!isSameOrganization(currentUser.organizationId, targetUser.organizationId, currentUser.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot delete user from different organization' },
          { status: 403 }
        );
      }

      // Business Admin cannot delete other admins
      if (!canManageUser(currentUser.role, targetUser.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot delete user with equal or higher role' },
          { status: 403 }
        );
      }
    }

    // Transfer user's data to current user (admin) before deletion
    await prisma.$transaction(async (tx) => {
      // Transfer threat models
      await tx.threatModel.updateMany({
        where: { userId: targetUserId },
        data: { userId: currentUser.id }
      });

      // Transfer findings
      await tx.finding.updateMany({
        where: { userId: targetUserId },
        data: { userId: currentUser.id }
      });

      // Transfer reports
      await tx.report.updateMany({
        where: { userId: targetUserId },
        data: { userId: currentUser.id }
      });

      // Delete user (cascading will handle related records)
      await tx.user.delete({
        where: { id: targetUserId }
      });
    });

    // Log activity
    await logActivity({
      userId: currentUser.id,
      action: 'ADMIN_DELETE_USER',
      status: 'SUCCESS',
      description: `Deleted user: ${targetUser.email}`,
      details: JSON.stringify({
        targetUserId: targetUserId,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        dataTransferred: targetUser._count,
        role: currentUser.role
      }),
      entityType: 'user',
      entityId: targetUserId
    });

    return NextResponse.json({ 
      message: 'User deleted successfully. Their data has been transferred to your account.',
      dataTransferred: targetUser._count
    });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    // Get current user safely for logging
    const session = await getServerSession(authOptions);
    const currentUser = session?.user;
    
    // Log failed deletion attempt
    if (currentUser) {
      await logActivity({
        userId: currentUser.id,
        action: 'ADMIN_DELETE_USER',
        status: 'FAILED',
        description: `Failed to delete user: ${params.id}`,
        details: JSON.stringify({
          targetUserId: params.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          role: currentUser.role
        }),
        entityType: 'user',
        entityId: params.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
