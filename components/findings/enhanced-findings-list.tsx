
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus,
  Link as LinkIcon,
  Tag as TagIcon,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { FindingWithEnhancedDetails, TagWithDetails, AssetWithDetails } from '@/lib/types';
import { AssetLinkingModal } from './asset-linking-modal';
import { TaggingModal } from './tagging-modal';

interface EnhancedFindingsListProps {
  threatModelId: string;
  findings: FindingWithEnhancedDetails[];
  onFindingUpdate: (findings: FindingWithEnhancedDetails[]) => void;
}

export function EnhancedFindingsList({ 
  threatModelId, 
  findings, 
  onFindingUpdate 
}: EnhancedFindingsListProps) {
  const { data: session } = useSession();
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [availableAssets, setAvailableAssets] = useState<AssetWithDetails[]>([]);
  const [availableTags, setAvailableTags] = useState<TagWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableAssets();
    fetchAvailableTags();
  }, [threatModelId]);

  const fetchAvailableAssets = async () => {
    try {
      const response = await fetch(`/api/assets?threatModelId=${threatModelId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const response = await fetch('/api/tags?includeSystem=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const toggleFindingExpansion = (findingId: string) => {
    setExpandedFindings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(findingId)) {
        newSet.delete(findingId);
      } else {
        newSet.add(findingId);
      }
      return newSet;
    });
  };

  const openAssetLinking = (findingId: string) => {
    setSelectedFindingId(findingId);
    setAssetModalOpen(true);
  };

  const openTagging = (findingId: string) => {
    setSelectedFindingId(findingId);
    setTagModalOpen(true);
  };

  const handleAssetLinked = async () => {
    // Refresh findings data after asset linking
    toast.success('Asset linked successfully');
    // You would typically call a parent callback to refresh the data
  };

  const handleTagAdded = async () => {
    // Refresh findings data after tagging
    toast.success('Tag added successfully');
    // You would typically call a parent callback to refresh the data
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'MEDIUM':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'LOW':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNewGenerationBadge = (finding: FindingWithEnhancedDetails) => {
    if (finding.isNewGeneration) {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
          New Generation
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading findings...</span>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          No findings found. Create a threat model to generate security findings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {findings.map((finding) => (
        <Card key={finding.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getSeverityIcon(finding.severity)}
                  <Badge className={getSeverityColor(finding.severity)}>
                    {finding.severity}
                  </Badge>
                  <Badge variant="outline">
                    {finding.strideCategory.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant={finding.status === 'RESOLVED' ? 'default' : 'secondary'}>
                    {finding.status.replace(/_/g, ' ')}
                  </Badge>
                  {getNewGenerationBadge(finding)}
                </div>
                <CardTitle className="text-lg leading-relaxed">
                  {finding.threatScenario}
                </CardTitle>
                <CardDescription className="mt-2">
                  {finding.description}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFindingExpansion(finding.id)}
              >
                {expandedFindings.has(finding.id) ? 'Hide Details' : 'View Details'}
              </Button>
            </div>
          </CardHeader>

          {/* Always show summary of assets and tags */}
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Affected Assets Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Affected Assets</span>
                  {finding.findingAssets?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {finding.findingAssets.length} asset(s)
                    </span>
                  )}
                </div>
                {finding.findingAssets?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {finding.findingAssets.slice(0, 3).map((fa) => (
                      <Badge key={fa.id} variant="outline" className="text-xs">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        {fa.asset.name}
                      </Badge>
                    ))}
                    {finding.findingAssets.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{finding.findingAssets.length - 3} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No assets linked</span>
                )}
              </div>

              {/* Applied Tags Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Tags</span>
                  {finding.findingTags?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {finding.findingTags.length} tag(s)
                    </span>
                  )}
                </div>
                {finding.findingTags?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {finding.findingTags.slice(0, 3).map((ft) => (
                      <Badge 
                        key={ft.id} 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: ft.tag.color ? `${ft.tag.color}10` : undefined,
                          borderColor: ft.tag.color || undefined,
                          color: ft.tag.color || undefined
                        }}
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {ft.tag.name}
                      </Badge>
                    ))}
                    {finding.findingTags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{finding.findingTags.length - 3} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No tags applied</span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAssetLinking(finding.id)}
              >
                <LinkIcon className="h-3 w-3 mr-1" />
                Link Assets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openTagging(finding.id)}
              >
                <TagIcon className="h-3 w-3 mr-1" />
                Add Tag
              </Button>
            </div>
          </CardContent>

          {/* Expanded Details Section */}
          {expandedFindings.has(finding.id) && (
            <>
              <Separator />
              <CardContent className="pt-4">
                <div className="space-y-6">
                  {/* Detailed Asset Information */}
                  {finding.findingAssets?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Affected Assets Details</h4>
                      <div className="space-y-2">
                        {finding.findingAssets.map((fa) => (
                          <div key={fa.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline">
                                {fa.asset.type.replace(/_/g, ' ')}
                              </Badge>
                              <div>
                                <div className="font-medium">{fa.asset.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {fa.asset.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={fa.impact === 'DIRECT' ? 'default' : 'secondary'}
                              >
                                {fa.impact}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Tag Information */}
                  {finding.findingTags?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Applied Tags</h4>
                      <div className="space-y-2">
                        {finding.findingTags.map((ft) => (
                          <div key={ft.id} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-start space-x-3">
                              <Badge 
                                variant="outline"
                                style={{ 
                                  backgroundColor: ft.tag.color ? `${ft.tag.color}20` : undefined,
                                  borderColor: ft.tag.color || undefined,
                                  color: ft.tag.color || undefined
                                }}
                              >
                                {ft.tag.name}
                              </Badge>
                              <div className="flex-1">
                                {ft.tag.description && (
                                  <div className="text-sm text-muted-foreground mb-1">
                                    {ft.tag.description}
                                  </div>
                                )}
                                {ft.justification && (
                                  <div className="text-sm">
                                    <span className="font-medium">Justification:</span> {ft.justification}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Applied by {ft.user.firstName || ft.user.name} on{' '}
                                  {new Date(ft.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation Section */}
                  {finding.recommendation && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendation</h4>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm">{finding.recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          )}
        </Card>
      ))}

      {/* Modals */}
      {selectedFindingId && (
        <>
          <AssetLinkingModal
            open={assetModalOpen}
            onOpenChange={setAssetModalOpen}
            findingId={selectedFindingId}
            availableAssets={availableAssets}
            onAssetLinked={handleAssetLinked}
          />
          <TaggingModal
            open={tagModalOpen}
            onOpenChange={setTagModalOpen}
            findingId={selectedFindingId}
            availableTags={availableTags}
            onTagAdded={handleTagAdded}
          />
        </>
      )}
    </div>
  );
}
