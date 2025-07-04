
/**
 * Endpoint Discovery Status API
 * Returns the current status and progress of an endpoint discovery session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Get discovery session with basic endpoint stats
    const discoverySession = await prisma.endpointDiscoverySession.findFirst({
      where: {
        id: sessionId,
        createdBy: session.user.id, // Ensure user can only access their own sessions
      },
      include: {
        applicationAsset: {
          select: {
            id: true,
            name: true,
            applicationUrl: true,
          },
        },
        _count: {
          select: {
            discoveredEndpoints: true,
          },
        },
      },
    });

    if (!discoverySession) {
      return NextResponse.json(
        { error: 'Discovery session not found' },
        { status: 404 }
      );
    }

    // Get endpoint statistics if session is completed
    let endpointStats = null;
    if (discoverySession.status === 'COMPLETED') {
      const stats = await prisma.discoveredEndpoint.groupBy({
        by: ['riskLevel'],
        where: {
          sessionId: sessionId,
        },
        _count: {
          _all: true,
        },
      });

      const anomalyCount = await prisma.discoveredEndpoint.count({
        where: {
          sessionId: sessionId,
          isAnomaly: true,
        },
      });

      endpointStats = {
        total: discoverySession._count.discoveredEndpoints,
        byRiskLevel: stats.reduce((acc, stat) => {
          acc[stat.riskLevel?.toLowerCase() || 'unknown'] = stat._count._all;
          return acc;
        }, {} as Record<string, number>),
        anomalies: anomalyCount,
      };
    }

    // Calculate estimated time remaining for active scans
    let estimatedTimeRemaining = null;
    if (['SCANNING', 'ANALYZING', 'CLASSIFYING'].includes(discoverySession.status)) {
      const elapsed = discoverySession.scanStartedAt 
        ? Date.now() - discoverySession.scanStartedAt.getTime()
        : 0;
      
      if (discoverySession.progress > 0) {
        const totalEstimated = (elapsed / discoverySession.progress) * 100;
        estimatedTimeRemaining = Math.max(0, totalEstimated - elapsed);
      }
    }

    const response = {
      sessionId: discoverySession.id,
      status: discoverySession.status,
      progress: discoverySession.progress,
      domain: discoverySession.domain,
      
      // Timing information
      createdAt: discoverySession.createdAt,
      scanStartedAt: discoverySession.scanStartedAt,
      scanCompletedAt: discoverySession.scanCompletedAt,
      scanDuration: discoverySession.scanDuration,
      estimatedTimeRemaining,
      
      // Progress tracking
      totalEndpoints: discoverySession.totalEndpoints,
      processedEndpoints: discoverySession.processedEndpoints,
      
      // Results summary
      endpointsFound: discoverySession.endpointsFound,
      highRiskEndpoints: discoverySession.highRiskEndpoints,
      mediumRiskEndpoints: discoverySession.mediumRiskEndpoints,
      lowRiskEndpoints: discoverySession.lowRiskEndpoints,
      anomaliesDetected: discoverySession.anomaliesDetected,
      
      // Configuration
      config: {
        maxDepth: discoverySession.maxDepth,
        includeSubdomains: discoverySession.includeSubdomains,
        followRedirects: discoverySession.followRedirects,
      },
      
      // Asset information
      asset: discoverySession.applicationAsset,
      
      // AI analysis (if completed)
      aiSummary: discoverySession.aiSummary,
      insights: discoverySession.insights ? JSON.parse(discoverySession.insights) : null,
      
      // Error information
      errorMessage: discoverySession.errorMessage,
      retryCount: discoverySession.retryCount,
      
      // Detailed stats (if completed)
      endpointStats,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get discovery session status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Find the discovery session
    const discoverySession = await prisma.endpointDiscoverySession.findFirst({
      where: {
        id: sessionId,
        createdBy: session.user.id,
      },
    });

    if (!discoverySession) {
      return NextResponse.json(
        { error: 'Discovery session not found' },
        { status: 404 }
      );
    }

    // Check if session can be cancelled
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(discoverySession.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel completed or already cancelled session' },
        { status: 400 }
      );
    }

    // Stop ZAP scan if active
    if (discoverySession.zapSessionId) {
      const { zapIntegration } = await import('@/lib/security/zap-integration');
      await zapIntegration.stopScan(discoverySession.zapSessionId);
      await zapIntegration.cleanupSession(discoverySession.zapSessionId);
    }

    // Update session status
    await prisma.endpointDiscoverySession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        scanCompletedAt: new Date(),
        errorMessage: 'Scan cancelled by user',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Discovery session cancelled successfully',
    });

  } catch (error) {
    console.error('Failed to cancel discovery session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
