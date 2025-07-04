
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

    const userId = session.user.id;
    const userRole = session.user.role;
    const organizationId = session.user.organizationId;

    // Base where conditions based on user role and organization
    const getWhereCondition = () => {
      if (userRole === 'ADMIN') {
        // Admin can see all data
        return {};
      } else if (userRole === 'BUSINESS_ADMIN' && organizationId) {
        // Business admin can see organization data
        return {
          OR: [
            { userId },
            { organizationId },
            { user: { organizationId } }
          ]
        };
      } else {
        // Regular users can only see their own data
        return { userId };
      }
    };

    const whereCondition = getWhereCondition();

    // Parallel queries for all dashboard metrics
    const [
      // Threat Modeling metrics
      threatModelStats,
      recentThreatModels,
      
      // Asset Management metrics
      assetStats,
      recentAssets,
      
      // Design Review metrics
      designReviewStats,
      recentDesignReviews,
      
      // Third-Party Review metrics
      thirdPartyStats,
      recentThirdPartyReviews,
      
      // Cross-module metrics
      recentActivity
    ] = await Promise.all([
      // Threat Modeling Statistics
      getThreatModelingStats(whereCondition),
      
      // Recent Threat Models (limit 5)
      prisma.threatModel.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { name: true, email: true } },
          findings: { select: { id: true, severity: true, status: true } },
          reports: { select: { id: true, format: true } }
        }
      }),
      
      // Asset Management Statistics
      getAssetManagementStats(whereCondition),
      
      // Recent Assets (limit 5)
      prisma.applicationAsset.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { name: true, email: true } }
        }
      }),
      
      // Design Review Statistics
      getDesignReviewStats(whereCondition),
      
      // Recent Design Reviews (limit 5)
      prisma.designReview.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { name: true, email: true } }
        }
      }),
      
      // Third-Party Review Statistics
      getThirdPartyReviewStats(whereCondition),
      
      // Recent Third-Party Reviews (limit 5)
      prisma.thirdPartyReview.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { name: true, email: true } }
        }
      }),
      
      // Recent Activity (last 10 activities)
      prisma.activityLog.findMany({
        where: userRole === 'ADMIN' ? {} : { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true, email: true } }
        }
      })
    ]);

    // Calculate overall security posture
    const securityPosture = calculateSecurityPosture(
      threatModelStats,
      assetStats,
      designReviewStats,
      thirdPartyStats
    );

    const dashboardData = {
      // User context
      user: {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        organizationId: session.user.organizationId
      },
      
      // Module statistics
      threatModeling: threatModelStats,
      assetManagement: assetStats,
      designReviews: designReviewStats,
      thirdPartyReviews: thirdPartyStats,
      
      // Recent items
      recentItems: {
        threatModels: recentThreatModels,
        assets: recentAssets,
        designReviews: recentDesignReviews,
        thirdPartyReviews: recentThirdPartyReviews
      },
      
      // Activity and insights
      recentActivity,
      securityPosture,
      
      // Quick stats summary
      summary: {
        totalThreatModels: threatModelStats.total,
        totalAssets: assetStats.total,
        totalDesignReviews: designReviewStats.total,
        totalThirdPartyReviews: thirdPartyStats.total,
        openFindings: threatModelStats.openFindings,
        criticalFindings: threatModelStats.criticalFindings,
        overallSecurityScore: securityPosture.overallScore
      }
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get threat modeling statistics
async function getThreatModelingStats(whereCondition: any) {
  const [
    total,
    completed,
    inProgress,
    draft,
    totalFindings,
    openFindings,
    criticalFindings,
    resolvedFindings,
    totalReports
  ] = await Promise.all([
    prisma.threatModel.count({ where: whereCondition }),
    prisma.threatModel.count({ where: { ...whereCondition, status: 'COMPLETED' } }),
    prisma.threatModel.count({ where: { ...whereCondition, status: 'ANALYZING' } }),
    prisma.threatModel.count({ where: { ...whereCondition, status: 'DRAFT' } }),
    
    prisma.finding.count({
      where: {
        threatModel: whereCondition
      }
    }),
    prisma.finding.count({
      where: {
        threatModel: whereCondition,
        status: 'OPEN'
      }
    }),
    prisma.finding.count({
      where: {
        threatModel: whereCondition,
        severity: 'CRITICAL',
        status: { not: 'RESOLVED' }
      }
    }),
    prisma.finding.count({
      where: {
        threatModel: whereCondition,
        status: 'RESOLVED'
      }
    }),
    
    prisma.report.count({
      where: {
        threatModel: whereCondition
      }
    })
  ]);

  return {
    total,
    completed,
    inProgress,
    draft,
    totalFindings,
    openFindings,
    criticalFindings,
    resolvedFindings,
    totalReports,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

// Helper function to get asset management statistics
async function getAssetManagementStats(whereCondition: any) {
  const [
    total,
    active,
    inactive,
    critical,
    high,
    medium,
    low,
    production,
    staging,
    development,
    withThreatModels,
    withDesignReviews
  ] = await Promise.all([
    prisma.applicationAsset.count({ where: whereCondition }),
    prisma.applicationAsset.count({ where: { ...whereCondition, status: 'ACTIVE' } }),
    prisma.applicationAsset.count({ where: { ...whereCondition, status: 'INACTIVE' } }),
    
    prisma.applicationAsset.count({ where: { ...whereCondition, businessCriticality: 'VERY_HIGH' } }),
    prisma.applicationAsset.count({ where: { ...whereCondition, businessCriticality: 'HIGH' } }),
    prisma.applicationAsset.count({ where: { ...whereCondition, businessCriticality: 'MEDIUM' } }),
    prisma.applicationAsset.count({ where: { ...whereCondition, businessCriticality: 'LOW' } }),
    
    prisma.applicationAsset.count({ where: { ...whereCondition, environment: 'PRODUCTION' } }),
    prisma.applicationAsset.count({ where: { ...whereCondition, environment: 'STAGING' } }),
    prisma.applicationAsset.count({ where: { ...whereCondition, environment: 'DEVELOPMENT' } }),
    
    prisma.applicationAsset.count({ where: { ...whereCondition, threatModelStatus: 'COMPLETED' } }),
    prisma.applicationAsset.count({ where: { ...whereCondition, designReviewStatus: 'COMPLETED' } })
  ]);

  return {
    total,
    active,
    inactive,
    byBusinessCriticality: { critical, high, medium, low },
    byEnvironment: { production, staging, development },
    withThreatModels,
    withDesignReviews,
    threatModelCoverage: total > 0 ? Math.round((withThreatModels / total) * 100) : 0,
    designReviewCoverage: total > 0 ? Math.round((withDesignReviews / total) * 100) : 0
  };
}

// Helper function to get design review statistics
async function getDesignReviewStats(whereCondition: any) {
  const [
    total,
    completed,
    inProgress,
    draft,
    cancelled,
    averageSecurityScore,
    gradeA,
    gradeB,
    gradeC,
    gradeD,
    gradeF
  ] = await Promise.all([
    prisma.designReview.count({ where: whereCondition }),
    prisma.designReview.count({ where: { ...whereCondition, status: 'COMPLETED' } }),
    prisma.designReview.count({ where: { ...whereCondition, status: 'IN_PROGRESS' } }),
    prisma.designReview.count({ where: { ...whereCondition, status: 'DRAFT' } }),
    prisma.designReview.count({ where: { ...whereCondition, status: 'CANCELLED' } }),
    
    prisma.designReview.aggregate({
      where: { ...whereCondition, securityScore: { not: null } },
      _avg: { securityScore: true }
    }),
    
    prisma.designReview.count({ where: { ...whereCondition, securityGrade: 'A' } }),
    prisma.designReview.count({ where: { ...whereCondition, securityGrade: 'B' } }),
    prisma.designReview.count({ where: { ...whereCondition, securityGrade: 'C' } }),
    prisma.designReview.count({ where: { ...whereCondition, securityGrade: 'D' } }),
    prisma.designReview.count({ where: { ...whereCondition, securityGrade: 'F' } })
  ]);

  return {
    total,
    completed,
    inProgress,
    draft,
    cancelled,
    averageSecurityScore: averageSecurityScore._avg.securityScore || 0,
    bySecurityGrade: { gradeA, gradeB, gradeC, gradeD, gradeF },
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

// Helper function to get third-party review statistics
async function getThirdPartyReviewStats(whereCondition: any) {
  const [
    total,
    completed,
    inProgress,
    pending,
    failed,
    averageOverallScore,
    highRisk,
    mediumRisk,
    lowRisk,
    gradeA,
    gradeB,
    gradeC
  ] = await Promise.all([
    prisma.thirdPartyReview.count({ where: whereCondition }),
    prisma.thirdPartyReview.count({ where: { ...whereCondition, status: 'COMPLETED' } }),
    prisma.thirdPartyReview.count({ where: { ...whereCondition, status: 'IN_PROGRESS' } }),
    prisma.thirdPartyReview.count({ where: { ...whereCondition, status: 'PENDING' } }),
    prisma.thirdPartyReview.count({ where: { ...whereCondition, status: 'FAILED' } }),
    
    prisma.thirdPartyReview.aggregate({
      where: { ...whereCondition, overallScore: { not: null } },
      _avg: { overallScore: true }
    }),
    
    prisma.thirdPartyReview.count({ where: { ...whereCondition, riskLevel: 'HIGH' } }),
    prisma.thirdPartyReview.count({ where: { ...whereCondition, riskLevel: 'MEDIUM' } }),
    prisma.thirdPartyReview.count({ where: { ...whereCondition, riskLevel: 'LOW' } }),
    
    prisma.thirdPartyReview.count({ where: { ...whereCondition, securityGrade: 'A' } }),
    prisma.thirdPartyReview.count({ where: { ...whereCondition, securityGrade: 'B' } }),
    prisma.thirdPartyReview.count({ where: { ...whereCondition, securityGrade: 'C' } })
  ]);

  return {
    total,
    completed,
    inProgress,
    pending,
    failed,
    averageSecurityScore: averageOverallScore._avg?.overallScore || 0,
    byRiskLevel: { highRisk, mediumRisk, lowRisk },
    bySecurityGrade: { gradeA, gradeB, gradeC },
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

// Helper function to calculate overall security posture
function calculateSecurityPosture(
  threatModelStats: any,
  assetStats: any,
  designReviewStats: any,
  thirdPartyStats: any
) {
  // Calculate weighted scores for each module
  const threatModelScore = threatModelStats.total > 0 ? 
    (threatModelStats.completed / threatModelStats.total) * 100 : 0;
  
  const assetCoverageScore = assetStats.total > 0 ? 
    ((assetStats.withThreatModels + assetStats.withDesignReviews) / (assetStats.total * 2)) * 100 : 0;
  
  const designReviewScore = designReviewStats.averageSecurityScore || 0;
  
  const thirdPartyScore = thirdPartyStats.averageSecurityScore || 0;
  
  // Weighted average (threat modeling 30%, assets 25%, design reviews 25%, third-party 20%)
  const overallScore = Math.round(
    (threatModelScore * 0.3) + 
    (assetCoverageScore * 0.25) + 
    (designReviewScore * 0.25) + 
    (thirdPartyScore * 0.2)
  );
  
  const getSecurityGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };
  
  const criticalIssues = threatModelStats.criticalFindings;
  const openIssues = threatModelStats.openFindings;
  
  return {
    overallScore,
    securityGrade: getSecurityGrade(overallScore),
    moduleScores: {
      threatModeling: Math.round(threatModelScore),
      assetCoverage: Math.round(assetCoverageScore),
      designReview: Math.round(designReviewScore),
      thirdParty: Math.round(thirdPartyScore)
    },
    criticalIssues,
    openIssues,
    recommendations: generateRecommendations(
      threatModelStats,
      assetStats,
      designReviewStats,
      thirdPartyStats
    )
  };
}

// Helper function to generate actionable recommendations
function generateRecommendations(
  threatModelStats: any,
  assetStats: any,
  designReviewStats: any,
  thirdPartyStats: any
) {
  const recommendations = [];
  
  if (threatModelStats.criticalFindings > 0) {
    recommendations.push({
      type: 'critical',
      message: `${threatModelStats.criticalFindings} critical security findings require immediate attention`,
      action: 'Review Critical Findings',
      link: '/findings?severity=CRITICAL'
    });
  }
  
  if (assetStats.threatModelCoverage < 80) {
    recommendations.push({
      type: 'warning',
      message: `Only ${assetStats.threatModelCoverage}% of assets have threat models`,
      action: 'Create Threat Models',
      link: '/threat-models/new'
    });
  }
  
  if (assetStats.designReviewCoverage < 70) {
    recommendations.push({
      type: 'info',
      message: `${assetStats.designReviewCoverage}% design review coverage - consider improving`,
      action: 'Start Design Review',
      link: '/design-reviews'
    });
  }
  
  if (designReviewStats.averageSecurityScore < 70) {
    recommendations.push({
      type: 'warning',
      message: `Average design security score is ${Math.round(designReviewStats.averageSecurityScore)}%`,
      action: 'Review Security Design',
      link: '/design-reviews'
    });
  }
  
  return recommendations;
}
