
'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  LogOut, 
  Settings, 
  KeyRound, 
  BookOpen, 
  Building2, 
  Activity,
  Users,
  Crown
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ChangePasswordModal } from '@/components/auth/change-password-modal';

export function UserControls() {
  const { data: session } = useSession();
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  // Administrative navigation items for user dropdown
  const getAdminNavigationItems = (userRole: string) => {
    const adminItems = [
      { name: 'User Management', href: '/user-management', icon: Users, roles: ['ADMIN', 'BUSINESS_ADMIN'] },
      { name: 'Organization Management', href: '/organization-management', icon: Building2, roles: ['ADMIN'] },
      { name: 'Organization Admin', href: '/business-admin', icon: Building2, roles: ['ADMIN', 'BUSINESS_ADMIN'] },
      { name: 'Organization Security', href: '/business-admin/security', icon: KeyRound, roles: ['ADMIN', 'BUSINESS_ADMIN'] },
      { name: 'Platform Admin', href: '/admin', icon: Crown, roles: ['ADMIN'] },
      { name: 'Platform Security', href: '/admin/security', icon: KeyRound, roles: ['ADMIN'] },
    ];

    return adminItems.filter(item => 
      item.roles?.includes(userRole)
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { text: 'Platform Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
      case 'BUSINESS_ADMIN':
        return { text: 'Org Admin', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'BUSINESS_USER':
        return { text: 'Business User', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
      case 'USER':
        return { text: 'User', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
      default:
        return null;
    }
  };

  const adminItems = session?.user ? getAdminNavigationItems(session.user.role) : [];

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.user.image || ''} alt={session.user.name || 'User'} />
              <AvatarFallback>
                {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium leading-none">
                {session.user.name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {session.user.email}
              </p>
              
              {/* Role Badge */}
              {(() => {
                const roleBadge = getRoleBadge(session.user.role);
                return roleBadge ? (
                  <Badge variant="outline" className={`w-fit text-xs ${roleBadge.color}`}>
                    {roleBadge.text}
                  </Badge>
                ) : null;
              })()}
              
              {/* Organization Context */}
              {session.user.organizationName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{session.user.organizationName}</span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Personal Settings */}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/activity-logs" className="flex items-center">
              <Activity className="mr-2 h-4 w-4" />
              <span>Activity Logs</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setChangePasswordModalOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/stride-definitions" className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>STRIDE Definitions</span>
            </Link>
          </DropdownMenuItem>

          {/* Administrative Functions - Role Based */}
          {adminItems.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
                Administration
              </DropdownMenuLabel>
              {adminItems.map((adminItem) => (
                <DropdownMenuItem key={adminItem.name} asChild>
                  <Link href={adminItem.href} className="flex items-center">
                    <adminItem.icon className="mr-2 h-4 w-4" />
                    <span>{adminItem.name}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem asChild>
            <Link href="/signout" className="flex items-center">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );
}
