
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { SecurityEventService } from '@/lib/security/security-events';
import { TwoFactorAuth } from '@/lib/security/two-factor-auth';
import { DeviceManager } from '@/lib/security/device-manager';
import { ApiKeyManager } from '@/lib/security/api-keys';
import { AccountLockoutService } from '@/lib/security/account-lockout';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    let organizationId: string | undefined;
    
    // Determine scope based on user role
    if (session.user.role === 'ADMIN') {
      // Platform admin sees all stats
      organizationId = undefined;
    } else if (session.user.role === 'BUSINESS_ADMIN') {
      // Business admin sees organization stats
      organizationId = session.user.organizationId || undefined;
    } else {
      // Regular users see limited personal stats
      organizationId = session.user.organizationId || undefined;
    }

    const [
      securityStats,
      twoFactorStats,
      deviceStats,
      apiKeyStats,
      lockoutStats
    ] = await Promise.all([
      SecurityEventService.getSecurityStats(organizationId, days),
      TwoFactorAuth.get2FAStats(organizationId),
      DeviceManager.getDeviceStats(
        session.user.role === 'ADMIN' || session.user.role === 'BUSINESS_ADMIN' 
          ? undefined 
          : session.user.id,
        organizationId
      ),
      ApiKeyManager.getApiKeyStats(
        session.user.role === 'ADMIN' || session.user.role === 'BUSINESS_ADMIN' 
          ? undefined 
          : session.user.id,
        organizationId
      ),
      AccountLockoutService.getLockoutStats(organizationId, days),
    ]);
    
    return NextResponse.json({
      security: securityStats,
      twoFactor: twoFactorStats,
      devices: deviceStats,
      apiKeys: apiKeyStats,
      lockouts: lockoutStats,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('Get security stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security statistics' },
      { status: 500 }
    );
  }
}
