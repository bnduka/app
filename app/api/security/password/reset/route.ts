
import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetService } from '@/lib/security/password-reset';
import { RateLimiter } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = RateLimiter.getIdentifier(request, 'ip');
    const rateLimit = await RateLimiter.checkRateLimit(identifier, RateLimiter.rules.passwordReset);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const result = await PasswordResetService.initiatePasswordReset(
      email,
      ipAddress,
      userAgent
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate password reset' },
      { status: 500 }
    );
  }
}
