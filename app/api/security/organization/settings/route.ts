
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and business admins can view org settings
    if (!['ADMIN', 'BUSINESS_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      include: { securitySettings: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Get org security settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business admins and platform admins can update org settings
    if (!['ADMIN', 'BUSINESS_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await request.json();
    
    // Update organization basic settings
    const orgUpdates: any = {};
    if (updates.sessionTimeoutMinutes !== undefined) {
      orgUpdates.sessionTimeoutMinutes = Math.max(5, Math.min(30, updates.sessionTimeoutMinutes));
    }
    if (updates.maxFailedLogins !== undefined) {
      orgUpdates.maxFailedLogins = Math.max(3, Math.min(10, updates.maxFailedLogins));
    }
    if (updates.lockoutDurationMinutes !== undefined) {
      orgUpdates.lockoutDurationMinutes = Math.max(5, Math.min(60, updates.lockoutDurationMinutes));
    }
    if (updates.requireTwoFactor !== undefined) {
      orgUpdates.requireTwoFactor = updates.requireTwoFactor;
    }

    // Update organization
    if (Object.keys(orgUpdates).length > 0) {
      await prisma.organization.update({
        where: { id: session.user.organizationId },
        data: orgUpdates,
      });
    }

    // Update or create security settings
    const securityUpdates: any = {};
    if (updates.passwordMinLength !== undefined) {
      securityUpdates.passwordMinLength = Math.max(8, Math.min(32, updates.passwordMinLength));
    }
    if (updates.passwordRequireUpper !== undefined) {
      securityUpdates.passwordRequireUpper = updates.passwordRequireUpper;
    }
    if (updates.passwordRequireLower !== undefined) {
      securityUpdates.passwordRequireLower = updates.passwordRequireLower;
    }
    if (updates.passwordRequireNumber !== undefined) {
      securityUpdates.passwordRequireNumber = updates.passwordRequireNumber;
    }
    if (updates.passwordRequireSymbol !== undefined) {
      securityUpdates.passwordRequireSymbol = updates.passwordRequireSymbol;
    }
    if (updates.maxConcurrentSessions !== undefined) {
      securityUpdates.maxConcurrentSessions = Math.max(1, Math.min(10, updates.maxConcurrentSessions));
    }
    if (updates.enableDeviceTracking !== undefined) {
      securityUpdates.enableDeviceTracking = updates.enableDeviceTracking;
    }
    if (updates.alertOnSuspiciousLogin !== undefined) {
      securityUpdates.alertOnSuspiciousLogin = updates.alertOnSuspiciousLogin;
    }

    if (Object.keys(securityUpdates).length > 0) {
      await prisma.organizationSecuritySettings.upsert({
        where: { organizationId: session.user.organizationId },
        create: {
          organizationId: session.user.organizationId,
          ...securityUpdates,
        },
        update: securityUpdates,
      });
    }

    // Fetch updated organization
    const updatedOrganization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      include: { securitySettings: true },
    });
    
    return NextResponse.json({ 
      success: true, 
      organization: updatedOrganization 
    });
  } catch (error) {
    console.error('Update org security settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization settings' },
      { status: 500 }
    );
  }
}
