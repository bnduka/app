
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { DesignReviewDashboardStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/design-reviews/stats - Get design review dashboard statistics
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
      completedReviewsThisMonth,
      pendingReviews,
      recentReviews,
    ] = await Promise.all([
      // Total reviews
      prisma.designReview.count({ where }),

      // Reviews by status
      prisma.designReview.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),

      // Reviews by security grade
      prisma.designReview.groupBy({
        by: ['securityGrade'],
        where: {
          ...where,
          securityGrade: { not: null },
        },
        _count: true,
      }),

      // Reviews by risk level
      prisma.designReview.groupBy({
        by: ['overallRisk'],
        where,
        _count: true,
      }),

      // Average security score
      prisma.designReview.aggregate({
        where: {
          ...where,
          securityScore: { not: null },
        },
        _avg: {
          securityScore: true,
        },
      }),

      // Completed reviews this month
      prisma.designReview.count({
        where: {
          ...where,
          status: 'COMPLETED',
          reviewCompletedDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Pending reviews
      prisma.designReview.count({
        where: {
          ...where,
          status: { in: ['DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW'] },
        },
      }),

      // Recent reviews
      prisma.designReview.findMany({
        where,
        include: {
          user: true,
          organization: true,
          linkedAssets: {
            include: {
              applicationAsset: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const stats: DesignReviewDashboardStats = {
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
        risk: item.overallRisk,
        count: item._count,
      })),
      averageSecurityScore: Math.round(averageSecurityScore._avg.securityScore || 0),
      completedReviewsThisMonth,
      pendingReviews,
      recentReviews: recentReviews.map((review) => ({
        ...review,
        organization: review.organization || undefined,
      })) as any,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching design review stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
