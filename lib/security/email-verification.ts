
import { prisma } from '../db';
import { EncryptionService } from './encryption';
import { EmailService } from './email-service';
import { SecurityEventService } from './security-events';

export class EmailVerificationService {
  /**
   * Send email verification
   */
  static async sendVerificationEmail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true,
        lastName: true, emailVerified: true },
    });

    if (!user?.email) {
      throw new Error('User email not found');
    }

    if (user.emailVerified) {
      return { success: false, error: 'Email already verified' };
    }

    // Generate verification token
    const token = EncryptionService.generateToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with verification token
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: expiresAt,
      },
    });

    // Send verification email
    await EmailService.sendEmailVerification(user.email, token, `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined);

    await SecurityEventService.logEvent({
      userId,
      eventType: 'EMAIL_VERIFICATION_SENT',
      severity: 'LOW',
      description: 'Email verification sent',
      metadata: { email: user.email },
    });

    return { success: true, expiresAt };
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
        emailVerified: null,
      },
    });

    if (!user) {
      return { success: false, error: 'Invalid or expired verification token' };
    }

    // Mark email as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    await SecurityEventService.logEvent({
      userId: user.id,
      eventType: 'EMAIL_VERIFIED',
      severity: 'LOW',
      description: 'Email address verified successfully',
      metadata: { email: user.email },
    });

    return { success: true, user: updatedUser };
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.emailVerified) {
      return { success: false, error: 'Email already verified' };
    }

    return await this.sendVerificationEmail(user.id);
  }

  /**
   * Check if email verification is required
   */
  static async isEmailVerificationRequired(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });

    return !user?.emailVerified;
  }

  /**
   * Get email verification status
   */
  static async getVerificationStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerified: true,
        emailVerificationExpires: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      email: user.email,
      isVerified: !!user.emailVerified,
      verifiedAt: user.emailVerified,
      hasActivePendingVerification: user.emailVerificationExpires ? user.emailVerificationExpires > new Date() : false,
    };
  }

  /**
   * Clean up expired verification tokens
   */
  static async cleanupExpiredTokens() {
    const result = await prisma.user.updateMany({
      where: {
        emailVerificationExpires: { lt: new Date() },
        emailVerified: null,
      },
      data: {
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return result.count;
  }

  /**
   * Invalidate verification token
   */
  static async invalidateVerificationToken(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  }

  /**
   * Get verification statistics
   */
  static async getVerificationStats(organizationId?: string) {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [
      totalUsers,
      verifiedUsers,
      pendingVerification,
      recentVerifications
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, emailVerified: { not: null } } }),
      prisma.user.count({
        where: {
          ...where,
          emailVerified: null,
          emailVerificationExpires: { gt: new Date() },
        },
      }),
      prisma.securityEvent.count({
        where: {
          eventType: 'EMAIL_VERIFIED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          ...(organizationId && { user: { organizationId } }),
        },
      }),
    ]);

    return {
      totalUsers,
      verifiedUsers,
      pendingVerification,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
      recentVerifications,
    };
  }

  /**
   * Force email verification for organization
   */
  static async enforceEmailVerificationForOrganization(organizationId: string) {
    // Get all unverified users in the organization
    const unverifiedUsers = await prisma.user.findMany({
      where: {
        organizationId,
        emailVerified: null,
      },
      select: { id: true, email: true },
    });

    // Send verification emails to all unverified users
    const results = await Promise.allSettled(
      unverifiedUsers.map(user => this.sendVerificationEmail(user.id))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    await SecurityEventService.logEvent({
      eventType: 'EMAIL_VERIFICATION_SENT',
      severity: 'LOW',
      description: `Mass email verification sent for organization`,
      metadata: {
        organizationId,
        totalUsers: unverifiedUsers.length,
        successful,
        failed,
      },
    });

    return {
      totalUsers: unverifiedUsers.length,
      successful,
      failed,
    };
  }
}
