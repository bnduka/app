
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, comments } = await request.json();

    // Verify the finding belongs to the user
    const existingFinding = await prisma.finding.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      }
    });

    if (!existingFinding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    const updatedFinding = await prisma.finding.update({
      where: { id: params.id },
      data: {
        status,
        comments,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        threatModel: true,
      },
    });

    return NextResponse.json({ finding: updatedFinding });
  } catch (error) {
    console.error('Error updating finding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
