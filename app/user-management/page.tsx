
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import { UserManagementContent } from '@/components/user-management/user-management-content';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function UserManagementPage() {
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

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {userRole === 'ADMIN' 
            ? 'Manage users across all organizations with full administrative control'
            : `Manage users in your organization with business admin privileges`
          }
        </p>
      </div>

      <UserManagementContent
        userRole={userRole}
        organizationId={session.user.organizationId}
        organizationName={session.user.organizationName}
        isGlobalAdmin={userRole === 'ADMIN'}
      />
    </div>
  );
}
