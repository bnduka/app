
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess, canManageUser, isSameOrganization } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';
import { UserRole, BillingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/admin/users/bulk - Bulk operations on users
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, userIds, data } = body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'Invalid request - action and userIds required' },
        { status: 400 }
      );
    }

    // Prevent self-operations
    if (userIds.includes(currentUser.id)) {
      return NextResponse.json(
        { error: 'Cannot perform bulk operations on your own account' },
        { status: 400 }
      );
    }

    // Get target users
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        organization: true
      }
    });

    if (targetUsers.length !== userIds.length) {
      return NextResponse.json(
        { error: 'Some users not found' },
        { status: 404 }
      );
    }

    // Check permissions for all target users
    for (const targetUser of targetUsers) {
      if (currentUser.role !== 'ADMIN') {
        // Business Admin can only manage users in their organization
        if (!isSameOrganization(currentUser.organizationId, targetUser.organizationId, currentUser.role)) {
          return NextResponse.json(
            { error: `Forbidden - Cannot manage user ${targetUser.email} from different organization` },
            { status: 403 }
          );
        }

        // Business Admin cannot manage other admins
        if (!canManageUser(currentUser.role, targetUser.role)) {
          return NextResponse.json(
            { error: `Forbidden - Cannot manage user ${targetUser.email} with equal or higher role` },
            { status: 403 }
          );
        }
      }
    }

    let result;
    let actionDescription = '';
    let dataTransferred: { threatModels: number; findings: number; reports: number } | undefined;

    switch (action) {
      case 'updateRole':
        if (!data?.role) {
          return NextResponse.json(
            { error: 'Role required for updateRole action' },
            { status: 400 }
          );
        }

        // Validate role assignment permissions
        if (currentUser.role !== 'ADMIN' && data.role !== 'BUSINESS_USER') {
          return NextResponse.json(
            { error: 'Forbidden - Cannot assign this role' },
            { status: 403 }
          );
        }

        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { role: data.role as UserRole }
        });

        actionDescription = `Updated role to ${data.role} for ${result.count} users`;
        break;

      case 'updateStatus':
        if (!data?.status) {
          return NextResponse.json(
            { error: 'Status required for updateStatus action' },
            { status: 400 }
          );
        }

        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { billingStatus: data.status as BillingStatus }
        });

        actionDescription = `Updated status to ${data.status} for ${result.count} users`;
        break;

      case 'assignOrganization':
        if (currentUser.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Forbidden - Only Admin can assign organizations' },
            { status: 403 }
          );
        }

        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { organizationId: data?.organizationId || null }
        });

        actionDescription = `Assigned organization ${data?.organizationId || 'none'} to ${result.count} users`;
        break;

      case 'delete':
        if (!data?.confirmationText || data.confirmationText !== 'DELETE') {
          return NextResponse.json(
            { error: 'Invalid confirmation text for delete action' },
            { status: 400 }
          );
        }

        // Transfer data and delete users in transaction
        let deletedCount = 0;
        dataTransferred = { threatModels: 0, findings: 0, reports: 0 };

        await prisma.$transaction(async (tx) => {
          for (const userId of userIds) {
            // Transfer threat models
            const threatModelsTransferred = await tx.threatModel.updateMany({
              where: { userId: userId },
              data: { userId: currentUser.id }
            });

            // Transfer findings
            const findingsTransferred = await tx.finding.updateMany({
              where: { userId: userId },
              data: { userId: currentUser.id }
            });

            // Transfer reports
            const reportsTransferred = await tx.report.updateMany({
              where: { userId: userId },
              data: { userId: currentUser.id }
            });

            dataTransferred!.threatModels += threatModelsTransferred.count;
            dataTransferred!.findings += findingsTransferred.count;
            dataTransferred!.reports += reportsTransferred.count;

            // Delete user
            await tx.user.delete({
              where: { id: userId }
            });

            deletedCount++;
          }
        });

        result = { count: deletedCount };
        actionDescription = `Deleted ${deletedCount} users and transferred their data`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Log activity
    await logActivity({
      userId: currentUser.id,
      action: 'ADMIN_BULK_USER_OPERATION',
      status: 'SUCCESS',
      description: actionDescription,
      details: JSON.stringify({
        action,
        userIds,
        data,
        result,
        role: currentUser.role,
        ...(action === 'delete' && { dataTransferred })
      }),
      entityType: 'user',
      entityId: userIds.join(',')
    });

    return NextResponse.json({
      message: actionDescription,
      result,
      ...(action === 'delete' && { dataTransferred })
    });

  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
