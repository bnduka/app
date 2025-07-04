
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { TwoFactorAuth } from '@/lib/security/two-factor-auth';
import { RateLimiter } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const identifier = RateLimiter.getIdentifier(request, 'user', session.user.id);
    const rateLimit = await RateLimiter.checkRateLimit(identifier, RateLimiter.rules.twoFactor);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const result = await TwoFactorAuth.generateAndSend2FACode(session.user.id);
    
    return NextResponse.json({
      success: true,
      expiresAt: result.expiresAt,
      message: '2FA code sent to your email',
    });
  } catch (error) {
    console.error('2FA generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate 2FA code' },
      { status: 500 }
    );
  }
}
