
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { 
      firstName,
      lastName, 
      email, 
      role, 
      organizationId, 
      organizationName,
      sendInvitation = true 
    } = await request.json();

    // Validation
    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json(
        { error: 'First name, last name, email, and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Handle organization
    let finalOrganizationId = organizationId;
    
    if (!organizationId && organizationName) {
      // Create new organization
      const newOrg = await prisma.organization.create({
        data: {
          name: organizationName,
          description: `Organization created for ${firstName} ${lastName}`
        }
      });
      finalOrganizationId = newOrg.id;
    }

    // Generate invitation token if sending invitation
    const invitationToken = sendInvitation ? crypto.randomBytes(32).toString('hex') : null;
    const invitationExpires = sendInvitation ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null; // 7 days

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        role: role as any,
        organizationId: finalOrganizationId,
        createdBy: session.user.id,
        invitationToken,
        invitationExpires,
        // If not sending invitation, create with temporary password
        password: sendInvitation ? null : await bcrypt.hash('TempPassword123!', 12),
        emailVerified: sendInvitation ? null : new Date(), // Auto-verify if not sending invitation
      },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'ADMIN_CREATE_USER',
      status: 'SUCCESS',
      description: `Created user ${firstName} ${lastName} (${email}) with role ${role}`,
      entityType: 'user',
      entityId: user.id,
      details: JSON.stringify({
        targetUserId: user.id,
        targetUserEmail: email,
        targetUserRole: role,
        organizationId: finalOrganizationId,
        sendInvitation
      })
    });

    // TODO: Send invitation email if requested
    if (sendInvitation && invitationToken) {
      // In a real implementation, you would send an email here
      console.log(`Would send invitation email to ${email} with token ${invitationToken}`);
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: user.organization,
        invitationSent: sendInvitation
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
