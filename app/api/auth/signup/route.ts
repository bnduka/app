
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { SecurityEventService } from '@/lib/security/security-events';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organization: z.string().optional(),
  organizationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, organization, organizationId } = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      await SecurityEventService.logEvent({
        eventType: 'SIGNUP_ATTEMPT_EXISTING_USER',
        severity: 'MEDIUM',
        description: 'Signup attempt with existing email',
        userId: existingUser.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: { email },
      });

      return NextResponse.json(
        { 
          success: false, 
          message: 'An account with this email already exists. Please sign in instead.' 
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user - no email verification required
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`, // Legacy field for backwards compatibility
        firstName,
        lastName,
        emailVerified: new Date(), // Set as verified immediately
        role: 'BUSINESS_USER',
      },
    });

    // Handle organization assignment
    let organizationToConnect = null;
    
    if (organizationId) {
      // User selected an existing organization
      organizationToConnect = organizationId;
    } else if (organization) {
      // User wants to create a new organization
      const newOrg = await prisma.organization.create({
        data: {
          name: organization,
        },
      });
      organizationToConnect = newOrg.id;
    }
    
    // Connect user to organization if one was selected or created
    if (organizationToConnect) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          organizationId: organizationToConnect,
        },
      });
    }

    // Successful signup - no security event logging needed

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now sign in.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

  } catch (error) {
    console.error('Signup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
