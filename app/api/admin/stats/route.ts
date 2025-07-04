
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get comprehensive stats
    const [
      totalUsers,
      totalOrganizations,
      totalThreatModels,
      totalFindings,
      totalReports,
      activeUsers,
      criticalFindings,
      recentActivity
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.threatModel.count(),
      prisma.finding.count(),
      prisma.report.count(),
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.finding.count({
        where: {
          severity: 'CRITICAL',
          status: {
            not: 'RESOLVED'
          }
        }
      }),
      prisma.activityLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    return NextResponse.json({
      totalUsers,
      totalOrganizations,
      totalThreatModels,
      totalFindings,
      totalReports,
      activeUsers,
      criticalFindings,
      recentActivity
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
