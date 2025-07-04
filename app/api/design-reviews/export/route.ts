
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// GET /api/design-reviews/export - Export design reviews data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true';

    const where = {
      userId: session.user.id,
      ...(session.user.organizationId && { organizationId: session.user.organizationId }),
    };

    const designReviews = await prisma.designReview.findMany({
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
        linkedAssets: {
          include: {
            applicationAsset: {
              select: {
                id: true,
                name: true,
                assetType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let responseData;
    let contentType = 'application/json';
    let fileName = 'design-reviews-export';

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID',
        'Name',
        'Description',
        'Status',
        'Review Type',
        'System Type',
        'Security Score',
        'Security Grade',
        'Overall Risk',
        'Progress',
        'Auth Score',
        'Authorization Score',
        'Data Protection Score',
        'Input Validation Score',
        'Logging Score',
        'Secure Design Score',
        'Compliance Frameworks',
        'Linked Assets',
        'Created At',
        'Completed At',
      ];

      const csvRows = [
        headers.join(','),
        ...designReviews.map((review) =>
          [
            review.id,
            `"${review.name}"`,
            `"${review.description || ''}"`,
            review.status,
            review.reviewType,
            review.systemType,
            review.securityScore || '',
            review.securityGrade || '',
            review.overallRisk,
            review.progress,
            review.authenticationScore || '',
            review.authorizationScore || '',
            review.dataProtectionScore || '',
            review.inputValidationScore || '',
            review.loggingMonitoringScore || '',
            review.secureDesignScore || '',
            `"${review.complianceFrameworks?.join('; ') || ''}"`,
            `"${review.linkedAssets?.map(link => link.applicationAsset.name).join('; ') || ''}"`,
            review.createdAt.toISOString(),
            review.reviewCompletedDate?.toISOString() || '',
          ].join(',')
        ),
      ];

      responseData = csvRows.join('\n');
      contentType = 'text/csv';
      fileName = 'design-reviews-export.csv';
    } else {
      // JSON format - optionally exclude analysis data for smaller file size
      const exportData = includeAnalysis 
        ? designReviews 
        : designReviews.map(({ analysisResults, securityFindings, recommendations, prioritizedActions, gaps, ...review }) => review);

      responseData = JSON.stringify(exportData, null, 2);
      fileName = 'design-reviews-export.json';
    }

    await logActivity({
      userId: session.user.id,
      action: 'EXPORT_DESIGN_REVIEW_REPORT',
      status: 'SUCCESS',
      description: `Exported ${designReviews.length} design reviews in ${format.toUpperCase()} format`,
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
    console.error('Error exporting design reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
