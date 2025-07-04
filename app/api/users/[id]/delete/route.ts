
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-config';
import { logActivity } from '@/lib/activity-logger';
import { SecurityEventService } from '@/lib/security/security-events';
import { userDeletionSchema } from '@/lib/validation/schemas';
import { createValidationMiddleware, createErrorResponse, createSuccessResponse, validateRateLimitHeaders } from '@/lib/validation/middleware';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    const { ipAddress, userAgent } = validateRateLimitHeaders(request);

    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const targetUserId = params.id;
    const currentUser = session.user;
    
    // Validate request body for admin deletions
    const body = await request.json();
    
    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!targetUser) {
      return createErrorResponse('User not found', 404);
    }

    // Authorization checks
    const canDelete = checkDeletionPermissions(currentUser, targetUser);
    if (!canDelete.allowed) {
      await SecurityEventService.logEvent({
        userId: currentUser.id,
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'HIGH',
        description: `Unauthorized user deletion attempt: ${canDelete.reason}`,
        ipAddress,
        userAgent,
        metadata: { 
          targetUserId,
          targetUserRole: targetUser.role,
          reason: canDelete.reason 
        },
      });
      return createErrorResponse(canDelete.reason, 403);
    }

    // For Platform Admins, require password confirmation
    if (currentUser.role === 'ADMIN') {
      if (!body.confirmPassword || !body.confirmationText) {
        return createErrorResponse('Password confirmation and deletion confirmation required', 400);
      }

      // Validate password
      const admin = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { password: true }
      });

      if (!admin?.password) {
        return createErrorResponse('Admin password not found', 400);
      }

      const isPasswordValid = await bcrypt.compare(body.confirmPassword, admin.password);
      if (!isPasswordValid) {
        await SecurityEventService.logEvent({
          userId: currentUser.id,
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          severity: 'HIGH',
          description: 'Invalid password for user deletion',
          ipAddress,
          userAgent,
          metadata: { targetUserId },
        });
        return createErrorResponse('Invalid password', 401);
      }

      // Validate confirmation text
      if (body.confirmationText !== 'DELETE') {
        return createErrorResponse('Invalid confirmation text', 400);
      }
    }

    // Prevent self-deletion
    if (targetUserId === currentUser.id) {
      return createErrorResponse('Cannot delete your own account', 400);
    }

    // Store user data for logging before deletion
    const userDataForLog = {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      organizationName: targetUser.organization?.name,
    };

    // Begin transaction for user deletion
    await prisma.$transaction(async (tx) => {
      // First, handle related data cleanup
      
      // Delete user's API keys
      await tx.apiKey.deleteMany({
        where: { userId: targetUserId }
      });

      // Delete user's security events
      await tx.securityEvent.deleteMany({
        where: { userId: targetUserId }
      });

      // Delete user's sessions
      await tx.session.deleteMany({
        where: { userId: targetUserId }
      });

      // Update activity logs to remove personal info but keep audit trail
      await tx.activityLog.updateMany({
        where: { userId: targetUserId },
        data: {
          details: JSON.stringify({ userDeleted: true, deletedAt: new Date() })
        }
      });

      // Update threat models ownership - transfer to organization admin or mark as orphaned
      if (targetUser.organizationId && currentUser.role === 'BUSINESS_ADMIN') {
        await tx.threatModel.updateMany({
          where: { userId: targetUserId },
          data: { userId: currentUser.id } // Transfer to the admin who deleted
        });
      } else {
        // For platform admin deletions, mark as system-owned
        await tx.threatModel.updateMany({
          where: { userId: targetUserId },
          data: { userId: undefined }
        });
      }

      // Update findings ownership similarly
      if (targetUser.organizationId && currentUser.role === 'BUSINESS_ADMIN') {
        await tx.finding.updateMany({
          where: { userId: targetUserId },
          data: { userId: currentUser.id }
        });
      } else {
        await tx.finding.updateMany({
          where: { userId: targetUserId },
          data: { userId: undefined }
        });
      }

      // Finally, delete the user
      await tx.user.delete({
        where: { id: targetUserId }
      });
    });

    // Log the deletion activity
    await logActivity({
      userId: currentUser.id,
      action: 'ADMIN_UPDATE_USER',
      status: 'SUCCESS',
      description: `User deleted: ${userDataForLog.email}`,
      entityType: 'user',
      entityId: targetUserId,
      details: JSON.stringify({
        action: 'DELETE_USER',
        deletedUser: userDataForLog,
        deletedBy: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role,
        },
        deletionType: currentUser.role === 'ADMIN' ? 'platform_admin' : 'business_admin',
      }),
      ipAddress,
      userAgent,
    });

    // Log security event
    await SecurityEventService.logEvent({
      userId: currentUser.id,
      eventType: 'ROLE_CHANGED',
      severity: 'MEDIUM',
      description: `User account deleted: ${userDataForLog.email}`,
      ipAddress,
      userAgent,
      metadata: {
        action: 'USER_DELETED',
        deletedUser: userDataForLog,
        deletedBy: currentUser.email,
      },
    });

    return createSuccessResponse(
      { deletedUserId: targetUserId },
      'User deleted successfully'
    );

  } catch (error) {
    console.error('Error deleting user:', error);
    
    const { ipAddress, userAgent } = validateRateLimitHeaders(request);
    await SecurityEventService.logEvent({
      eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      severity: 'HIGH',
      description: 'Failed to delete user due to server error',
      ipAddress,
      userAgent,
      metadata: { error: 'Internal server error' },
    });
    
    return createErrorResponse('Failed to delete user', 500);
  }
}

function checkDeletionPermissions(currentUser: any, targetUser: any) {
  // Platform Admin can delete anyone except themselves
  if (currentUser.role === 'ADMIN') {
    if (targetUser.id === currentUser.id) {
      return { allowed: false, reason: 'Cannot delete your own account' };
    }
    return { allowed: true, reason: '' };
  }

  // Business Admin can delete users in their organization (except other admins)
  if (currentUser.role === 'BUSINESS_ADMIN') {
    if (!currentUser.organizationId) {
      return { allowed: false, reason: 'Business admin not associated with organization' };
    }
    
    if (targetUser.organizationId !== currentUser.organizationId) {
      return { allowed: false, reason: 'Cannot delete users from other organizations' };
    }
    
    if (targetUser.role === 'ADMIN' || targetUser.role === 'BUSINESS_ADMIN') {
      return { allowed: false, reason: 'Cannot delete admin users' };
    }
    
    if (targetUser.id === currentUser.id) {
      return { allowed: false, reason: 'Cannot delete your own account' };
    }
    
    return { allowed: true, reason: '' };
  }

  // Other roles cannot delete users
  return { allowed: false, reason: 'Insufficient permissions to delete users' };
}
