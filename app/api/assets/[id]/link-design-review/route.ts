
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// POST /api/assets/[id]/link-design-review - Link asset to design review
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
    const { designReviewId, notes } = await request.json();

    if (!designReviewId) {
      return NextResponse.json(
        { error: 'Design review ID is required' },
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

    // Verify design review ownership
    const designReview = await prisma.designReview.findFirst({
      where: {
        id: designReviewId,
        userId: session.user.id,
      },
    });

    if (!designReview) {
      return NextResponse.json(
        { error: 'Design review not found' },
        { status: 404 }
      );
    }

    // Check if link already exists
    const existingLink = await prisma.designReviewAssetLink.findFirst({
      where: {
        designReviewId,
        applicationAssetId: id,
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'Asset is already linked to this design review' },
        { status: 400 }
      );
    }

    // Create the link
    const link = await prisma.designReviewAssetLink.create({
      data: {
        designReviewId,
        applicationAssetId: id,
        notes,
        createdBy: session.user.id,
      },
      include: {
        designReview: true,
        applicationAsset: true,
      },
    });

    // Update asset design review status
    await prisma.applicationAsset.update({
      where: { id },
      data: {
        designReviewStatus: 'COMPLETED',
        lastModifiedBy: session.user.id,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'LINK_ASSET_TO_DESIGN_REVIEW',
      status: 'SUCCESS',
      description: `Linked asset ${asset.name} to design review ${designReview.name}`,
      entityType: 'application_asset',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error linking asset to design review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/assets/[id]/link-design-review - Unlink asset from design review
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
    const { designReviewId } = await request.json();

    if (!designReviewId) {
      return NextResponse.json(
        { error: 'Design review ID is required' },
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
    const existingLink = await prisma.designReviewAssetLink.findFirst({
      where: {
        designReviewId,
        applicationAssetId: id,
      },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    await prisma.designReviewAssetLink.delete({
      where: { id: existingLink.id },
    });

    // Check if there are other design review links
    const remainingLinks = await prisma.designReviewAssetLink.count({
      where: { applicationAssetId: id },
    });

    // Update asset design review status
    await prisma.applicationAsset.update({
      where: { id },
      data: {
        designReviewStatus: remainingLinks > 0 ? 'COMPLETED' : 'NOT_STARTED',
        lastModifiedBy: session.user.id,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'UNLINK_ASSET_FROM_DESIGN_REVIEW',
      status: 'SUCCESS',
      description: `Unlinked asset ${asset.name} from design review`,
      entityType: 'application_asset',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({ message: 'Asset unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking asset from design review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
