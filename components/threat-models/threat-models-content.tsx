
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  ChevronRight,
  Eye,
  Trash2,
  RefreshCw,
  Plus,
  Users,
  Calendar,
  BarChart3,
  Network
} from 'lucide-react';
import Link from 'next/link';
import { ThreatModelDiagram } from '@/components/threat-modeling/threat-model-diagram';
import { toast } from 'sonner';

interface ThreatModel {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ANALYZING' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    organizationId?: string;
  };
  findings: Array<{
    id: string;
    threatScenario: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    strideCategory: string;
  }>;
  reports: Array<{
    id: string;
    name: string;
    format: string;
  }>;
  fileUploads: Array<{
    id: string;
    originalName: string;
    fileSize: number;
  }>;
}

export function ThreatModelsContent() {
  const { data: session } = useSession();
  const [threatModels, setThreatModels] = useState<ThreatModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [modelsWithDiagrams, setModelsWithDiagrams] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<ThreatModel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterFindings, setFilterFindings] = useState<string>('');

  const fetchThreatModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/threat-models');
      if (!response.ok) {
        throw new Error('Failed to fetch threat models');
      }

      const data = await response.json();
      setThreatModels(data.threatModels || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleModelExpansion = (modelId: string) => {
    setExpandedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };

  const toggleDiagramView = (modelId: string) => {
    setModelsWithDiagrams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };

  const canDeleteThreatModel = (model: ThreatModel) => {
    if (!session?.user) return false;
    
    const userRole = session.user.role;
    const userOrgId = session.user.organizationId;
    
    // Platform admins can delete any threat model
    if (userRole === 'ADMIN') return true;
    
    // Business admins can delete threat models in their organization
    if (userRole === 'BUSINESS_ADMIN' && userOrgId === model.user.organizationId) return true;
    
    // Users can delete their own threat models
    if (model.user.id === session.user.id) return true;
    
    return false;
  };

  const handleDeleteClick = (model: ThreatModel) => {
    setModelToDelete(model);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!modelToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/threat-models/${modelToDelete.id}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Threat model deleted successfully');
        setThreatModels(prev => prev.filter(m => m.id !== modelToDelete.id));
        setDeleteDialogOpen(false);
        setModelToDelete(null);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete threat model');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchThreatModels();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ANALYZING':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'DRAFT':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'ARCHIVED':
        return <Shield className="h-4 w-4 text-gray-400" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      COMPLETED: 'default',
      ANALYZING: 'secondary',
      DRAFT: 'outline',
      ARCHIVED: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toLowerCase()}
      </Badge>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      case 'LOW':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredThreatModels = threatModels.filter(model => {
    // Search term filter
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === '' || model.status === filterStatus;
    
    // Findings filter
    let matchesFindings = true;
    if (filterFindings === 'critical') {
      matchesFindings = model.findings.some(f => f.severity === 'CRITICAL');
    } else if (filterFindings === 'all') {
      matchesFindings = model.findings.length > 0;
    }
    
    return matchesSearch && matchesStatus && matchesFindings;
  });

  const getStats = () => {
    const total = threatModels.length;
    const completed = threatModels.filter(m => m.status === 'COMPLETED').length;
    const analyzing = threatModels.filter(m => m.status === 'ANALYZING').length;
    const totalFindings = threatModels.reduce((sum, m) => sum + m.findings.length, 0);
    const criticalFindings = threatModels.reduce(
      (sum, m) => sum + m.findings.filter(f => f.severity === 'CRITICAL').length, 
      0
    );

    return { total, completed, analyzing, totalFindings, criticalFindings };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading threat models...</span>
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

  return (
    <div className="space-y-6">
      {/* Clickable Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSearchTerm('')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Click to view all</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('COMPLETED')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Click to filter</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('ANALYZING')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyzing</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.analyzing}</div>
            <p className="text-xs text-muted-foreground">Click to filter</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterFindings('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFindings}</div>
            <p className="text-xs text-muted-foreground">Click to view findings</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterFindings('critical')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.criticalFindings}</div>
            <p className="text-xs text-muted-foreground">Click to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search threat models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchThreatModels}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/threat-models/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Threat Model
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Filters */}
      {(filterStatus || filterFindings || searchTerm) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchTerm('')}>
              Search: "{searchTerm}" ×
            </Badge>
          )}
          {filterStatus && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterStatus('')}>
              Status: {filterStatus.toLowerCase()} ×
            </Badge>
          )}
          {filterFindings && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterFindings('')}>
              Findings: {filterFindings} ×
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('');
              setFilterFindings('');
            }}
            className="text-xs"
          >
            Clear all filters
          </Button>
        </div>
      )}

      {/* Threat Models List */}
      {filteredThreatModels.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No threat models found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No models match your search criteria.' : 'Start by creating your first threat model.'}
            </p>
            {!searchTerm && (
              <Link href="/threat-models/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Threat Model
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredThreatModels.map((model) => (
            <Card key={model.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(model.status)}
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      {getStatusBadge(model.status)}
                    </div>
                    {model.description && (
                      <CardDescription className="line-clamp-2">
                        {model.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Findings Summary */}
                {model.findings.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Findings ({model.findings.length})</span>
                      <Link href={`/findings?threatModel=${model.id}`}>
                        <Button variant="ghost" size="sm">
                          View All <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => {
                        const count = model.findings.filter(f => f.severity === severity).length;
                        if (count === 0) return null;
                        return (
                          <Badge 
                            key={severity} 
                            variant="outline" 
                            className={getSeverityColor(severity)}
                          >
                            {count} {severity.toLowerCase()}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Files and Reports */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    {model.fileUploads.length > 0 && (
                      <span className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        {model.fileUploads.length} file(s)
                      </span>
                    )}
                    {model.reports.length > 0 && (
                      <span className="flex items-center">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {model.reports.length} report(s)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(model.createdAt), { addSuffix: true })}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleModelExpansion(model.id)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {expandedModels.has(model.id) ? 'Hide Details' : 'View Details'}
                    </Button>
                    {model.findings.length > 0 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDiagramView(model.id)}
                        >
                          <Network className="h-3 w-3 mr-1" />
                          {modelsWithDiagrams.has(model.id) ? 'Hide Diagram' : 'Show Diagram'}
                        </Button>
                        <Link href={`/findings?threatModel=${model.id}`}>
                          <Button variant="ghost" size="sm">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Findings
                          </Button>
                        </Link>
                      </>
                    )}
                    {canDeleteThreatModel(model) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(model)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {model.id.slice(-8)}
                  </div>
                </div>
              </CardContent>
              
              {/* Expanded Details Section */}
              {expandedModels.has(model.id) && (
                <div className="border-t bg-muted/30 p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Basic Information</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Status:</span> {getStatusBadge(model.status)}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {formatDistanceToNow(new Date(model.createdAt), { addSuffix: true })}
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span> {formatDistanceToNow(new Date(model.updatedAt), { addSuffix: true })}
                          </div>
                          {model.description && (
                            <div>
                              <span className="font-medium">Description:</span>
                              <p className="mt-1 text-muted-foreground">{model.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Total Findings:</span> {model.findings.length}
                          </div>
                          <div>
                            <span className="font-medium">Files Analyzed:</span> {model.fileUploads.length}
                          </div>
                          <div>
                            <span className="font-medium">Reports Generated:</span> {model.reports.length}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Threat Model Diagram */}
                    {modelsWithDiagrams.has(model.id) && model.findings.length > 0 && (
                      <div className="mt-6">
                        <ThreatModelDiagram 
                          threatModel={model}
                          className="w-full"
                        />
                      </div>
                    )}

                    {model.findings.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Recent Findings</h4>
                        <div className="space-y-2">
                          {model.findings.slice(0, 3).map((finding) => (
                            <div key={finding.id} className="flex items-center justify-between p-2 bg-background rounded border">
                              <div className="flex items-center space-x-2">
                                <Badge className={getSeverityColor(finding.severity)}>
                                  {finding.severity}
                                </Badge>
                                <span className="text-sm font-medium">{finding.threatScenario}</span>
                              </div>
                              <Badge variant="outline">
                                {finding.strideCategory}
                              </Badge>
                            </div>
                          ))}
                          {model.findings.length > 3 && (
                            <Link href={`/findings?threatModel=${model.id}`}>
                              <Button variant="outline" size="sm" className="w-full">
                                View All {model.findings.length} Findings
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Threat Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{modelToDelete?.name}"? This action cannot be undone and will permanently remove:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The threat model and all its data</li>
                <li>All associated findings ({modelToDelete?.findings.length || 0} findings)</li>
                <li>All uploaded files ({modelToDelete?.fileUploads.length || 0} files)</li>
                <li>All generated reports ({modelToDelete?.reports.length || 0} reports)</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
