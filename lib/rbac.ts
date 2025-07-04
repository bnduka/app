
import { NextApiRequest } from 'next';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-config';
import { prisma } from './db';
import { UserRole } from '@prisma/client';

export interface UserWithOrganization {
  id: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
}

// Role hierarchy definitions
export const ROLE_HIERARCHY = {
  ADMIN: 4,
  BUSINESS_ADMIN: 3,
  BUSINESS_USER: 2,
  USER: 1,
} as const;

// Permission definitions
export const PERMISSIONS = {
  // Platform-level permissions
  MANAGE_ALL_ORGANIZATIONS: ['ADMIN'],
  MANAGE_ALL_USERS: ['ADMIN'],
  VIEW_ALL_DATA: ['ADMIN'],
  CREATE_ORGANIZATION: ['ADMIN'],
  ASSIGN_ANY_ROLE: ['ADMIN'],
  
  // Organization-level permissions
  MANAGE_ORG_USERS: ['ADMIN', 'BUSINESS_ADMIN'],
  VIEW_ORG_USERS: ['ADMIN', 'BUSINESS_ADMIN'],
  PROMOTE_DEMOTE_IN_ORG: ['ADMIN', 'BUSINESS_ADMIN'],
  CREATE_BUSINESS_USER: ['ADMIN', 'BUSINESS_ADMIN'],
  VIEW_ORG_ACTIVITY_LOGS: ['ADMIN', 'BUSINESS_ADMIN'],
  
  // Data access permissions
  VIEW_OWN_DATA: ['ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_USER', 'USER'],
  MANAGE_OWN_DATA: ['ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_USER', 'USER'],
  VIEW_ORG_DATA: ['ADMIN', 'BUSINESS_ADMIN'],
  
  // Admin interface permissions
  ACCESS_ADMIN_INTERFACE: ['ADMIN'],
  ACCESS_BUSINESS_ADMIN_INTERFACE: ['ADMIN', 'BUSINESS_ADMIN'],
} as const;

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(userRole);
}

/**
 * Check if a user can manage another user (role hierarchy)
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Check if a user can assign a specific role
 */
export function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  // Only ADMIN can assign ADMIN or BUSINESS_ADMIN roles
  if (targetRole === 'ADMIN' || targetRole === 'BUSINESS_ADMIN') {
    return assignerRole === 'ADMIN';
  }
  
  // BUSINESS_ADMIN can assign BUSINESS_USER
  if (targetRole === 'BUSINESS_USER') {
    return assignerRole === 'ADMIN' || assignerRole === 'BUSINESS_ADMIN';
  }
  
  // Only ADMIN can assign legacy USER role
  if (targetRole === 'USER') {
    return assignerRole === 'ADMIN';
  }
  
  return false;
}

/**
 * Check if users are in the same organization (or if manager is ADMIN)
 */
export function isSameOrganization(
  managerOrgId: string | null | undefined,
  targetOrgId: string | null | undefined,
  managerRole: UserRole
): boolean {
  // ADMIN can manage users across all organizations
  if (managerRole === 'ADMIN') {
    return true;
  }
  
  // Both must be in the same organization
  return managerOrgId === targetOrgId && managerOrgId !== null;
}

/**
 * Get session with error handling
 */
export async function getServerSessionWithError() {
  try {
    const session = await getServerSession(authOptions);
    return session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

/**
 * Validate API access with role and organization checks
 */
export async function validateApiAccess(
  req: NextRequest | NextApiRequest,
  requiredPermission: keyof typeof PERMISSIONS,
  requireOrganization: boolean = false
) {
  const session = await getServerSessionWithError();
  
  if (!session?.user) {
    return {
      success: false,
      error: 'Unauthorized - No session',
      status: 401
    };
  }

  const { role, organizationId } = session.user;

  // Check permission
  if (!hasPermission(role, requiredPermission)) {
    return {
      success: false,
      error: 'Forbidden - Insufficient permissions',
      status: 403
    };
  }

  // Check organization requirement
  if (requireOrganization && !organizationId && role !== 'ADMIN') {
    return {
      success: false,
      error: 'Forbidden - Organization required',
      status: 403
    };
  }

  return {
    success: true,
    user: session.user,
    session
  };
}

/**
 * Build organization-scoped where clause for Prisma queries
 */
export function buildOrganizationScope(
  userRole: UserRole,
  userOrgId: string | null | undefined,
  additionalWhere: any = {}
) {
  // ADMIN can see all data
  if (userRole === 'ADMIN') {
    return additionalWhere;
  }

  // BUSINESS_ADMIN can see organization data
  if (userRole === 'BUSINESS_ADMIN' && userOrgId) {
    return {
      ...additionalWhere,
      user: {
        organizationId: userOrgId
      }
    };
  }

  // BUSINESS_USER and USER can only see their own data
  return {
    ...additionalWhere,
    userId: undefined // This will be set by the calling function
  };
}

/**
 * Build user-scoped where clause for Prisma queries
 */
export function buildUserScope(
  userId: string,
  userRole: UserRole,
  userOrgId: string | null | undefined,
  additionalWhere: any = {}
) {
  // ADMIN can see all data
  if (userRole === 'ADMIN') {
    return additionalWhere;
  }

  // BUSINESS_ADMIN can see organization data
  if (userRole === 'BUSINESS_ADMIN' && userOrgId) {
    return {
      ...additionalWhere,
      user: {
        organizationId: userOrgId
      }
    };
  }

  // BUSINESS_USER and USER can only see their own data
  return {
    ...additionalWhere,
    userId: userId
  };
}

/**
 * Get accessible user IDs based on role and organization
 */
export async function getAccessibleUserIds(
  currentUserId: string,
  currentUserRole: UserRole,
  currentUserOrgId: string | null | undefined
): Promise<string[]> {
  // ADMIN can access all users
  if (currentUserRole === 'ADMIN') {
    const users = await prisma.user.findMany({
      select: { id: true }
    });
    return users.map(u => u.id);
  }

  // BUSINESS_ADMIN can access users in their organization
  if (currentUserRole === 'BUSINESS_ADMIN' && currentUserOrgId) {
    const users = await prisma.user.findMany({
      where: { organizationId: currentUserOrgId },
      select: { id: true }
    });
    return users.map(u => u.id);
  }

  // BUSINESS_USER and USER can only access their own data
  return [currentUserId];
}

/**
 * Role-based redirect helper
 */
export function getRoleBasedRedirect(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'BUSINESS_ADMIN':
      return '/dashboard'; // Will show business admin features
    case 'BUSINESS_USER':
    case 'USER':
    default:
      return '/dashboard';
  }
}

/**
 * Check if user can access specific resource
 */
export async function canAccessResource(
  userId: string,
  resourceUserId: string,
  userRole: UserRole,
  userOrgId: string | null | undefined
): Promise<boolean> {
  // Users can always access their own resources
  if (userId === resourceUserId) {
    return true;
  }

  // ADMIN can access all resources
  if (userRole === 'ADMIN') {
    return true;
  }

  // BUSINESS_ADMIN can access resources from users in their organization
  if (userRole === 'BUSINESS_ADMIN' && userOrgId) {
    const resourceUser = await prisma.user.findUnique({
      where: { id: resourceUserId },
      select: { organizationId: true }
    });
    
    return resourceUser?.organizationId === userOrgId;
  }

  // BUSINESS_USER and USER can only access their own resources
  return false;
}
