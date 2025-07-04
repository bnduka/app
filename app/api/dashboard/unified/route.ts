
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { UnifiedDashboardStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/unified - Get unified dashboard statistics from all modules
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

    // Threat Modeling Stats
    const [
      totalThreatModels,
      completedThreatModels,
      totalFindings,
      criticalFindings,
      recentThreatModels,
    ] = await Promise.all([
      prisma.threatModel.count({ where }),
      prisma.threatModel.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.finding.count({ where }),
      prisma.finding.count({ where: { ...where, severity: 'CRITICAL' } }),
      prisma.threatModel.findMany({
        where,
        include: {
          user: true,
          findings: {
            include: {
              user: true,
              threatModel: true,
              findingAssets: {
                include: {
                  finding: true,
                  asset: true,
                },
              },
              findingTags: {
                include: {
                  finding: true,
                  tag: true,
                },
              },
            },
          },
          reports: true,
          fileUploads: true,
          assets: {
            include: {
              threatModel: true,
              findingAssets: {
                include: {
                  finding: true,
                  asset: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    // Asset Management Stats
    const [
      totalAssets,
      assetsByType,
      assetsByStatus,
      assetsByCriticality,
      threatModeledAssets,
      designReviewedAssets,
      recentAssets,
    ] = await Promise.all([
      prisma.applicationAsset.count({ where }),
      prisma.applicationAsset.groupBy({
        by: ['assetType'],
        where,
        _count: true,
      }),
      prisma.applicationAsset.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.applicationAsset.groupBy({
        by: ['businessCriticality'],
        where,
        _count: true,
      }),
      prisma.applicationAsset.count({
        where: { ...where, threatModelStatus: 'COMPLETED' },
      }),
      prisma.applicationAsset.count({
        where: { ...where, designReviewStatus: 'COMPLETED' },
      }),
      prisma.applicationAsset.findMany({
        where,
        include: {
          user: true,
          organization: true,
          linkedThreatModels: { include: { threatModel: true } },
          linkedDesignReviews: { include: { designReview: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

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

    // Design Review Stats
    const [
      totalDesignReviews,
      designReviewsByStatus,
      designReviewsByGrade,
      designReviewsByRisk,
      averageDesignSecurityScore,
      completedDesignReviewsThisMonth,
      pendingDesignReviews,
      recentDesignReviews,
    ] = await Promise.all([
      prisma.designReview.count({ where }),
      prisma.designReview.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.designReview.groupBy({
        by: ['securityGrade'],
        where: { ...where, securityGrade: { not: null } },
        _count: true,
      }),
      prisma.designReview.groupBy({
        by: ['overallRisk'],
        where,
        _count: true,
      }),
      prisma.designReview.aggregate({
        where: { ...where, securityScore: { not: null } },
        _avg: { securityScore: true },
      }),
      prisma.designReview.count({
        where: {
          ...where,
          status: 'COMPLETED',
          reviewCompletedDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.designReview.count({
        where: {
          ...where,
          status: { in: ['DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW'] },
        },
      }),
      prisma.designReview.findMany({
        where,
        include: {
          user: true,
          organization: true,
          linkedAssets: { include: { applicationAsset: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    // Third-Party Review Stats
    const [
      totalThirdPartyReviews,
      thirdPartyReviewsByStatus,
      thirdPartyReviewsByGrade,
      thirdPartyReviewsByRisk,
      averageThirdPartySecurityScore,
      scheduledScans,
      failedScans,
      recentThirdPartyReviews,
    ] = await Promise.all([
      prisma.thirdPartyReview.count({ where }),
      prisma.thirdPartyReview.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.thirdPartyReview.groupBy({
        by: ['securityGrade'],
        where: { ...where, securityGrade: { not: null } },
        _count: true,
      }),
      prisma.thirdPartyReview.groupBy({
        by: ['riskLevel'],
        where,
        _count: true,
      }),
      prisma.thirdPartyReview.aggregate({
        where: { ...where, overallScore: { not: null } },
        _avg: { overallScore: true },
      }),
      prisma.thirdPartyReview.count({
        where: { ...where, nextScanDate: { gte: new Date() } },
      }),
      prisma.thirdPartyReview.count({
        where: { ...where, status: 'FAILED' },
      }),
      prisma.thirdPartyReview.findMany({
        where,
        include: {
          user: true,
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    const highRiskThirdPartyApplications = await prisma.thirdPartyReview.count({
      where: {
        ...where,
        riskLevel: { in: ['HIGH', 'VERY_HIGH', 'CRITICAL'] },
      },
    });

    // Calculate overall security posture
    const totalScores = [];
    if (averageDesignSecurityScore._avg.securityScore) {
      totalScores.push(averageDesignSecurityScore._avg.securityScore);
    }
    if (averageThirdPartySecurityScore._avg.overallScore) {
      totalScores.push(averageThirdPartySecurityScore._avg.overallScore);
    }

    const overallScore = totalScores.length > 0 
      ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
      : 75; // Default score

    // Calculate trend (simplified - could be enhanced with historical data)
    const trend = overallScore >= 80 ? 'IMPROVING' : overallScore >= 60 ? 'STABLE' : 'DECLINING';

    // Risk distribution across all modules
    const allRiskLevels = [
      ...designReviewsByRisk.map(item => ({ risk: item.overallRisk, count: item._count })),
      ...thirdPartyReviewsByRisk.map(item => ({ risk: item.riskLevel, count: item._count }))
    ];

    // Consolidate risk distribution
    const riskDistribution = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'CRITICAL'].map(risk => ({
      risk: risk as any,
      count: allRiskLevels.filter(item => item.risk === risk).reduce((sum, item) => sum + item.count, 0)
    })).filter(item => item.count > 0);

    // Calculate compliance score (simplified)
    const complianceScore = Math.round((
      (completedThreatModels / Math.max(totalThreatModels, 1)) * 30 +
      (threatModeledAssets / Math.max(totalAssets, 1)) * 25 +
      (designReviewedAssets / Math.max(totalAssets, 1)) * 25 +
      (overallScore / 100) * 20
    ));

    const stats: UnifiedDashboardStats = {
      threatModeling: {
        totalThreatModels,
        completedThreatModels,
        totalFindings,
        criticalFindings,
        recentThreatModels: recentThreatModels as any,
      },
      assetManagement: {
        totalAssets,
        assetsByType: assetsByType.map(item => ({
          type: item.assetType,
          count: item._count,
        })),
        assetsByStatus: assetsByStatus.map(item => ({
          status: item.status,
          count: item._count,
        })),
        assetsByCriticality: assetsByCriticality.map(item => ({
          criticality: item.businessCriticality,
          count: item._count,
        })),
        threatModeledAssets,
        designReviewedAssets,
        highRiskAssets,
        recentAssets: recentAssets as any,
      },
      designReviews: {
        totalReviews: totalDesignReviews,
        reviewsByStatus: designReviewsByStatus.map(item => ({
          status: item.status,
          count: item._count,
        })),
        reviewsByGrade: designReviewsByGrade.map(item => ({
          grade: item.securityGrade!,
          count: item._count,
        })),
        reviewsByRisk: designReviewsByRisk.map(item => ({
          risk: item.overallRisk,
          count: item._count,
        })),
        averageSecurityScore: Math.round(averageDesignSecurityScore._avg.securityScore || 0),
        completedReviewsThisMonth: completedDesignReviewsThisMonth,
        pendingReviews: pendingDesignReviews,
        recentReviews: recentDesignReviews as any,
      },
      thirdPartyReviews: {
        totalReviews: totalThirdPartyReviews,
        reviewsByStatus: thirdPartyReviewsByStatus.map(item => ({
          status: item.status,
          count: item._count,
        })),
        reviewsByGrade: thirdPartyReviewsByGrade.map(item => ({
          grade: item.securityGrade!,
          count: item._count,
        })),
        reviewsByRisk: thirdPartyReviewsByRisk.map(item => ({
          risk: item.riskLevel,
          count: item._count,
        })),
        averageSecurityScore: Math.round(averageThirdPartySecurityScore._avg.overallScore || 0),
        scheduledScans,
        failedScans,
        highRiskApplications: highRiskThirdPartyApplications,
        recentReviews: recentThirdPartyReviews as any,
      },
      overallSecurityPosture: {
        overallScore,
        trend,
        riskDistribution,
        complianceScore,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching unified dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
