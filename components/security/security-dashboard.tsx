
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Users, 
  Key, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle,
  Lock,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface SecurityStats {
  security: {
    totalEvents: number;
    criticalEvents: number;
    highEvents: number;
    unresolvedEvents: number;
    loginFailures: number;
    suspiciousLogins: number;
  };
  twoFactor: {
    totalUsers: number;
    users2FAEnabled: number;
    adoptionRate: number;
    organizations2FARequired: number;
  };
  devices: {
    totalDevices: number;
    activeDevices: number;
    trustedDevices: number;
    recentActivity: number;
  };
  apiKeys: {
    totalKeys: number;
    activeKeys: number;
    recentlyUsed: number;
    expiringSoon: number;
  };
  lockouts: {
    totalLockouts: number;
    failedLogins: number;
    currentlyLocked: number;
  };
  period: string;
}

interface SecurityDashboardProps {
  isAdmin?: boolean;
  organizationId?: string;
}

export function SecurityDashboard({ isAdmin = false, organizationId }: SecurityDashboardProps) {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/security/stats');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch security stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Failed to load security statistics
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSecurityScore = () => {
    const factors = {
      twoFactorAdoption: Math.min(100, stats.twoFactor.adoptionRate),
      deviceTrust: stats.devices.totalDevices > 0 
        ? (stats.devices.trustedDevices / stats.devices.totalDevices) * 100 
        : 0,
      unresolvedEvents: Math.max(0, 100 - (stats.security.unresolvedEvents * 10)),
      apiKeySecurity: stats.apiKeys.totalKeys > 0 
        ? Math.max(0, 100 - (stats.apiKeys.expiringSoon * 20))
        : 100,
    };

    return Math.round(
      (factors.twoFactorAdoption * 0.3 + 
       factors.deviceTrust * 0.2 + 
       factors.unresolvedEvents * 0.3 + 
       factors.apiKeySecurity * 0.2)
    );
  };

  const securityScore = getSecurityScore();
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="space-y-6">
      {/* Security Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Score Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(securityScore)}`}>
                {securityScore}
              </div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span>Security Health</span>
                <span className={getScoreColor(securityScore)}>
                  {getScoreStatus(securityScore)}
                </span>
              </div>
              <Progress value={securityScore} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Security Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.security.totalEvents}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Critical: {stats.security.criticalEvents}</span>
              {stats.security.criticalEvents > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.security.criticalEvents}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2FA Adoption */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">2FA Adoption</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.twoFactor.adoptionRate)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.twoFactor.users2FAEnabled} of {stats.twoFactor.totalUsers} users
            </div>
          </CardContent>
        </Card>

        {/* Active Devices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.devices.activeDevices}</div>
            <div className="text-xs text-muted-foreground">
              {stats.devices.trustedDevices} trusted devices
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiKeys.activeKeys}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Recently used: {stats.apiKeys.recentlyUsed}</span>
              {stats.apiKeys.expiringSoon > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  {stats.apiKeys.expiringSoon} expiring
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Security Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Login Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Login Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Failed Login Attempts</span>
              <span className="font-medium">{stats.lockouts.failedLogins}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Account Lockouts</span>
              <span className="font-medium">{stats.lockouts.totalLockouts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Currently Locked</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.lockouts.currentlyLocked}</span>
                {stats.lockouts.currentlyLocked > 0 && (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Suspicious Logins</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.security.suspiciousLogins}</span>
                {stats.security.suspiciousLogins > 0 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Security Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Unresolved Events</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats.security.unresolvedEvents}</span>
                {stats.security.unresolvedEvents > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">2FA Coverage</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{Math.round(stats.twoFactor.adoptionRate)}%</span>
                {stats.twoFactor.adoptionRate >= 80 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Device Trust Rate</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {stats.devices.totalDevices > 0 
                    ? Math.round((stats.devices.trustedDevices / stats.devices.totalDevices) * 100)
                    : 0}%
                </span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Recent Activity</span>
              <span className="font-medium">{stats.devices.recentActivity} devices</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
