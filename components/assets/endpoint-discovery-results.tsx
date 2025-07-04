
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search,
  Download,
  Filter,
  AlertTriangle,
  Shield,
  Clock,
  Globe,
  Eye,
  RefreshCw,
  FileText,
  BarChart3,
  X,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface EndpointDiscoveryResultsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

interface DiscoverySession {
  sessionId: string;
  status: string;
  progress: number;
  domain: string;
  createdAt: string;
  scanStartedAt?: string;
  scanCompletedAt?: string;
  scanDuration?: number;
  estimatedTimeRemaining?: number;
  endpointsFound: number;
  highRiskEndpoints: number;
  mediumRiskEndpoints: number;
  lowRiskEndpoints: number;
  anomaliesDetected: number;
  aiSummary?: string;
  insights?: any;
  errorMessage?: string;
  asset: {
    id: string;
    name: string;
    applicationUrl?: string;
  };
}

interface DiscoveredEndpoint {
  id: string;
  url: string;
  method: string;
  path: string;
  statusCode?: number;
  riskLevel?: string;
  riskScore?: number;
  endpointType?: string;
  sensitivity?: string;
  functionPurpose?: string;
  securityConcerns: string[];
  dataExposure: string[];
  isAnomaly: boolean;
  anomalyReason?: string;
  responseTime?: number;
  responseSize?: number;
  contentType?: string;
  discoveredAt: string;
}

interface ResultsData {
  endpoints: DiscoveredEndpoint[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: {
    riskLevels: Record<string, number>;
    endpointTypes: Record<string, number>;
    sensitivities: Record<string, number>;
    anomalies: number;
    averageRiskScore: number;
  };
}

export function EndpointDiscoveryResults({ 
  open, 
  onOpenChange, 
  sessionId 
}: EndpointDiscoveryResultsProps) {
  const { data: session } = useSession();
  const [sessionData, setSessionData] = useState<DiscoverySession | null>(null);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<DiscoveredEndpoint | null>(null);

  // Filters and pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('riskScore');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch session status
  const fetchSessionStatus = async () => {
    try {
      const response = await fetch(`/api/assets/endpoint-discovery/status/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session status');
      
      const data = await response.json();
      setSessionData(data);
      
      // If completed, fetch results
      if (data.status === 'COMPLETED' && !resultsData) {
        fetchResults();
      }
    } catch (error) {
      console.error('Failed to fetch session status:', error);
      toast.error('Failed to load discovery session');
    } finally {
      setLoading(false);
    }
  };

  // Fetch results with filters
  const fetchResults = async () => {
    if (!sessionData || sessionData.status !== 'COMPLETED') return;

    setResultsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.set('search', searchTerm);
      if (riskFilter) params.set('riskLevel', riskFilter);
      if (typeFilter) params.set('endpointType', typeFilter);
      if (anomaliesOnly) params.set('anomaliesOnly', 'true');

      const response = await fetch(`/api/assets/endpoint-discovery/results/${sessionId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch results');
      
      const data = await response.json();
      setResultsData(data);
    } catch (error) {
      console.error('Failed to fetch results:', error);
      toast.error('Failed to load discovery results');
    } finally {
      setResultsLoading(false);
    }
  };

  // Auto-refresh for active sessions
  useEffect(() => {
    if (!open || !sessionId) return;

    fetchSessionStatus();

    // Set up auto-refresh for active sessions
    const interval = setInterval(() => {
      if (sessionData?.status && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(sessionData.status)) {
        fetchSessionStatus();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [open, sessionId, sessionData?.status]);

  // Fetch results when filters change
  useEffect(() => {
    if (sessionData?.status === 'COMPLETED') {
      fetchResults();
    }
  }, [currentPage, searchTerm, riskFilter, typeFilter, anomaliesOnly, sortBy, sortOrder, sessionData?.status]);

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const params = new URLSearchParams({ format });
      if (riskFilter) params.set('riskLevel', riskFilter);
      if (typeFilter) params.set('endpointType', typeFilter);
      if (anomaliesOnly) params.set('anomaliesOnly', 'true');

      const response = await fetch(`/api/assets/endpoint-discovery/export/${sessionId}?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `endpoint-discovery-${sessionData?.domain}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Results exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export results');
    }
  };

  const getRiskBadgeColor = (riskLevel?: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderProgressView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {sessionData?.domain}
            </span>
            <Badge variant={getStatusBadgeColor(sessionData?.status || '')}>
              {sessionData?.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionData?.status && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(sessionData.status) && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{sessionData?.progress || 0}%</span>
                </div>
                <Progress value={sessionData?.progress || 0} className="w-full" />
              </div>
              
              {sessionData?.estimatedTimeRemaining && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Estimated time remaining: {formatDuration(Math.floor(sessionData.estimatedTimeRemaining / 1000))}
                </p>
              )}
            </>
          )}

          {sessionData?.scanStartedAt && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Started:</span>
                <p>{new Date(sessionData.scanStartedAt).toLocaleString()}</p>
              </div>
              {sessionData.scanCompletedAt && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <p>{new Date(sessionData.scanCompletedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {sessionData?.errorMessage && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              {sessionData.errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {sessionData?.status === 'COMPLETED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Discovery Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{sessionData.endpointsFound}</div>
                <div className="text-sm text-muted-foreground">Total Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{sessionData.highRiskEndpoints}</div>
                <div className="text-sm text-muted-foreground">High Risk</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{sessionData.mediumRiskEndpoints}</div>
                <div className="text-sm text-muted-foreground">Medium Risk</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{sessionData.anomaliesDetected}</div>
                <div className="text-sm text-muted-foreground">Anomalies</div>
              </div>
            </div>

            {sessionData.aiSummary && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">AI Analysis Summary</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">{sessionData.aiSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderResultsView = () => (
    <Tabs defaultValue="endpoints" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="endpoints" className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search endpoints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Risks</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="LOGIN_PAGE">Login</SelectItem>
                  <SelectItem value="API_ENDPOINT">API</SelectItem>
                  <SelectItem value="ADMIN_PANEL">Admin</SelectItem>
                  <SelectItem value="FILE_UPLOAD">Upload</SelectItem>
                  <SelectItem value="FORM_SUBMISSION">Form</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={anomaliesOnly ? "default" : "outline"}
                onClick={() => setAnomaliesOnly(!anomaliesOnly)}
                size="sm"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Anomalies
              </Button>

              <Button variant="outline" onClick={() => handleExport('csv')} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardContent className="p-0">
            {resultsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading results...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultsData?.endpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-mono text-sm max-w-[300px] truncate">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {endpoint.method}
                          </Badge>
                          <span title={endpoint.url}>{endpoint.path}</span>
                          {endpoint.isAnomaly && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {endpoint.endpointType?.replace('_', ' ') || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeColor(endpoint.riskLevel) as any}>
                          {endpoint.riskLevel} ({endpoint.riskScore?.toFixed(1)})
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={endpoint.statusCode && endpoint.statusCode < 400 ? "secondary" : "destructive"}>
                          {endpoint.statusCode || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {endpoint.functionPurpose || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEndpoint(endpoint)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(endpoint.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {resultsData?.pagination && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((resultsData.pagination.currentPage - 1) * resultsData.pagination.limit) + 1} to{' '}
              {Math.min(resultsData.pagination.currentPage * resultsData.pagination.limit, resultsData.pagination.totalCount)} of{' '}
              {resultsData.pagination.totalCount} endpoints
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!resultsData.pagination.hasPreviousPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!resultsData.pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="analytics" className="space-y-4">
        {/* Analytics content would go here */}
        <Card>
          <CardHeader>
            <CardTitle>Discovery Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Analytics charts and insights would be displayed here.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading discovery session...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Endpoint Discovery Results
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Asset: {sessionData?.asset.name} • Domain: {sessionData?.domain}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {sessionData?.status === 'COMPLETED' ? renderResultsView() : renderProgressView()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
