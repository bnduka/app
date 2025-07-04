
import { prisma } from '../db';
import { SecurityEventType, SecuritySeverity } from '@prisma/client';

interface SecurityEventData {
  userId?: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class SecurityEventService {
  /**
   * Log a security event
   */
  static async logEvent(eventData: SecurityEventData) {
    try {
      const event = await prisma.securityEvent.create({
        data: {
          ...eventData,
          metadata: eventData.metadata ? JSON.stringify(eventData.metadata) : null,
          createdAt: new Date(),
        },
      });

      // Check if we need to send alerts
      await this.checkForAlerts(event);

      return event;
    } catch (error) {
      console.error('Failed to log security event:', error);
      throw error;
    }
  }

  /**
   * Check for security alerts and patterns
   */
  static async checkForAlerts(event: any) {
    // Check for multiple failed logins
    if (event.eventType === 'LOGIN_FAILED' && event.userId) {
      const recentFailures = await prisma.securityEvent.count({
        where: {
          userId: event.userId,
          eventType: 'LOGIN_FAILED',
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          },
        },
      });

      if (recentFailures >= 3) {
        await this.logEvent({
          userId: event.userId,
          eventType: 'MULTIPLE_FAILED_LOGINS',
          severity: 'HIGH',
          description: `Multiple failed login attempts detected: ${recentFailures} attempts`,
          ipAddress: event.ipAddress || undefined,
          userAgent: event.userAgent || undefined,
          metadata: { failureCount: recentFailures },
        });
      }
    }

    // Check for suspicious login patterns
    if (event.eventType === 'LOGIN_SUCCESS' && event.userId) {
      await this.detectSuspiciousLogin(event);
    }
  }

  /**
   * Detect suspicious login patterns
   */
  static async detectSuspiciousLogin(loginEvent: any) {
    // Get recent login activities
    const recentLogins = await prisma.loginActivity.findMany({
      where: {
        userId: loginEvent.userId,
        loginTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { loginTime: 'desc' },
      take: 10,
    });

    if (recentLogins.length > 0) {
      const currentLogin = recentLogins[0];
      const previousLogin = recentLogins[1];

      if (previousLogin) {
        // Check for different IP addresses
        if (currentLogin.ipAddress !== previousLogin.ipAddress) {
          await this.logEvent({
            userId: loginEvent.userId,
            eventType: 'SUSPICIOUS_LOGIN',
            severity: 'MEDIUM',
            description: 'Login from different IP address detected',
            ipAddress: currentLogin.ipAddress || undefined,
            userAgent: currentLogin.userAgent || undefined,
            metadata: {
              previousIp: previousLogin.ipAddress,
              currentIp: currentLogin.ipAddress,
              timeDifference: currentLogin.loginTime.getTime() - previousLogin.loginTime.getTime(),
            },
          });
        }

        // Check for different locations (if available)
        if (currentLogin.location && previousLogin.location && 
            currentLogin.location !== previousLogin.location) {
          await this.logEvent({
            userId: loginEvent.userId,
            eventType: 'SUSPICIOUS_LOGIN',
            severity: 'HIGH',
            description: 'Login from different location detected',
            ipAddress: currentLogin.ipAddress || undefined,
            userAgent: currentLogin.userAgent || undefined,
            metadata: {
              previousLocation: previousLogin.location,
              currentLocation: currentLogin.location,
            },
          });
        }
      }
    }

    // Check for rapid successive logins from different IPs
    const recentIPs = recentLogins
      .filter(login => login.loginTime > new Date(Date.now() - 60 * 60 * 1000)) // Last hour
      .map(login => login.ipAddress);
    
    const uniqueIPs = new Set(recentIPs);
    if (uniqueIPs.size > 3) {
      await this.logEvent({
        userId: loginEvent.userId,
        eventType: 'SUSPICIOUS_LOGIN',
        severity: 'CRITICAL',
        description: 'Multiple IP addresses used in short time period',
        ipAddress: loginEvent.ipAddress,
        userAgent: loginEvent.userAgent,
        metadata: {
          uniqueIPs: Array.from(uniqueIPs),
          timeSpan: '1 hour',
        },
      });
    }
  }

  /**
   * Get security events for a user
   */
  static async getUserSecurityEvents(userId: string, limit: number = 50) {
    return await prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all security events (admin view)
   */
  static async getAllSecurityEvents(filters?: {
    severity?: SecuritySeverity;
    eventType?: SecurityEventType;
    userId?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.severity) where.severity = filters.severity;
    if (filters?.eventType) where.eventType = filters.eventType;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.organizationId) {
      where.user = { organizationId: filters.organizationId };
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return await prisma.securityEvent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
        lastName: true,
            email: true,
            organization: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  /**
   * Get security events for an organization (business admin view)
   */
  static async getOrganizationSecurityEvents(organizationId: string, limit: number = 50) {
    return await this.getAllSecurityEvents({
      organizationId,
      limit
    });
  }

  /**
   * Mark security event as resolved
   */
  static async resolveEvent(eventId: string, resolvedBy: string) {
    return await prisma.securityEvent.update({
      where: { id: eventId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  /**
   * Get security statistics
   */
  static async getSecurityStats(organizationId?: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const where: any = {
      createdAt: { gte: startDate }
    };

    if (organizationId) {
      where.user = { organizationId };
    }

    const [
      totalEvents,
      criticalEvents,
      highEvents,
      unresolvedEvents,
      loginFailures,
      suspiciousLogins
    ] = await Promise.all([
      prisma.securityEvent.count({ where }),
      prisma.securityEvent.count({ where: { ...where, severity: 'CRITICAL' } }),
      prisma.securityEvent.count({ where: { ...where, severity: 'HIGH' } }),
      prisma.securityEvent.count({ where: { ...where, isResolved: false } }),
      prisma.securityEvent.count({ where: { ...where, eventType: 'LOGIN_FAILED' } }),
      prisma.securityEvent.count({ where: { ...where, eventType: 'SUSPICIOUS_LOGIN' } }),
    ]);

    return {
      totalEvents,
      criticalEvents,
      highEvents,
      unresolvedEvents,
      loginFailures,
      suspiciousLogins,
      period: `${days} days`,
    };
  }
}
