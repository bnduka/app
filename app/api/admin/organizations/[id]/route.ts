
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

// GET /api/admin/organizations/[id] - Get specific organization details
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const validation = await validateApiAccess(request, 'MANAGE_ALL_ORGANIZATIONS');
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const organizationId = params.id;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            billingStatus: true,
            lastLoginAt: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get additional stats
    const stats = await prisma.$transaction([
      // Active users in last 30 days
      prisma.user.count({
        where: {
          organizationId,
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Total threat models
      prisma.threatModel.count({
        where: {
          user: { organizationId }
        }
      }),
      // Total findings
      prisma.finding.count({
        where: {
          user: { organizationId }
        }
      }),
      // Total reports
      prisma.report.count({
        where: {
          user: { organizationId }
        }
      }),
      // Role distribution
      prisma.user.groupBy({
        by: ['role'],
        where: { organizationId },
        _count: true,
        orderBy: { role: 'asc' }
      })
    ]);

    const [activeUsers, threatModels, findings, reports, roleDistribution] = stats;

    const enrichedOrganization = {
      ...organization,
      stats: {
        totalUsers: organization._count.users,
        activeUsers,
        threatModels,
        findings,
        reports,
        roleDistribution: roleDistribution.reduce((acc, item) => {
          acc[item.role] = typeof item._count === 'number' ? item._count : 0;
          return acc;
        }, {} as Record<string, number>)
      }
    };

    return NextResponse.json({ organization: enrichedOrganization });

  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/organizations/[id] - Update organization
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const validation = await validateApiAccess(request, 'MANAGE_ALL_ORGANIZATIONS');
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

    const organizationId = params.id;
    const body = await request.json();

    const { 
      name, 
      description, 
      sessionTimeoutMinutes,
      maxFailedLogins,
      lockoutDurationMinutes,
      requireTwoFactor
    } = body;

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check for name conflicts if name is being changed
    if (name && name !== existingOrg.name) {
      const nameExists = await prisma.organization.findFirst({
        where: {
          name,
          id: { not: organizationId }
        }
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Organization name already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sessionTimeoutMinutes !== undefined) updateData.sessionTimeoutMinutes = sessionTimeoutMinutes;
    if (maxFailedLogins !== undefined) updateData.maxFailedLogins = maxFailedLogins;
    if (lockoutDurationMinutes !== undefined) updateData.lockoutDurationMinutes = lockoutDurationMinutes;
    if (requireTwoFactor !== undefined) updateData.requireTwoFactor = requireTwoFactor;

    // Update organization
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    // Log activity
    await logActivity({
      userId: currentUser.id,
      action: 'ADMIN_UPDATE_ORGANIZATION',
      status: 'SUCCESS',
      description: `Updated organization: ${updatedOrganization.name}`,
      details: JSON.stringify({
        organizationId,
        changes: updateData,
        role: currentUser.role
      }),
      entityType: 'organization',
      entityId: organizationId
    });

    return NextResponse.json({
      organization: updatedOrganization,
      message: 'Organization updated successfully'
    });

  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/organizations/[id] - Delete organization
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const validation = await validateApiAccess(request, 'MANAGE_ALL_ORGANIZATIONS');
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

    const organizationId = params.id;
    const body = await request.json();
    const { confirmationText, transferUsersTo } = body;

    // Require confirmation
    if (confirmationText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Invalid confirmation text' },
        { status: 400 }
      );
    }

    // Get organization with user count
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if organization has users and no transfer specified
    if (organization._count.users > 0 && !transferUsersTo) {
      return NextResponse.json(
        { error: 'Cannot delete organization with users. Specify transferUsersTo or remove users first.' },
        { status: 400 }
      );
    }

    // Validate transfer organization if specified
    let transferOrganization = null;
    if (transferUsersTo) {
      transferOrganization = await prisma.organization.findUnique({
        where: { id: transferUsersTo }
      });

      if (!transferOrganization) {
        return NextResponse.json(
          { error: 'Transfer organization not found' },
          { status: 404 }
        );
      }
    }

    // Perform deletion in transaction
    const result = await prisma.$transaction(async (tx) => {
      let transferredUsers = 0;

      // Transfer users if specified
      if (transferUsersTo && organization.users.length > 0) {
        const userUpdate = await tx.user.updateMany({
          where: { organizationId },
          data: { organizationId: transferUsersTo }
        });
        transferredUsers = userUpdate.count;
      } else if (organization.users.length > 0) {
        // Set users to no organization
        const userUpdate = await tx.user.updateMany({
          where: { organizationId },
          data: { organizationId: null }
        });
        transferredUsers = userUpdate.count;
      }

      // Delete organization (cascading will handle related records)
      await tx.organization.delete({
        where: { id: organizationId }
      });

      return { transferredUsers };
    });

    // Log activity
    await logActivity({
      userId: currentUser.id,
      action: 'ADMIN_DELETE_ORGANIZATION',
      status: 'SUCCESS',
      description: `Deleted organization: ${organization.name}`,
      details: JSON.stringify({
        organizationId,
        organizationName: organization.name,
        usersCount: organization._count.users,
        transferredTo: transferUsersTo,
        transferOrganizationName: transferOrganization?.name,
        transferredUsers: result.transferredUsers,
        role: currentUser.role
      }),
      entityType: 'organization',
      entityId: organizationId
    });

    return NextResponse.json({
      message: `Organization deleted successfully. ${result.transferredUsers} users were ${transferUsersTo ? `transferred to ${transferOrganization?.name}` : 'set to no organization'}.`,
      transferredUsers: result.transferredUsers,
      transferredTo: transferOrganization?.name || null
    });

  } catch (error: any) {
    console.error('Error deleting organization:', error);
    
    // Get current user safely for logging
    const session = await getServerSession(authOptions);
    const currentUser = session?.user;
    
    // Log failed deletion attempt
    if (currentUser) {
      await logActivity({
        userId: currentUser.id,
        action: 'ADMIN_DELETE_ORGANIZATION',
        status: 'FAILED',
        description: `Failed to delete organization: ${params.id}`,
        details: JSON.stringify({
          organizationId: params.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          role: currentUser.role
        }),
        entityType: 'organization',
        entityId: params.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
