
import { prisma } from '../db';
import { EncryptionService } from './encryption';
import { EmailService } from './email-service';
import { SecurityEventService } from './security-events';

export class TwoFactorAuth {
  /**
   * Generate and send 2FA code
   */
  static async generateAndSend2FACode(userId: string, type: 'EMAIL' = 'EMAIL') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      throw new Error('User email not found');
    }

    // Generate 6-digit code
    const code = EncryptionService.generate2FACode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing tokens
    await prisma.twoFactorToken.updateMany({
      where: {
        userId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });

    // Create new token
    const token = await prisma.twoFactorToken.create({
      data: {
        userId,
        token: code,
        type,
        expiresAt,
      },
    });

    // Send via email
    if (type === 'EMAIL') {
      await EmailService.send2FACode(user.email, code, user.name || undefined);
    }

    await SecurityEventService.logEvent({
      userId,
      eventType: 'TWO_FACTOR_ENABLED',
      severity: 'LOW',
      description: `2FA code generated and sent via ${type}`,
      metadata: { type, codeId: token.id },
    });

    return { success: true, expiresAt };
  }

  /**
   * Verify 2FA code
   */
  static async verify2FACode(userId: string, code: string) {
    const token = await prisma.twoFactorToken.findFirst({
      where: {
        userId,
        token: code,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) {
      await SecurityEventService.logEvent({
        userId,
        eventType: 'TWO_FACTOR_FAILED',
        severity: 'MEDIUM',
        description: 'Invalid or expired 2FA code provided',
        metadata: { providedCode: code },
      });
      return { success: false, error: 'Invalid or expired code' };
    }

    // Mark token as used
    await prisma.twoFactorToken.update({
      where: { id: token.id },
      data: { isUsed: true },
    });

    await SecurityEventService.logEvent({
      userId,
      eventType: 'TWO_FACTOR_VERIFIED',
      severity: 'LOW',
      description: '2FA code verified successfully',
      metadata: { tokenId: token.id },
    });

    return { success: true };
  }

  /**
   * Enable 2FA for user
   */
  static async enable2FA(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    await SecurityEventService.logEvent({
      userId,
      eventType: 'TWO_FACTOR_ENABLED',
      severity: 'LOW',
      description: '2FA enabled for user account',
    });

    return user;
  }

  /**
   * Disable 2FA for user
   */
  static async disable2FA(userId: string) {
    // Invalidate all existing tokens
    await prisma.twoFactorToken.updateMany({
      where: { userId },
      data: { isUsed: true },
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });

    await SecurityEventService.logEvent({
      userId,
      eventType: 'TWO_FACTOR_DISABLED',
      severity: 'MEDIUM',
      description: '2FA disabled for user account',
    });

    return user;
  }

  /**
   * Check if user has 2FA enabled
   */
  static async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled || false;
  }

  /**
   * Check if user needs 2FA based on organization policy
   */
  static async isRequired2FA(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    return user?.organization?.requireTwoFactor || false;
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens() {
    const result = await prisma.twoFactorToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isUsed: true },
        ],
      },
    });

    return result.count;
  }

  /**
   * Get 2FA statistics
   */
  static async get2FAStats(organizationId?: string) {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [
      totalUsers,
      users2FAEnabled,
      organizations2FARequired,
      recent2FAActivity
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, twoFactorEnabled: true } }),
      prisma.organization.count({ where: { requireTwoFactor: true } }),
      prisma.securityEvent.count({
        where: {
          eventType: { in: ['TWO_FACTOR_VERIFIED', 'TWO_FACTOR_FAILED'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          ...(organizationId && { user: { organizationId } }),
        },
      }),
    ]);

    return {
      totalUsers,
      users2FAEnabled,
      adoptionRate: totalUsers > 0 ? (users2FAEnabled / totalUsers) * 100 : 0,
      organizations2FARequired,
      recent2FAActivity,
    };
  }

  /**
   * Enforce 2FA for organization
   */
  static async enforce2FAForOrganization(organizationId: string, enforce: boolean) {
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: { requireTwoFactor: enforce },
    });

    if (enforce) {
      // Enable 2FA for all users in the organization
      await prisma.user.updateMany({
        where: { organizationId },
        data: { twoFactorEnabled: true },
      });
    }

    await SecurityEventService.logEvent({
      eventType: 'SETTINGS_CHANGED',
      severity: 'MEDIUM',
      description: `2FA ${enforce ? 'enforced' : 'not enforced'} for organization`,
      metadata: {
        organizationId,
        action: enforce ? 'enforce' : 'optional',
        affectedUsers: organization.name,
      },
    });

    return organization;
  }

  /**
   * Backup codes generation (for future enhancement)
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(EncryptionService.generateToken(8).toUpperCase());
    }
    return codes;
  }
}
