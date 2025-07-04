
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { ThreatModelCreationRequest, StrideAnalysis, ThreatAnalysis } from '@/lib/types';
import { FindingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/threat-models/enhanced - Create enhanced threat model with AI analysis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ThreatModelCreationRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.analysisType) {
      return NextResponse.json(
        { error: 'Name and analysis type are required' },
        { status: 400 }
      );
    }

    if (body.analysisType === 'PROMPT' && !body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required for prompt-based analysis' },
        { status: 400 }
      );
    }

    if (body.analysisType === 'DOCUMENT' && !body.documentContent) {
      return NextResponse.json(
        { error: 'Document content is required for document-based analysis' },
        { status: 400 }
      );
    }

    // Create the threat model first
    const threatModel = await prisma.threatModel.create({
      data: {
        name: body.name,
        description: body.description,
        prompt: body.prompt || body.documentContent || '',
        status: 'ANALYZING',
        progress: 10,
        userId: session.user.id,
      },
    });

    // Link to assets if provided
    if (body.linkedAssetIds && body.linkedAssetIds.length > 0) {
      // Verify asset ownership
      const assets = await prisma.applicationAsset.findMany({
        where: {
          id: { in: body.linkedAssetIds },
          userId: session.user.id,
        },
      });

      if (assets.length > 0) {
        await Promise.all(
          assets.map(asset => 
            prisma.threatModelAssetLink.create({
              data: {
                threatModelId: threatModel.id,
                applicationAssetId: asset.id,
                createdBy: session.user.id,
              },
            })
          )
        );

        // Update asset threat model status
        await prisma.applicationAsset.updateMany({
          where: { id: { in: assets.map(a => a.id) } },
          data: { threatModelStatus: 'COMPLETED' },
        });
      }
    }

    try {
      // Prepare AI analysis prompt based on type
      let analysisPrompt = '';
      
      if (body.analysisType === 'PROMPT' || body.analysisType === 'HYBRID') {
        analysisPrompt = `
          You are a senior cybersecurity expert specializing in threat modeling using the STRIDE methodology.

          System Description: ${body.prompt || body.systemContext || ''}
          ${body.documentContent ? `Additional Documentation: ${body.documentContent}` : ''}
          ${body.securityRequirements ? `Security Requirements: ${body.securityRequirements.join(', ')}` : ''}

          Please perform a comprehensive STRIDE threat analysis and provide:

          1. STRIDE Analysis covering all six categories:
             - Spoofing: Authentication-related threats
             - Tampering: Data integrity threats  
             - Repudiation: Non-repudiation threats
             - Information Disclosure: Confidentiality threats
             - Denial of Service: Availability threats
             - Elevation of Privilege: Authorization threats

          For each STRIDE category, provide 2-4 specific threat scenarios with:
          - Title: Clear, specific threat name
          - Description: Detailed explanation of the threat scenario
          - Severity: LOW, MEDIUM, HIGH, or CRITICAL
          - Recommendation: Specific mitigation strategies

          2. Current Mitigations Assessment:
             Analyze what security controls might already be in place and identify gaps.

          3. Security Recommendations:
             Provide 5-10 prioritized security recommendations to address identified threats.

          4. Technical Assumptions:
             List key technical assumptions made during the analysis.

          Please provide realistic, actionable threat scenarios based on the system description. Focus on practical threats that could realistically occur in the described environment.

          Respond with valid JSON only. Do not include code blocks, markdown, or any other formatting.
        `;
      } else if (body.analysisType === 'DOCUMENT') {
        analysisPrompt = `
          You are a senior cybersecurity expert specializing in threat modeling. You have been provided with technical documentation for a system.

          Document Content: ${body.documentContent}
          ${body.systemContext ? `Additional Context: ${body.systemContext}` : ''}
          ${body.securityRequirements ? `Security Requirements: ${body.securityRequirements.join(', ')}` : ''}

          Please analyze the provided documentation and perform a comprehensive STRIDE threat analysis:

          1. System Understanding:
             First, analyze the documentation to understand the system architecture, components, data flows, and technologies.

          2. STRIDE Threat Analysis:
             For each STRIDE category, identify specific threats based on the documented system:
             - Spoofing
             - Tampering
             - Repudiation
             - Information Disclosure
             - Denial of Service
             - Elevation of Privilege

          For each threat, provide:
          - Title: Specific threat name
          - Description: How this threat applies to the documented system
          - Severity: LOW, MEDIUM, HIGH, or CRITICAL
          - Recommendation: Specific mitigations for this system

          3. Current Mitigations:
             Based on the documentation, identify existing security controls and gaps.

          4. Prioritized Recommendations:
             Provide actionable security recommendations prioritized by risk and impact.

          5. Technical Assumptions:
             Note any assumptions made about the system based on the documentation.

          Respond with valid JSON only. Do not include code blocks, markdown, or any other formatting.
        `;
      }

      await prisma.threatModel.update({
        where: { id: threatModel.id },
        data: { progress: 25 },
      });

      // Call AI service for threat analysis
      const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'user',
              content: analysisPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      await prisma.threatModel.update({
        where: { id: threatModel.id },
        data: { progress: 75 },
      });

      const aiResponse = await response.json();
      let analysisResults;

      try {
        const content = aiResponse.choices[0].message.content;
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        analysisResults = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        throw new Error('Failed to parse AI analysis results');
      }

      // Create findings from STRIDE analysis
      const findings = [];
      
      if (analysisResults.strideAnalysis) {
        for (const strideCategory of analysisResults.strideAnalysis) {
          if (strideCategory.threats) {
            for (const threat of strideCategory.threats) {
              findings.push({
                threatScenario: threat.title || threat.name || 'Unnamed Threat',
                description: threat.description || '',
                severity: threat.severity || 'MEDIUM',
                strideCategory: strideCategory.category || 'INFORMATION_DISCLOSURE',
                recommendation: threat.recommendation || threat.mitigation || '',
                status: FindingStatus.OPEN,
                userId: session.user.id,
                threatModelId: threatModel.id,
              });
            }
          }
        }
      }

      // Create findings in database
      if (findings.length > 0) {
        await prisma.finding.createMany({
          data: findings,
        });
      }

      // Update threat model with completion
      const completedThreatModel = await prisma.threatModel.update({
        where: { id: threatModel.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
          generationCount: 1,
          lastGenerationAt: new Date(),
        },
        include: {
          user: true,
          findings: {
            include: {
              user: true,
            },
          },
          linkedAssets: {
            include: {
              applicationAsset: true,
            },
          },
        },
      });

      await logActivity({
        userId: session.user.id,
        action: 'CREATE_THREAT_MODEL',
        status: 'SUCCESS',
        description: `Created enhanced threat model: ${body.name} with ${findings.length} findings`,
        entityType: 'threat_model',
        entityId: threatModel.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      });

      return NextResponse.json({
        threatModel: completedThreatModel,
        analysis: {
          summary: analysisResults.summary || 'Threat analysis completed successfully',
          strideAnalysis: analysisResults.strideAnalysis || [],
          recommendations: analysisResults.recommendations || [],
          technicalAssumptions: analysisResults.technicalAssumptions || [],
          findingsCount: findings.length,
        },
      }, { status: 201 });

    } catch (analysisError) {
      console.error('Analysis error:', analysisError);

      // Update threat model status to failed
      await prisma.threatModel.update({
        where: { id: threatModel.id },
        data: {
          status: 'DRAFT',
          progress: 0,
        },
      });

      await logActivity({
        userId: session.user.id,
        action: 'CREATE_THREAT_MODEL',
        status: 'FAILED',
        description: `Failed to create enhanced threat model: ${body.name}`,
        errorMessage: (analysisError as Error).message,
        entityType: 'threat_model',
        entityId: threatModel.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      });

      return NextResponse.json(
        { error: 'Threat analysis failed. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating enhanced threat model:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
