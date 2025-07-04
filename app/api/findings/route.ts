
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const findings = await prisma.finding.findMany({
      where: { userId: session.user.id },
      include: {
        user: true,
        threatModel: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ findings });
  } catch (error) {
    console.error('Error fetching findings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
