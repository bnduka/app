
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Calculate user statistics
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      trialUsers,
      suspendedUsers,
      newUsersThisMonth
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (billing status is ACTIVE)
      prisma.user.count({
        where: { billingStatus: 'ACTIVE' }
      }),
      
      // Admin users
      prisma.user.count({
        where: { role: 'ADMIN' }
      }),
      
      // Trial users
      prisma.user.count({
        where: { billingStatus: 'TRIAL' }
      }),
      
      // Suspended users
      prisma.user.count({
        where: { billingStatus: 'SUSPENDED' }
      }),
      
      // New users this month
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      adminUsers,
      trialUsers,
      suspendedUsers,
      newUsersThisMonth,
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    );
  }
}
