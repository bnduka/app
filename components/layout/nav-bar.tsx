
'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, Menu, User, LogOut, Settings, BarChart3, Search, FileText, Activity, KeyRound, BookOpen, Building2, Users, Crown, UserCheck, Lock, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ChangePasswordModal } from '@/components/auth/change-password-modal';
import { Badge } from '@/components/ui/badge';

export function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  // Landing page navigation items
  const landingNavItems = [
    { name: 'Solutions', href: '#solutions' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Security', href: '#security' },
    { name: 'Company', href: '#company' },
  ];

  const isLandingPage = pathname === '/';

  // Role-based navigation items
  const getNavigationItems = (userRole: string) => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: Shield },
      { name: 'Threat Models', href: '/threat-models', icon: Shield },
      { name: 'Findings', href: '/findings', icon: Search },
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Activity Logs', href: '/activity-logs', icon: Activity },
      { name: 'Security', href: '/security', icon: Lock },
    ];

    const adminItems = [
      { name: 'Platform Admin', href: '/admin', icon: Crown },
      { name: 'Platform Security', href: '/admin/security', icon: KeyRound },
    ];

    const businessAdminItems = [
      { name: 'Organization Admin', href: '/business-admin', icon: Building2 },
      { name: 'Organization Security', href: '/business-admin/security', icon: KeyRound },
    ];

    switch (userRole) {
      case 'ADMIN':
        return [...baseItems, ...businessAdminItems, ...adminItems];
      case 'BUSINESS_ADMIN':
        return [...baseItems, ...businessAdminItems];
      case 'BUSINESS_USER':
      case 'USER':
      default:
        return baseItems;
    }
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

  const navigationItems = session?.user ? getNavigationItems(session.user.role) : [];



  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gradient">BGuard</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {isLandingPage && status !== 'authenticated' ? (
              // Landing page navigation tabs
              <>
                {landingNavItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
                  >
                    {item.name}
                  </Link>
                ))}
              </>
            ) : status === 'authenticated' ? (
              // Authenticated user navigation
              <>
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </>
            ) : null}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle - always visible */}
            <ThemeToggle />

            {status === 'loading' ? (
              <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
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
                  
                  {/* Mobile Navigation Items */}
                  <div className="md:hidden">
                    {isLandingPage && status !== 'authenticated' ? (
                      // Landing page mobile navigation
                      <>
                        {landingNavItems.map((item) => (
                          <DropdownMenuItem key={item.name} asChild>
                            <Link href={item.href} className="flex items-center space-x-2">
                              <span>{item.name}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                      </>
                    ) : status === 'authenticated' ? (
                      // Authenticated user mobile navigation
                      <>
                        {navigationItems.map((item) => (
                          <DropdownMenuItem key={item.name} asChild>
                            <Link href={item.href} className="flex items-center space-x-2">
                              <item.icon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                      </>
                    ) : null}
                  </div>

                  {/* Profile Options */}
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
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
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link href="/signout" className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-sm font-medium">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="text-sm font-medium bg-blue-600 hover:bg-blue-700">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </nav>
  );
}
