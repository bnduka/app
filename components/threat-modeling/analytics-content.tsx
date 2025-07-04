
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield,
  Activity,
  Target,
  Calendar,
  RefreshCw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AnalyticsData {
  keyMetrics: {
    totalFindings: number;
    totalThreatModels: number;
    avgResolutionTime: number;
    slaComplianceRate: number;
    activeThreats: number;
    criticalFindings: number;
    completedThreatModels: number;
  };
  findingsByStatus: {
    open: number;
    inProgress: number;
    resolved: number;
  };
  findingsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findingsByStride: {
    spoofing: number;
    tampering: number;
    repudiation: number;
    informationDisclosure: number;
    denialOfService: number;
    elevationOfPrivilege: number;
  };
  slaCompliance: {
    withinSla: number;
    exceedingSla: number;
  };
  threatModelsByStatus: {
    draft: number;
    analyzing: number;
    completed: number;
    archived: number;
  };
  trendData: Array<{
    date: string;
    findingsCreated: number;
    findingsResolved: number;
    threatModelsCreated: number;
  }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

const COLORS = {
  primary: '#60B5FF',
  secondary: '#FF9149',
  accent: '#FF9898',
  success: '#72BF78',
  warning: '#FF90BB',
  danger: '#FF6363',
  info: '#80D8C3',
  purple: '#A19AD3',
  critical: '#FF6363',
  high: '#FF9149',
  medium: '#FF90BB',
  low: '#72BF78'
};

export function ThreatModelingAnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (days: string) => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/threat-modeling/analytics?days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const handleRefresh = () => {
    fetchAnalytics(period);
  };

  const formatStatusData = (statusData: any) => [
    { name: 'Open', value: statusData.open, color: COLORS.danger },
    { name: 'In Progress', value: statusData.inProgress, color: COLORS.warning },
    { name: 'Resolved', value: statusData.resolved, color: COLORS.success }
  ];

  const formatSeverityData = (severityData: any) => [
    { name: 'Critical', value: severityData.critical, color: COLORS.critical },
    { name: 'High', value: severityData.high, color: COLORS.high },
    { name: 'Medium', value: severityData.medium, color: COLORS.medium },
    { name: 'Low', value: severityData.low, color: COLORS.low }
  ];

  const formatStrideData = (strideData: any) => [
    { name: 'Spoofing', value: strideData.spoofing },
    { name: 'Tampering', value: strideData.tampering },
    { name: 'Repudiation', value: strideData.repudiation },
    { name: 'Info Disclosure', value: strideData.informationDisclosure },
    { name: 'DoS', value: strideData.denialOfService },
    { name: 'Privilege Escalation', value: strideData.elevationOfPrivilege }
  ];

  const formatSlaData = (slaData: any) => [
    { name: 'Within SLA', value: slaData.withinSla, color: COLORS.success },
    { name: 'Exceeding SLA', value: slaData.exceedingSla, color: COLORS.danger }
  ];

  const formatThreatModelStatusData = (statusData: any) => [
    { name: 'Draft', value: statusData.draft, color: COLORS.info },
    { name: 'Analyzing', value: statusData.analyzing, color: COLORS.warning },
    { name: 'Completed', value: statusData.completed, color: COLORS.success },
    { name: 'Archived', value: statusData.archived, color: COLORS.secondary }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">No threat modeling data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.period.startDate} to {data.period.endDate}
          </Badge>
        </div>
        
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.keyMetrics.totalFindings}</div>
            <p className="text-xs text-muted-foreground">
              {data.keyMetrics.activeThreats} active threats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Models</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.keyMetrics.totalThreatModels}</div>
            <p className="text-xs text-muted-foreground">
              {data.keyMetrics.completedThreatModels} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.keyMetrics.slaComplianceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.slaCompliance.withinSla} within SLA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.keyMetrics.avgResolutionTime}</div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Findings Alert */}
      {data.keyMetrics.criticalFindings > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {data.keyMetrics.criticalFindings} critical findings require immediate attention
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Review and prioritize these high-risk threats
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Findings by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Findings by Status</CardTitle>
            <CardDescription>Current status distribution of all findings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatStatusData(data.findingsByStatus)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {formatStatusData(data.findingsByStatus).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="top" 
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Findings by Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Findings by Severity</CardTitle>
            <CardDescription>Risk level breakdown of security findings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formatSeverityData(data.findingsBySeverity)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <XAxis 
                    dataKey="name" 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>SLA Compliance</CardTitle>
            <CardDescription>Findings within vs exceeding SLA targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatSlaData(data.slaCompliance)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {formatSlaData(data.slaCompliance).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="top" 
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Threat Model Status */}
        <Card>
          <CardHeader>
            <CardTitle>Threat Model Status</CardTitle>
            <CardDescription>Current state of threat modeling projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formatThreatModelStatusData(data.threatModelsByStatus)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <XAxis 
                    dataKey="name" 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full-width Charts */}
      <div className="space-y-6">
        {/* STRIDE Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>STRIDE Category Distribution</CardTitle>
            <CardDescription>Threat classification breakdown by STRIDE methodology</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formatStrideData(data.findingsByStride)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <XAxis 
                    dataKey="name" 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Trends</CardTitle>
            <CardDescription>Daily activity trends for findings and threat models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.trendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Legend 
                    verticalAlign="top" 
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="findingsCreated" 
                    stroke={COLORS.danger} 
                    strokeWidth={2}
                    name="Findings Created"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="findingsResolved" 
                    stroke={COLORS.success} 
                    strokeWidth={2}
                    name="Findings Resolved"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="threatModelsCreated" 
                    stroke={COLORS.primary} 
                    strokeWidth={2}
                    name="Threat Models Created"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Summary</CardTitle>
          <CardDescription>Key insights from your threat modeling data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{data.keyMetrics.slaComplianceRate}% SLA compliance rate</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>{data.keyMetrics.activeThreats} active security threats</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span>{data.keyMetrics.avgResolutionTime} days average resolution</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-500" />
              <span>{data.keyMetrics.totalThreatModels} total threat models</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-500" />
              <span>{data.keyMetrics.criticalFindings} critical findings</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span>{data.keyMetrics.completedThreatModels} completed assessments</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
