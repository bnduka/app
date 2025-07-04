
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// POST /api/assets/bulk - Bulk operations on assets
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, assetIds, data } = await request.json();

    if (!operation || !assetIds || !Array.isArray(assetIds)) {
      return NextResponse.json(
        { error: 'Operation and asset IDs are required' },
        { status: 400 }
      );
    }

    // Verify all assets belong to the user
    const assets = await prisma.applicationAsset.findMany({
      where: {
        id: { in: assetIds },
        userId: session.user.id,
      },
    });

    if (assets.length !== assetIds.length) {
      return NextResponse.json(
        { error: 'Some assets not found or not accessible' },
        { status: 404 }
      );
    }

    let result;
    let description;

    switch (operation) {
      case 'UPDATE_STATUS':
        if (!data?.status) {
          return NextResponse.json(
            { error: 'Status is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.applicationAsset.updateMany({
          where: { id: { in: assetIds } },
          data: {
            status: data.status,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated status to ${data.status} for ${result.count} assets`;
        break;

      case 'UPDATE_CRITICALITY':
        if (!data?.businessCriticality) {
          return NextResponse.json(
            { error: 'Business criticality is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.applicationAsset.updateMany({
          where: { id: { in: assetIds } },
          data: {
            businessCriticality: data.businessCriticality,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated criticality to ${data.businessCriticality} for ${result.count} assets`;
        break;

      case 'UPDATE_ENVIRONMENT':
        if (!data?.environment) {
          return NextResponse.json(
            { error: 'Environment is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.applicationAsset.updateMany({
          where: { id: { in: assetIds } },
          data: {
            environment: data.environment,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated environment to ${data.environment} for ${result.count} assets`;
        break;

      case 'ADD_TAGS':
        if (!data?.tags || !Array.isArray(data.tags)) {
          return NextResponse.json(
            { error: 'Tags array is required for add tags operation' },
            { status: 400 }
          );
        }
        // Get existing assets with their tags
        const assetsWithTags = await prisma.applicationAsset.findMany({
          where: { id: { in: assetIds } },
          select: { id: true, tags: true },
        });

        // Update each asset individually to merge tags
        const updatePromises = assetsWithTags.map((asset: any) => {
          const existingTags = asset.tags || [];
          const newTags = Array.from(new Set([...existingTags, ...data.tags]));
          return prisma.applicationAsset.update({
            where: { id: asset.id },
            data: {
              tags: newTags,
              lastModifiedBy: session.user.id,
            },
          });
        });

        await Promise.all(updatePromises);
        result = { count: updatePromises.length };
        description = `Bulk added tags [${data.tags.join(', ')}] to ${result.count} assets`;
        break;

      case 'DELETE':
        // Delete associated links first
        await prisma.threatModelAssetLink.deleteMany({
          where: { applicationAssetId: { in: assetIds } },
        });
        await prisma.designReviewAssetLink.deleteMany({
          where: { applicationAssetId: { in: assetIds } },
        });

        // Delete assets
        result = await prisma.applicationAsset.deleteMany({
          where: { id: { in: assetIds } },
        });
        description = `Bulk deleted ${result.count} assets`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    await logActivity({
      userId: session.user.id,
      action: 'BULK_ASSET_OPERATION',
      status: 'SUCCESS',
      description,
      details: JSON.stringify({ operation, assetIds, data }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      message: description,
      affectedCount: result.count,
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
