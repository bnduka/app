
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BusinessAdminDashboard } from '@/components/business-admin/business-admin-dashboard';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function BusinessAdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userRole = session.user.role as UserRole;
  
  // Only ADMIN and BUSINESS_ADMIN can access this page
  if (userRole !== 'ADMIN' && userRole !== 'BUSINESS_ADMIN') {
    redirect('/dashboard');
  }

  // For BUSINESS_ADMIN, ensure they have an organization
  if (userRole === 'BUSINESS_ADMIN' && !session.user.organizationId) {
    redirect('/dashboard?error=no-organization');
  }

  // Get organization data and stats
  const organizationId = userRole === 'ADMIN' ? null : session.user.organizationId;
  
  const [organization, organizationStats, recentUsers] = await Promise.all([
    organizationId ? 
      prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: { users: true }
          }
        }
      }) : null,
    
    // Get organization-specific stats
    organizationId ? 
      getOrganizationStats(organizationId) :
      getGlobalStats(),
    
    // Get recent users in organization
    organizationId ?
      prisma.user.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }) :
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          lastLoginAt: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
  ]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {userRole === 'ADMIN' ? 'Platform Administration' : 'Organization Administration'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {userRole === 'ADMIN' 
            ? 'Manage organizations and platform-wide settings'
            : `Manage users and settings for ${organization?.name || 'your organization'}`
          }
        </p>
      </div>

      <BusinessAdminDashboard
        userRole={userRole}
        organization={organization}
        stats={organizationStats}
        recentUsers={recentUsers}
        isGlobalAdmin={userRole === 'ADMIN'}
      />
    </div>
  );
}

async function getOrganizationStats(organizationId: string) {
  const [
    totalUsers,
    activeUsers,
    threatModels,
    findings,
    reports
  ] = await Promise.all([
    prisma.user.count({
      where: { organizationId }
    }),
    prisma.user.count({
      where: { 
        organizationId,
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    }),
    prisma.threatModel.count({
      where: {
        user: { organizationId }
      }
    }),
    prisma.finding.count({
      where: {
        user: { organizationId }
      }
    }),
    prisma.report.count({
      where: {
        user: { organizationId }
      }
    })
  ]);

  const roleDistribution = await prisma.user.groupBy({
    by: ['role'],
    where: { organizationId },
    _count: { role: true }
  });

  return {
    totalUsers,
    activeUsers,
    threatModels,
    findings,
    reports,
    roleDistribution: roleDistribution.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>)
  };
}

async function getGlobalStats() {
  const [
    totalUsers,
    totalOrganizations,
    activeUsers,
    threatModels,
    findings,
    reports
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    }),
    prisma.threatModel.count(),
    prisma.finding.count(),
    prisma.report.count()
  ]);

  const roleDistribution = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true }
  });

  const organizationDistribution = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { users: true }
      }
    },
    orderBy: {
      users: {
        _count: 'desc'
      }
    },
    take: 10
  });

  return {
    totalUsers,
    totalOrganizations,
    activeUsers,
    threatModels,
    findings,
    reports,
    roleDistribution: roleDistribution.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>),
    organizationDistribution
  };
}
