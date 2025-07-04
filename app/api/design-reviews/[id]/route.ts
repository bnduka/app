
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { DesignReviewRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/design-reviews/[id] - Get specific design review
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

    const designReview = await prisma.designReview.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        user: true,
        organization: true,
        linkedAssets: {
          include: {
            applicationAsset: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!designReview) {
      return NextResponse.json({ error: 'Design review not found' }, { status: 404 });
    }

    return NextResponse.json(designReview);
  } catch (error) {
    console.error('Error fetching design review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/design-reviews/[id] - Update design review
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
    const body: DesignReviewRequest = await request.json();

    // Check if design review exists and user owns it
    const existingReview = await prisma.designReview.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Design review not found' }, { status: 404 });
    }

    const designReview = await prisma.designReview.update({
      where: { id },
      data: {
        name: body.name || existingReview.name,
        description: body.description,
        reviewType: body.reviewType,
        systemType: body.systemType,
        scope: body.scope,
        businessContext: body.businessContext,
        techStack: body.techStack,
        cloudProviders: body.cloudProviders,
        frameworks: body.frameworks,
        databases: body.databases,
        architectureDescription: body.architectureDescription,
        complianceFrameworks: body.complianceFrameworks,
        overallRisk: body.overallRisk,
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
      action: 'UPDATE_DESIGN_REVIEW',
      status: 'SUCCESS',
      description: `Updated design review: ${designReview.name}`,
      entityType: 'design_review',
      entityId: designReview.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(designReview);
  } catch (error) {
    console.error('Error updating design review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/design-reviews/[id] - Delete design review
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

    // Check if design review exists and user owns it
    const existingReview = await prisma.designReview.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Design review not found' }, { status: 404 });
    }

    // Delete associated links first
    await prisma.designReviewAssetLink.deleteMany({
      where: { designReviewId: id },
    });

    // Delete the design review
    await prisma.designReview.delete({
      where: { id },
    });

    await logActivity({
      userId: session.user.id,
      action: 'DELETE_DESIGN_REVIEW',
      status: 'SUCCESS',
      description: `Deleted design review: ${existingReview.name}`,
      entityType: 'design_review',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({ message: 'Design review deleted successfully' });
  } catch (error) {
    console.error('Error deleting design review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
