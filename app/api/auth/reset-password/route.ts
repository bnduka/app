
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validation/schemas';
import { createValidationMiddleware, createErrorResponse, createSuccessResponse, validateRateLimitHeaders } from '@/lib/validation/middleware';
import { SecurityEventService } from '@/lib/security/security-events';
import { logActivity } from '@/lib/activity-logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get request metadata for security logging
    const { ipAddress, userAgent } = validateRateLimitHeaders(request);

    // Validate input data
    const validationMiddleware = createValidationMiddleware(resetPasswordSchema);
    const validation = await validationMiddleware(request);
    
    if (!validation.success) {
      await SecurityEventService.logEvent({
        eventType: 'PASSWORD_RESET_COMPLETE',
        severity: 'LOW',
        description: 'Password reset failed due to validation errors',
        ipAddress,
        userAgent,
        metadata: { errors: validation.response },
      });
      return validation.response!;
    }

    const { token, password } = validation.data!;

    // Hash the provided token to match against stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: {
          gt: new Date(), // Token not expired
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        password: true,
      },
    });

    if (!user) {
      await SecurityEventService.logEvent({
        eventType: 'PASSWORD_RESET_COMPLETE',
        severity: 'MEDIUM',
        description: 'Password reset attempted with invalid or expired token',
        ipAddress,
        userAgent,
        metadata: { tokenProvided: !!token },
      });
      return createErrorResponse('Invalid or expired password reset token', 400);
    }

    // Check if new password is different from current password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return createErrorResponse('New password must be different from your current password', 400);
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        lastPasswordChange: new Date(),
        // Reset failed login attempts on successful password reset
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Log successful password reset
    await logActivity({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETE',
      status: 'SUCCESS',
      description: 'User successfully reset password',
      details: JSON.stringify({
        userId: user.id,
        email: user.email,
        resetTime: new Date().toISOString(),
      }),
      ipAddress,
      userAgent,
    });

    await SecurityEventService.logEvent({
      userId: user.id,
      eventType: 'PASSWORD_RESET_COMPLETE',
      severity: 'MEDIUM',
      description: 'Password successfully reset',
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    return createSuccessResponse(
      { message: 'Password has been reset successfully. You can now log in with your new password.' },
      'Password reset successful'
    );
    
  } catch (error) {
    console.error('Reset password error:', error);
    
    // Log error for monitoring
    const { ipAddress, userAgent } = validateRateLimitHeaders(request);
    await SecurityEventService.logEvent({
      eventType: 'PASSWORD_RESET_COMPLETE',
      severity: 'HIGH',
      description: 'Password reset failed due to server error',
      ipAddress,
      userAgent,
      metadata: { error: 'Internal server error' },
    });
    
    return createErrorResponse('Internal server error', 500);
  }
}
