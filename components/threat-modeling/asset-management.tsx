
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Database, 
  Globe, 
  Server, 
  Shield,
  Upload,
  Network,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { AssetWithDetails, AssetType } from '@/lib/types';
import { AssetFormModal } from './asset-form-modal';
import { AssetExtractionModal } from './asset-extraction-modal';

interface AssetManagementProps {
  threatModelId: string;
}

export function AssetManagement({ threatModelId }: AssetManagementProps) {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [extractionModalOpen, setExtractionModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetWithDetails | null>(null);

  useEffect(() => {
    fetchAssets();
  }, [threatModelId]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assets?threatModelId=${threatModelId}`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      } else {
        toast.error('Failed to fetch assets');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Error fetching assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetCreated = (newAsset: AssetWithDetails) => {
    setAssets(prev => [newAsset, ...prev]);
    setAssetFormOpen(false);
    setEditingAsset(null);
  };

  const handleAssetUpdated = (updatedAsset: AssetWithDetails) => {
    setAssets(prev => prev.map(asset => 
      asset.id === updatedAsset.id ? updatedAsset : asset
    ));
    setAssetFormOpen(false);
    setEditingAsset(null);
  };

  const handleEditAsset = (asset: AssetWithDetails) => {
    setEditingAsset(asset);
    setAssetFormOpen(true);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset? This will also remove all finding-asset relationships.')) {
      return;
    }

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAssets(prev => prev.filter(asset => asset.id !== assetId));
        toast.success('Asset deleted successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete asset');
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Network error occurred');
    }
  };

  const handleAssetsExtracted = (extractedAssets: AssetWithDetails[]) => {
    setAssets(prev => [...extractedAssets, ...prev]);
    setExtractionModalOpen(false);
  };

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'API':
        return <Globe className="h-4 w-4" />;
      case 'DATABASE':
        return <Database className="h-4 w-4" />;
      case 'SERVICE':
      case 'MICROSERVICE':
        return <Server className="h-4 w-4" />;
      case 'AUTHENTICATION_SYSTEM':
        return <Shield className="h-4 w-4" />;
      case 'NETWORK_COMPONENT':
      case 'LOAD_BALANCER':
        return <Network className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getAssetTypeColor = (type: AssetType) => {
    const colors = {
      API: 'bg-blue-100 text-blue-800 border-blue-200',
      DATABASE: 'bg-green-100 text-green-800 border-green-200',
      SERVICE: 'bg-purple-100 text-purple-800 border-purple-200',
      COMPONENT: 'bg-orange-100 text-orange-800 border-orange-200',
      DATA_FLOW: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      EXTERNAL_DEPENDENCY: 'bg-red-100 text-red-800 border-red-200',
      USER_INTERFACE: 'bg-pink-100 text-pink-800 border-pink-200',
      AUTHENTICATION_SYSTEM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      FILE_SYSTEM: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      NETWORK_COMPONENT: 'bg-teal-100 text-teal-800 border-teal-200',
      THIRD_PARTY_INTEGRATION: 'bg-rose-100 text-rose-800 border-rose-200',
      MICROSERVICE: 'bg-violet-100 text-violet-800 border-violet-200',
      MESSAGE_QUEUE: 'bg-amber-100 text-amber-800 border-amber-200',
      CACHE: 'bg-lime-100 text-lime-800 border-lime-200',
      LOAD_BALANCER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[type] || colors.OTHER;
  };

  const groupedAssets = assets.reduce((groups, asset) => {
    if (!groups[asset.type]) {
      groups[asset.type] = [];
    }
    groups[asset.type].push(asset);
    return groups;
  }, {} as Record<AssetType, AssetWithDetails[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading assets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asset Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage system assets and their relationships to threat findings
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExtractionModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Extract from Document
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingAsset(null);
              setAssetFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {assets.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No assets found. Add assets manually or extract them from technical specifications.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Asset List</TabsTrigger>
            <TabsTrigger value="grouped">Grouped by Type</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-3">
            {assets.map((asset) => (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getAssetIcon(asset.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <CardTitle className="text-base">{asset.name}</CardTitle>
                          <Badge className={getAssetTypeColor(asset.type)}>
                            {asset.type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <CardDescription>
                          {asset.description || 'No description provided'}
                        </CardDescription>
                        {asset.findingAssets?.length > 0 && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {asset.findingAssets.length} finding(s) linked
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAsset(asset)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {asset.properties && (
                  <CardContent className="pt-0">
                    <div className="text-xs text-muted-foreground">
                      <strong>Properties:</strong> {asset.properties}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="grouped" className="space-y-4">
            {Object.entries(groupedAssets).map(([type, typeAssets]) => (
              <Card key={type}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    {getAssetIcon(type as AssetType)}
                    <CardTitle className="text-base">
                      {type.replace(/_/g, ' ')} ({typeAssets.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {typeAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{asset.name}</div>
                        {asset.description && (
                          <div className="text-sm text-muted-foreground">
                            {asset.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {asset.findingAssets?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {asset.findingAssets.length} finding(s)
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAsset(asset)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Modals */}
      <AssetFormModal
        open={assetFormOpen}
        onOpenChange={setAssetFormOpen}
        threatModelId={threatModelId}
        asset={editingAsset}
        onAssetCreated={handleAssetCreated}
        onAssetUpdated={handleAssetUpdated}
      />

      <AssetExtractionModal
        open={extractionModalOpen}
        onOpenChange={setExtractionModalOpen}
        threatModelId={threatModelId}
        onAssetsExtracted={handleAssetsExtracted}
      />
    </div>
  );
}
