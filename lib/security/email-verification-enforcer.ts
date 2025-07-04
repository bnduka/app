
// Enhanced email verification enforcement for non-SSO signups
import { prisma } from '../db';
import { logActivity } from '../activity-logger';
import crypto from 'crypto';

export class EmailVerificationEnforcer {
  static async requireEmailVerification(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          emailVerified: true,
          accounts: {
            select: { provider: true }
          }
        }
      });

      if (!user) return false;

      // Skip verification for SSO users
      const hasSSOProvider = user.accounts.some(account => 
        account.provider !== 'credentials'
      );

      if (hasSSOProvider) {
        return true; // SSO users are pre-verified
      }

      // Require verification for credential-based users
      return !!user.emailVerified;
    } catch (error) {
      console.error('Error checking email verification requirement:', error);
      return false;
    }
  }

  static async generateVerificationToken(userId: string): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expires
        }
      });

      await logActivity({
        userId,
        action: 'EMAIL_VERIFICATION_SENT',
        status: 'SUCCESS',
        description: 'Email verification token generated',
        entityType: 'user',
        entityId: userId
      });

      return token;
    } catch (error) {
      console.error('Error generating verification token:', error);
      throw new Error('Failed to generate verification token');
    }
  }

  static async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string }> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        return { success: false };
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      });

      await logActivity({
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        status: 'SUCCESS',
        description: 'Email address verified successfully',
        entityType: 'user',
        entityId: user.id
      });

      return { success: true, userId: user.id };
    } catch (error) {
      console.error('Error verifying email token:', error);
      return { success: false };
    }
  }

  static async resendVerificationEmail(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { 
          id: true, 
          emailVerified: true,
          accounts: {
            select: { provider: true }
          }
        }
      });

      if (!user || user.emailVerified) {
        return false;
      }

      // Don't resend for SSO users
      const hasSSOProvider = user.accounts.some(account => 
        account.provider !== 'credentials'
      );

      if (hasSSOProvider) {
        return false;
      }

      await this.generateVerificationToken(user.id);
      return true;
    } catch (error) {
      console.error('Error resending verification email:', error);
      return false;
    }
  }
}
