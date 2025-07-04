
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const { userId, organizationId, action, organizationName, organizationDescription } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify user exists and doesn't already have an organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.organizationId) {
      return NextResponse.json(
        { error: 'User already belongs to an organization' },
        { status: 400 }
      );
    }

    let organization;
    let updatedUser;

    if (action === 'join') {
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization ID is required for joining' },
          { status: 400 }
        );
      }

      // Verify organization exists
      organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      // Update user to join organization
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          organizationId: organizationId,
          role: 'BUSINESS_USER'
        },
        include: { organization: true }
      });

      await logActivity({
        userId: user.id,
        action: 'ADMIN_ASSIGN_USER_TO_ORG',
        status: 'SUCCESS',
        description: `User joined organization via SSO: ${organization.name}`,
        entityType: 'organization',
        entityId: organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

    } else if (action === 'create') {
      if (!organizationName?.trim()) {
        return NextResponse.json(
          { error: 'Organization name is required' },
          { status: 400 }
        );
      }

      // Check if organization with this name already exists
      const existingOrg = await prisma.organization.findFirst({
        where: {
          name: {
            equals: organizationName.trim(),
            mode: 'insensitive'
          }
        }
      });

      if (existingOrg) {
        return NextResponse.json(
          { error: 'An organization with this name already exists' },
          { status: 400 }
        );
      }

      // Create new organization
      organization = await prisma.organization.create({
        data: {
          name: organizationName.trim(),
          description: organizationDescription?.trim() || null
        }
      });

      // Update user to be admin of the new organization
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          organizationId: organization.id,
          role: 'BUSINESS_ADMIN'
        },
        include: { organization: true }
      });

      await logActivity({
        userId: user.id,
        action: 'ADMIN_CREATE_ORGANIZATION',
        status: 'SUCCESS',
        description: `User created organization via SSO: ${organization.name}`,
        entityType: 'organization',
        entityId: organization.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action specified' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
        organizationName: updatedUser.organization?.name
      },
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description
      }
    });

  } catch (error) {
    console.error('SSO organization setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
