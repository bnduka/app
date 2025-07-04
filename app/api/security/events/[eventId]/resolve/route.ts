
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { SecurityEventService } from '@/lib/security/security-events';

export async function POST(request: NextRequest, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and business admins can resolve events
    if (!['ADMIN', 'BUSINESS_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedBy = `${session.user.name || session.user.email} (${session.user.role})`;
    
    const event = await SecurityEventService.resolveEvent(params.eventId, resolvedBy);
    
    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Resolve security event error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve security event' },
      { status: 500 }
    );
  }
}
