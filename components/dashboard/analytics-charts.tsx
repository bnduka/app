
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  PieChartIcon,
  Activity
} from 'lucide-react';

interface AnalyticsData {
  threatStatus: {
    open: number;
    inProgress: number;
    resolved: number;
  };
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  slaCompliance: {
    withinSLA: number;
    overdueSLA: number;
    criticalOverdue: number;
  };
  monthlyTrends: Array<{
    month: string;
    threatsIdentified: number;
    threatsResolved: number;
  }>;
}

const COLORS = {
  open: '#ff6b6b',
  inProgress: '#ffa726', 
  resolved: '#66bb6a',
  critical: '#f44336',
  high: '#ff9800',
  medium: '#ffeb3b',
  low: '#4caf50',
  withinSLA: '#4caf50',
  overdueSLA: '#ff9800',
  criticalOverdue: '#f44336',
};

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch('/api/dashboard/analytics');
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        throw new Error('Failed to fetch analytics data');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  // Prepare data for charts
  const threatStatusData = [
    { name: 'Open', value: data.threatStatus.open, color: COLORS.open },
    { name: 'In Progress', value: data.threatStatus.inProgress, color: COLORS.inProgress },
    { name: 'Resolved', value: data.threatStatus.resolved, color: COLORS.resolved },
  ];

  const severityData = [
    { name: 'Critical', value: data.severityBreakdown.critical, color: COLORS.critical },
    { name: 'High', value: data.severityBreakdown.high, color: COLORS.high },
    { name: 'Medium', value: data.severityBreakdown.medium, color: COLORS.medium },
    { name: 'Low', value: data.severityBreakdown.low, color: COLORS.low },
  ];

  const slaComplianceData = [
    { name: 'Within SLA', value: data.slaCompliance.withinSLA, color: COLORS.withinSLA },
    { name: 'Overdue', value: data.slaCompliance.overdueSLA, color: COLORS.overdueSLA },
    { name: 'Critical Overdue', value: data.slaCompliance.criticalOverdue, color: COLORS.criticalOverdue },
  ];

  const totalThreats = data.threatStatus.open + data.threatStatus.inProgress + data.threatStatus.resolved;
  const resolvedPercentage = totalThreats > 0 ? Math.round((data.threatStatus.resolved / totalThreats) * 100) : 0;
  const slaCompliancePercentage = totalThreats > 0 ? Math.round((data.slaCompliance.withinSLA / totalThreats) * 100) : 0;

  const renderCustomizedLabel = (entry: any) => {
    if (entry.value === 0) return null;
    return `${entry.name}: ${entry.value}`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            {resolvedPercentage >= 70 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {data.threatStatus.resolved} of {totalThreats} threats resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
            {slaCompliancePercentage >= 80 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slaCompliancePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {data.slaCompliance.withinSLA} threats within SLA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.slaCompliance.overdueSLA + data.slaCompliance.criticalOverdue}</div>
            <p className="text-xs text-muted-foreground">
              {data.slaCompliance.criticalOverdue} critical overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-600" />
              Threat Status Distribution
            </CardTitle>
            <CardDescription>
              Current status of all identified threats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={threatStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {threatStatusData.map((entry, index) => (
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
          </CardContent>
        </Card>

        {/* Severity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              Severity Breakdown
            </CardTitle>
            <CardDescription>
              Distribution by threat severity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="value">
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              SLA Compliance Status
            </CardTitle>
            <CardDescription>
              Threats meeting SLA requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={slaComplianceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {slaComplianceData.map((entry, index) => (
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
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Monthly Trends
            </CardTitle>
            <CardDescription>
              Threats identified vs resolved over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <Tooltip />
                <Legend 
                  verticalAlign="top"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="threatsIdentified" 
                  stroke="#ff6b6b" 
                  strokeWidth={2}
                  name="Identified"
                />
                <Line 
                  type="monotone" 
                  dataKey="threatsResolved" 
                  stroke="#66bb6a" 
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
