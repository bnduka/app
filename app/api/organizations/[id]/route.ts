
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess } from '@/lib/rbac';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = "force-dynamic";

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

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
        lastName: true,
            email: true,
            role: true,
            lastLoginAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: params.id },
    });

    if (!existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if new name conflicts with existing organization
    if (name !== existingOrg.name) {
      const nameConflict = await prisma.organization.findUnique({
        where: { name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Organization name already exists' },
          { status: 409 }
        );
      }
    }

    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        name,
        description,
      },
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
    });

    await logActivity({
      userId: validation.user!.id,
      action: 'ADMIN_UPDATE_ORGANIZATION',
      status: 'SUCCESS',
      description: `Updated organization: ${name}`,
      details: JSON.stringify({ 
        organizationId: organization.id, 
        oldName: existingOrg.name,
        newName: name,
        description 
      })
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Error updating organization:', error);
    
    const validation = await validateApiAccess(request, 'MANAGE_ALL_ORGANIZATIONS');
    
    await logActivity({
      userId: validation.user?.id || 'unknown',
      action: 'ADMIN_UPDATE_ORGANIZATION',
      status: 'FAILED',
      description: 'Failed to update organization',
      details: JSON.stringify({ organizationId: params.id, error: error instanceof Error ? error.message : 'Unknown error' })
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Check if organization exists and get user count
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if organization has users
    if (organization._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with existing users. Please reassign users first.' },
        { status: 400 }
      );
    }

    await prisma.organization.delete({
      where: { id: params.id },
    });

    await logActivity({
      userId: validation.user!.id,
      action: 'ADMIN_DELETE_ORGANIZATION',
      status: 'SUCCESS',
      description: `Deleted organization: ${organization.name}`,
      details: JSON.stringify({ organizationId: organization.id, name: organization.name })
    });

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    
    const validation = await validateApiAccess(request, 'MANAGE_ALL_ORGANIZATIONS');
    
    await logActivity({
      userId: validation.user?.id || 'unknown',
      action: 'ADMIN_DELETE_ORGANIZATION',
      status: 'FAILED',
      description: 'Failed to delete organization',
      details: JSON.stringify({ organizationId: params.id, error: error instanceof Error ? error.message : 'Unknown error' })
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
