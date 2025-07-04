
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const validation = await validateApiAccess(request, 'MANAGE_ALL_ORGANIZATIONS');
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
        lastName: true,
              email: true,
              role: true,
              lastLoginAt: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.count({ where }),
    ]);

    await logActivity({
      userId: validation.user!.id,
      action: 'ADMIN_VIEW_USERS',
      status: 'SUCCESS',
      description: 'Viewed organizations list',
      details: JSON.stringify({ page, limit, search, total })
    });

    return NextResponse.json({
      organizations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateApiAccess(request, 'CREATE_ORGANIZATION');
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check if organization name already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { name },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization name already exists' },
        { status: 409 }
      );
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        description,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    await logActivity({
      userId: validation.user!.id,
      action: 'ADMIN_CREATE_ORGANIZATION',
      status: 'SUCCESS',
      description: `Created organization: ${name}`,
      details: JSON.stringify({ organizationId: organization.id, name, description })
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    
    const validation = await validateApiAccess(request, 'CREATE_ORGANIZATION');
    
    await logActivity({
      userId: validation.user?.id || 'unknown',
      action: 'ADMIN_CREATE_ORGANIZATION',
      status: 'FAILED',
      description: 'Failed to create organization',
      details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
