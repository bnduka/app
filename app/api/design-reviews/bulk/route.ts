
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// POST /api/design-reviews/bulk - Bulk operations on design reviews
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, reviewIds, data } = await request.json();

    if (!operation || !reviewIds || !Array.isArray(reviewIds)) {
      return NextResponse.json(
        { error: 'Operation and review IDs are required' },
        { status: 400 }
      );
    }

    // Verify all reviews belong to the user
    const reviews = await prisma.designReview.findMany({
      where: {
        id: { in: reviewIds },
        userId: session.user.id,
      },
    });

    if (reviews.length !== reviewIds.length) {
      return NextResponse.json(
        { error: 'Some design reviews not found or not accessible' },
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
        result = await prisma.designReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            status: data.status,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated status to ${data.status} for ${result.count} design reviews`;
        break;

      case 'UPDATE_RISK':
        if (!data?.overallRisk) {
          return NextResponse.json(
            { error: 'Risk level is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.designReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            overallRisk: data.overallRisk,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated risk level to ${data.overallRisk} for ${result.count} design reviews`;
        break;

      case 'UPDATE_REVIEW_TYPE':
        if (!data?.reviewType) {
          return NextResponse.json(
            { error: 'Review type is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.designReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            reviewType: data.reviewType,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated review type to ${data.reviewType} for ${result.count} design reviews`;
        break;

      case 'ADD_COMPLIANCE_FRAMEWORKS':
        if (!data?.complianceFrameworks || !Array.isArray(data.complianceFrameworks)) {
          return NextResponse.json(
            { error: 'Compliance frameworks array is required' },
            { status: 400 }
          );
        }
        // Get existing reviews with their compliance frameworks
        const reviewsWithFrameworks = await prisma.designReview.findMany({
          where: { id: { in: reviewIds } },
          select: { id: true, complianceFrameworks: true },
        });

        // Update each review individually to merge frameworks
        const updatePromises = reviewsWithFrameworks.map((review) => {
          const existingFrameworks = review.complianceFrameworks || [];
          const newFrameworks = Array.from(new Set([...existingFrameworks, ...data.complianceFrameworks]));
          return prisma.designReview.update({
            where: { id: review.id },
            data: {
              complianceFrameworks: newFrameworks,
              lastModifiedBy: session.user.id,
            },
          });
        });

        await Promise.all(updatePromises);
        result = { count: updatePromises.length };
        description = `Bulk added compliance frameworks [${data.complianceFrameworks.join(', ')}] to ${result.count} design reviews`;
        break;

      case 'DELETE':
        // Delete associated links first
        await prisma.designReviewAssetLink.deleteMany({
          where: { designReviewId: { in: reviewIds } },
        });

        // Delete design reviews
        result = await prisma.designReview.deleteMany({
          where: { id: { in: reviewIds } },
        });
        description = `Bulk deleted ${result.count} design reviews`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    await logActivity({
      userId: session.user.id,
      action: 'BULK_DESIGN_REVIEW_OPERATION',
      status: 'SUCCESS',
      description,
      details: JSON.stringify({ operation, reviewIds, data }),
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
