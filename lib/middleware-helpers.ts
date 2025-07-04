
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@prisma/client';
import { hasPermission, PERMISSIONS } from './rbac';

/**
 * API Route Protection Middleware
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>,
  options: {
    requiredRole?: UserRole[];
    requiredPermission?: keyof typeof PERMISSIONS;
    requireOrganization?: boolean;
  } = {}
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    const { role, organizationId } = token;

    // Check required role
    if (options.requiredRole && !options.requiredRole.includes(role as UserRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient role' },
        { status: 403 }
      );
    }

    // Check required permission
    if (options.requiredPermission && !hasPermission(role as UserRole, options.requiredPermission)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check organization requirement
    if (options.requireOrganization && !organizationId && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Organization required' },
        { status: 403 }
      );
    }

    return await handler(request, token);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Route-based role checking
 */
export function getRequiredRoleForRoute(pathname: string): {
  roles?: UserRole[];
  permission?: keyof typeof PERMISSIONS;
  requireOrganization?: boolean;
} {
  // Admin routes - only ADMIN can access
  if (pathname.startsWith('/admin')) {
    return {
      permission: 'ACCESS_ADMIN_INTERFACE'
    };
  }

  // API routes for admin
  if (pathname.startsWith('/api/admin')) {
    return {
      roles: ['ADMIN']
    };
  }

  // Business admin API routes
  if (pathname.startsWith('/api/business-admin')) {
    return {
      permission: 'ACCESS_BUSINESS_ADMIN_INTERFACE',
      requireOrganization: true
    };
  }

  // Organization-scoped routes
  if (pathname.startsWith('/api/organizations')) {
    return {
      permission: 'MANAGE_ALL_ORGANIZATIONS'
    };
  }

  // User management routes
  if (pathname.startsWith('/api/users') && pathname.includes('/manage')) {
    return {
      permission: 'MANAGE_ORG_USERS',
      requireOrganization: true
    };
  }

  // General authenticated routes
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/findings') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/threat-models') ||
    pathname.startsWith('/api/threat-models') ||
    pathname.startsWith('/api/findings') ||
    pathname.startsWith('/api/reports')
  ) {
    return {
      roles: ['ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_USER', 'USER']
    };
  }

  return {};
}

/**
 * Organization context validation
 */
export function validateOrganizationContext(
  userRole: UserRole,
  userOrgId: string | null | undefined,
  targetOrgId?: string
): boolean {
  // ADMIN can access any organization
  if (userRole === 'ADMIN') {
    return true;
  }

  // BUSINESS_ADMIN and BUSINESS_USER must be in the same organization
  if (targetOrgId) {
    return userOrgId === targetOrgId;
  }

  // If no target org specified, user must have an organization (except ADMIN)
  return userOrgId !== null && userOrgId !== undefined;
}

/**
 * Error response helpers
 */
export const errorResponses = {
  unauthorized: () => NextResponse.json(
    { error: 'Unauthorized - Please sign in' },
    { status: 401 }
  ),
  
  forbidden: (message?: string) => NextResponse.json(
    { error: message || 'Forbidden - Insufficient permissions' },
    { status: 403 }
  ),
  
  organizationRequired: () => NextResponse.json(
    { error: 'Organization membership required' },
    { status: 403 }
  ),
  
  invalidOrganization: () => NextResponse.json(
    { error: 'Invalid organization context' },
    { status: 403 }
  ),
  
  serverError: (message?: string) => NextResponse.json(
    { error: message || 'Internal server error' },
    { status: 500 }
  )
};

/**
 * Legacy role migration helper
 */
export function shouldMigrateUserRole(role: UserRole): boolean {
  return role === 'USER';
}

/**
 * Get default role for new users
 */
export function getDefaultUserRole(): UserRole {
  return 'BUSINESS_USER';
}
