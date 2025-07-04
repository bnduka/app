
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Edit, 
  Trash2, 
  ExternalLink, 
  Shield, 
  FileText, 
  Link,
  Building,
  Users,
  Calendar,
  Globe,
  Database,
  Lock,
  Key,
  Tag,
  GitBranch,
  Cloud,
  Server
} from 'lucide-react';
import { ApplicationAssetWithDetails } from '@/lib/types';
import { AssetFormModal } from './asset-form-modal';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface AssetDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: ApplicationAssetWithDetails;
  onAssetUpdated: () => void;
  onAssetDeleted: () => void;
}

export function AssetDetailModal({
  open,
  onOpenChange,
  asset,
  onAssetUpdated,
  onAssetDeleted,
}: AssetDetailModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete asset');
      }

      onAssetDeleted();
      toast.success('Asset deleted successfully');
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete asset');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkThreatModel = async (threatModelId: string) => {
    try {
      const response = await fetch(`/api/assets/${asset.id}/link-threat-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threatModelId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link threat model');
      }

      onAssetUpdated();
      toast.success('Threat model linked successfully');
    } catch (error) {
      console.error('Error linking threat model:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link threat model');
    }
  };

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-2xl">{asset.name}</DialogTitle>
                <div className="flex items-center gap-2">
                  {getStatusBadge(asset.status)}
                  {getCriticalityBadge(asset.businessCriticality)}
                  <Badge variant="outline">{asset.assetType.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline">{asset.environment}</Badge>
                </div>
                {asset.description && (
                  <DialogDescription className="text-base">
                    {asset.description}
                  </DialogDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the asset
                        and remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {loading ? 'Deleting...' : 'Delete Asset'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Asset Type
                        </label>
                        <p className="text-sm font-medium">{asset.assetType.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Environment
                        </label>
                        <p className="text-sm font-medium">{asset.environment}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      {asset.owner && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            <span className="font-medium">Owner:</span> {asset.owner}
                          </span>
                        </div>
                      )}
                      {asset.team && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            <span className="font-medium">Team:</span> {asset.team}
                          </span>
                        </div>
                      )}
                      {asset.businessUnit && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            <span className="font-medium">Business Unit:</span> {asset.businessUnit}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Business Criticality
                        </label>
                        <div className="mt-1">
                          {getCriticalityBadge(asset.businessCriticality)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Data Classification
                        </label>
                        <p className="text-sm font-medium">{asset.dataClassification}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Threat Model Status
                        </label>
                        <Badge variant="outline" className="mt-1">
                          {asset.threatModelStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Design Review Status
                        </label>
                        <Badge variant="outline" className="mt-1">
                          {asset.designReviewStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* URLs and Links */}
                {(asset.applicationUrl || asset.documentationUrl || asset.repositoryUrl) && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Link className="h-5 w-5" />
                        URLs & Documentation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {asset.applicationUrl && (
                          <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Application
                            </label>
                            <a
                              href={asset.applicationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Globe className="h-4 w-4" />
                              {new URL(asset.applicationUrl).hostname}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {asset.documentationUrl && (
                          <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Documentation
                            </label>
                            <a
                              href={asset.documentationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <FileText className="h-4 w-4" />
                              Documentation
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {asset.repositoryUrl && (
                          <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Repository
                            </label>
                            <a
                              href={asset.repositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <GitBranch className="h-4 w-4" />
                              Repository
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-500 dark:text-gray-400">Created</label>
                        <p>{format(new Date(asset.createdAt), 'MMM dd, yyyy')}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-500 dark:text-gray-400">Last Modified</label>
                        <p>{format(new Date(asset.updatedAt), 'MMM dd, yyyy')}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(asset.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      {asset.deploymentDate && (
                        <div>
                          <label className="font-medium text-gray-500 dark:text-gray-400">Deployed</label>
                          <p>{format(new Date(asset.deploymentDate), 'MMM dd, yyyy')}</p>
                        </div>
                      )}
                      {asset.lastSecurityReview && (
                        <div>
                          <label className="font-medium text-gray-500 dark:text-gray-400">Last Security Review</label>
                          <p>{format(new Date(asset.lastSecurityReview), 'MMM dd, yyyy')}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Security Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Security Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Authentication</span>
                        <Badge variant={asset.hasAuthentication ? 'default' : 'secondary'}>
                          {asset.hasAuthentication ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Authorization</span>
                        <Badge variant={asset.hasAuthorization ? 'default' : 'secondary'}>
                          {asset.hasAuthorization ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Encryption in Transit</span>
                        <Badge variant={asset.encryptionInTransit ? 'default' : 'secondary'}>
                          {asset.encryptionInTransit ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Encryption at Rest</span>
                        <Badge variant={asset.encryptionAtRest ? 'default' : 'secondary'}>
                          {asset.encryptionAtRest ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Authentication Methods */}
                {asset.authenticationMethods && asset.authenticationMethods.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Authentication Methods
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {asset.authenticationMethods.map((method) => (
                          <Badge key={method} variant="outline">
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Compliance Requirements */}
                {asset.complianceRequirements && asset.complianceRequirements.length > 0 && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Compliance Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {asset.complianceRequirements.map((req) => (
                          <Badge key={req} variant="secondary">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hosting Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5" />
                      Hosting Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {asset.hostingType && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Hosting Type
                        </label>
                        <p className="text-sm font-medium">{asset.hostingType}</p>
                      </div>
                    )}
                    {asset.hostingProvider && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Provider
                        </label>
                        <p className="text-sm font-medium">{asset.hostingProvider}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Technology Stack */}
                {asset.techStack && asset.techStack.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Technology Stack
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {asset.techStack.map((tech) => (
                          <Badge key={tech} variant="outline">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tags */}
                {asset.tags && asset.tags.length > 0 && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {asset.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="relationships" className="space-y-6">
              {/* Linked Threat Models */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Linked Threat Models
                    <Badge variant="secondary">{asset.linkedThreatModels?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {asset.linkedThreatModels && asset.linkedThreatModels.length > 0 ? (
                    <div className="space-y-3">
                      {asset.linkedThreatModels.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{link.threatModel.name}</p>
                            <p className="text-sm text-gray-500">
                              Status: {link.threatModel.status} • 
                              Created {formatDistanceToNow(new Date(link.threatModel.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant="outline">{link.linkStatus}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No threat models linked to this asset</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Link Threat Model
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Linked Design Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Linked Design Reviews
                    <Badge variant="secondary">{asset.linkedDesignReviews?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {asset.linkedDesignReviews && asset.linkedDesignReviews.length > 0 ? (
                    <div className="space-y-3">
                      {asset.linkedDesignReviews.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{link.designReview.name}</p>
                            <p className="text-sm text-gray-500">
                              Status: {link.designReview.status} • 
                              Created {formatDistanceToNow(new Date(link.designReview.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant="outline">{link.linkStatus}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No design reviews linked to this asset</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Link Design Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <AssetFormModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onAssetCreated={onAssetUpdated}
        asset={asset}
      />
    </>
  );
}
