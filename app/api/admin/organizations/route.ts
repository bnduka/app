
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { validateApiAccess } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateApiAccess(request, 'MANAGE_ALL_ORGANIZATIONS');
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    // Add search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get organizations with enhanced data
    const [organizations, totalCount] = await Promise.all([
      prisma.organization.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              users: true
            }
          },
          users: {
            where: {
              role: 'BUSINESS_ADMIN'
            },
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              lastLoginAt: true
            },
            take: 3 // Show first 3 business admins
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.organization.count({
        where: whereClause
      })
    ]);

    // Get additional stats for each organization
    const enrichedOrganizations = await Promise.all(
      organizations.map(async (org) => {
        const [activeUsers, threatModels, findings, reports] = await Promise.all([
          // Active users in last 30 days
          prisma.user.count({
            where: {
              organizationId: org.id,
              lastLoginAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }),
          // Total threat models
          prisma.threatModel.count({
            where: {
              user: { organizationId: org.id }
            }
          }),
          // Total findings
          prisma.finding.count({
            where: {
              user: { organizationId: org.id }
            }
          }),
          // Total reports
          prisma.report.count({
            where: {
              user: { organizationId: org.id }
            }
          })
        ]);

        return {
          ...org,
          stats: {
            totalUsers: org._count.users,
            activeUsers,
            threatModels,
            findings,
            reports
          }
        };
      })
    );

    return NextResponse.json({
      organizations: enrichedOrganizations,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
