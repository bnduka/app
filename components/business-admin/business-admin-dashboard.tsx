
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserCheck, 
  Building2, 
  Shield, 
  TrendingUp, 
  Activity,
  UserPlus,
  Settings,
  BarChart3,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { UserRole, Organization, User } from '@prisma/client';
import { OrganizationUserManagement } from './organization-user-management';
import { OrganizationInsights } from './organization-insights';
import { useSession } from 'next-auth/react';

interface BusinessAdminDashboardProps {
  userRole: UserRole;
  organization: (Organization & { _count: { users: number } }) | null;
  stats: {
    totalUsers: number;
    activeUsers: number;
    threatModels: number;
    findings: number;
    reports: number;
    roleDistribution: Record<string, number>;
    totalOrganizations?: number;
    organizationDistribution?: Array<{
      id: string;
      name: string;
      _count: { users: number };
    }>;
  };
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: UserRole;
    lastLoginAt: Date | null;
    createdAt: Date;
    organization?: {
      id: string;
      name: string;
    } | null;
  }>;
  isGlobalAdmin: boolean;
}

export function BusinessAdminDashboard({
  userRole,
  organization,
  stats,
  recentUsers,
  isGlobalAdmin
}: BusinessAdminDashboardProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'BUSINESS_ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'BUSINESS_USER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'USER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          {isGlobalAdmin 
            ? 'You have platform-wide administrative privileges. You can manage all organizations and users.'
            : `You are managing ${organization?.name || 'your organization'} with ${stats.totalUsers} users.`
          }
        </AlertDescription>
      </Alert>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {isGlobalAdmin ? 'across all organizations' : 'in your organization'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              last 30 days
            </p>
          </CardContent>
        </Card>

        {isGlobalAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganizations || 0}</div>
              <p className="text-xs text-muted-foreground">
                total organizations
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Models</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.threatModels}</div>
            <p className="text-xs text-muted-foreground">
              {isGlobalAdmin ? 'platform-wide' : 'in organization'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          {isGlobalAdmin && <TabsTrigger value="organizations">Organizations</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Role Distribution</CardTitle>
                <CardDescription>
                  User roles {isGlobalAdmin ? 'across platform' : 'in your organization'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.roleDistribution).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getRoleBadgeColor(role as UserRole)}>
                          {role.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Users</CardTitle>
                <CardDescription>
                  Latest user registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.name || user.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                          {isGlobalAdmin && user.organization && (
                            <span>• {user.organization.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>Joined {formatDate(user.createdAt)}</div>
                        <div>Last: {formatDate(user.lastLoginAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Summary</CardTitle>
              <CardDescription>
                Security analysis activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.threatModels}</p>
                    <p className="text-sm text-muted-foreground">Threat Models</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.findings}</p>
                    <p className="text-sm text-muted-foreground">Security Findings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.reports}</p>
                    <p className="text-sm text-muted-foreground">Reports Generated</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <OrganizationUserManagement
            organization={organization}
            userRole={userRole}
            isGlobalAdmin={isGlobalAdmin}
          />
        </TabsContent>

        <TabsContent value="insights">
          <OrganizationInsights
            organization={organization}
            stats={stats}
            isGlobalAdmin={isGlobalAdmin}
          />
        </TabsContent>

        {isGlobalAdmin && (
          <TabsContent value="organizations">
            <Card>
              <CardHeader>
                <CardTitle>Organization Management</CardTitle>
                <CardDescription>
                  Manage platform organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.organizationDistribution?.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{org.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {org._count.users} users
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
