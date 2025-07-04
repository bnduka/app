
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import { OrganizationManagementContent } from '@/components/organization-management/organization-management-content';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function OrganizationManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userRole = session.user.role as UserRole;
  
  // Only ADMIN can access this page
  if (userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Organization Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage all organizations on the platform with full administrative control
        </p>
      </div>

      <OrganizationManagementContent />
    </div>
  );
}
