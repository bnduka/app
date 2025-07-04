
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// POST /api/admin/organizations/create - Create new organization
export async function POST(request: NextRequest) {
  try {
    const validation = await validateApiAccess(request, 'CREATE_ORGANIZATION');
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
      description,
      sessionTimeoutMinutes = 5,
      maxFailedLogins = 5,
      lockoutDurationMinutes = 10,
      requireTwoFactor = false,
      businessAdminEmail
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check if organization name already exists
    const existingOrg = await prisma.organization.findFirst({
      where: { name }
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization name already exists' },
        { status: 400 }
      );
    }

    // Validate business admin email if provided
    let businessAdmin: { id: string; organizationId: string | null } | null = null;
    if (businessAdminEmail) {
      businessAdmin = await prisma.user.findUnique({
        where: { email: businessAdminEmail },
        select: { id: true, organizationId: true }
      });

      if (!businessAdmin) {
        return NextResponse.json(
          { error: 'Business admin user not found' },
          { status: 404 }
        );
      }

      // Check if user is already assigned to an organization
      if (businessAdmin.organizationId) {
        return NextResponse.json(
          { error: 'User is already assigned to an organization' },
          { status: 400 }
        );
      }
    }

    // Create organization in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const newOrganization = await tx.organization.create({
        data: {
          name,
          description,
          sessionTimeoutMinutes,
          maxFailedLogins,
          lockoutDurationMinutes,
          requireTwoFactor
        }
      });

      // Assign business admin if provided
      if (businessAdmin) {
        await tx.user.update({
          where: { id: businessAdmin.id },
          data: {
            organizationId: newOrganization.id,
            role: 'BUSINESS_ADMIN'
          }
        });
      }

      return {
        organization: newOrganization,
        businessAdminAssigned: !!businessAdmin
      };
    });

    // Log activity
    await logActivity({
      userId: currentUser.id,
      action: 'ADMIN_CREATE_ORGANIZATION',
      status: 'SUCCESS',
      description: `Created organization: ${result.organization.name}`,
      details: JSON.stringify({
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        businessAdminEmail,
        businessAdminAssigned: result.businessAdminAssigned,
        role: currentUser.role
      }),
      entityType: 'organization',
      entityId: result.organization.id
    });

    return NextResponse.json({
      organization: result.organization,
      businessAdminAssigned: result.businessAdminAssigned,
      message: `Organization created successfully${result.businessAdminAssigned ? ' with business admin assigned' : ''}`
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating organization:', error);
    
    // Get current user safely for logging
    const session = await getServerSession(authOptions);
    const currentUser = session?.user;
    
    // Log failed creation attempt
    if (currentUser) {
      await logActivity({
        userId: currentUser.id,
        action: 'ADMIN_CREATE_ORGANIZATION',
        status: 'FAILED',
        description: 'Failed to create organization',
        details: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          role: currentUser.role
        }),
        entityType: 'organization',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
