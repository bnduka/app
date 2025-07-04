
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { AssetDashboardStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/assets/stats - Get asset dashboard statistics
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
      totalAssets,
      assetsByType,
      assetsByStatus,
      assetsByCriticality,
      threatModeledAssets,
      designReviewedAssets,
      recentAssets,
    ] = await Promise.all([
      // Total assets
      prisma.applicationAsset.count({ where }),

      // Assets by type
      prisma.applicationAsset.groupBy({
        by: ['assetType'],
        where,
        _count: true,
      }),

      // Assets by status
      prisma.applicationAsset.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),

      // Assets by criticality
      prisma.applicationAsset.groupBy({
        by: ['businessCriticality'],
        where,
        _count: true,
      }),

      // Threat modeled assets
      prisma.applicationAsset.count({
        where: {
          ...where,
          threatModelStatus: 'COMPLETED',
        },
      }),

      // Design reviewed assets
      prisma.applicationAsset.count({
        where: {
          ...where,
          designReviewStatus: 'COMPLETED',
        },
      }),

      // Recent assets
      prisma.applicationAsset.findMany({
        where,
        include: {
          user: true,
          organization: true,
          linkedThreatModels: {
            include: {
              threatModel: true,
              applicationAsset: true,
            },
          },
          linkedDesignReviews: {
            include: {
              designReview: true,
              applicationAsset: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate high risk assets (very high or high criticality without threat modeling or design review)
    const highRiskAssets = await prisma.applicationAsset.count({
      where: {
        ...where,
        businessCriticality: { in: ['VERY_HIGH', 'HIGH'] },
        OR: [
          { threatModelStatus: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
          { designReviewStatus: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
        ],
      },
    });

    const stats: AssetDashboardStats = {
      totalAssets,
      assetsByType: assetsByType.map((item) => ({
        type: item.assetType,
        count: item._count,
      })),
      assetsByStatus: assetsByStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
      assetsByCriticality: assetsByCriticality.map((item) => ({
        criticality: item.businessCriticality,
        count: item._count,
      })),
      threatModeledAssets,
      designReviewedAssets,
      highRiskAssets,
      recentAssets: recentAssets.map((asset) => ({
        ...asset,
        organization: asset.organization || undefined,
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching asset stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
