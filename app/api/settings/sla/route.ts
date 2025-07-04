
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slaSettings = await prisma.slaSettings.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({ slaSettings });
  } catch (error: any) {
    console.error('Error fetching SLA settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SLA settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { criticalDays, highDays, mediumDays, lowDays } = body;

    // Validate input
    if (!criticalDays || !highDays || !mediumDays || !lowDays) {
      return NextResponse.json(
        { error: 'All SLA days are required' },
        { status: 400 }
      );
    }

    // Validate that days are in ascending order
    if (criticalDays >= highDays || 
        highDays >= mediumDays || 
        mediumDays >= lowDays) {
      return NextResponse.json(
        { error: 'SLA days must be in ascending order: Critical < High < Medium < Low' },
        { status: 400 }
      );
    }

    // Validate range
    const days = [criticalDays, highDays, mediumDays, lowDays];
    if (days.some(day => day < 1 || day > 365)) {
      return NextResponse.json(
        { error: 'SLA days must be between 1 and 365' },
        { status: 400 }
      );
    }

    const slaSettings = await prisma.slaSettings.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        criticalDays,
        highDays,
        mediumDays,
        lowDays,
      },
      create: {
        userId: session.user.id,
        criticalDays,
        highDays,
        mediumDays,
        lowDays,
      },
    });

    // Log the activity
    await logActivity({
      userId: session.user.id,
      action: 'UPDATE_SLA_SETTINGS',
      status: 'SUCCESS',
      description: `Updated SLA settings: Critical: ${criticalDays}d, High: ${highDays}d, Medium: ${mediumDays}d, Low: ${lowDays}d`,
      entityType: 'sla_settings',
      entityId: slaSettings.id,
    });

    return NextResponse.json({ slaSettings });
  } catch (error: any) {
    console.error('Error saving SLA settings:', error);
    
    // Log the failed activity
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'UPDATE_SLA_SETTINGS',
        status: 'FAILED',
        description: 'Failed to update SLA settings',
        errorMessage: error.message,
      });
    }

    return NextResponse.json(
      { error: 'Failed to save SLA settings' },
      { status: 500 }
    );
  }
}
