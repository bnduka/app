
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { ApplicationAssetRequest, ApplicationAssetWithDetails } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/assets - List all assets with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const assetType = searchParams.get('assetType');
    const status = searchParams.get('status');
    const businessCriticality = searchParams.get('businessCriticality');
    const environment = searchParams.get('environment');
    const threatModelStatus = searchParams.get('threatModelStatus');
    const designReviewStatus = searchParams.get('designReviewStatus');

    const where: any = {
      userId: session.user.id,
    };

    if (session.user.organizationId) {
      where.organizationId = session.user.organizationId;
    }

    // Apply filters
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { owner: { contains: search, mode: 'insensitive' } },
        { team: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (assetType) where.assetType = assetType;
    if (status) where.status = status;
    if (businessCriticality) where.businessCriticality = businessCriticality;
    if (environment) where.environment = environment;
    if (threatModelStatus) where.threatModelStatus = threatModelStatus;
    if (designReviewStatus) where.designReviewStatus = designReviewStatus;

    const [assets, total] = await Promise.all([
      prisma.applicationAsset.findMany({
        where,
        include: {
          user: true,
          organization: true,
          linkedThreatModels: {
            include: {
              threatModel: true,
            },
          },
          linkedDesignReviews: {
            include: {
              designReview: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.applicationAsset.count({ where }),
    ]);

    await logActivity({
      userId: session.user.id,
      action: 'VIEW_APPLICATION_ASSETS',
      status: 'SUCCESS',
      description: `Viewed application assets list (page ${page})`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      assets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/assets - Create new asset
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ApplicationAssetRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.assetType) {
      return NextResponse.json(
        { error: 'Name and asset type are required' },
        { status: 400 }
      );
    }

    const asset = await prisma.applicationAsset.create({
      data: {
        name: body.name,
        description: body.description,
        assetType: body.assetType,
        status: body.status || 'ACTIVE',
        businessCriticality: body.businessCriticality || 'MEDIUM',
        dataClassification: body.dataClassification || 'INTERNAL',
        owner: body.owner,
        team: body.team,
        businessUnit: body.businessUnit,
        techStack: body.techStack || [],
        hostingType: body.hostingType,
        hostingProvider: body.hostingProvider,
        environment: body.environment || 'PRODUCTION',
        hasAuthentication: body.hasAuthentication || false,
        authenticationMethods: body.authenticationMethods || [],
        hasAuthorization: body.hasAuthorization || false,
        encryptionInTransit: body.encryptionInTransit || false,
        encryptionAtRest: body.encryptionAtRest || false,
        complianceRequirements: body.complianceRequirements || [],
        deploymentDate: body.deploymentDate,
        lastSecurityReview: body.lastSecurityReview,
        lastPenetrationTest: body.lastPenetrationTest,
        upstreamAssets: body.upstreamAssets || [],
        downstreamAssets: body.downstreamAssets || [],
        integrations: body.integrations || [],
        applicationUrl: body.applicationUrl,
        documentationUrl: body.documentationUrl,
        repositoryUrl: body.repositoryUrl,
        tags: body.tags || [],
        metadata: body.metadata,
        userId: session.user.id,
        organizationId: session.user.organizationId,
        createdBy: session.user.id,
        lastModifiedBy: session.user.id,
      },
      include: {
        user: true,
        organization: true,
        linkedThreatModels: true,
        linkedDesignReviews: true,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'CREATE_APPLICATION_ASSET',
      status: 'SUCCESS',
      description: `Created application asset: ${body.name}`,
      entityType: 'application_asset',
      entityId: asset.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
