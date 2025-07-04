
/**
 * Endpoint Discovery Results API
 * Returns detailed results of discovered endpoints with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = "force-dynamic";

// Query parameters validation schema
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  endpointType: z.enum([
    'LOGIN_PAGE', 'AUTHENTICATION', 'ADMIN_PANEL', 'API_ENDPOINT',
    'FORM_SUBMISSION', 'FILE_UPLOAD', 'DOWNLOAD', 'SEARCH',
    'USER_PROFILE', 'STATIC_CONTENT', 'DOCUMENTATION', 'ERROR_PAGE',
    'REDIRECT', 'HEALTH_CHECK', 'METRICS', 'WEBHOOK', 'CALLBACK', 'OTHER'
  ]).optional(),
  sensitivity: z.enum(['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL', 'HIGHLY_SENSITIVE']).optional(),
  anomaliesOnly: z.coerce.boolean().default(false),
  search: z.string().optional(),
  sortBy: z.enum(['url', 'riskScore', 'discoveredAt', 'statusCode', 'responseTime']).default('riskScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

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
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // Verify session ownership
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

    if (discoverySession.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Discovery session not completed yet' },
        { status: 400 }
      );
    }

    // Build filter conditions
    const whereConditions: any = {
      sessionId: sessionId,
    };

    if (query.riskLevel) {
      whereConditions.riskLevel = query.riskLevel;
    }

    if (query.endpointType) {
      whereConditions.endpointType = query.endpointType;
    }

    if (query.sensitivity) {
      whereConditions.sensitivity = query.sensitivity;
    }

    if (query.anomaliesOnly) {
      whereConditions.isAnomaly = true;
    }

    if (query.search) {
      whereConditions.OR = [
        { url: { contains: query.search, mode: 'insensitive' } },
        { path: { contains: query.search, mode: 'insensitive' } },
        { functionPurpose: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Build sorting
    const orderBy: any = {};
    if (query.sortBy === 'url') {
      orderBy.url = query.sortOrder;
    } else if (query.sortBy === 'riskScore') {
      orderBy.riskScore = query.sortOrder;
    } else if (query.sortBy === 'discoveredAt') {
      orderBy.discoveredAt = query.sortOrder;
    } else if (query.sortBy === 'statusCode') {
      orderBy.statusCode = query.sortOrder;
    } else if (query.sortBy === 'responseTime') {
      orderBy.responseTime = query.sortOrder;
    }

    // Get total count for pagination
    const totalCount = await prisma.discoveredEndpoint.count({
      where: whereConditions,
    });

    // Calculate pagination
    const offset = (query.page - 1) * query.limit;
    const totalPages = Math.ceil(totalCount / query.limit);

    // Get paginated results
    const endpoints = await prisma.discoveredEndpoint.findMany({
      where: whereConditions,
      orderBy,
      skip: offset,
      take: query.limit,
      select: {
        id: true,
        url: true,
        method: true,
        path: true,
        queryParams: true,
        statusCode: true,
        responseSize: true,
        responseTime: true,
        contentType: true,
        serverHeader: true,
        endpointType: true,
        sensitivity: true,
        riskScore: true,
        riskLevel: true,
        functionPurpose: true,
        securityConcerns: true,
        dataExposure: true,
        isAnomaly: true,
        anomalyReason: true,
        anomalyScore: true,
        discoveredAt: true,
        discoveryMethod: true,
        parentUrl: true,
        depth: true,
        securityHeaders: true,
        cookieAnalysis: true,
        forms: true,
        classification: true,
      },
    });

    // Parse JSON fields for response
    const processedEndpoints = endpoints.map(endpoint => ({
      ...endpoint,
      securityHeaders: endpoint.securityHeaders ? JSON.parse(endpoint.securityHeaders) : null,
      cookieAnalysis: endpoint.cookieAnalysis ? JSON.parse(endpoint.cookieAnalysis) : null,
      forms: endpoint.forms ? JSON.parse(endpoint.forms) : null,
      classification: endpoint.classification ? JSON.parse(endpoint.classification) : null,
    }));

    // Get summary statistics for current filter
    const stats = await getFilteredStats(sessionId, whereConditions);

    const response = {
      endpoints: processedEndpoints,
      pagination: {
        currentPage: query.page,
        totalPages,
        totalCount,
        limit: query.limit,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
      filters: {
        riskLevel: query.riskLevel,
        endpointType: query.endpointType,
        sensitivity: query.sensitivity,
        anomaliesOnly: query.anomaliesOnly,
        search: query.search,
      },
      sorting: {
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      stats,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get discovery results:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get summary statistics for filtered results
 */
async function getFilteredStats(sessionId: string, whereConditions: any) {
  const [
    riskLevelStats,
    endpointTypeStats,
    sensitivityStats,
    anomaliesCount,
    averageRiskScore,
  ] = await Promise.all([
    // Risk level distribution
    prisma.discoveredEndpoint.groupBy({
      by: ['riskLevel'],
      where: whereConditions,
      _count: { _all: true },
    }),
    
    // Endpoint type distribution
    prisma.discoveredEndpoint.groupBy({
      by: ['endpointType'],
      where: whereConditions,
      _count: { _all: true },
    }),
    
    // Sensitivity distribution
    prisma.discoveredEndpoint.groupBy({
      by: ['sensitivity'],
      where: whereConditions,
      _count: { _all: true },
    }),
    
    // Anomalies count
    prisma.discoveredEndpoint.count({
      where: { ...whereConditions, isAnomaly: true },
    }),
    
    // Average risk score
    prisma.discoveredEndpoint.aggregate({
      where: whereConditions,
      _avg: { riskScore: true },
    }),
  ]);

  return {
    riskLevels: riskLevelStats.reduce((acc, stat) => {
      acc[stat.riskLevel?.toLowerCase() || 'unknown'] = stat._count._all;
      return acc;
    }, {} as Record<string, number>),
    
    endpointTypes: endpointTypeStats.reduce((acc, stat) => {
      acc[stat.endpointType?.toLowerCase() || 'unknown'] = stat._count._all;
      return acc;
    }, {} as Record<string, number>),
    
    sensitivities: sensitivityStats.reduce((acc, stat) => {
      acc[stat.sensitivity?.toLowerCase() || 'unknown'] = stat._count._all;
      return acc;
    }, {} as Record<string, number>),
    
    anomalies: anomaliesCount,
    averageRiskScore: averageRiskScore._avg.riskScore || 0,
  };
}
