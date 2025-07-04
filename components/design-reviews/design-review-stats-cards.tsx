
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  BarChart3, 
  CheckCircle, 
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { DesignReviewDashboardStats } from '@/lib/types';

interface DesignReviewStatsCardsProps {
  stats: DesignReviewDashboardStats;
}

export function DesignReviewStatsCards({ stats }: DesignReviewStatsCardsProps) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      case 'F': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'VERY_LOW': return 'bg-green-500';
      case 'LOW': return 'bg-blue-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'VERY_HIGH': return 'bg-red-500';
      case 'CRITICAL': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'UNDER_REVIEW': return 'bg-yellow-500';
      case 'DRAFT': return 'bg-gray-500';
      case 'CANCELLED': return 'bg-red-500';
      case 'ARCHIVED': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Reviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalReviews}</div>
          <p className="text-xs text-muted-foreground">
            Security design assessments
          </p>
        </CardContent>
      </Card>

      {/* Average Security Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageSecurityScore}</div>
          <p className="text-xs text-muted-foreground">
            Out of 100 points
          </p>
        </CardContent>
      </Card>

      {/* Completed This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completedReviewsThisMonth}</div>
          <p className="text-xs text-muted-foreground">
            Reviews finished
          </p>
        </CardContent>
      </Card>

      {/* Pending Reviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingReviews}</div>
          <p className="text-xs text-muted-foreground">
            Awaiting completion
          </p>
        </CardContent>
      </Card>

      {/* Reviews by Status */}
      <Card className="col-span-full md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Reviews by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.reviewsByStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                  <span className="text-sm">{status.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reviews by Security Grade */}
      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Security Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.reviewsByGrade.map(({ grade, count }) => (
              <div key={grade} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getGradeColor(grade)}`} />
                  <span className="text-sm font-medium">Grade {grade}</span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reviews by Risk Level */}
      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.reviewsByRisk.map(({ risk, count }) => (
              <div key={risk} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getRiskColor(risk)}`} />
                  <span className="text-sm">{risk.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
