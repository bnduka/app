
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { SecurityEventService } from '@/lib/security/security-events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Role-based access control for security events
    let events;
    
    if (session.user.role === 'ADMIN') {
      // Platform admin sees all events across all organizations
      events = await SecurityEventService.getAllSecurityEvents({ limit });
    } else if (session.user.role === 'BUSINESS_ADMIN' && session.user.organizationId) {
      // Business admin sees only events from their organization
      events = await SecurityEventService.getOrganizationSecurityEvents(
        session.user.organizationId, 
        limit
      );
    } else {
      // Regular users see only their own events
      events = await SecurityEventService.getUserSecurityEvents(session.user.id, limit);
    }
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Get security events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    );
  }
}
