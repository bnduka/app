
import { prisma } from './db';
import { ActivityAction, ActivityStatus, UserRole } from '@prisma/client';
import { buildUserScope } from './rbac';

interface LogActivityParams {
  action: ActivityAction;
  status: ActivityStatus;
  description: string;
  details?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export class ActivityLogger {
  static async log(params: LogActivityParams): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          action: params.action,
          status: params.status,
          description: params.description,
          details: params.details,
          userId: params.userId,
          entityType: params.entityType,
          entityId: params.entityId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          errorMessage: params.errorMessage,
        },
      });
    } catch (error) {
      // Don't throw errors for logging failures to avoid breaking main functionality
      console.error('Failed to log activity:', error);
    }
  }

  static async logUserActivity(
    userId: string,
    action: ActivityAction,
    description: string,
    status: ActivityStatus = 'SUCCESS',
    additionalParams?: Partial<LogActivityParams>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      status,
      description,
      ...additionalParams,
    });
  }

  static async logError(
    action: ActivityAction,
    description: string,
    errorMessage: string,
    userId?: string,
    additionalParams?: Partial<LogActivityParams>
  ): Promise<void> {
    await this.log({
      action,
      status: 'FAILED',
      description,
      errorMessage,
      userId,
      ...additionalParams,
    });
  }

  static async getRecentActivities(
    userId?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const where = userId ? { userId } : {};
    
    return await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
        lastName: true,
            email: true,
            role: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get organization-scoped activities
   */
  static async getOrganizationActivities(
    currentUserId: string,
    currentUserRole: UserRole,
    currentUserOrgId: string | null | undefined,
    limit: number = 50,
    offset: number = 0
  ) {
    // ADMIN can see all activities
    if (currentUserRole === 'ADMIN') {
      return await this.getRecentActivities(undefined, limit, offset);
    }

    // BUSINESS_ADMIN can see activities from users in their organization
    if (currentUserRole === 'BUSINESS_ADMIN' && currentUserOrgId) {
      return await prisma.activityLog.findMany({
        where: {
          user: {
            organizationId: currentUserOrgId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
        lastName: true,
              email: true,
              role: true,
              organizationId: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    }

    // BUSINESS_USER and USER can only see their own activities
    return await this.getRecentActivities(currentUserId, limit, offset);
  }

  /**
   * Log role change events with enhanced security context
   */
  static async logRoleChange(
    performedBy: string,
    targetUserId: string,
    oldRole: UserRole,
    newRole: UserRole,
    organizationId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: performedBy,
      action: 'ADMIN_CHANGE_USER_ROLE',
      status: 'SUCCESS',
      description: `Changed user role from ${oldRole} to ${newRole}`,
      details: JSON.stringify({
        targetUserId,
        oldRole,
        newRole,
        organizationId,
        timestamp: new Date().toISOString(),
        security: {
          roleElevation: this.isRoleElevation(oldRole, newRole),
          crossOrganization: false // Could be enhanced to detect this
        }
      }),
      entityType: 'user_role_change',
      entityId: targetUserId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log organization assignment events
   */
  static async logOrganizationAssignment(
    performedBy: string,
    targetUserId: string,
    oldOrgId: string | null,
    newOrgId: string | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: performedBy,
      action: 'ADMIN_ASSIGN_USER_TO_ORG',
      status: 'SUCCESS',
      description: `Changed user organization assignment`,
      details: JSON.stringify({
        targetUserId,
        oldOrganizationId: oldOrgId,
        newOrganizationId: newOrgId,
        timestamp: new Date().toISOString(),
      }),
      entityType: 'user_organization_change',
      entityId: targetUserId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log security events (failed access attempts, permission violations, etc.)
   */
  static async logSecurityEvent(
    action: ActivityAction,
    description: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    userId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action,
      status: 'FAILED',
      description: `SECURITY EVENT [${severity}]: ${description}`,
      details: JSON.stringify({
        severity,
        timestamp: new Date().toISOString(),
        ...details,
      }),
      entityType: 'security_event',
      ipAddress,
      userAgent,
      errorMessage: description,
    });
  }

  /**
   * Log administrative actions with enhanced context
   */
  static async logAdminAction(
    adminUserId: string,
    action: ActivityAction,
    description: string,
    targetEntity?: {
      type: string;
      id: string;
      name?: string;
    },
    additionalContext?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: adminUserId,
      action,
      status: 'SUCCESS',
      description,
      details: JSON.stringify({
        targetEntity,
        timestamp: new Date().toISOString(),
        adminContext: true,
        ...additionalContext,
      }),
      entityType: targetEntity?.type,
      entityId: targetEntity?.id,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Helper to determine if a role change is an elevation
   */
  private static isRoleElevation(oldRole: UserRole, newRole: UserRole): boolean {
    const roleHierarchy = {
      'USER': 1,
      'BUSINESS_USER': 2,
      'BUSINESS_ADMIN': 3,
      'ADMIN': 4,
    };

    return roleHierarchy[newRole] > roleHierarchy[oldRole];
  }

  static async getActivityStats(userId?: string) {
    const where = userId ? { userId } : {};
    
    const [
      totalActivities,
      successActivities,
      failedActivities,
      recentActivities,
    ] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.count({ where: { ...where, status: 'SUCCESS' } }),
      prisma.activityLog.count({ where: { ...where, status: 'FAILED' } }),
      prisma.activityLog.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalActivities,
      successActivities,
      failedActivities,
      recentActivities,
      successRate: totalActivities > 0 ? (successActivities / totalActivities) * 100 : 0,
    };
  }

  /**
   * Get organization-scoped activity stats
   */
  static async getOrganizationActivityStats(
    currentUserRole: UserRole,
    currentUserOrgId?: string | null
  ) {
    let where: any = {};

    // ADMIN can see all activities
    if (currentUserRole === 'ADMIN') {
      where = {};
    } else if (currentUserRole === 'BUSINESS_ADMIN' && currentUserOrgId) {
      // BUSINESS_ADMIN can see activities from users in their organization
      where = {
        user: {
          organizationId: currentUserOrgId
        }
      };
    } else {
      // For other roles, return empty stats
      return {
        totalActivities: 0,
        successActivities: 0,
        failedActivities: 0,
        recentActivities: 0,
        securityEvents: 0,
        adminActions: 0,
        successRate: 0,
      };
    }

    const [
      totalActivities,
      successActivities,
      failedActivities,
      recentActivities,
      securityEvents,
      adminActions,
    ] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.count({ where: { ...where, status: 'SUCCESS' } }),
      prisma.activityLog.count({ where: { ...where, status: 'FAILED' } }),
      prisma.activityLog.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      prisma.activityLog.count({
        where: {
          ...where,
          entityType: 'security_event',
        },
      }),
      prisma.activityLog.count({
        where: {
          ...where,
          action: {
            in: ['ADMIN_CHANGE_USER_ROLE', 'ADMIN_ASSIGN_USER_TO_ORG', 'ADMIN_CREATE_ORGANIZATION', 'ADMIN_UPDATE_ORGANIZATION', 'ADMIN_DELETE_ORGANIZATION']
          },
        },
      }),
    ]);

    return {
      totalActivities,
      successActivities,
      failedActivities,
      recentActivities,
      securityEvents,
      adminActions,
      successRate: totalActivities > 0 ? (successActivities / totalActivities) * 100 : 0,
    };
  }

  /**
   * Get security events summary
   */
  static async getSecurityEventsSummary(
    organizationId?: string,
    days: number = 30
  ) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    let where: any = {
      entityType: 'security_event',
      createdAt: { gte: since },
    };

    if (organizationId) {
      where.user = { organizationId };
    }

    const events = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            organization: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse severity from details
    const eventsBySeverity = events.reduce((acc: any, event) => {
      try {
        const details = JSON.parse(event.details || '{}');
        const severity = details.severity || 'UNKNOWN';
        acc[severity] = (acc[severity] || 0) + 1;
      } catch {
        acc['UNKNOWN'] = (acc['UNKNOWN'] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalEvents: events.length,
      eventsBySeverity,
      recentEvents: events.slice(0, 10),
    };
  }
}

// Helper function to extract IP and User Agent from request
export function getRequestInfo(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0] : 
    request.headers.get('x-real-ip') || 
    request.headers.get('remote-addr') || 
    'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}

// Convenience function for compatibility
export async function logActivity(params: LogActivityParams): Promise<void> {
  return ActivityLogger.log(params);
}
