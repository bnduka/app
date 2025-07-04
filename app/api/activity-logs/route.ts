
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ActivityLogger } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const all = searchParams.get('all') === 'true';

    // Admin users can see all activities, regular users only see their own
    const userId = session.user.role === 'ADMIN' && all ? undefined : session.user.id;

    const activities = await ActivityLogger.getRecentActivities(userId, limit, offset);
    const stats = await ActivityLogger.getActivityStats(userId);

    return NextResponse.json({ 
      activities,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: activities.length === limit,
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
