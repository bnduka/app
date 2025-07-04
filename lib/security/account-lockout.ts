
import { prisma } from '../db';
import { SecurityEventService } from './security-events';
import { EmailService } from './email-service';

export class AccountLockoutService {
  /**
   * Record a failed login attempt
   */
  static async recordFailedLogin(
    email: string,
    ipAddress: string,
    userAgent?: string,
    reason?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      // Still log the attempt for security monitoring
      await SecurityEventService.logEvent({
        eventType: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        description: `Failed login attempt for non-existent email: ${email}`,
        ipAddress,
        userAgent,
        metadata: { email, reason: reason || 'invalid_credentials' },
      });
      return null;
    }

    // Get organization settings or defaults
    const maxFailedLogins = user.organization?.maxFailedLogins || 5;
    const lockoutDurationMinutes = user.organization?.lockoutDurationMinutes || 10;

    // Increment failed login attempts
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: user.failedLoginAttempts + 1,
      },
    });

    // Log the failed attempt
    await SecurityEventService.logEvent({
      userId: user.id,
      eventType: 'LOGIN_FAILED',
      severity: 'MEDIUM',
      description: `Failed login attempt ${updatedUser.failedLoginAttempts}/${maxFailedLogins}`,
      ipAddress,
      userAgent,
      metadata: {
        email,
        attempt: updatedUser.failedLoginAttempts,
        maxAttempts: maxFailedLogins,
        reason: reason || 'invalid_credentials',
      },
    });

    // Check if account should be locked
    if (updatedUser.failedLoginAttempts >= maxFailedLogins) {
      await this.lockAccount(user.id, lockoutDurationMinutes, ipAddress, userAgent);
    }

    return updatedUser;
  }

  /**
   * Lock a user account
   */
  static async lockAccount(
    userId: string,
    lockoutDurationMinutes: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    const lockUntil = new Date(Date.now() + lockoutDurationMinutes * 60 * 1000);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: lockUntil,
        isOnline: false,
      },
    });

    // Terminate all active sessions
    await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'ACCOUNT_LOCKED',
      },
    });

    // Log the lockout event
    await SecurityEventService.logEvent({
      userId,
      eventType: 'ACCOUNT_LOCKED',
      severity: 'HIGH',
      description: `Account locked due to ${user.failedLoginAttempts} failed login attempts`,
      ipAddress,
      userAgent,
      metadata: {
        lockoutDuration: lockoutDurationMinutes,
        unlockTime: lockUntil.toISOString(),
        failedAttempts: user.failedLoginAttempts,
      },
    });

    // Send lockout notification email
    if (user.email) {
      try {
        await EmailService.sendAccountLockout(user.email, lockUntil, `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined);
      } catch (error) {
        console.error('Failed to send lockout notification:', error);
      }
    }

    return user;
  }

  /**
   * Check if account is currently locked
   */
  static async isAccountLocked(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { lockedUntil: true },
    });

    if (!user?.lockedUntil) {
      return false;
    }

    // Check if lockout has expired
    if (user.lockedUntil <= new Date()) {
      // Auto-unlock the account
      await this.unlockAccount(email);
      return false;
    }

    return true;
  }

  /**
   * Unlock a user account
   */
  static async unlockAccount(email: string, unlockedBy?: string) {
    const user = await prisma.user.update({
      where: { email },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    // Log the unlock event
    await SecurityEventService.logEvent({
      userId: user.id,
      eventType: 'ACCOUNT_UNLOCKED',
      severity: 'LOW',
      description: unlockedBy ? `Account unlocked by ${unlockedBy}` : 'Account auto-unlocked after timeout',
      metadata: {
        unlockedBy: unlockedBy || 'system',
        previousFailedAttempts: user.failedLoginAttempts,
      },
    });

    return user;
  }

  /**
   * Reset failed login attempts after successful login
   */
  static async resetFailedAttempts(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true },
    });

    if (user && user.failedLoginAttempts > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }
  }

  /**
   * Get lockout information for a user
   */
  static async getLockoutInfo(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        organization: {
          select: {
            maxFailedLogins: true,
            lockoutDurationMinutes: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const maxFailedLogins = user.organization?.maxFailedLogins || 5;
    const lockoutDurationMinutes = user.organization?.lockoutDurationMinutes || 10;

    return {
      failedAttempts: user.failedLoginAttempts,
      maxAttempts: maxFailedLogins,
      isLocked: user.lockedUntil ? user.lockedUntil > new Date() : false,
      lockedUntil: user.lockedUntil,
      lockoutDurationMinutes,
      remainingAttempts: Math.max(0, maxFailedLogins - user.failedLoginAttempts),
    };
  }

  /**
   * Clean up expired lockouts
   */
  static async cleanupExpiredLockouts() {
    const result = await prisma.user.updateMany({
      where: {
        lockedUntil: {
          lte: new Date(),
        },
      },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    return result.count;
  }

  /**
   * Get lockout statistics
   */
  static async getLockoutStats(organizationId?: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const where: any = {
      createdAt: { gte: startDate },
      eventType: { in: ['ACCOUNT_LOCKED', 'LOGIN_FAILED'] },
    };

    if (organizationId) {
      where.user = { organizationId };
    }

    const [
      totalLockouts,
      failedLogins,
      currentlyLocked,
      lockoutEvents
    ] = await Promise.all([
      prisma.securityEvent.count({
        where: { ...where, eventType: 'ACCOUNT_LOCKED' },
      }),
      prisma.securityEvent.count({
        where: { ...where, eventType: 'LOGIN_FAILED' },
      }),
      prisma.user.count({
        where: {
          lockedUntil: { gt: new Date() },
          ...(organizationId && { organizationId }),
        },
      }),
      prisma.securityEvent.findMany({
        where: { ...where, eventType: 'ACCOUNT_LOCKED' },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
        lastName: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      totalLockouts,
      failedLogins,
      currentlyLocked,
      lockoutEvents,
      period: `${days} days`,
    };
  }
}
