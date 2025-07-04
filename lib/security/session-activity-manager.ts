
// Enhanced session management with activity tracking
import { prisma } from '../db';
import { logActivity } from '../activity-logger';

export class SessionActivityManager {
  private static activityThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  static async updateUserActivity(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastActiveAt: new Date(),
          isOnline: true 
        }
      });
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  static async checkSessionExpiry(userId: string, organizationId?: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          lastActiveAt: true,
          organization: {
            select: { sessionTimeoutMinutes: true }
          }
        }
      });

      if (!user?.lastActiveAt) return false;

      const timeoutMinutes = user.organization?.sessionTimeoutMinutes || 5;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const timeSinceActivity = Date.now() - user.lastActiveAt.getTime();

      return timeSinceActivity > timeoutMs;
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return false;
    }
  }

  static async expireUserSession(userId: string, reason: string = 'TIMEOUT'): Promise<void> {
    try {
      // Terminate all active sessions
      await prisma.userSession.updateMany({
        where: { 
          userId,
          isActive: true 
        },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: reason
        }
      });

      // Update user status
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false }
      });

      // Log session expiry
      await logActivity({
        userId,
        action: 'SESSION_TIMEOUT',
        status: 'SUCCESS',
        description: `Session expired due to ${reason.toLowerCase()}`,
        entityType: 'session',
        entityId: userId
      });
    } catch (error) {
      console.error('Error expiring user session:', error);
    }
  }

  static async cleanupInactiveSessions(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

      // Find users with expired sessions
      const expiredUsers = await prisma.user.findMany({
        where: {
          isOnline: true,
          lastActiveAt: {
            lt: cutoffTime
          }
        },
        select: { id: true }
      });

      // Expire sessions for inactive users
      for (const user of expiredUsers) {
        await this.expireUserSession(user.id, 'INACTIVITY');
      }
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
    }
  }

  static async isUserActive(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastActiveAt: true }
      });

      if (!user?.lastActiveAt) return false;

      const timeSinceActivity = Date.now() - user.lastActiveAt.getTime();
      return timeSinceActivity < this.activityThreshold;
    } catch (error) {
      console.error('Error checking user activity:', error);
      return false;
    }
  }
}
