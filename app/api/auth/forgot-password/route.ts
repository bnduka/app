
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { createValidationMiddleware, createErrorResponse, createSuccessResponse, validateRateLimitHeaders } from '@/lib/validation/middleware';
import { SecurityEventService } from '@/lib/security/security-events';
import { EmailService } from '@/lib/security/email-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get request metadata for security logging
    const { ipAddress, userAgent } = validateRateLimitHeaders(request);

    // Validate input data
    const validationMiddleware = createValidationMiddleware(forgotPasswordSchema);
    const validation = await validationMiddleware(request);
    
    if (!validation.success) {
      await SecurityEventService.logEvent({
        eventType: 'PASSWORD_RESET_REQUEST',
        severity: 'LOW',
        description: 'Password reset failed due to validation errors',
        ipAddress,
        userAgent,
        metadata: { errors: validation.response },
      });
      return validation.response!;
    }

    const { email } = validation.data!;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        passwordResetToken: true,
        passwordResetExpires: true,
      },
    });

    // Always return success to prevent email enumeration attacks
    // but only send email if user exists
    if (user) {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetTokenHash,
          passwordResetExpires: expiresAt,
        },
      });

      // Send password reset email
      try {
        await EmailService.sendPasswordReset(user.email!, resetToken, `${user.firstName || ''} ${user.lastName || ''}`.trim());
        
        // Log successful password reset request
        await SecurityEventService.logEvent({
          userId: user.id,
          eventType: 'PASSWORD_RESET_REQUEST',
          severity: 'MEDIUM',
          description: 'Password reset email sent',
          ipAddress,
          userAgent,
          metadata: { email },
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        
        // Log email failure
        await SecurityEventService.logEvent({
          userId: user.id,
          eventType: 'PASSWORD_RESET_REQUEST',
          severity: 'HIGH',
          description: 'Failed to send password reset email',
          ipAddress,
          userAgent,
          metadata: { email, error: 'Email delivery failed' },
        });
        
        return createErrorResponse('Failed to send password reset email. Please try again later.', 500);
      }
    } else {
      // Log attempted reset for non-existent user
      await SecurityEventService.logEvent({
        eventType: 'PASSWORD_RESET_REQUEST',
        severity: 'LOW',
        description: 'Password reset attempted for non-existent user',
        ipAddress,
        userAgent,
        metadata: { email },
      });
    }

    return createSuccessResponse(
      { message: 'If an account with that email exists, we have sent a password reset link.' },
      'Password reset email sent'
    );
    
  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Log error for monitoring
    const { ipAddress, userAgent } = validateRateLimitHeaders(request);
    await SecurityEventService.logEvent({
      eventType: 'PASSWORD_RESET_REQUEST',
      severity: 'HIGH',
      description: 'Password reset failed due to server error',
      ipAddress,
      userAgent,
      metadata: { error: 'Internal server error' },
    });
    
    return createErrorResponse('Internal server error', 500);
  }
}
