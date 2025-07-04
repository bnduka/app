
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { aiService } from '@/lib/ai-service';
import { ActivityLogger, getRequestInfo } from '@/lib/activity-logger';
import { buildUserScope } from '@/lib/rbac';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { ipAddress, userAgent } = getRequestInfo(request);
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Build organization-scoped where clause
    const where = buildUserScope(
      session.user.id,
      session.user.role as UserRole,
      session.user.organizationId
    );

    const threatModels = await prisma.threatModel.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
        lastName: true,
            email: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        findings: true,
        reports: true,
        fileUploads: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Log successful fetch
    await ActivityLogger.logUserActivity(
      session.user.id,
      'VIEW_THREAT_MODELS',
      `Fetched ${threatModels.length} threat models (${session.user.role})`,
      'SUCCESS',
      {
        ipAddress,
        userAgent,
        details: JSON.stringify({
          threatModelCount: threatModels.length,
          limit: limit || 'unlimited',
          userRole: session.user.role,
          organizationId: session.user.organizationId,
          scopeType: session.user.role === 'ADMIN' ? 'global' : 
                     session.user.role === 'BUSINESS_ADMIN' ? 'organization' : 'personal'
        })
      }
    );

    return NextResponse.json({ threatModels });
  } catch (error) {
    console.error('Error fetching threat models:', error);
    
    const session = await getServerSession(authOptions);
    await ActivityLogger.logError(
      'VIEW_DASHBOARD',
      'Failed to fetch threat models',
      error instanceof Error ? error.message : 'Unknown error',
      session?.user?.id,
      { ipAddress, userAgent }
    );
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { ipAddress, userAgent } = getRequestInfo(request);
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, prompt, fileIds } = await request.json();

    if (!name || !prompt) {
      await ActivityLogger.logError(
        'CREATE_THREAT_MODEL',
        'Threat model creation failed - missing required fields',
        'Name and prompt are required',
        session.user.id,
        { ipAddress, userAgent }
      );
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      );
    }

    // Create threat model
    const threatModel = await prisma.threatModel.create({
      data: {
        name,
        description,
        prompt,
        userId: session.user.id,
        status: 'ANALYZING',
      },
      include: {
        user: true,
        findings: true,
        reports: true,
        fileUploads: true,
      },
    });

    // Log successful creation
    await ActivityLogger.logUserActivity(
      session.user.id,
      'CREATE_THREAT_MODEL',
      `Created threat model: ${name}`,
      'SUCCESS',
      {
        ipAddress,
        userAgent,
        entityType: 'threat_model',
        entityId: threatModel.id,
        details: JSON.stringify({
          name,
          description,
          hasFiles: fileIds && fileIds.length > 0,
          fileCount: fileIds?.length || 0,
          promptLength: prompt.length
        })
      }
    );

    // Process AI analysis in background
    processAIAnalysis(threatModel.id, prompt, fileIds || []);

    return NextResponse.json({ threatModel }, { status: 201 });
  } catch (error) {
    console.error('Error creating threat model:', error);
    
    const session = await getServerSession(authOptions);
    await ActivityLogger.logError(
      'CREATE_THREAT_MODEL',
      'Failed to create threat model due to server error',
      error instanceof Error ? error.message : 'Unknown error',
      session?.user?.id,
      { ipAddress, userAgent }
    );
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processAIAnalysis(threatModelId: string, prompt: string, fileIds: string[]) {
  try {
    // Get file content if any files are referenced
    let fileContent = '';
    if (fileIds.length > 0) {
      const files = await prisma.fileUpload.findMany({
        where: { id: { in: fileIds } },
      });
      
      // Process different file types appropriately
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.extractedText) {
            // For text-based files or already extracted content
            if (file.extractedText.startsWith('data:')) {
              // This is a base64 data URI for PDF/images - analyze with AI first
              try {
                const documentAnalysis = await aiService.analyzeDocument(file.extractedText, file.mimeType || '');
                return `File: ${file.originalName}\nContent Analysis: ${documentAnalysis}`;
              } catch (error) {
                console.error('Document analysis failed:', error);
                return `File: ${file.originalName}\nNote: Document could not be analyzed`;
              }
            } else {
              // Regular text content
              return `File: ${file.originalName}\nContent: ${file.extractedText}`;
            }
          }
          return `File: ${file.originalName}\nNote: No content extracted`;
        })
      );
      
      fileContent = processedFiles.join('\n\n');
    }

    // Analyze with AI
    const analysis = await aiService.analyzeThreat(prompt, fileContent);

    // Create findings from analysis
    const findings = [];
    for (const strideCategory of analysis.strideAnalysis) {
      for (const threat of strideCategory.threats) {
        findings.push({
          threatScenario: threat.title,
          description: threat.description,
          severity: threat.severity,
          strideCategory: strideCategory.category,
          recommendation: threat.recommendation,
          status: 'OPEN' as const,
          userId: (await prisma.threatModel.findUnique({ 
            where: { id: threatModelId },
            select: { userId: true }
          }))!.userId,
          threatModelId,
        });
      }
    }

    if (findings.length > 0) {
      await prisma.finding.createMany({
        data: findings,
      });
    }

    // Update threat model status
    await prisma.threatModel.update({
      where: { id: threatModelId },
      data: { status: 'COMPLETED' },
    });

    // Update admin stats
    await updateAdminStats();
  } catch (error) {
    console.error('AI analysis error:', error);
    // Update threat model status to indicate error
    await prisma.threatModel.update({
      where: { id: threatModelId },
      data: { status: 'DRAFT' },
    });
  }
}

async function updateAdminStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await prisma.adminStats.findFirst({
    where: { date: today },
  });

  const [totalUsers, totalThreatModels, totalFindings, totalReports] = await Promise.all([
    prisma.user.count(),
    prisma.threatModel.count(),
    prisma.finding.count(),
    prisma.report.count(),
  ]);

  if (stats) {
    await prisma.adminStats.update({
      where: { id: stats.id },
      data: {
        totalUsers,
        totalThreatModels,
        totalFindings,
        totalReports,
        apiCalls: stats.apiCalls + 1,
      },
    });
  } else {
    await prisma.adminStats.create({
      data: {
        date: today,
        totalUsers,
        totalThreatModels,
        totalFindings,
        totalReports,
        apiCalls: 1,
      },
    });
  }
}
