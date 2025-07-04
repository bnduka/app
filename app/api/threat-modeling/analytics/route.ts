
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Build user filter based on role
    const userFilter = session.user.role === 'ADMIN' 
      ? {} 
      : { userId: session.user.id };

    // Organization filter for business admin
    const orgFilter = session.user.role === 'BUSINESS_ADMIN' && session.user.organizationId
      ? { user: { organizationId: session.user.organizationId } }
      : {};

    const whereClause = {
      ...userFilter,
      ...orgFilter,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Get SLA settings for the user or default values
    const slaSettings = await prisma.slaSettings.findFirst({
      where: { userId: session.user.id }
    }) || {
      criticalDays: 20,
      highDays: 60,
      mediumDays: 180,
      lowDays: 240
    };

    // Get findings data
    const findings = await prisma.finding.findMany({
      where: whereClause,
      include: {
        threatModel: true,
        user: {
          select: {
            name: true,
            email: true,
            organizationId: true
          }
        }
      }
    });

    // Get threat models data
    const threatModels = await prisma.threatModel.findMany({
      where: {
        ...userFilter,
        ...orgFilter,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        findings: true,
        user: {
          select: {
            name: true,
            email: true,
            organizationId: true
          }
        }
      }
    });

    // Calculate findings by status
    const findingsByStatus = {
      open: findings.filter(f => f.status === 'OPEN').length,
      inProgress: findings.filter(f => f.status === 'IN_PROGRESS').length,
      resolved: findings.filter(f => f.status === 'RESOLVED').length
    };

    // Calculate findings by severity
    const findingsBySeverity = {
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      high: findings.filter(f => f.severity === 'HIGH').length,
      medium: findings.filter(f => f.severity === 'MEDIUM').length,
      low: findings.filter(f => f.severity === 'LOW').length
    };

    // Calculate findings by STRIDE category
    const findingsByStride = {
      spoofing: findings.filter(f => f.strideCategory === 'SPOOFING').length,
      tampering: findings.filter(f => f.strideCategory === 'TAMPERING').length,
      repudiation: findings.filter(f => f.strideCategory === 'REPUDIATION').length,
      informationDisclosure: findings.filter(f => f.strideCategory === 'INFORMATION_DISCLOSURE').length,
      denialOfService: findings.filter(f => f.strideCategory === 'DENIAL_OF_SERVICE').length,
      elevationOfPrivilege: findings.filter(f => f.strideCategory === 'ELEVATION_OF_PRIVILEGE').length
    };

    // Calculate SLA compliance
    const calculateSlaCompliance = () => {
      const now = new Date();
      let withinSla = 0;
      let exceedingSla = 0;

      findings.forEach(finding => {
        const daysSinceCreated = Math.floor((now.getTime() - finding.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        let slaLimit = 0;

        switch (finding.severity) {
          case 'CRITICAL':
            slaLimit = slaSettings.criticalDays;
            break;
          case 'HIGH':
            slaLimit = slaSettings.highDays;
            break;
          case 'MEDIUM':
            slaLimit = slaSettings.mediumDays;
            break;
          case 'LOW':
            slaLimit = slaSettings.lowDays;
            break;
        }

        if (finding.status === 'RESOLVED' || daysSinceCreated <= slaLimit) {
          withinSla++;
        } else {
          exceedingSla++;
        }
      });

      return { withinSla, exceedingSla };
    };

    const slaCompliance = calculateSlaCompliance();

    // Calculate threat model status distribution
    const threatModelsByStatus = {
      draft: threatModels.filter(tm => tm.status === 'DRAFT').length,
      analyzing: threatModels.filter(tm => tm.status === 'ANALYZING').length,
      completed: threatModels.filter(tm => tm.status === 'COMPLETED').length,
      archived: threatModels.filter(tm => tm.status === 'ARCHIVED').length
    };

    // Generate trend data for the last 30 days
    const generateTrendData = () => {
      const trendData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const findingsCreated = findings.filter(f => 
          f.createdAt >= dayStart && f.createdAt <= dayEnd
        ).length;

        const findingsResolved = findings.filter(f => 
          f.status === 'RESOLVED' && f.updatedAt >= dayStart && f.updatedAt <= dayEnd
        ).length;

        const threatModelsCreated = threatModels.filter(tm => 
          tm.createdAt >= dayStart && tm.createdAt <= dayEnd
        ).length;

        trendData.push({
          date: format(date, 'MMM dd'),
          findingsCreated,
          findingsResolved,
          threatModelsCreated
        });
      }
      return trendData;
    };

    const trendData = generateTrendData();

    // Calculate average resolution time
    const resolvedFindings = findings.filter(f => f.status === 'RESOLVED');
    const avgResolutionTime = resolvedFindings.length > 0
      ? resolvedFindings.reduce((acc, f) => {
          const resolutionTime = (f.updatedAt.getTime() - f.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return acc + resolutionTime;
        }, 0) / resolvedFindings.length
      : 0;

    // Calculate key metrics
    const keyMetrics = {
      totalFindings: findings.length,
      totalThreatModels: threatModels.length,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      slaComplianceRate: Math.round(
        (slaCompliance.withinSla / (slaCompliance.withinSla + slaCompliance.exceedingSla || 1)) * 100
      ),
      activeThreats: findings.filter(f => f.status !== 'RESOLVED').length,
      criticalFindings: findingsBySeverity.critical,
      completedThreatModels: threatModelsByStatus.completed
    };

    return NextResponse.json({
      keyMetrics,
      findingsByStatus,
      findingsBySeverity,
      findingsByStride,
      slaCompliance,
      threatModelsByStatus,
      trendData,
      period: {
        days,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      }
    });

  } catch (error) {
    console.error('Error fetching threat modeling analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
