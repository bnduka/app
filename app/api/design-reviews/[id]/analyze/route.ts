
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { DesignReviewAnalysisRequest, DesignReviewAnalysisResponse, SecurityGrade } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST /api/design-reviews/[id]/analyze - Perform AI-powered design analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: DesignReviewAnalysisRequest = await request.json();

    if (!body.architectureDescription) {
      return NextResponse.json(
        { error: 'Architecture description is required' },
        { status: 400 }
      );
    }

    // Verify design review ownership
    const designReview = await prisma.designReview.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!designReview) {
      return NextResponse.json(
        { error: 'Design review not found' },
        { status: 404 }
      );
    }

    // Update status to analyzing
    await prisma.designReview.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        progress: 25,
        lastAnalysisDate: new Date(),
      },
    });

    try {
      // Call AI service for analysis
      const analysisPrompt = `
        You are a senior security architect tasked with performing a comprehensive security assessment of a system architecture.

        System Details:
        - Architecture Description: ${body.architectureDescription}
        - Tech Stack: ${body.techStack || 'Not specified'}
        - System Type: ${body.systemType}
        - Compliance Requirements: ${body.complianceFrameworks?.join(', ') || 'None specified'}

        Please provide a detailed security analysis with the following structure:

        1. Overall Security Assessment:
           - Security Score (0-100)
           - Security Grade (A, B, C, D, F)

        2. Domain-Specific Scores (0-100 each):
           - Authentication & Identity Management
           - Authorization & Access Control
           - Data Protection & Privacy
           - Input Validation & Sanitization
           - Logging & Monitoring
           - Secure Design Principles

        3. Security Findings (provide 3-7 specific findings):
           For each finding include:
           - Category (Authentication, Authorization, Data Protection, etc.)
           - Title (concise)
           - Description (detailed explanation)
           - Severity (LOW, MEDIUM, HIGH, CRITICAL)
           - Impact (business impact)
           - Recommendation (specific remediation steps)

        4. Security Recommendations (provide 5-10 actionable recommendations):
           For each recommendation include:
           - Category
           - Title
           - Description
           - Priority (HIGH, MEDIUM, LOW)
           - Effort (HIGH, MEDIUM, LOW)
           - Impact (HIGH, MEDIUM, LOW)

        5. Priority Actions (provide 3-5 most critical actions):
           For each action include:
           - Title
           - Description
           - Category
           - Priority (1-5, where 1 is highest)
           - Timeframe (e.g., "Immediate", "Within 1 month", "Within 3 months")

        ${body.complianceFrameworks && body.complianceFrameworks.length > 0 ? `
        6. Compliance Analysis:
           - Compliance Score (0-100)
           - Gaps for each framework: ${body.complianceFrameworks.join(', ')}
           For each gap include:
           - Framework
           - Requirement
           - Description
           - Severity
           - Remediation steps
        ` : ''}

        Please provide realistic, actionable insights based on common security vulnerabilities and best practices for the described system architecture.

        Respond with valid JSON only. Do not include code blocks, markdown, or any other formatting.
      `;

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

      const aiResponse = await response.json();
      let analysisResults;

      try {
        // Parse and validate AI response
        const content = aiResponse.choices[0].message.content;
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        analysisResults = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        throw new Error('Failed to parse AI analysis results');
      }

      // Calculate security grade based on overall score
      const getSecurityGrade = (score: number): SecurityGrade => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
      };

      const securityScore = analysisResults.overallSecurityScore || 75;
      const securityGrade = getSecurityGrade(securityScore);

      // Structure the response
      const structuredResponse: DesignReviewAnalysisResponse = {
        securityScore,
        securityGrade,
        authenticationScore: analysisResults.domainScores?.authentication || 70,
        authorizationScore: analysisResults.domainScores?.authorization || 70,
        dataProtectionScore: analysisResults.domainScores?.dataProtection || 70,
        inputValidationScore: analysisResults.domainScores?.inputValidation || 70,
        loggingMonitoringScore: analysisResults.domainScores?.logging || 70,
        secureDesignScore: analysisResults.domainScores?.secureDesign || 70,
        securityFindings: analysisResults.securityFindings || [],
        recommendations: analysisResults.recommendations || [],
        prioritizedActions: analysisResults.priorityActions || [],
        complianceScore: analysisResults.complianceScore,
        gaps: analysisResults.complianceGaps,
      };

      // Update design review with analysis results
      const updatedReview = await prisma.designReview.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          securityScore,
          securityGrade,
          authenticationScore: structuredResponse.authenticationScore,
          authorizationScore: structuredResponse.authorizationScore,
          dataProtectionScore: structuredResponse.dataProtectionScore,
          inputValidationScore: structuredResponse.inputValidationScore,
          loggingMonitoringScore: structuredResponse.loggingMonitoringScore,
          secureDesignScore: structuredResponse.secureDesignScore,
          analysisResults: JSON.stringify(analysisResults),
          securityFindings: JSON.stringify(structuredResponse.securityFindings),
          recommendations: JSON.stringify(structuredResponse.recommendations),
          prioritizedActions: JSON.stringify(structuredResponse.prioritizedActions),
          complianceScore: structuredResponse.complianceScore,
          gaps: structuredResponse.gaps ? JSON.stringify(structuredResponse.gaps) : null,
          reviewCompletedDate: new Date(),
          lastModifiedBy: session.user.id,
        },
        include: {
          user: true,
          organization: true,
          linkedAssets: {
            include: {
              applicationAsset: true,
            },
          },
        },
      });

      await logActivity({
        userId: session.user.id,
        action: 'COMPLETE_DESIGN_ANALYSIS',
        status: 'SUCCESS',
        description: `Completed security analysis for design review: ${updatedReview.name} (Score: ${securityScore}, Grade: ${securityGrade})`,
        entityType: 'design_review',
        entityId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      });

      return NextResponse.json({
        designReview: updatedReview,
        analysis: structuredResponse,
      });
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);

      // Update status to failed
      await prisma.designReview.update({
        where: { id },
        data: {
          status: 'DRAFT',
          progress: 0,
        },
      });

      await logActivity({
        userId: session.user.id,
        action: 'START_DESIGN_ANALYSIS',
        status: 'FAILED',
        description: `Failed to analyze design review: ${designReview.name}`,
        errorMessage: (analysisError as Error).message,
        entityType: 'design_review',
        entityId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      });

      return NextResponse.json(
        { error: 'Analysis failed. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error performing design analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
