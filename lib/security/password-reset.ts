
import { prisma } from '../db';
import { EncryptionService, PasswordSecurity } from './encryption';
import { EmailService } from './email-service';
import { SecurityEventService } from './security-events';
import bcrypt from 'bcryptjs';

export class PasswordResetService {
  /**
   * Initiate password reset
   */
  static async initiatePasswordReset(email: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true,
        lastName: true, email: true },
    });

    // Always return success to prevent email enumeration
    const response = { success: true, message: 'If an account exists, a reset link has been sent' };

    if (!user) {
      // Log attempt for non-existent email
      await SecurityEventService.logEvent({
        eventType: 'PASSWORD_RESET',
        severity: 'LOW',
        description: `Password reset attempt for non-existent email: ${email}`,
        ipAddress,
        userAgent,
        metadata: { email, reason: 'user_not_found' },
      });
      return response;
    }

    // Generate reset token
    const token = EncryptionService.generateToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });

    // Send reset email
    if (user.email) {
      await EmailService.sendPasswordReset(user.email, token, `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined);
    }

    await SecurityEventService.logEvent({
      userId: user.id,
      eventType: 'PASSWORD_RESET_REQUEST',
      severity: 'MEDIUM',
      description: 'Password reset requested',
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    return response;
  }

  /**
   * Validate reset token
   */
  static async validateResetToken(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      return { valid: false, error: 'Invalid or expired reset token' };
    }

    return { valid: true, userId: user.id, email: user.email };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const validation = await this.validateResetToken(token);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const userId = validation.userId!;

    // Get user and organization for password policy
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { securitySettings: true },
        },
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate password strength
    const securitySettings = user.organization?.securitySettings;
    const passwordValidation = PasswordSecurity.validatePassword(newPassword, {
      minLength: securitySettings?.passwordMinLength || 8,
      requireUpper: securitySettings?.passwordRequireUpper ?? true,
      requireLower: securitySettings?.passwordRequireLower ?? true,
      requireNumber: securitySettings?.passwordRequireNumber ?? true,
      requireSymbol: securitySettings?.passwordRequireSymbol ?? true,
    });

    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.errors.join(', ') };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        lastPasswordChange: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Terminate all existing sessions for security
    await prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'PASSWORD_RESET',
      },
    });

    await SecurityEventService.logEvent({
      userId,
      eventType: 'PASSWORD_RESET_COMPLETE',
      severity: 'MEDIUM',
      description: 'Password reset completed successfully',
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    return { success: true };
  }

  /**
   * Change password (authenticated user)
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { securitySettings: true },
        },
      },
    });

    if (!user || !user.password) {
      return { success: false, error: 'User not found or no password set' };
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      await SecurityEventService.logEvent({
        userId,
        eventType: 'PASSWORD_CHANGED',
        severity: 'MEDIUM',
        description: 'Password change failed: incorrect current password',
        ipAddress,
        userAgent,
      });
      return { success: false, error: 'Current password is incorrect' };
    }

    // Validate new password strength
    const securitySettings = user.organization?.securitySettings;
    const passwordValidation = PasswordSecurity.validatePassword(newPassword, {
      minLength: securitySettings?.passwordMinLength || 8,
      requireUpper: securitySettings?.passwordRequireUpper ?? true,
      requireLower: securitySettings?.passwordRequireLower ?? true,
      requireNumber: securitySettings?.passwordRequireNumber ?? true,
      requireSymbol: securitySettings?.passwordRequireSymbol ?? true,
    });

    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.errors.join(', ') };
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return { success: false, error: 'New password must be different from current password' };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
      },
    });

    await SecurityEventService.logEvent({
      userId,
      eventType: 'PASSWORD_CHANGED',
      severity: 'LOW',
      description: 'Password changed successfully',
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  /**
   * Clean up expired reset tokens
   */
  static async cleanupExpiredTokens() {
    const result = await prisma.user.updateMany({
      where: {
        passwordResetExpires: { lt: new Date() },
      },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return result.count;
  }

  /**
   * Get password security info for user
   */
  static async getPasswordSecurityInfo(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastPasswordChange: true,
        organization: {
          include: { securitySettings: true },
        },
      },
    });

    if (!user) {
      return null;
    }

    const securitySettings = user.organization?.securitySettings;
    
    return {
      lastPasswordChange: user.lastPasswordChange,
      passwordAge: user.lastPasswordChange 
        ? Math.floor((Date.now() - user.lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      requirements: {
        minLength: securitySettings?.passwordMinLength || 8,
        requireUpper: securitySettings?.passwordRequireUpper ?? true,
        requireLower: securitySettings?.passwordRequireLower ?? true,
        requireNumber: securitySettings?.passwordRequireNumber ?? true,
        requireSymbol: securitySettings?.passwordRequireSymbol ?? true,
      },
    };
  }

  /**
   * Get password reset statistics
   */
  static async getPasswordResetStats(organizationId?: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const where: any = {
      createdAt: { gte: startDate },
      eventType: { in: ['PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE', 'PASSWORD_CHANGED'] },
    };

    if (organizationId) {
      where.user = { organizationId };
    }

    const [
      resetRequests,
      resetCompletions,
      passwordChanges,
      recentActivity
    ] = await Promise.all([
      prisma.securityEvent.count({
        where: { ...where, eventType: 'PASSWORD_RESET_REQUEST' },
      }),
      prisma.securityEvent.count({
        where: { ...where, eventType: 'PASSWORD_RESET_COMPLETE' },
      }),
      prisma.securityEvent.count({
        where: { ...where, eventType: 'PASSWORD_CHANGED' },
      }),
      prisma.securityEvent.findMany({
        where,
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
      resetRequests,
      resetCompletions,
      passwordChanges,
      completionRate: resetRequests > 0 ? (resetCompletions / resetRequests) * 100 : 0,
      recentActivity,
      period: `${days} days`,
    };
  }
}
