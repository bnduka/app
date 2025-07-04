
'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChangePasswordModal } from '@/components/auth/change-password-modal';
import { cn } from '@/lib/utils';
import {
  Shield,
  BarChart3,
  Search,
  FileText,
  Crown,
  KeyRound,
  Building2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  Home,
  ExternalLink,
  Users,
  User,
  LogOut,
  Activity,
  BookOpen,
  MoreHorizontal,
  Layers,
  Eye,
  CheckSquare,
  TrendingUp
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Auto-expand Threat Modeling if user is on findings, reports, or analytics page
  useEffect(() => {
    const threatModelingPaths = ['/findings', '/reports', '/threat-models', '/threat-modeling/analytics'];
    const shouldExpand = threatModelingPaths.some(path => pathname.startsWith(path));
    
    if (shouldExpand && !expandedModules.includes('Threat Modeling')) {
      setExpandedModules(prev => [...prev, 'Threat Modeling']);
    }
  }, [pathname, expandedModules]);

  // Toggle expand/collapse for modules
  const toggleModuleExpansion = (moduleName: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleName) 
        ? prev.filter(name => name !== moduleName)
        : [...prev, moduleName]
    );
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ 
        callbackUrl: '/', 
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback redirect to landing page
      window.location.href = '/';
    } finally {
      setIsSigningOut(false);
    }
  };

  // New 4-module navigation structure
  const getNavigationItems = () => {
    // Core 4 modules available to all users
    return [
      { 
        name: 'Dashboard', 
        href: '/dashboard', 
        icon: BarChart3 
      },
      { 
        name: 'Threat Modeling', 
        href: '/threat-models', 
        icon: Shield,
        isExpandable: true,
        subModules: [
          { name: 'Threat Models', href: '/threat-models', icon: Shield },
          { name: 'Findings', href: '/findings', icon: Search },
          { name: 'Reports', href: '/reports', icon: FileText },
          { name: 'Analytics', href: '/threat-modeling/analytics', icon: TrendingUp }
        ]
      },
      { 
        name: 'Asset Management', 
        href: '/assets', 
        icon: Layers 
      },
      { 
        name: 'Secure Design Review', 
        href: '/design-reviews', 
        icon: Eye 
      },
      { 
        name: 'Third-Party Application Review', 
        href: '/third-party-reviews', 
        icon: CheckSquare 
      }
    ];
  };

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

  const navigationItems = getNavigationItems();
  const adminItems = session?.user ? getAdminNavigationItems(session.user.role) : [];

  if (!session?.user) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-blue-600" />
          {!isCollapsed && (
            <span className="text-xl font-bold text-gradient">BGuard Suite</span>
          )}
        </Link>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="border-b p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">
              {session.user.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground">
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
                <span className="truncate">{session.user.organizationName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {/* Main Navigation - 4 Module Structure */}
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.subModules && item.subModules.some(sub => pathname.startsWith(sub.href)));
            const isExpanded = expandedModules.includes(item.name);

            return (
              <div key={item.name} className="space-y-1">
                {/* Main Module Item */}
                <div className="flex items-center">
                  {/* Module Link */}
                  <Link href={item.href} className="flex-1">
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start transition-all duration-200 hover:bg-muted/70',
                        isCollapsed && 'px-2',
                        isActive && 'shadow-sm'
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (item.isExpandable && e.ctrlKey) {
                            e.preventDefault();
                            toggleModuleExpansion(item.name);
                          }
                        }
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-2">{item.name}</span>}
                    </Button>
                  </Link>

                  {/* Expand/Collapse Button for modules with sub-modules */}
                  {item.isExpandable && !isCollapsed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 ml-1 hover:bg-muted/50 transition-colors"
                      onClick={() => toggleModuleExpansion(item.name)}
                      aria-label={isExpanded ? `Collapse ${item.name}` : `Expand ${item.name}`}
                    >
                      <ChevronDown 
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} 
                      />
                    </Button>
                  )}
                </div>

                {/* Sub-modules (when expanded) */}
                {item.subModules && !isCollapsed && (
                  <div 
                    className={cn(
                      "ml-4 space-y-1 border-l border-muted pl-3 overflow-hidden transition-all duration-300 ease-in-out",
                      isExpanded 
                        ? "max-h-96 opacity-100 transform translate-y-0" 
                        : "max-h-0 opacity-0 transform -translate-y-2"
                    )}
                  >
                    {item.subModules.map((subItem, index) => (
                      <Link key={subItem.name} href={subItem.href}>
                        <Button
                          variant={pathname.startsWith(subItem.href) ? 'secondary' : 'ghost'}
                          className={cn(
                            "w-full justify-start text-sm h-8 transition-all duration-200 hover:bg-muted/70",
                            isExpanded && `animate-in slide-in-from-left-2 duration-300 delay-${index * 50}`
                          )}
                        >
                          <subItem.icon className="h-3 w-3" />
                          <span className="ml-2">{subItem.name}</span>
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* User Controls and Footer */}
      <div className="border-t p-2 space-y-2">
        {/* User Controls Row */}
        <div className="flex items-center justify-between">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || 'User'} />
                  <AvatarFallback className="text-xs">
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
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
          
          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex h-8 w-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden lg:flex h-screen flex-col border-r bg-background transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-background border-r">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 left-4 z-40 lg:hidden"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>
    </>
  );
}
