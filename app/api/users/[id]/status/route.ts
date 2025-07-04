
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { UserRole, BillingStatus } from '@prisma/client';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const { status } = await request.json();
    const userRole = session.user.role as UserRole;

    // Validate status
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Only ADMIN and BUSINESS_ADMIN can change user status
    if (userRole !== 'ADMIN' && userRole !== 'BUSINESS_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For BUSINESS_ADMIN, check if they can modify this user
    if (userRole === 'BUSINESS_ADMIN') {
      if (session.user.organizationId !== targetUser.organizationId) {
        return NextResponse.json({ error: 'Cannot modify users from other organizations' }, { status: 403 });
      }
      
      // Business admin cannot modify other admins
      if (targetUser.role === 'ADMIN' || targetUser.role === 'BUSINESS_ADMIN') {
        return NextResponse.json({ error: 'Cannot modify admin users' }, { status: 403 });
      }
    }

    // Prevent user from changing their own status
    if (targetUser.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot change your own account status' }, { status: 400 });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        billingStatus: status as BillingStatus,
        updatedAt: new Date()
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

    // Log the activity
    await logActivity({
      userId: session.user.id!,
      action: status === 'ACTIVE' ? 'ACCOUNT_UNLOCKED' : 'ACCOUNT_LOCKED',
      status: 'SUCCESS',
      description: `Admin ${status === 'ACTIVE' ? 'activated' : 'suspended'} user account`,
      details: `User account ${status === 'ACTIVE' ? 'activated' : 'suspended'}: ${targetUser.email} (ID: ${targetUser.id}). Previous status: ${targetUser.billingStatus}. Organization: ${targetUser.organization?.name || 'None'}`
    });

    return NextResponse.json({
      message: `User ${status === 'ACTIVE' ? 'activated' : 'suspended'} successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        billingStatus: updatedUser.billingStatus
      }
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
