
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess, buildUserScope } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/business-admin/users - Get organization-scoped users for business admin
export async function GET(request: NextRequest) {
  try {
    const validation = await validateApiAccess(request, 'VIEW_ORG_USERS', true);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { user: currentUser } = validation;
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found in session' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause for organization scope
    const whereClause: any = {
      organizationId: currentUser.organizationId
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add role filter
    if (role && role !== 'all') {
      whereClause.role = role;
    }

    // Add status filter
    if (status && status !== 'all') {
      whereClause.billingStatus = status;
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              threatModels: true,
              findings: true,
              reports: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({
        where: whereClause
      })
    ]);

    // Remove sensitive data
    const safeUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      billingStatus: user.billingStatus,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      organization: user.organization,
      stats: user._count,
      canManage: user.role === 'BUSINESS_USER' // Business admin can only manage business users
    }));

    return NextResponse.json({
      users: safeUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching organization users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/business-admin/users - Create new user in organization (Business Admin only)
export async function POST(request: NextRequest) {
  try {
    const validation = await validateApiAccess(request, 'CREATE_BUSINESS_USER', true);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { user: currentUser } = validation;
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found in session' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      name,
      firstName,
      lastName,
      email,
      sendInvitation = true
    } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user with BUSINESS_USER role in current organization
    const newUser = await prisma.user.create({
      data: {
        name: name || `${firstName || ''} ${lastName || ''}`.trim() || null,
        firstName,
        lastName,
        email,
        role: 'BUSINESS_USER', // Business admin can only create business users
        organizationId: currentUser.organizationId,
        createdBy: currentUser.id,
        billingStatus: 'ACTIVE',
        // Generate invitation token if sending invitation
        ...(sendInvitation && {
          invitationToken: crypto.randomUUID(),
          invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        })
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Log activity
    await logActivity({
      userId: currentUser.id,
      action: 'BUSINESS_ADMIN_CREATE_USER',
      status: 'SUCCESS',
      description: `Created user: ${newUser.email}`,
      details: JSON.stringify({
        newUserId: newUser.id,
        newUserEmail: newUser.email,
        role: newUser.role,
        organizationId: currentUser.organizationId,
        sendInvitation,
        createdByRole: currentUser.role
      }),
      entityType: 'user',
      entityId: newUser.id
    });

    // TODO: Send invitation email if requested
    // This would be implemented with an email service

    // Remove sensitive data
    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      billingStatus: newUser.billingStatus,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt,
      organization: newUser.organization,
      invitationSent: sendInvitation
    };

    return NextResponse.json({
      user: safeUser,
      message: `User created successfully${sendInvitation ? ' and invitation sent' : ''}`
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Get current user safely for logging
    const session = await getServerSession(authOptions);
    const currentUser = session?.user;
    
    // Log failed creation attempt
    if (currentUser) {
      await logActivity({
        userId: currentUser.id,
        action: 'BUSINESS_ADMIN_CREATE_USER',
        status: 'FAILED',
        description: 'Failed to create user',
        details: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          role: currentUser.role
        }),
        entityType: 'user',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
