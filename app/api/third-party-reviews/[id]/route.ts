
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { ThirdPartyReviewRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/third-party-reviews/[id] - Get specific third-party review
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

    const thirdPartyReview = await prisma.thirdPartyReview.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        user: true,
        organization: true,
      },
    });

    if (!thirdPartyReview) {
      return NextResponse.json({ error: 'Third-party review not found' }, { status: 404 });
    }

    return NextResponse.json(thirdPartyReview);
  } catch (error) {
    console.error('Error fetching third-party review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/third-party-reviews/[id] - Update third-party review
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
    const body: ThirdPartyReviewRequest = await request.json();

    // Check if third-party review exists and user owns it
    const existingReview = await prisma.thirdPartyReview.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Third-party review not found' }, { status: 404 });
    }

    // Validate URL format if provided
    if (body.applicationUrl) {
      try {
        new URL(body.applicationUrl);
      } catch {
        return NextResponse.json(
          { error: 'Invalid application URL format' },
          { status: 400 }
        );
      }
    }

    const thirdPartyReview = await prisma.thirdPartyReview.update({
      where: { id },
      data: {
        name: body.name || existingReview.name,
        description: body.description,
        applicationUrl: body.applicationUrl || existingReview.applicationUrl,
        additionalUrls: body.additionalUrls,
        vendor: body.vendor,
        applicationCategory: body.applicationCategory,
        businessPurpose: body.businessPurpose,
        dataTypes: body.dataTypes,
        scanFrequency: body.scanFrequency,
        businessOwner: body.businessOwner,
        technicalContact: body.technicalContact,
        contractStatus: body.contractStatus,
        contractExpiry: body.contractExpiry,
        dataProcessingAgreement: body.dataProcessingAgreement,
        dataClassification: body.dataClassification,
        businessCriticality: body.businessCriticality,
        lastModifiedBy: session.user.id,
      },
      include: {
        user: true,
        organization: true,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'UPDATE_THIRD_PARTY_REVIEW',
      status: 'SUCCESS',
      description: `Updated third-party review: ${thirdPartyReview.name}`,
      entityType: 'third_party_review',
      entityId: thirdPartyReview.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(thirdPartyReview);
  } catch (error) {
    console.error('Error updating third-party review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/third-party-reviews/[id] - Delete third-party review
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

    // Check if third-party review exists and user owns it
    const existingReview = await prisma.thirdPartyReview.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Third-party review not found' }, { status: 404 });
    }

    // Delete the third-party review
    await prisma.thirdPartyReview.delete({
      where: { id },
    });

    await logActivity({
      userId: session.user.id,
      action: 'DELETE_THIRD_PARTY_REVIEW',
      status: 'SUCCESS',
      description: `Deleted third-party review: ${existingReview.name}`,
      entityType: 'third_party_review',
      entityId: id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({ message: 'Third-party review deleted successfully' });
  } catch (error) {
    console.error('Error deleting third-party review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
