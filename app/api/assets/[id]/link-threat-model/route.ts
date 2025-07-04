
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// POST /api/assets/[id]/link-threat-model - Link asset to threat model
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
    const { threatModelId, notes } = await request.json();

    if (!threatModelId) {
      return NextResponse.json(
        { error: 'Threat model ID is required' },
        { status: 400 }
      );
    }

    // Verify asset ownership
    const asset = await prisma.applicationAsset.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify threat model ownership
    const threatModel = await prisma.threatModel.findFirst({
      where: {
        id: threatModelId,
        userId: session.user.id,
      },
    });

    if (!threatModel) {
      return NextResponse.json(
        { error: 'Threat model not found' },
        { status: 404 }
      );
    }

    // Check if link already exists
    const existingLink = await prisma.threatModelAssetLink.findFirst({
      where: {
        threatModelId,
        applicationAssetId: id,
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'Asset is already linked to this threat model' },
        { status: 400 }
      );
    }

    // Create the link
    const link = await prisma.threatModelAssetLink.create({
      data: {
        threatModelId,
        applicationAssetId: id,
        notes,
        createdBy: session.user.id,
      },
      include: {
        threatModel: true,
        applicationAsset: true,
      },
    });

    // Update asset threat model status
    await prisma.applicationAsset.update({
      where: { id },
      data: {
        threatModelStatus: 'COMPLETED',
        lastModifiedBy: session.user.id,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'LINK_ASSET_TO_THREAT_MODEL',
      status: 'SUCCESS',
      description: `Linked asset ${asset.name} to threat model ${threatModel.name}`,
      entityType: 'application_asset',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error linking asset to threat model:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/assets/[id]/link-threat-model - Unlink asset from threat model
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
    const { threatModelId } = await request.json();

    if (!threatModelId) {
      return NextResponse.json(
        { error: 'Threat model ID is required' },
        { status: 400 }
      );
    }

    // Verify asset ownership
    const asset = await prisma.applicationAsset.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Find and delete the link
    const existingLink = await prisma.threatModelAssetLink.findFirst({
      where: {
        threatModelId,
        applicationAssetId: id,
      },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    await prisma.threatModelAssetLink.delete({
      where: { id: existingLink.id },
    });

    // Check if there are other threat model links
    const remainingLinks = await prisma.threatModelAssetLink.count({
      where: { applicationAssetId: id },
    });

    // Update asset threat model status
    await prisma.applicationAsset.update({
      where: { id },
      data: {
        threatModelStatus: remainingLinks > 0 ? 'COMPLETED' : 'NOT_STARTED',
        lastModifiedBy: session.user.id,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'UNLINK_ASSET_FROM_THREAT_MODEL',
      status: 'SUCCESS',
      description: `Unlinked asset ${asset.name} from threat model`,
      entityType: 'application_asset',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({ message: 'Asset unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking asset from threat model:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
