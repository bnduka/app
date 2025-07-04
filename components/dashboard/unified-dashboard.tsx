
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Shield, 
  FileText, 
  Search, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Award,
  Clock,
  Plus,
  Database,
  Layers,
  Eye,
  CheckSquare,
  Globe,
  Activity,
  Users,
  Target,
  Zap,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { UserControls } from '@/components/layout/user-controls';

export function UnifiedDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status, router]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 max-w-md">
          <CardContent className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDashboardData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header with User Controls */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gradient">
            Welcome back, {dashboardData.user.name || 'User'}
          </h1>
          <p className="text-muted-foreground">
            Comprehensive application security platform with threat modeling, asset management, design reviews, and third-party assessments.
          </p>
        </div>
        <UserControls />
      </div>

      {/* Enhanced Security Posture Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Security Posture Overview
          </CardTitle>
          <CardDescription>
            Comprehensive security health across all modules with real-time metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Main Security Score Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left: Overall Security Score with Circular Progress */}
            <div className="flex flex-col items-center justify-center relative p-6">
              <div className="relative w-48 h-48">
                {/* Circular Progress Chart */}
                <div className="relative w-full h-full">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    {/* Background circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      stroke={
                        dashboardData.securityPosture.overallScore >= 90 ? "#10B981" :
                        dashboardData.securityPosture.overallScore >= 80 ? "#3B82F6" :
                        dashboardData.securityPosture.overallScore >= 70 ? "#F59E0B" :
                        dashboardData.securityPosture.overallScore >= 60 ? "#EF4444" : "#DC2626"
                      }
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 85}`}
                      strokeDashoffset={`${2 * Math.PI * 85 * (1 - dashboardData.securityPosture.overallScore / 100)}`}
                      className="transition-all duration-1000 ease-in-out"
                      style={{
                        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
                      }}
                    />
                  </svg>
                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-4xl font-bold mb-1 ${
                      dashboardData.securityPosture.overallScore >= 90 ? "text-green-600" :
                      dashboardData.securityPosture.overallScore >= 80 ? "text-blue-600" :
                      dashboardData.securityPosture.overallScore >= 70 ? "text-yellow-600" :
                      dashboardData.securityPosture.overallScore >= 60 ? "text-orange-600" : "text-red-600"
                    }`}>
                      {dashboardData.securityPosture.overallScore}%
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">Security Score</div>
                    <Badge 
                      variant={dashboardData.securityPosture.securityGrade === 'A' ? 'default' : 
                              dashboardData.securityPosture.securityGrade === 'B' ? 'secondary' : 'destructive'}
                      className="text-lg px-3 py-1"
                    >
                      Grade {dashboardData.securityPosture.securityGrade}
                    </Badge>
                  </div>
                </div>
              </div>
              {/* Trend indicators */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Improving</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Active Monitoring</span>
                </div>
              </div>
            </div>
            
            {/* Right: Module Performance Chart */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Module Performance
              </h4>
              
              {/* Module Score Bars */}
              <div className="space-y-4">
                {[
                  { name: 'Threat Modeling', score: dashboardData.securityPosture.moduleScores?.threatModeling || 0, color: 'bg-green-500', icon: Shield },
                  { name: 'Asset Coverage', score: dashboardData.securityPosture.moduleScores?.assetCoverage || 0, color: 'bg-blue-500', icon: Layers },
                  { name: 'Design Reviews', score: dashboardData.securityPosture.moduleScores?.designReview || 0, color: 'bg-purple-500', icon: Eye },
                  { name: 'Third-Party', score: dashboardData.securityPosture.moduleScores?.thirdParty || 0, color: 'bg-orange-500', icon: CheckSquare }
                ].map((module, index) => {
                  const IconComponent = module.icon;
                  return (
                    <div key={module.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{module.name}</span>
                        </div>
                        <span className="text-sm font-bold">{module.score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${module.color} transition-all duration-1000 ease-in-out`}
                          style={{ 
                            width: `${module.score}%`,
                            animationDelay: `${index * 200}ms`
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Critical Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Critical Issues */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {dashboardData.securityPosture.criticalIssues}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">Critical Issues</div>
                  </div>
                  <div className="p-3 bg-red-200 dark:bg-red-800 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                {dashboardData.securityPosture.criticalIssues > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <Link href="/findings?severity=CRITICAL">
                      <Button size="sm" variant="outline" className="w-full text-red-700 border-red-300 hover:bg-red-50">
                        View Critical Issues
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Issues */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {dashboardData.securityPosture.openIssues}
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">Open Issues</div>
                  </div>
                  <div className="p-3 bg-orange-200 dark:bg-orange-800 rounded-full">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                {dashboardData.securityPosture.openIssues > 0 && (
                  <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                    <Link href="/findings?status=OPEN">
                      <Button size="sm" variant="outline" className="w-full text-orange-700 border-orange-300 hover:bg-orange-50">
                        Review Open Issues
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Assets */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {dashboardData.summary.totalAssets}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">Protected Assets</div>
                  </div>
                  <div className="p-3 bg-green-200 dark:bg-green-800 rounded-full">
                    <Database className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                  <Link href="/assets">
                    <Button size="sm" variant="outline" className="w-full text-green-700 border-green-300 hover:bg-green-50">
                      Manage Assets
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations Section */}
          {dashboardData.securityPosture.recommendations?.length > 0 && (
            <div className="border-t pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Priority Recommendations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.securityPosture.recommendations.slice(0, 3).map((rec: any, index: number) => (
                  <Card key={index} className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          rec.type === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
                          rec.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {rec.type === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                          {rec.type === 'warning' && <Clock className="h-4 w-4 text-yellow-600" />}
                          {rec.type === 'info' && <Zap className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-2">{rec.message}</p>
                          <Link href={rec.link}>
                            <Button size="sm" variant="outline" className="w-full">
                              {rec.action}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Four Main Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-green-500/25 hover:scale-105 hover:bg-green-50/50 dark:hover:bg-green-950/30"
          onClick={() => router.push('/threat-models')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Modeling</CardTitle>
            <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.summary.totalThreatModels}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.threatModeling.completed} completed • {dashboardData.threatModeling.openFindings} open findings
            </p>
            <div className="mt-2">
              <Progress value={dashboardData.threatModeling.completionRate} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{dashboardData.threatModeling.completionRate}% completion rate</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
          onClick={() => router.push('/assets')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asset Management</CardTitle>
            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.summary.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.assetManagement.active} active • {dashboardData.assetManagement.byBusinessCriticality.critical} critical
            </p>
            <div className="mt-2">
              <Progress value={dashboardData.assetManagement.threatModelCoverage} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{dashboardData.assetManagement.threatModelCoverage}% threat model coverage</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 hover:bg-purple-50/50 dark:hover:bg-purple-950/30"
          onClick={() => router.push('/design-reviews')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Design Reviews</CardTitle>
            <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.summary.totalDesignReviews}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.designReviews.completed} completed • Avg score {Math.round(dashboardData.designReviews.averageSecurityScore)}%
            </p>
            <div className="mt-2">
              <Progress value={dashboardData.designReviews.completionRate} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{dashboardData.designReviews.completionRate}% completion rate</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105 hover:bg-orange-50/50 dark:hover:bg-orange-950/30"
          onClick={() => router.push('/third-party-reviews')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Third-Party Reviews</CardTitle>
            <CheckSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.summary.totalThirdPartyReviews}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.thirdPartyReviews.completed} completed • {dashboardData.thirdPartyReviews.byRiskLevel.highRisk} high risk
            </p>
            <div className="mt-2">
              <Progress value={dashboardData.thirdPartyReviews.completionRate} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{dashboardData.thirdPartyReviews.completionRate}% completion rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Module Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Threat Modeling Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Threat Modeling Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Models</span>
              <span className="text-sm font-medium">
                {dashboardData.threatModeling.total}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed</span>
              <span className="text-sm font-medium text-green-600">
                {dashboardData.threatModeling.completed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">In Progress</span>
              <span className="text-sm font-medium text-blue-600">
                {dashboardData.threatModeling.inProgress}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Critical Findings</span>
              <span className="text-sm font-medium text-red-600">
                {dashboardData.threatModeling.criticalFindings}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Asset Management Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Asset Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Assets</span>
              <span className="text-sm font-medium">
                {dashboardData.assetManagement.total}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active</span>
              <span className="text-sm font-medium text-green-600">
                {dashboardData.assetManagement.active}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Critical Priority</span>
              <span className="text-sm font-medium text-red-600">
                {dashboardData.assetManagement.byBusinessCriticality.critical}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Production</span>
              <span className="text-sm font-medium">
                {dashboardData.assetManagement.byEnvironment.production}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Design Review Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Design Review Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Reviews</span>
              <span className="text-sm font-medium">
                {dashboardData.designReviews.total}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed</span>
              <span className="text-sm font-medium text-green-600">
                {dashboardData.designReviews.completed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg Security Score</span>
              <span className="text-sm font-medium">
                {Math.round(dashboardData.designReviews.averageSecurityScore)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Grade A Reviews</span>
              <span className="text-sm font-medium text-green-600">
                {dashboardData.designReviews.bySecurityGrade.gradeA}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Third-Party Review Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-orange-600" />
              Third-Party Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Reviews</span>
              <span className="text-sm font-medium">
                {dashboardData.thirdPartyReviews.total}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed</span>
              <span className="text-sm font-medium text-green-600">
                {dashboardData.thirdPartyReviews.completed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">High Risk</span>
              <span className="text-sm font-medium text-red-600">
                {dashboardData.thirdPartyReviews.byRiskLevel.highRisk}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg Security Score</span>
              <span className="text-sm font-medium">
                {Math.round(dashboardData.thirdPartyReviews.averageSecurityScore)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and workflows across all security modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Link href="/threat-models/new">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Shield className="h-6 w-6 mb-2 text-green-600" />
                <span className="text-xs">New Threat Model</span>
              </Button>
            </Link>
            <Link href="/findings">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Search className="h-6 w-6 mb-2 text-orange-600" />
                <span className="text-xs">Review Findings</span>
              </Button>
            </Link>
            <Link href="/assets">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Layers className="h-6 w-6 mb-2 text-blue-600" />
                <span className="text-xs">Manage Assets</span>
              </Button>
            </Link>
            <Link href="/design-reviews">
              <Button variant="outline" className="w-full h-16 flex-col">
                <Eye className="h-6 w-6 mb-2 text-purple-600" />
                <span className="text-xs">Design Review</span>
              </Button>
            </Link>
            <Link href="/third-party-reviews">
              <Button variant="outline" className="w-full h-16 flex-col">
                <CheckSquare className="h-6 w-6 mb-2 text-orange-600" />
                <span className="text-xs">Third-Party Scan</span>
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full h-16 flex-col">
                <FileText className="h-6 w-6 mb-2 text-indigo-600" />
                <span className="text-xs">Generate Report</span>
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full h-16 flex-col" onClick={() => fetchDashboardData()}>
                <Activity className="h-6 w-6 mb-2 text-teal-600" />
                <span className="text-xs">Refresh Data</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="w-full h-16 flex-col">
                <BarChart3 className="h-6 w-6 mb-2 text-gray-600" />
                <span className="text-xs">View Analytics</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Across All Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest activity across all security modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.recentActivity?.length > 0 ? (
              dashboardData.recentActivity.slice(0, 8).map((activity: any) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                  <div className="flex-shrink-0">
                    {activity.action.includes('THREAT_MODEL') && <Shield className="h-4 w-4 text-green-600" />}
                    {activity.action.includes('ASSET') && <Layers className="h-4 w-4 text-blue-600" />}
                    {activity.action.includes('DESIGN') && <Eye className="h-4 w-4 text-purple-600" />}
                    {activity.action.includes('THIRD_PARTY') && <CheckSquare className="h-4 w-4 text-orange-600" />}
                    {!activity.action.includes('THREAT_MODEL') && !activity.action.includes('ASSET') && 
                     !activity.action.includes('DESIGN') && !activity.action.includes('THIRD_PARTY') && 
                     <Activity className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user?.name || 'System'} • {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={activity.status === 'SUCCESS' ? 'default' : activity.status === 'FAILED' ? 'destructive' : 'secondary'} className="text-xs">
                    {activity.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Items by Module */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              Recent Items
            </CardTitle>
            <CardDescription>Latest items created across modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recent Threat Models */}
            {dashboardData.recentItems?.threatModels?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  Threat Models
                </h4>
                {dashboardData.recentItems.threatModels.slice(0, 2).map((item: any) => (
                  <div key={item.id} className="ml-6 p-2 border-l-2 border-green-200 mb-2 cursor-pointer hover:bg-green-50/50"
                       onClick={() => router.push(`/threat-models`)}>
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.findings?.length || 0} findings • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Assets */}
            {dashboardData.recentItems?.assets?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Assets
                </h4>
                {dashboardData.recentItems.assets.slice(0, 2).map((item: any) => (
                  <div key={item.id} className="ml-6 p-2 border-l-2 border-blue-200 mb-2 cursor-pointer hover:bg-blue-50/50"
                       onClick={() => router.push(`/assets`)}>
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.assetType} • {item.environment} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Design Reviews */}
            {dashboardData.recentItems?.designReviews?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-600" />
                  Design Reviews
                </h4>
                {dashboardData.recentItems.designReviews.slice(0, 2).map((item: any) => (
                  <div key={item.id} className="ml-6 p-2 border-l-2 border-purple-200 mb-2 cursor-pointer hover:bg-purple-50/50"
                       onClick={() => router.push(`/design-reviews`)}>
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.reviewType} • {item.status} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Third-Party Reviews */}
            {dashboardData.recentItems?.thirdPartyReviews?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-orange-600" />
                  Third-Party Reviews
                </h4>
                {dashboardData.recentItems.thirdPartyReviews.slice(0, 2).map((item: any) => (
                  <div key={item.id} className="ml-6 p-2 border-l-2 border-orange-200 mb-2 cursor-pointer hover:bg-orange-50/50"
                       onClick={() => router.push(`/third-party-reviews`)}>
                    <p className="text-sm font-medium truncate">{item.vendorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.service} • {item.status} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {(!dashboardData.recentItems?.threatModels?.length && 
              !dashboardData.recentItems?.assets?.length && 
              !dashboardData.recentItems?.designReviews?.length && 
              !dashboardData.recentItems?.thirdPartyReviews?.length) && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent items</p>
                <p className="text-xs mt-2">Start by creating a threat model or adding assets</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
