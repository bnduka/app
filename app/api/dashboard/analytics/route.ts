
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

    // Get user's SLA settings
    const slaSettings = await prisma.slaSettings.findUnique({
      where: { userId: session.user.id },
    }) || {
      criticalDays: 20,
      highDays: 60,
      mediumDays: 180,
      lowDays: 240,
    };

    // Fetch all findings for the user
    const findings = await prisma.finding.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        threatModel: true,
      },
    });

    // Calculate threat status distribution
    const threatStatus = {
      open: findings.filter(f => f.status === 'OPEN').length,
      inProgress: findings.filter(f => f.status === 'IN_PROGRESS').length,
      resolved: findings.filter(f => f.status === 'RESOLVED').length,
    };

    // Calculate severity breakdown
    const severityBreakdown = {
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      high: findings.filter(f => f.severity === 'HIGH').length,
      medium: findings.filter(f => f.severity === 'MEDIUM').length,
      low: findings.filter(f => f.severity === 'LOW').length,
    };

    // Calculate SLA compliance
    const now = new Date();
    const slaCompliance = {
      withinSLA: 0,
      overdueSLA: 0,
      criticalOverdue: 0,
    };

    findings.forEach(finding => {
      if (finding.status === 'RESOLVED') {
        slaCompliance.withinSLA++;
        return;
      }

      const createdDate = new Date(finding.createdAt);
      const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let slaLimit: number;
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
        default:
          slaLimit = slaSettings.lowDays;
      }

      if (daysSinceCreated <= slaLimit) {
        slaCompliance.withinSLA++;
      } else {
        if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
          slaCompliance.criticalOverdue++;
        } else {
          slaCompliance.overdueSLA++;
        }
      }
    });

    // Calculate monthly trends (last 6 months)
    const monthlyTrends = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      
      const monthFindings = findings.filter(f => {
        const findingDate = new Date(f.createdAt);
        return findingDate >= monthDate && findingDate < nextMonthDate;
      });

      const monthResolved = findings.filter(f => {
        if (f.status !== 'RESOLVED') return false;
        const resolvedDate = new Date(f.updatedAt);
        return resolvedDate >= monthDate && resolvedDate < nextMonthDate;
      });

      monthlyTrends.push({
        month: monthName,
        threatsIdentified: monthFindings.length,
        threatsResolved: monthResolved.length,
      });
    }

    const analyticsData = {
      threatStatus,
      severityBreakdown,
      slaCompliance,
      monthlyTrends,
    };

    return NextResponse.json(analyticsData);
  } catch (error: any) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
