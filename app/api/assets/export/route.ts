
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// GET /api/assets/export - Export assets data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeLinks = searchParams.get('includeLinks') === 'true';

    const where = {
      userId: session.user.id,
      ...(session.user.organizationId && { organizationId: session.user.organizationId }),
    };

    const assets = await prisma.applicationAsset.findMany({
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
        ...(includeLinks && {
          linkedThreatModels: {
            include: {
              threatModel: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
          linkedDesignReviews: {
            include: {
              designReview: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });

    let responseData;
    let contentType = 'application/json';
    let fileName = 'assets-export';

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID',
        'Name',
        'Description',
        'Asset Type',
        'Status',
        'Business Criticality',
        'Data Classification',
        'Owner',
        'Team',
        'Business Unit',
        'Tech Stack',
        'Hosting Type',
        'Hosting Provider',
        'Environment',
        'Has Authentication',
        'Has Authorization',
        'Encryption in Transit',
        'Encryption at Rest',
        'Application URL',
        'Threat Model Status',
        'Design Review Status',
        'Created At',
        'Last Modified',
      ];

      const csvRows = [
        headers.join(','),
        ...assets.map((asset) =>
          [
            asset.id,
            `"${asset.name}"`,
            `"${asset.description || ''}"`,
            asset.assetType,
            asset.status,
            asset.businessCriticality,
            asset.dataClassification,
            `"${asset.owner || ''}"`,
            `"${asset.team || ''}"`,
            `"${asset.businessUnit || ''}"`,
            `"${asset.techStack?.join('; ') || ''}"`,
            asset.hostingType || '',
            `"${asset.hostingProvider || ''}"`,
            asset.environment,
            asset.hasAuthentication,
            asset.hasAuthorization,
            asset.encryptionInTransit,
            asset.encryptionAtRest,
            `"${asset.applicationUrl || ''}"`,
            asset.threatModelStatus,
            asset.designReviewStatus,
            asset.createdAt.toISOString(),
            asset.updatedAt.toISOString(),
          ].join(',')
        ),
      ];

      responseData = csvRows.join('\n');
      contentType = 'text/csv';
      fileName = 'assets-export.csv';
    } else {
      // JSON format
      responseData = JSON.stringify(assets, null, 2);
      fileName = 'assets-export.json';
    }

    await logActivity({
      userId: session.user.id,
      action: 'EXPORT_ASSETS',
      status: 'SUCCESS',
      description: `Exported ${assets.length} assets in ${format.toUpperCase()} format`,
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
    console.error('Error exporting assets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
