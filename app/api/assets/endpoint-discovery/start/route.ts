
/**
 * Endpoint Discovery Start API
 * Initiates automated endpoint discovery for a given domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { zapIntegration } from '@/lib/security/zap-integration';
import { ActivityLogger } from '@/lib/activity-logger';
import { z } from 'zod';

export const dynamic = "force-dynamic";

// Request validation schema
const startDiscoverySchema = z.object({
  applicationAssetId: z.string().cuid(),
  domain: z.string().min(1).max(253),
  maxDepth: z.number().min(1).max(10).default(3),
  includeSubdomains: z.boolean().default(false),
  followRedirects: z.boolean().default(true),
  customHeaders: z.record(z.string()).optional(),
  authConfig: z.object({
    type: z.enum(['basic', 'bearer', 'cookie']),
    credentials: z.record(z.string()),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = startDiscoverySchema.parse(body);

    // Verify asset ownership
    const asset = await prisma.applicationAsset.findFirst({
      where: {
        id: validatedData.applicationAssetId,
        userId: session.user.id,
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    // Validate domain
    const domainValidation = await zapIntegration.validateDomain(validatedData.domain);
    if (!domainValidation.valid) {
      return NextResponse.json(
        { error: `Domain validation failed: ${domainValidation.reason}` },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimitCheck = await zapIntegration.checkRateLimit(session.user.id, validatedData.domain);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before starting another scan.',
          remaining: rateLimitCheck.remaining 
        },
        { status: 429 }
      );
    }

    // Check for existing active session
    const existingSession = await prisma.endpointDiscoverySession.findFirst({
      where: {
        applicationAssetId: validatedData.applicationAssetId,
        domain: validatedData.domain,
        status: {
          in: ['PENDING', 'INITIALIZING', 'SCANNING', 'ANALYZING', 'CLASSIFYING'],
        },
      },
    });

    if (existingSession) {
      return NextResponse.json(
        { 
          error: 'An active discovery session already exists for this domain',
          sessionId: existingSession.id 
        },
        { status: 409 }
      );
    }

    // Create discovery session
    const discoverySession = await prisma.endpointDiscoverySession.create({
      data: {
        applicationAssetId: validatedData.applicationAssetId,
        domain: validatedData.domain,
        status: 'PENDING',
        maxDepth: validatedData.maxDepth,
        includeSubdomains: validatedData.includeSubdomains,
        followRedirects: validatedData.followRedirects,
        customHeaders: validatedData.customHeaders ? JSON.stringify(validatedData.customHeaders) : null,
        authConfig: validatedData.authConfig ? JSON.stringify(validatedData.authConfig) : null,
        createdBy: session.user.id,
      },
    });

    // Start ZAP scan asynchronously
    startZapScanAsync(discoverySession.id, validatedData).catch(error => {
      console.error('ZAP scan failed:', error);
      // Update session status to failed
      prisma.endpointDiscoverySession.update({
        where: { id: discoverySession.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      }).catch(console.error);
    });

    // Log activity
    await ActivityLogger.log({
      userId: session.user.id,
      action: 'CREATE_ENDPOINT_DISCOVERY_SESSION' as any,
      status: 'SUCCESS',
      description: `Started endpoint discovery for domain ${validatedData.domain}`,
      entityType: 'endpoint_discovery_session',
      entityId: discoverySession.id,
    });

    return NextResponse.json({
      success: true,
      sessionId: discoverySession.id,
      message: 'Endpoint discovery started successfully',
    });

  } catch (error) {
    console.error('Endpoint discovery start failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
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
 * Starts ZAP scan asynchronously and processes results
 */
async function startZapScanAsync(sessionId: string, config: z.infer<typeof startDiscoverySchema>) {
  try {
    // Update status to initializing
    await prisma.endpointDiscoverySession.update({
      where: { id: sessionId },
      data: {
        status: 'INITIALIZING',
        scanStartedAt: new Date(),
      },
    });

    // Start ZAP scan
    const zapConfig = {
      apiUrl: process.env.ZAP_API_URL || 'http://localhost:8080',
      maxDepth: config.maxDepth,
      includeSubdomains: config.includeSubdomains,
      followRedirects: config.followRedirects,
      customHeaders: config.customHeaders,
      authConfig: config.authConfig,
    };

    const scanResult = await zapIntegration.startScan(config.domain, zapConfig);
    
    if (!scanResult.success) {
      throw new Error(scanResult.error || 'Failed to start ZAP scan');
    }

    // Update session with ZAP session ID
    await prisma.endpointDiscoverySession.update({
      where: { id: sessionId },
      data: {
        status: 'SCANNING',
        zapSessionId: scanResult.sessionId,
      },
    });

    // Monitor scan progress
    await monitorScanProgress(sessionId, scanResult.sessionId);

  } catch (error) {
    console.error('ZAP scan async execution failed:', error);
    
    await prisma.endpointDiscoverySession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        scanCompletedAt: new Date(),
      },
    });
  }
}

/**
 * Monitors scan progress and processes results
 */
async function monitorScanProgress(sessionId: string, zapSessionId: string) {
  const maxWaitTime = 30 * 60 * 1000; // 30 minutes max
  const checkInterval = 10 * 1000; // Check every 10 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const scanStatus = await zapIntegration.getScanStatus(zapSessionId);
      
      // Update progress
      await prisma.endpointDiscoverySession.update({
        where: { id: sessionId },
        data: {
          progress: scanStatus.progress,
          totalEndpoints: scanStatus.urls.length,
        },
      });

      if (scanStatus.status === 'completed') {
        // Process discovered endpoints
        await processDiscoveredEndpoints(sessionId, scanStatus.urls);
        break;
      } else if (scanStatus.status === 'failed') {
        throw new Error('ZAP scan failed');
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));

    } catch (error) {
      console.error('Scan monitoring error:', error);
      throw error;
    }
  }

  // Cleanup ZAP session
  await zapIntegration.cleanupSession(zapSessionId);
}

/**
 * Processes discovered endpoints and applies AI classification
 */
async function processDiscoveredEndpoints(sessionId: string, discoveredUrls: any[]) {
  try {
    // Import classifier here to avoid circular dependencies
    const { endpointClassifier } = await import('@/lib/security/endpoint-classifier');

    // Update status to analyzing
    await prisma.endpointDiscoverySession.update({
      where: { id: sessionId },
      data: { status: 'ANALYZING' },
    });

    // Prepare endpoints for classification
    const classificationRequests = discoveredUrls.map(url => ({
      url: url.url,
      method: url.method,
      path: new URL(url.url).pathname,
      queryParams: url.queryParams || [],
      statusCode: url.statusCode,
      contentType: url.contentType,
      responseSize: url.responseSize,
      securityHeaders: url.securityHeaders,
      forms: url.forms,
      domain: new URL(url.url).hostname,
    }));

    // Update status to classifying
    await prisma.endpointDiscoverySession.update({
      where: { id: sessionId },
      data: { status: 'CLASSIFYING' },
    });

    // Classify endpoints using AI
    const classifications = await endpointClassifier.classifyEndpoints(classificationRequests);

    // Save discovered endpoints to database
    const endpointsData = discoveredUrls.map((url, index) => {
      const classification = classifications[index];
      return {
        sessionId,
        url: url.url,
        method: url.method,
        path: new URL(url.url).pathname,
        queryParams: url.queryParams || [],
        statusCode: url.statusCode,
        responseSize: url.responseSize,
        responseTime: url.responseTime,
        contentType: url.contentType,
        serverHeader: url.serverHeader,
        securityHeaders: url.securityHeaders ? JSON.stringify(url.securityHeaders) : null,
        cookieAnalysis: url.cookies ? JSON.stringify(url.cookies) : null,
        endpointType: classification.endpointType,
        sensitivity: classification.sensitivity,
        riskScore: classification.riskScore,
        riskLevel: classification.riskLevel,
        classification: JSON.stringify(classification.classification),
        functionPurpose: classification.functionPurpose,
        securityConcerns: classification.securityConcerns,
        dataExposure: classification.dataExposure,
        isAnomaly: classification.isAnomaly,
        anomalyReason: classification.anomalyReason,
        anomalyScore: classification.anomalyScore,
        discoveryMethod: 'zap_spider',
        parentUrl: url.parentUrl,
        depth: url.depth,
        forms: url.forms ? JSON.stringify(url.forms) : null,
        jsFiles: url.jsFiles || [],
        assets: url.assets || [],
      };
    });

    // Batch insert endpoints
    await prisma.discoveredEndpoint.createMany({
      data: endpointsData,
    });

    // Generate AI summary
    const session = await prisma.endpointDiscoverySession.findUnique({
      where: { id: sessionId },
    });

    const aiSummary = await endpointClassifier.generateSummary(
      classifications, 
      session?.domain || 'unknown'
    );

    // Calculate summary statistics
    const stats = {
      endpointsFound: endpointsData.length,
      highRiskEndpoints: endpointsData.filter(e => e.riskLevel === 'HIGH' || e.riskLevel === 'CRITICAL').length,
      mediumRiskEndpoints: endpointsData.filter(e => e.riskLevel === 'MEDIUM').length,
      lowRiskEndpoints: endpointsData.filter(e => e.riskLevel === 'LOW').length,
      anomaliesDetected: endpointsData.filter(e => e.isAnomaly).length,
    };

    // Update session with final results
    await prisma.endpointDiscoverySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        scanCompletedAt: new Date(),
        scanDuration: session?.scanStartedAt 
          ? Math.floor((Date.now() - session.scanStartedAt.getTime()) / 1000)
          : null,
        endpointsFound: stats.endpointsFound,
        highRiskEndpoints: stats.highRiskEndpoints,
        mediumRiskEndpoints: stats.mediumRiskEndpoints,
        lowRiskEndpoints: stats.lowRiskEndpoints,
        anomaliesDetected: stats.anomaliesDetected,
        aiSummary,
        insights: JSON.stringify({
          totalEndpoints: stats.endpointsFound,
          riskDistribution: {
            high: stats.highRiskEndpoints,
            medium: stats.mediumRiskEndpoints,
            low: stats.lowRiskEndpoints,
          },
          anomalies: stats.anomaliesDetected,
          endpointTypes: getEndpointTypeDistribution(endpointsData),
        }),
      },
    });

  } catch (error) {
    console.error('Endpoint processing failed:', error);
    
    await prisma.endpointDiscoverySession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Endpoint processing failed',
        scanCompletedAt: new Date(),
      },
    });
  }
}

/**
 * Calculates endpoint type distribution
 */
function getEndpointTypeDistribution(endpoints: any[]) {
  const distribution: Record<string, number> = {};
  
  endpoints.forEach(endpoint => {
    const type = endpoint.endpointType;
    distribution[type] = (distribution[type] || 0) + 1;
  });

  return distribution;
}
