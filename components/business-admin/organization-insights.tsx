
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Shield, 
  AlertTriangle, 
  Clock,
  Activity,
  Target
} from 'lucide-react';
import { UserRole, Organization } from '@prisma/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface OrganizationInsightsProps {
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
  isGlobalAdmin: boolean;
}

export function OrganizationInsights({
  organization,
  stats,
  isGlobalAdmin
}: OrganizationInsightsProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [insights, setInsights] = useState<any>(null);

  // Prepare data for charts
  const roleChartData = Object.entries(stats.roleDistribution).map(([role, count]) => ({
    name: role.replace('_', ' '),
    value: count,
    color: getRoleColor(role as UserRole)
  }));

  const activityData = [
    { name: 'Threat Models', value: stats.threatModels, color: '#3b82f6' },
    { name: 'Findings', value: stats.findings, color: '#f59e0b' },
    { name: 'Reports', value: stats.reports, color: '#10b981' }
  ];

  const engagementData = [
    { name: 'Total Users', value: stats.totalUsers },
    { name: 'Active Users', value: stats.activeUsers },
    { name: 'Inactive Users', value: stats.totalUsers - stats.activeUsers }
  ];

  function getRoleColor(role: UserRole): string {
    switch (role) {
      case 'ADMIN': return '#ef4444';
      case 'BUSINESS_ADMIN': return '#3b82f6';
      case 'BUSINESS_USER': return '#10b981';
      case 'USER': return '#6b7280';
      default: return '#6b7280';
    }
  }

  const calculateEngagementRate = () => {
    if (stats.totalUsers === 0) return 0;
    return Math.round((stats.activeUsers / stats.totalUsers) * 100);
  };

  const calculateSecurityScore = () => {
    // Simple scoring based on activity
    const base = 50;
    const modelScore = Math.min(stats.threatModels * 5, 30);
    const findingScore = Math.min(stats.findings * 2, 15);
    const reportScore = Math.min(stats.reports * 3, 5);
    
    return Math.min(base + modelScore + findingScore + reportScore, 100);
  };

  const getEngagementLevel = (rate: number) => {
    if (rate >= 80) return { level: 'Excellent', color: 'text-green-600' };
    if (rate >= 60) return { level: 'Good', color: 'text-blue-600' };
    if (rate >= 40) return { level: 'Fair', color: 'text-yellow-600' };
    return { level: 'Needs Improvement', color: 'text-red-600' };
  };

  const engagementRate = calculateEngagementRate();
  const securityScore = calculateSecurityScore();
  const engagement = getEngagementLevel(engagementRate);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementRate}%</div>
            <p className={`text-xs ${engagement.color}`}>
              {engagement.level}
            </p>
            <Progress value={engagementRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityScore}/100</div>
            <p className="text-xs text-muted-foreground">
              Based on activity metrics
            </p>
            <Progress value={securityScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers > 0 ? Math.round(stats.threatModels / stats.totalUsers * 100) / 100 : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Threat models per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>
              User roles breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {roleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>
              Security analysis activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Health */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Health</CardTitle>
            <CardDescription>
              Key health indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>User Adoption</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats.totalUsers} users</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.activeUsers} active (30d)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>Security Engagement</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats.threatModels} models</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.findings} findings identified
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span>Reporting</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats.reports} reports</div>
                  <div className="text-sm text-muted-foreground">
                    Generated by users
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Suggested actions for improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {engagementRate < 60 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Improve User Engagement
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Consider user training or onboarding to increase platform adoption.
                    </p>
                  </div>
                </div>
              )}

              {stats.threatModels === 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                      Start Security Analysis
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      No threat models created yet. Encourage users to begin security assessments.
                    </p>
                  </div>
                </div>
              )}

              {stats.reports < stats.threatModels && (
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200">
                      Generate More Reports
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Encourage users to generate reports from their threat model analyses.
                    </p>
                  </div>
                </div>
              )}

              {engagementRate >= 80 && stats.threatModels > 5 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200">
                      Great Performance!
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your organization shows excellent security engagement and platform adoption.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Distribution (Global Admin Only) */}
      {isGlobalAdmin && stats.organizationDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Top Organizations by User Count</CardTitle>
            <CardDescription>
              Organizations with the most users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.organizationDistribution.slice(0, 10).map((org, index) => (
                <div key={org.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{org.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{org._count.users}</p>
                    <p className="text-sm text-muted-foreground">users</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
