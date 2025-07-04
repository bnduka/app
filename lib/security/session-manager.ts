
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../db';
import { EncryptionService } from './encryption';
import { SecurityEventService } from './security-events';

export class SessionManager {
  /**
   * Create a new user session
   */
  static async createSession(
    userId: string,
    deviceInfo: {
      userAgent?: string;
      ipAddress: string;
      deviceId?: string;
    },
    timeoutMinutes?: number
  ) {
    const sessionToken = EncryptionService.generateToken(64);
    const expiresAt = new Date(Date.now() + (timeoutMinutes || 5) * 60 * 1000);

    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        deviceId: deviceInfo.deviceId,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent || undefined,
        expiresAt,
        lastActiveAt: new Date(),
      },
    });

    // Update user online status
    await prisma.user.update({
      where: { id: userId },
      data: { 
        isOnline: true,
        lastActiveAt: new Date()
      },
    });

    return session;
  }

  /**
   * Validate and refresh session
   */
  static async validateSession(sessionToken: string) {
    const session = await prisma.userSession.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || !session.isActive) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      await this.terminateSession(sessionToken, 'EXPIRED');
      await SecurityEventService.logEvent({
        userId: session.userId,
        eventType: 'SESSION_TIMEOUT',
        severity: 'LOW',
        description: 'Session expired due to timeout',
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
      });
      return null;
    }

    // Update last active time
    await prisma.userSession.update({
      where: { sessionToken },
      data: { lastActiveAt: new Date() },
    });

    await prisma.user.update({
      where: { id: session.userId },
      data: { lastActiveAt: new Date() },
    });

    return session;
  }

  /**
   * Extend session timeout
   */
  static async extendSession(sessionToken: string, timeoutMinutes: number) {
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    
    return await prisma.userSession.update({
      where: { sessionToken },
      data: { 
        expiresAt,
        lastActiveAt: new Date()
      },
    });
  }

  /**
   * Terminate a specific session
   */
  static async terminateSession(sessionToken: string, reason: string = 'USER_LOGOUT') {
    const session = await prisma.userSession.findUnique({
      where: { sessionToken },
    });

    if (session) {
      await prisma.userSession.update({
        where: { sessionToken },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: reason,
        },
      });

      // Check if user has any other active sessions
      const activeSessions = await prisma.userSession.count({
        where: {
          userId: session.userId,
          isActive: true,
        },
      });

      // If no active sessions, mark user as offline
      if (activeSessions === 0) {
        await prisma.user.update({
          where: { id: session.userId },
          data: { isOnline: false },
        });
      }
    }
  }

  /**
   * Terminate all sessions for a user
   */
  static async terminateAllUserSessions(userId: string, reason: string = 'ADMIN_ACTION') {
    await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false },
    });
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions() {
    const result = await prisma.userSession.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'EXPIRED',
      },
    });

    return result.count;
  }

  /**
   * Get user's active sessions
   */
  static async getUserSessions(userId: string) {
    return await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /**
   * Check session limits
   */
  static async checkSessionLimits(userId: string, maxSessions: number = 5) {
    const activeSessions = await prisma.userSession.count({
      where: {
        userId,
        isActive: true,
      },
    });

    if (activeSessions >= maxSessions) {
      // Terminate oldest session
      const oldestSession = await prisma.userSession.findFirst({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { lastActiveAt: 'asc' },
      });

      if (oldestSession) {
        await this.terminateSession(oldestSession.sessionToken, 'SESSION_LIMIT_EXCEEDED');
      }
    }
  }

  /**
   * Session timeout middleware
   */
  static createTimeoutMiddleware(timeoutMinutes: number = 5) {
    return async (request: NextRequest) => {
      const sessionToken = request.cookies.get('session-token')?.value;
      
      if (!sessionToken) {
        return null;
      }

      const session = await this.validateSession(sessionToken);
      
      if (!session) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session-token');
        return response;
      }

      // Extend session on activity
      await this.extendSession(sessionToken, timeoutMinutes);
      
      return session;
    };
  }
}
