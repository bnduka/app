
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Eye, 
  Edit, 
  MoreHorizontal, 
  Shield, 
  FileText,
  ExternalLink,
  Building,
  Users,
  Zap
} from 'lucide-react';
import { ApplicationAssetWithDetails } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface AssetListTableProps {
  assets: ApplicationAssetWithDetails[];
  onAssetView: (asset: ApplicationAssetWithDetails) => void;
  onAssetEdit: (asset: ApplicationAssetWithDetails) => void;
  onStartEndpointDiscovery?: (asset: ApplicationAssetWithDetails) => void;
}

export function AssetListTable({ assets, onAssetView, onAssetEdit, onStartEndpointDiscovery }: AssetListTableProps) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ACTIVE: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      INACTIVE: { variant: 'secondary' },
      DEPRECATED: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      DECOMMISSIONED: { variant: 'destructive' },
      PLANNED: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      DEVELOPMENT: { variant: 'outline' },
      TESTING: { variant: 'outline' },
      MAINTENANCE: { variant: 'secondary' },
    };

    const config = variants[status] || { variant: 'secondary' };
    return (
      <Badge {...config}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getCriticalityBadge = (criticality: string) => {
    const variants: Record<string, any> = {
      VERY_HIGH: { variant: 'destructive' },
      HIGH: { variant: 'outline', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      MEDIUM: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      LOW: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      VERY_LOW: { variant: 'outline', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    };

    const config = variants[criticality] || { variant: 'secondary' };
    return (
      <Badge {...config}>
        {criticality.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getThreatModelStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      NOT_STARTED: { variant: 'outline', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
      IN_PROGRESS: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      COMPLETED: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      NOT_APPLICABLE: { variant: 'secondary' },
    };

    const config = variants[status] || { variant: 'secondary' };
    return (
      <Badge {...config} className="text-xs">
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(assets.map(asset => asset.id));
    } else {
      setSelectedAssets([]);
    }
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssets(prev => [...prev, assetId]);
    } else {
      setSelectedAssets(prev => prev.filter(id => id !== assetId));
    }
  };

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No assets found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Start by adding your first application asset to begin tracking security assessments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedAssets.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedAssets.length} asset(s) selected
          </span>
          <Button size="sm" variant="outline">
            Bulk Actions
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedAssets.length === assets.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Security Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell>
                  <Checkbox
                    checked={selectedAssets.includes(asset.id)}
                    onCheckedChange={(checked) => handleSelectAsset(asset.id, !!checked)}
                  />
                </TableCell>
                <TableCell onClick={() => onAssetView(asset)}>
                  <div className="space-y-1">
                    <div className="font-medium">{asset.name}</div>
                    {asset.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {asset.description}
                      </div>
                    )}
                    {asset.applicationUrl && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <ExternalLink className="h-3 w-3" />
                        {new URL(asset.applicationUrl).hostname}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => onAssetView(asset)}>
                  <Badge variant="outline">
                    {asset.assetType.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => onAssetView(asset)}>
                  {getStatusBadge(asset.status)}
                </TableCell>
                <TableCell onClick={() => onAssetView(asset)}>
                  {getCriticalityBadge(asset.businessCriticality)}
                </TableCell>
                <TableCell onClick={() => onAssetView(asset)}>
                  <Badge variant="outline" className="text-xs">
                    {asset.environment}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => onAssetView(asset)}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {getThreatModelStatusBadge(asset.threatModelStatus)}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {getThreatModelStatusBadge(asset.designReviewStatus)}
                    </div>
                  </div>
                </TableCell>
                <TableCell onClick={() => onAssetView(asset)}>
                  <div className="space-y-1">
                    {asset.owner && (
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        {asset.owner}
                      </div>
                    )}
                    {asset.team && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {asset.team}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => onAssetView(asset)}>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(asset.updatedAt), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAssetView(asset)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAssetEdit(asset)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Asset
                      </DropdownMenuItem>
                      {asset.applicationUrl && onStartEndpointDiscovery && (
                        <DropdownMenuItem onClick={() => onStartEndpointDiscovery(asset)}>
                          <Zap className="h-4 w-4 mr-2" />
                          Discover Endpoints
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
