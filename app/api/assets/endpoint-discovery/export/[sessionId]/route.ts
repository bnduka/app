
/**
 * Endpoint Discovery Export API
 * Exports discovery results in various formats (CSV, PDF, JSON)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = "force-dynamic";

// Query parameters validation schema
const exportSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).default('csv'),
  includeDetails: z.coerce.boolean().default(true),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  endpointType: z.enum([
    'LOGIN_PAGE', 'AUTHENTICATION', 'ADMIN_PANEL', 'API_ENDPOINT',
    'FORM_SUBMISSION', 'FILE_UPLOAD', 'DOWNLOAD', 'SEARCH',
    'USER_PROFILE', 'STATIC_CONTENT', 'DOCUMENTATION', 'ERROR_PAGE',
    'REDIRECT', 'HEALTH_CHECK', 'METRICS', 'WEBHOOK', 'CALLBACK', 'OTHER'
  ]).optional(),
  anomaliesOnly: z.coerce.boolean().default(false),
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
    const query = exportSchema.parse(Object.fromEntries(searchParams));

    // Verify session ownership and get session details
    const discoverySession = await prisma.endpointDiscoverySession.findFirst({
      where: {
        id: sessionId,
        createdBy: session.user.id,
      },
      include: {
        applicationAsset: {
          select: {
            name: true,
            applicationUrl: true,
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

    if (query.anomaliesOnly) {
      whereConditions.isAnomaly = true;
    }

    // Get filtered endpoints
    const endpoints = await prisma.discoveredEndpoint.findMany({
      where: whereConditions,
      orderBy: [
        { riskScore: 'desc' },
        { discoveredAt: 'asc' },
      ],
    });

    // Generate export based on format
    switch (query.format) {
      case 'csv':
        return generateCSVExport(endpoints, discoverySession, query.includeDetails);
      
      case 'json':
        return generateJSONExport(endpoints, discoverySession, query.includeDetails);
      
      case 'pdf':
        return generatePDFExport(endpoints, discoverySession, query.includeDetails);
      
      default:
        return NextResponse.json(
          { error: 'Unsupported export format' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Failed to export discovery results:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid export parameters', details: error.errors },
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
 * Generates CSV export
 */
function generateCSVExport(endpoints: any[], session: any, includeDetails: boolean) {
  const headers = [
    'URL',
    'Method',
    'Status Code',
    'Risk Level',
    'Risk Score',
    'Endpoint Type',
    'Sensitivity',
    'Function Purpose',
    'Response Time (ms)',
    'Response Size (bytes)',
    'Content Type',
    'Is Anomaly',
  ];

  if (includeDetails) {
    headers.push(
      'Security Concerns',
      'Data Exposure',
      'Anomaly Reason',
      'Parent URL',
      'Depth',
      'Server Header'
    );
  }

  const csvRows = [headers.join(',')];

  endpoints.forEach(endpoint => {
    const row = [
      `"${endpoint.url}"`,
      endpoint.method,
      endpoint.statusCode || '',
      endpoint.riskLevel || '',
      endpoint.riskScore || '',
      endpoint.endpointType || '',
      endpoint.sensitivity || '',
      `"${endpoint.functionPurpose || ''}"`,
      endpoint.responseTime || '',
      endpoint.responseSize || '',
      `"${endpoint.contentType || ''}"`,
      endpoint.isAnomaly ? 'Yes' : 'No',
    ];

    if (includeDetails) {
      row.push(
        `"${endpoint.securityConcerns?.join('; ') || ''}"`,
        `"${endpoint.dataExposure?.join('; ') || ''}"`,
        `"${endpoint.anomalyReason || ''}"`,
        `"${endpoint.parentUrl || ''}"`,
        endpoint.depth || '',
        `"${endpoint.serverHeader || ''}"`
      );
    }

    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');
  const filename = `endpoint-discovery-${session.domain}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Generates JSON export
 */
function generateJSONExport(endpoints: any[], session: any, includeDetails: boolean) {
  const exportData = {
    meta: {
      exportedAt: new Date().toISOString(),
      sessionId: session.id,
      domain: session.domain,
      assetName: session.applicationAsset?.name,
      totalEndpoints: endpoints.length,
      scanDate: session.scanCompletedAt,
      scanDuration: session.scanDuration,
    },
    summary: {
      endpointsFound: session.endpointsFound,
      highRiskEndpoints: session.highRiskEndpoints,
      mediumRiskEndpoints: session.mediumRiskEndpoints,
      lowRiskEndpoints: session.lowRiskEndpoints,
      anomaliesDetected: session.anomaliesDetected,
      aiSummary: session.aiSummary,
    },
    endpoints: endpoints.map(endpoint => {
      const data: any = {
        id: endpoint.id,
        url: endpoint.url,
        method: endpoint.method,
        path: endpoint.path,
        statusCode: endpoint.statusCode,
        riskLevel: endpoint.riskLevel,
        riskScore: endpoint.riskScore,
        endpointType: endpoint.endpointType,
        sensitivity: endpoint.sensitivity,
        functionPurpose: endpoint.functionPurpose,
        isAnomaly: endpoint.isAnomaly,
        discoveredAt: endpoint.discoveredAt,
      };

      if (includeDetails) {
        data.responseTime = endpoint.responseTime;
        data.responseSize = endpoint.responseSize;
        data.contentType = endpoint.contentType;
        data.serverHeader = endpoint.serverHeader;
        data.securityConcerns = endpoint.securityConcerns;
        data.dataExposure = endpoint.dataExposure;
        data.anomalyReason = endpoint.anomalyReason;
        data.anomalyScore = endpoint.anomalyScore;
        data.parentUrl = endpoint.parentUrl;
        data.depth = endpoint.depth;
        data.securityHeaders = endpoint.securityHeaders ? JSON.parse(endpoint.securityHeaders) : null;
        data.classification = endpoint.classification ? JSON.parse(endpoint.classification) : null;
      }

      return data;
    }),
  };

  const filename = `endpoint-discovery-${session.domain}-${new Date().toISOString().split('T')[0]}.json`;

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Generates PDF export (simplified - would need proper PDF library in production)
 */
function generatePDFExport(endpoints: any[], session: any, includeDetails: boolean) {
  // For now, return a simple text-based report
  // In production, you would use libraries like jsPDF or Puppeteer
  
  const report = `
ENDPOINT DISCOVERY REPORT
=========================

Domain: ${session.domain}
Asset: ${session.applicationAsset?.name || 'Unknown'}
Scan Date: ${session.scanCompletedAt ? new Date(session.scanCompletedAt).toLocaleDateString() : 'Unknown'}
Total Endpoints: ${endpoints.length}

SUMMARY
-------
High Risk Endpoints: ${session.highRiskEndpoints || 0}
Medium Risk Endpoints: ${session.mediumRiskEndpoints || 0}
Low Risk Endpoints: ${session.lowRiskEndpoints || 0}
Anomalies Detected: ${session.anomaliesDetected || 0}

AI SUMMARY
----------
${session.aiSummary || 'No AI summary available'}

ENDPOINT DETAILS
----------------
${endpoints.map((endpoint, index) => `
${index + 1}. ${endpoint.url}
   Method: ${endpoint.method}
   Risk Level: ${endpoint.riskLevel} (Score: ${endpoint.riskScore})
   Type: ${endpoint.endpointType}
   Purpose: ${endpoint.functionPurpose}
   ${endpoint.isAnomaly ? '⚠️ ANOMALY DETECTED' : ''}
   ${endpoint.securityConcerns?.length > 0 ? `Security Concerns: ${endpoint.securityConcerns.join(', ')}` : ''}
`).join('\n')}

Generated on ${new Date().toLocaleString()}
`;

  const filename = `endpoint-discovery-${session.domain}-${new Date().toISOString().split('T')[0]}.txt`;

  return new NextResponse(report, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
