
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// GET /api/third-party-reviews/export - Export third-party reviews data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeFindings = searchParams.get('includeFindings') === 'true';

    const where = {
      userId: session.user.id,
      ...(session.user.organizationId && { organizationId: session.user.organizationId }),
    };

    const thirdPartyReviews = await prisma.thirdPartyReview.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let responseData;
    let contentType = 'application/json';
    let fileName = 'third-party-reviews-export';

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID',
        'Name',
        'Description',
        'Application URL',
        'Vendor',
        'Status',
        'Security Score',
        'Security Grade',
        'TLS Grade',
        'Risk Level',
        'Business Criticality',
        'Data Classification',
        'Contract Status',
        'Scan Frequency',
        'Privacy Policy Status',
        'Terms of Service Status',
        'Supports SSO',
        'Supports MFA',
        'Business Owner',
        'Technical Contact',
        'Created At',
        'Last Scan Date',
        'Next Scan Date',
      ];

      const csvRows = [
        headers.join(','),
        ...thirdPartyReviews.map((review) =>
          [
            review.id,
            `"${review.name}"`,
            `"${review.description || ''}"`,
            `"${review.applicationUrl}"`,
            `"${review.vendor || ''}"`,
            review.status,
            review.overallScore || '',
            review.securityGrade || '',
            `"${review.tlsGrade || ''}"`,
            review.riskLevel,
            review.businessCriticality,
            review.dataClassification,
            review.contractStatus,
            review.scanFrequency,
            review.privacyPolicyStatus,
            review.termsOfServiceStatus,
            review.supportsSSO || '',
            review.supportsMFA || '',
            `"${review.businessOwner || ''}"`,
            `"${review.technicalContact || ''}"`,
            review.createdAt.toISOString(),
            review.lastScanDate?.toISOString() || '',
            review.nextScanDate?.toISOString() || '',
          ].join(',')
        ),
      ];

      responseData = csvRows.join('\n');
      contentType = 'text/csv';
      fileName = 'third-party-reviews-export.csv';
    } else {
      // JSON format - optionally exclude findings data for smaller file size
      const exportData = includeFindings 
        ? thirdPartyReviews 
        : thirdPartyReviews.map(({ 
            httpSecurityHeaders, 
            cookieAnalysis, 
            checklistResults, 
            securityFindings, 
            recommendations,
            ...review 
          }) => review);

      responseData = JSON.stringify(exportData, null, 2);
      fileName = 'third-party-reviews-export.json';
    }

    await logActivity({
      userId: session.user.id,
      action: 'EXPORT_THIRD_PARTY_REPORT',
      status: 'SUCCESS',
      description: `Exported ${thirdPartyReviews.length} third-party reviews in ${format.toUpperCase()} format`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return new NextResponse(responseData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=${fileName}`,
      },
    });
  } catch (error) {
    console.error('Error exporting third-party reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
