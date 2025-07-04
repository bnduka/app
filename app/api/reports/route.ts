
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const threatModelId = searchParams.get('threatModelId');

    // Build where clause based on user role and filters
    let whereClause: any = {
      deletedAt: null // Exclude soft-deleted reports
    };

    // Filter by threat model if specified
    if (threatModelId) {
      whereClause.threatModelId = threatModelId;
    }

    // Role-based filtering
    const isAdmin = ['ADMIN', 'BUSINESS_ADMIN'].includes(session.user.role);
    
    if (!isAdmin) {
      // Non-admin users can only see their own reports or reports from their organization
      if (session.user.organizationId) {
        whereClause.OR = [
          { userId: session.user.id },
          {
            user: {
              organizationId: session.user.organizationId
            }
          }
        ];
      } else {
        whereClause.userId = session.user.id;
      }
    }

    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        threatModel: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      reports
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
