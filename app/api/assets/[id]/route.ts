
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { ApplicationAssetRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/assets/[id] - Get specific asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const asset = await prisma.applicationAsset.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        user: true,
        organization: true,
        linkedThreatModels: {
          include: {
            threatModel: {
              include: {
                user: true,
              },
            },
          },
        },
        linkedDesignReviews: {
          include: {
            designReview: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/assets/[id] - Update asset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: ApplicationAssetRequest = await request.json();

    // Check if asset exists and user owns it
    const existingAsset = await prisma.applicationAsset.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const asset = await prisma.applicationAsset.update({
      where: { id },
      data: {
        name: body.name || existingAsset.name,
        description: body.description,
        assetType: body.assetType || existingAsset.assetType,
        status: body.status,
        businessCriticality: body.businessCriticality,
        dataClassification: body.dataClassification,
        owner: body.owner,
        team: body.team,
        businessUnit: body.businessUnit,
        techStack: body.techStack,
        hostingType: body.hostingType,
        hostingProvider: body.hostingProvider,
        environment: body.environment,
        hasAuthentication: body.hasAuthentication,
        authenticationMethods: body.authenticationMethods,
        hasAuthorization: body.hasAuthorization,
        encryptionInTransit: body.encryptionInTransit,
        encryptionAtRest: body.encryptionAtRest,
        complianceRequirements: body.complianceRequirements,
        deploymentDate: body.deploymentDate,
        lastSecurityReview: body.lastSecurityReview,
        lastPenetrationTest: body.lastPenetrationTest,
        upstreamAssets: body.upstreamAssets,
        downstreamAssets: body.downstreamAssets,
        integrations: body.integrations,
        applicationUrl: body.applicationUrl,
        documentationUrl: body.documentationUrl,
        repositoryUrl: body.repositoryUrl,
        tags: body.tags,
        metadata: body.metadata,
        lastModifiedBy: session.user.id,
      },
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
    });

    await logActivity({
      userId: session.user.id,
      action: 'UPDATE_APPLICATION_ASSET',
      status: 'SUCCESS',
      description: `Updated application asset: ${asset.name}`,
      entityType: 'application_asset',
      entityId: asset.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/assets/[id] - Delete asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if asset exists and user owns it
    const existingAsset = await prisma.applicationAsset.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete associated links first
    await prisma.threatModelAssetLink.deleteMany({
      where: { applicationAssetId: id },
    });

    await prisma.designReviewAssetLink.deleteMany({
      where: { applicationAssetId: id },
    });

    // Delete the asset
    await prisma.applicationAsset.delete({
      where: { id },
    });

    await logActivity({
      userId: session.user.id,
      action: 'DELETE_APPLICATION_ASSET',
      status: 'SUCCESS',
      description: `Deleted application asset: ${existingAsset.name}`,
      entityType: 'application_asset',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
