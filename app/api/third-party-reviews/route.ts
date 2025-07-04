
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { ThirdPartyReviewRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/third-party-reviews - List all third-party reviews with filtering and pagination
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
    const securityGrade = searchParams.get('securityGrade');
    const riskLevel = searchParams.get('riskLevel');
    const contractStatus = searchParams.get('contractStatus');
    const scanFrequency = searchParams.get('scanFrequency');

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
        { vendor: { contains: search, mode: 'insensitive' } },
        { applicationUrl: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (securityGrade) where.securityGrade = securityGrade;
    if (riskLevel) where.riskLevel = riskLevel;
    if (contractStatus) where.contractStatus = contractStatus;
    if (scanFrequency) where.scanFrequency = scanFrequency;

    const [thirdPartyReviews, total] = await Promise.all([
      prisma.thirdPartyReview.findMany({
        where,
        include: {
          user: true,
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.thirdPartyReview.count({ where }),
    ]);

    await logActivity({
      userId: session.user.id,
      action: 'VIEW_THIRD_PARTY_REVIEWS',
      status: 'SUCCESS',
      description: `Viewed third-party reviews list (page ${page})`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      thirdPartyReviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching third-party reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/third-party-reviews - Create new third-party review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ThirdPartyReviewRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.applicationUrl) {
      return NextResponse.json(
        { error: 'Name and application URL are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.applicationUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid application URL format' },
        { status: 400 }
      );
    }

    const thirdPartyReview = await prisma.thirdPartyReview.create({
      data: {
        name: body.name,
        description: body.description,
        applicationUrl: body.applicationUrl,
        additionalUrls: body.additionalUrls || [],
        vendor: body.vendor,
        applicationCategory: body.applicationCategory,
        businessPurpose: body.businessPurpose,
        dataTypes: body.dataTypes || [],
        scanFrequency: body.scanFrequency || 'MANUAL',
        businessOwner: body.businessOwner,
        technicalContact: body.technicalContact,
        contractStatus: body.contractStatus || 'ACTIVE',
        contractExpiry: body.contractExpiry,
        dataProcessingAgreement: body.dataProcessingAgreement || false,
        dataClassification: body.dataClassification || 'INTERNAL',
        businessCriticality: body.businessCriticality || 'MEDIUM',
        userId: session.user.id,
        organizationId: session.user.organizationId,
        createdBy: session.user.id,
        lastModifiedBy: session.user.id,
      },
      include: {
        user: true,
        organization: true,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: 'CREATE_THIRD_PARTY_REVIEW',
      status: 'SUCCESS',
      description: `Created third-party review: ${body.name}`,
      entityType: 'third_party_review',
      entityId: thirdPartyReview.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(thirdPartyReview, { status: 201 });
  } catch (error) {
    console.error('Error creating third-party review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
