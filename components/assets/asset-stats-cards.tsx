
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Building
} from 'lucide-react';
import { AssetDashboardStats } from '@/lib/types';

interface AssetStatsCardsProps {
  stats: AssetDashboardStats;
}

export function AssetStatsCards({ stats }: AssetStatsCardsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'INACTIVE': return 'bg-gray-500';
      case 'DEPRECATED': return 'bg-yellow-500';
      case 'DECOMMISSIONED': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'VERY_HIGH': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      case 'VERY_LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Assets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAssets}</div>
          <p className="text-xs text-muted-foreground">
            Across all environments
          </p>
        </CardContent>
      </Card>

      {/* Threat Modeled */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Threat Modeled</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.threatModeledAssets}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalAssets > 0 
              ? `${Math.round((stats.threatModeledAssets / stats.totalAssets) * 100)}% coverage`
              : '0% coverage'
            }
          </p>
        </CardContent>
      </Card>

      {/* Design Reviewed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Design Reviewed</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.designReviewedAssets}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalAssets > 0 
              ? `${Math.round((stats.designReviewedAssets / stats.totalAssets) * 100)}% coverage`
              : '0% coverage'
            }
          </p>
        </CardContent>
      </Card>

      {/* High Risk Assets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Risk Assets</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.highRiskAssets}</div>
          <p className="text-xs text-muted-foreground">
            Require immediate attention
          </p>
        </CardContent>
      </Card>

      {/* Assets by Type */}
      <Card className="col-span-full md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Assets by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.assetsByType.map(({ type, count }) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type.replace(/_/g, ' ')}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assets by Status */}
      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.assetsByStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                  <span className="text-sm">{status}</span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assets by Criticality */}
      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Business Criticality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.assetsByCriticality.map(({ criticality, count }) => (
              <div key={criticality} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getCriticalityColor(criticality)}`} />
                  <span className="text-sm">{criticality.replace(/_/g, ' ')}</span>
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
