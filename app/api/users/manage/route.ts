
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess, canAssignRole, isSameOrganization } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';
import { UserRole } from '@prisma/client';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const validation = await validateApiAccess(request, 'MANAGE_ORG_USERS');
    
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
    const organizationId = searchParams.get('organizationId');

    const skip = (page - 1) * limit;
    const { user } = validation;

    // Build where clause based on user role and organization
    let where: any = {};

    if (user!.role === 'ADMIN') {
      // ADMIN can see all users or filter by organization
      if (organizationId) {
        where.organizationId = organizationId;
      }
    } else if (user!.role === 'BUSINESS_ADMIN') {
      // BUSINESS_ADMIN can only see users in their organization
      where.organizationId = user!.organizationId;
    } else {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
        lastName: true,
          email: true,
          role: true,
          billingStatus: true,
          lastLoginAt: true,
          createdAt: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    await logActivity({
      userId: user!.id,
      action: user!.role === 'ADMIN' ? 'ADMIN_VIEW_USERS' : 'BUSINESS_ADMIN_VIEW_ORG_USERS',
      status: 'SUCCESS',
      description: `Viewed users list (${user!.role})`,
      details: JSON.stringify({ page, limit, search, organizationId, total })
    });

    return NextResponse.json({
      users,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
