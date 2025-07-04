
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Shield,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  Activity
} from 'lucide-react';
import { ApplicationAssetWithDetails, AssetDashboardStats, EndpointDiscoverySession } from '@/lib/types';
import { AssetStatsCards } from './asset-stats-cards';
import { AssetListTable } from './asset-list-table';
import { AssetFormModal } from './asset-form-modal';
import { AssetDetailModal } from './asset-detail-modal';
import { AssetFilters } from './asset-filters';
import { EndpointDiscoveryModal } from './endpoint-discovery-modal';
import { EndpointDiscoveryResults } from './endpoint-discovery-results';
import { toast } from 'sonner';

export function AssetManagementContent() {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<ApplicationAssetWithDetails[]>([]);
  const [stats, setStats] = useState<AssetDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<ApplicationAssetWithDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});
  
  // Endpoint Discovery state
  const [showEndpointDiscoveryModal, setShowEndpointDiscoveryModal] = useState(false);
  const [showEndpointResultsModal, setShowEndpointResultsModal] = useState(false);
  const [endpointDiscoveryAsset, setEndpointDiscoveryAsset] = useState<ApplicationAssetWithDetails | null>(null);
  const [activeDiscoverySessionId, setActiveDiscoverySessionId] = useState<string | null>(null);
  const [discoverySessions, setDiscoverySessions] = useState<EndpointDiscoverySession[]>([]);

  const fetchAssets = async (page = 1, search = '', appliedFilters = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...appliedFilters,
      });

      const response = await fetch(`/api/assets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch assets');
      
      const data = await response.json();
      setAssets(data.assets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/assets/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAssets(), fetchStats()]);
      setLoading(false);
    };

    if (session) {
      loadData();
    }
  }, [session]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAssets(1, searchTerm, filters);
  };

  const handleFilterApply = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
    fetchAssets(1, searchTerm, newFilters);
    setShowFilters(false);
  };

  const handleAssetCreated = () => {
    setShowCreateModal(false);
    fetchAssets(currentPage, searchTerm, filters);
    fetchStats();
    toast.success('Asset created successfully');
  };

  const handleAssetUpdated = () => {
    setShowDetailModal(false);
    setSelectedAsset(null);
    fetchAssets(currentPage, searchTerm, filters);
    fetchStats();
    toast.success('Asset updated successfully');
  };

  const handleAssetDeleted = () => {
    setShowDetailModal(false);
    setSelectedAsset(null);
    fetchAssets(currentPage, searchTerm, filters);
    fetchStats();
    toast.success('Asset deleted successfully');
  };

  const handleAssetView = (asset: ApplicationAssetWithDetails) => {
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  // Endpoint Discovery functions
  const fetchDiscoverySessions = async () => {
    try {
      // This would be implemented with a proper API endpoint to fetch sessions
      // For now, we'll keep track of sessions in state
    } catch (error) {
      console.error('Error fetching discovery sessions:', error);
    }
  };

  const handleStartEndpointDiscovery = (asset: ApplicationAssetWithDetails) => {
    setEndpointDiscoveryAsset(asset);
    setShowEndpointDiscoveryModal(true);
  };

  const handleDiscoveryStarted = (sessionId: string) => {
    setActiveDiscoverySessionId(sessionId);
    setShowEndpointDiscoveryModal(false);
    setShowEndpointResultsModal(true);
    toast.success('Endpoint discovery started successfully');
  };

  const handleViewDiscoveryResults = (sessionId: string) => {
    setActiveDiscoverySessionId(sessionId);
    setShowEndpointResultsModal(true);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/assets/export?format=${format}`);
      if (!response.ok) throw new Error('Failed to export assets');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `assets-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Assets exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting assets:', error);
      toast.error('Failed to export assets');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Asset Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Catalog and manage your application assets with comprehensive security tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && <AssetStatsCards stats={stats} />}

      {/* Main Content Tabs */}
      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Asset Management
          </TabsTrigger>
          <TabsTrigger value="endpoint-discovery" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Endpoint Discovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-6">
          {/* Filters */}
          {showFilters && (
            <Card>
              <CardContent className="pt-6">
                <AssetFilters onApply={handleFilterApply} />
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search assets by name, description, owner, or team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Assets Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Application Assets
                <Badge variant="secondary" className="ml-2">
                  {assets.length} assets
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssetListTable
                assets={assets}
                onAssetView={handleAssetView}
                onAssetEdit={handleAssetView}
                onStartEndpointDiscovery={handleStartEndpointDiscovery}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoint-discovery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Automated Endpoint Discovery
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                AI-powered endpoint discovery and security classification for your application assets
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.filter(asset => asset.applicationUrl).map((asset) => (
                  <Card key={asset.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{asset.name}</h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {asset.applicationUrl}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {asset.assetType.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleStartEndpointDiscovery(asset)}
                            className="flex-1"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Discover Endpoints
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssetView(asset)}
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {assets.filter(asset => asset.applicationUrl).length === 0 && (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Web Assets Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Add application assets with URLs to start endpoint discovery
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Web Asset
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AssetFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onAssetCreated={handleAssetCreated}
      />

      {selectedAsset && (
        <AssetDetailModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          asset={selectedAsset}
          onAssetUpdated={handleAssetUpdated}
          onAssetDeleted={handleAssetDeleted}
        />
      )}

      {/* Endpoint Discovery Modals */}
      {endpointDiscoveryAsset && (
        <EndpointDiscoveryModal
          open={showEndpointDiscoveryModal}
          onOpenChange={setShowEndpointDiscoveryModal}
          asset={endpointDiscoveryAsset}
          onDiscoveryStarted={handleDiscoveryStarted}
        />
      )}

      {activeDiscoverySessionId && (
        <EndpointDiscoveryResults
          open={showEndpointResultsModal}
          onOpenChange={setShowEndpointResultsModal}
          sessionId={activeDiscoverySessionId}
        />
      )}
    </div>
  );
}
