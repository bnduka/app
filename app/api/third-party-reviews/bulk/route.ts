
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// POST /api/third-party-reviews/bulk - Bulk operations on third-party reviews
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
    const reviews = await prisma.thirdPartyReview.findMany({
      where: {
        id: { in: reviewIds },
        userId: session.user.id,
      },
    });

    if (reviews.length !== reviewIds.length) {
      return NextResponse.json(
        { error: 'Some third-party reviews not found or not accessible' },
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
        result = await prisma.thirdPartyReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            status: data.status,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated status to ${data.status} for ${result.count} third-party reviews`;
        break;

      case 'UPDATE_RISK_LEVEL':
        if (!data?.riskLevel) {
          return NextResponse.json(
            { error: 'Risk level is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.thirdPartyReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            riskLevel: data.riskLevel,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated risk level to ${data.riskLevel} for ${result.count} third-party reviews`;
        break;

      case 'UPDATE_SCAN_FREQUENCY':
        if (!data?.scanFrequency) {
          return NextResponse.json(
            { error: 'Scan frequency is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.thirdPartyReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            scanFrequency: data.scanFrequency,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated scan frequency to ${data.scanFrequency} for ${result.count} third-party reviews`;
        break;

      case 'UPDATE_CONTRACT_STATUS':
        if (!data?.contractStatus) {
          return NextResponse.json(
            { error: 'Contract status is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.thirdPartyReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            contractStatus: data.contractStatus,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated contract status to ${data.contractStatus} for ${result.count} third-party reviews`;
        break;

      case 'UPDATE_DATA_CLASSIFICATION':
        if (!data?.dataClassification) {
          return NextResponse.json(
            { error: 'Data classification is required for update operation' },
            { status: 400 }
          );
        }
        result = await prisma.thirdPartyReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            dataClassification: data.dataClassification,
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk updated data classification to ${data.dataClassification} for ${result.count} third-party reviews`;
        break;

      case 'SCHEDULE_SCANS':
        if (!data?.scanDate) {
          return NextResponse.json(
            { error: 'Scan date is required for schedule operation' },
            { status: 400 }
          );
        }
        result = await prisma.thirdPartyReview.updateMany({
          where: { id: { in: reviewIds } },
          data: {
            nextScanDate: new Date(data.scanDate),
            status: 'SCHEDULED',
            lastModifiedBy: session.user.id,
          },
        });
        description = `Bulk scheduled scans for ${result.count} third-party reviews`;
        break;

      case 'DELETE':
        // Delete third-party reviews
        result = await prisma.thirdPartyReview.deleteMany({
          where: { id: { in: reviewIds } },
        });
        description = `Bulk deleted ${result.count} third-party reviews`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    await logActivity({
      userId: session.user.id,
      action: 'BULK_THIRD_PARTY_REVIEW_OPERATION',
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
