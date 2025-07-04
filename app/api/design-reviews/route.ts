
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { DesignReviewRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/design-reviews - List all design reviews with filtering and pagination
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
    const status = searchParams.get('status');
    const reviewType = searchParams.get('reviewType');
    const systemType = searchParams.get('systemType');
    const securityGrade = searchParams.get('securityGrade');
    const riskLevel = searchParams.get('riskLevel');

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
        { scope: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (reviewType) where.reviewType = reviewType;
    if (systemType) where.systemType = systemType;
    if (securityGrade) where.securityGrade = securityGrade;
    if (riskLevel) where.overallRisk = riskLevel;

    const [designReviews, total] = await Promise.all([
      prisma.designReview.findMany({
        where,
        include: {
          user: true,
          organization: true,
          linkedAssets: {
            include: {
              applicationAsset: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.designReview.count({ where }),
    ]);

    await logActivity({
      userId: session.user.id,
      action: 'VIEW_DESIGN_REVIEWS',
      status: 'SUCCESS',
      description: `Viewed design reviews list (page ${page})`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      designReviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching design reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/design-reviews - Create new design review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DesignReviewRequest = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const designReview = await prisma.designReview.create({
      data: {
        name: body.name,
        description: body.description,
        reviewType: body.reviewType || 'ARCHITECTURE',
        systemType: body.systemType || 'WEB_APPLICATION',
        scope: body.scope,
        businessContext: body.businessContext,
        techStack: body.techStack,
        cloudProviders: body.cloudProviders || [],
        frameworks: body.frameworks || [],
        databases: body.databases || [],
        architectureDescription: body.architectureDescription,
        complianceFrameworks: body.complianceFrameworks || [],
        overallRisk: body.overallRisk || 'MEDIUM',
        userId: session.user.id,
        organizationId: session.user.organizationId,
        createdBy: session.user.id,
        lastModifiedBy: session.user.id,
      },
      include: {
        user: true,
        organization: true,
        linkedAssets: true,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'CREATE_DESIGN_REVIEW',
      status: 'SUCCESS',
      description: `Created design review: ${body.name}`,
      entityType: 'design_review',
      entityId: designReview.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(designReview, { status: 201 });
  } catch (error) {
    console.error('Error creating design review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
