
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { SessionManager } from '@/lib/security/session-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await SessionManager.getUserSessions(session.user.id);
    
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionToken } = await request.json();
    
    if (sessionToken) {
      // Terminate specific session
      await SessionManager.terminateSession(sessionToken, 'USER_REQUEST');
    } else {
      // Terminate all sessions except current
      await SessionManager.terminateAllUserSessions(session.user.id, 'USER_REQUEST');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Terminate session error:', error);
    return NextResponse.json(
      { error: 'Failed to terminate session' },
      { status: 500 }
    );
  }
}
