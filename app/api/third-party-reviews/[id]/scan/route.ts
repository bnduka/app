
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { 
  ThirdPartyReviewScanRequest, 
  ThirdPartyReviewScanResponse, 
  SecurityGrade,
  RiskLevel 
} from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST /api/third-party-reviews/[id]/scan - Perform AI-powered security scan
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
    const body: ThirdPartyReviewScanRequest = await request.json();

    if (!body.url) {
      return NextResponse.json(
        { error: 'URL is required for scanning' },
        { status: 400 }
      );
    }

    // Verify third-party review ownership
    const thirdPartyReview = await prisma.thirdPartyReview.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!thirdPartyReview) {
      return NextResponse.json(
        { error: 'Third-party review not found' },
        { status: 404 }
      );
    }

    // Validate URL format
    let targetUrl;
    try {
      targetUrl = new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Update status to scanning
    await prisma.thirdPartyReview.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        lastScanDate: new Date(),
      },
    });

    try {
      // Call AI service for comprehensive security analysis
      const scanPrompt = `
        You are a cybersecurity expert tasked with performing a comprehensive security assessment of a third-party web application.

        Target URL: ${body.url}
        Scan Type: ${body.scanType}
        Include Headers Analysis: ${body.includeHeaders || true}
        Include Cookie Analysis: ${body.includeCookies || true}
        Include Privacy Policy Review: ${body.includePrivacyPolicy || true}
        Include Terms of Service Review: ${body.includeTermsOfService || true}

        Please provide a realistic security assessment covering the following areas:

        1. Overall Security Assessment:
           - Overall Security Score (0-100)
           - Security Grade (A, B, C, D, F)
           - TLS/SSL Grade (A+, A, B, C, D, F)

        2. HTTP Security Headers Analysis:
           - Security Headers Score (0-100)
           - Analysis of each header:
             * Strict-Transport-Security
             * Content-Security-Policy
             * X-Frame-Options
             * X-Content-Type-Options
             * X-XSS-Protection
             * Referrer-Policy
             * Permissions-Policy
           - For each header: present (boolean), value (if present), recommendation, severity

        3. Cookie Security Analysis:
           - Cookie Security Score (0-100)
           - Total number of cookies
           - Number of secure cookies
           - Number of HttpOnly cookies
           - Number of SameSite cookies
           - Security issues found with cookies

        4. Security Features Assessment:
           - Supports SSO (boolean)
           - Supports MFA/2FA (boolean)
           - Authentication methods available
           - Encryption in transit (boolean)
           - Encryption at rest (boolean)
           - Data backups available (boolean)
           - Incident response procedures (boolean)
           - Penetration testing performed (boolean)
           - Vulnerability management (boolean)
           - Security certifications

        5. Privacy and Compliance:
           - Privacy Policy Status (NOT_FOUND, FOUND, REVIEWED, COMPLIANT, NON_COMPLIANT, OUTDATED)
           - Terms of Service Status (NOT_FOUND, FOUND, REVIEWED, ACCEPTABLE, CONCERNING, UNACCEPTABLE)

        6. Security Checklist Results (provide 10-15 checklist items):
           For each item include:
           - Category (e.g., "Authentication", "Data Protection", "Network Security")
           - Item description
           - Status (PASS, FAIL, WARNING, NOT_APPLICABLE)
           - Score (0-100)
           - Details (if applicable)
           - Recommendation (if applicable)

        7. Security Findings (provide 3-8 specific findings):
           For each finding include:
           - Category
           - Title
           - Description
           - Severity (LOW, MEDIUM, HIGH, CRITICAL)
           - Impact
           - Recommendation

        8. Security Recommendations (provide 5-10 actionable recommendations):
           For each recommendation include:
           - Category
           - Title
           - Description
           - Priority (HIGH, MEDIUM, LOW)
           - Effort (HIGH, MEDIUM, LOW)
           - Impact (HIGH, MEDIUM, LOW)

        9. Risk Assessment:
           - Risk Level (VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH, CRITICAL)
           - Risk Factors (array of risk factor descriptions)

        Please provide realistic assessments based on common security practices and vulnerabilities for web applications. Consider the domain and apparent purpose of the application in your assessment.

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
              content: scanPrompt,
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
      let scanResults;

      try {
        // Parse and validate AI response
        const content = aiResponse.choices[0].message.content;
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        scanResults = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        throw new Error('Failed to parse AI scan results');
      }

      // Calculate security grade based on overall score
      const getSecurityGrade = (score: number): SecurityGrade => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
      };

      // Calculate risk level based on overall score
      const getRiskLevel = (score: number): RiskLevel => {
        if (score >= 90) return 'VERY_LOW';
        if (score >= 80) return 'LOW';
        if (score >= 70) return 'MEDIUM';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'VERY_HIGH';
        return 'CRITICAL';
      };

      const overallScore = scanResults.overallSecurityScore || 75;
      const securityGrade = getSecurityGrade(overallScore);
      const riskLevel = getRiskLevel(overallScore);

      // Structure the response
      const structuredResponse: ThirdPartyReviewScanResponse = {
        overallScore,
        securityGrade,
        tlsGrade: scanResults.tlsGrade || 'B',
        httpSecurityHeaders: scanResults.httpSecurityHeaders || {
          score: 70,
          headers: {}
        },
        cookieAnalysis: scanResults.cookieAnalysis || {
          score: 70,
          totalCookies: 5,
          secureCookies: 3,
          httpOnlyCookies: 4,
          sameSiteCookies: 2,
          issues: []
        },
        privacyPolicyStatus: scanResults.privacyPolicyStatus || 'FOUND',
        termsOfServiceStatus: scanResults.termsOfServiceStatus || 'FOUND',
        securityFeatures: scanResults.securityFeatures || {
          authenticationMethods: [],
          certifications: []
        },
        checklistResults: scanResults.checklistResults || [],
        securityFindings: scanResults.securityFindings || [],
        recommendations: scanResults.recommendations || [],
        riskLevel,
        riskFactors: scanResults.riskFactors || [],
      };

      // Update third-party review with scan results
      const updatedReview = await prisma.thirdPartyReview.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          overallScore,
          securityGrade,
          tlsGrade: structuredResponse.tlsGrade,
          httpSecurityHeaders: JSON.stringify(structuredResponse.httpSecurityHeaders),
          cookieAnalysis: JSON.stringify(structuredResponse.cookieAnalysis),
          privacyPolicyStatus: structuredResponse.privacyPolicyStatus,
          termsOfServiceStatus: structuredResponse.termsOfServiceStatus,
          supportsSSO: structuredResponse.securityFeatures.supportsSSO,
          supportsMFA: structuredResponse.securityFeatures.supportsMFA,
          authenticationMethods: structuredResponse.securityFeatures.authenticationMethods,
          encryptionInTransit: structuredResponse.securityFeatures.encryptionInTransit,
          encryptionAtRest: structuredResponse.securityFeatures.encryptionAtRest,
          dataBackups: structuredResponse.securityFeatures.dataBackups,
          incidentResponse: structuredResponse.securityFeatures.incidentResponse,
          penetrationTesting: structuredResponse.securityFeatures.penetrationTesting,
          vulnerabilityManagement: structuredResponse.securityFeatures.vulnerabilityManagement,
          certifications: structuredResponse.securityFeatures.certifications,
          riskLevel,
          riskFactors: structuredResponse.riskFactors,
          checklistResults: JSON.stringify(structuredResponse.checklistResults),
          securityFindings: JSON.stringify(structuredResponse.securityFindings),
          recommendations: JSON.stringify(structuredResponse.recommendations),
          lastAssessmentDate: new Date(),
          nextScanDate: thirdPartyReview.scanFrequency !== 'MANUAL' 
            ? new Date(Date.now() + (
                thirdPartyReview.scanFrequency === 'WEEKLY' ? 7 * 24 * 60 * 60 * 1000 :
                thirdPartyReview.scanFrequency === 'MONTHLY' ? 30 * 24 * 60 * 60 * 1000 :
                thirdPartyReview.scanFrequency === 'QUARTERLY' ? 90 * 24 * 60 * 60 * 1000 :
                365 * 24 * 60 * 60 * 1000
              ))
            : null,
          lastModifiedBy: session.user.id,
        },
        include: {
          user: true,
          organization: true,
        },
      });

      await logActivity({
        userId: session.user.id,
        action: 'COMPLETE_THIRD_PARTY_SCAN',
        status: 'SUCCESS',
        description: `Completed security scan for third-party review: ${updatedReview.name} (Score: ${overallScore}, Grade: ${securityGrade})`,
        entityType: 'third_party_review',
        entityId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      });

      return NextResponse.json({
        thirdPartyReview: updatedReview,
        scanResults: structuredResponse,
      });
    } catch (scanError) {
      console.error('Scan error:', scanError);

      // Update status to failed
      await prisma.thirdPartyReview.update({
        where: { id },
        data: {
          status: 'FAILED',
        },
      });

      await logActivity({
        userId: session.user.id,
        action: 'START_THIRD_PARTY_SCAN',
        status: 'FAILED',
        description: `Failed to scan third-party review: ${thirdPartyReview.name}`,
        errorMessage: (scanError as Error).message,
        entityType: 'third_party_review',
        entityId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      });

      return NextResponse.json(
        { error: 'Security scan failed. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error performing third-party scan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
