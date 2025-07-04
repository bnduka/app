
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { ThirdPartyDashboardStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/third-party-reviews/stats - Get third-party review dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where = {
      userId: session.user.id,
      ...(session.user.organizationId && { organizationId: session.user.organizationId }),
    };

    const [
      totalReviews,
      reviewsByStatus,
      reviewsByGrade,
      reviewsByRisk,
      averageSecurityScore,
      scheduledScans,
      failedScans,
      recentReviews,
    ] = await Promise.all([
      // Total reviews
      prisma.thirdPartyReview.count({ where }),

      // Reviews by status
      prisma.thirdPartyReview.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),

      // Reviews by security grade
      prisma.thirdPartyReview.groupBy({
        by: ['securityGrade'],
        where: {
          ...where,
          securityGrade: { not: null },
        },
        _count: true,
      }),

      // Reviews by risk level
      prisma.thirdPartyReview.groupBy({
        by: ['riskLevel'],
        where,
        _count: true,
      }),

      // Average security score
      prisma.thirdPartyReview.aggregate({
        where: {
          ...where,
          overallScore: { not: null },
        },
        _avg: {
          overallScore: true,
        },
      }),

      // Scheduled scans (next scan date in future)
      prisma.thirdPartyReview.count({
        where: {
          ...where,
          nextScanDate: {
            gte: new Date(),
          },
        },
      }),

      // Failed scans
      prisma.thirdPartyReview.count({
        where: {
          ...where,
          status: 'FAILED',
        },
      }),

      // Recent reviews
      prisma.thirdPartyReview.findMany({
        where,
        include: {
          user: true,
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate high risk applications (high or critical risk level)
    const highRiskApplications = await prisma.thirdPartyReview.count({
      where: {
        ...where,
        riskLevel: { in: ['HIGH', 'VERY_HIGH', 'CRITICAL'] },
      },
    });

    const stats: ThirdPartyDashboardStats = {
      totalReviews,
      reviewsByStatus: reviewsByStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
      reviewsByGrade: reviewsByGrade.map((item) => ({
        grade: item.securityGrade!,
        count: item._count,
      })),
      reviewsByRisk: reviewsByRisk.map((item) => ({
        risk: item.riskLevel,
        count: item._count,
      })),
      averageSecurityScore: Math.round(averageSecurityScore._avg.overallScore || 0),
      scheduledScans,
      failedScans,
      highRiskApplications,
      recentReviews: recentReviews.map((review) => ({
        ...review,
        organization: review.organization || undefined,
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching third-party review stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
