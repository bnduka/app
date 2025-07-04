
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Network,
  Tag as TagIcon,
  BarChart3,
  FileText,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { 
  ThreatModelWithDetails, 
  FindingWithEnhancedDetails,
  AssetWithDetails,
  TagWithDetails 
} from '@/lib/types';
import { EnhancedFindingsList } from '../findings/enhanced-findings-list';
import { AssetManagement } from './asset-management';
import { GenerateMoreScenarios } from './generate-more-scenarios';

interface EnhancedThreatResultsProps {
  threatModelId: string;
}

export function EnhancedThreatResults({ threatModelId }: EnhancedThreatResultsProps) {
  const { data: session } = useSession();
  const [threatModel, setThreatModel] = useState<ThreatModelWithDetails | null>(null);
  const [findings, setFindings] = useState<FindingWithEnhancedDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('findings');

  useEffect(() => {
    fetchThreatModelData();
  }, [threatModelId]);

  const fetchThreatModelData = async () => {
    try {
      setLoading(true);
      
      // Fetch threat model with enhanced details
      const [threatModelResponse, findingsResponse] = await Promise.all([
        fetch(`/api/threat-models/${threatModelId}`),
        fetch(`/api/findings?threatModelId=${threatModelId}&enhanced=true`)
      ]);

      if (threatModelResponse.ok && findingsResponse.ok) {
        const threatModelData = await threatModelResponse.json();
        const findingsData = await findingsResponse.json();
        
        setThreatModel(threatModelData.threatModel);
        setFindings(findingsData.findings || []);
      } else {
        setError('Failed to fetch threat model data');
      }
    } catch (error) {
      console.error('Error fetching threat model data:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFindingsUpdate = (updatedFindings: FindingWithEnhancedDetails[]) => {
    setFindings(updatedFindings);
  };

  const handleScenariosGenerated = (newScenarios: any[]) => {
    // Refresh the findings data to include the new scenarios
    fetchThreatModelData();
    toast.success(`Generated ${newScenarios.length} new threat scenarios`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'ANALYZING':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'DRAFT':
        return <FileText className="h-5 w-5 text-gray-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      COMPLETED: 'default',
      ANALYZING: 'secondary',
      DRAFT: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toLowerCase()}
      </Badge>
    );
  };

  const getSeverityStats = () => {
    const stats = {
      CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
      HIGH: findings.filter(f => f.severity === 'HIGH').length,
      MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
      LOW: findings.filter(f => f.severity === 'LOW').length,
    };
    return stats;
  };

  const getTagStats = () => {
    const tagCounts = new Map();
    findings.forEach(finding => {
      finding.findingTags?.forEach(ft => {
        const count = tagCounts.get(ft.tag.name) || 0;
        tagCounts.set(ft.tag.name, count + 1);
      });
    });
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 tags
  };

  const getAssetStats = () => {
    const assetCounts = new Map();
    findings.forEach(finding => {
      finding.findingAssets?.forEach(fa => {
        const count = assetCounts.get(fa.asset.name) || 0;
        assetCounts.set(fa.asset.name, count + 1);
      });
    });
    return Array.from(assetCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 affected assets
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-lg">Loading threat model results...</span>
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

  if (!threatModel) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>Threat model not found.</AlertDescription>
      </Alert>
    );
  }

  const severityStats = getSeverityStats();
  const tagStats = getTagStats();
  const assetStats = getAssetStats();
  const newGenerationCount = findings.filter(f => f.isNewGeneration).length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(threatModel.status)}
            <div>
              <h1 className="text-2xl font-bold">{threatModel.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(threatModel.status)}
                <span className="text-sm text-muted-foreground">
                  Created {formatDistanceToNow(new Date(threatModel.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {threatModel.description && (
          <p className="text-muted-foreground">{threatModel.description}</p>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{findings.length}</div>
              {newGenerationCount > 0 && (
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {newGenerationCount} new generation
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <Shield className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{severityStats.CRITICAL}</div>
              <p className="text-xs text-muted-foreground">
                {severityStats.HIGH} high severity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assets Analyzed</CardTitle>
              <Network className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{threatModel.assets?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {assetStats.length} with findings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tags Applied</CardTitle>
              <TagIcon className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tagStats.reduce((sum, [, count]) => sum + count, 0)}</div>
              <p className="text-xs text-muted-foreground">
                {tagStats.length} unique tags
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generate More Scenarios Section */}
      {threatModel.status === 'COMPLETED' && (
        <GenerateMoreScenarios
          threatModelId={threatModelId}
          generationCount={threatModel.generationCount || 0}
          onScenariosGenerated={handleScenariosGenerated}
        />
      )}

      <Separator />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="findings" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Threat Scenarios ({findings.length})</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center space-x-2">
            <Network className="h-4 w-4" />
            <span>Assets ({threatModel.assets?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Threat Scenarios</h2>
            <Badge variant="outline">
              {findings.filter(f => f.status === 'OPEN').length} open issues
            </Badge>
          </div>
          <EnhancedFindingsList
            threatModelId={threatModelId}
            findings={findings}
            onFindingUpdate={handleFindingsUpdate}
          />
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <AssetManagement threatModelId={threatModelId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>Breakdown of findings by severity level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(severityStats).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        severity === 'CRITICAL' ? 'bg-red-500' :
                        severity === 'HIGH' ? 'bg-orange-500' :
                        severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <span className="font-medium">{severity}</span>
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Most Used Tags</CardTitle>
                <CardDescription>Frequently applied finding tags</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tagStats.length > 0 ? (
                  tagStats.map(([tagName, count]) => (
                    <div key={tagName} className="flex items-center justify-between">
                      <span className="font-medium">{tagName}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No tags applied yet</p>
                )}
              </CardContent>
            </Card>

            {/* Top Affected Assets */}
            <Card>
              <CardHeader>
                <CardTitle>Most Affected Assets</CardTitle>
                <CardDescription>Assets with the most linked findings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assetStats.length > 0 ? (
                  assetStats.map(([assetName, count]) => (
                    <div key={assetName} className="flex items-center justify-between">
                      <span className="font-medium">{assetName}</span>
                      <Badge variant="outline">{count} finding(s)</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No assets linked yet</p>
                )}
              </CardContent>
            </Card>

            {/* Generation History */}
            <Card>
              <CardHeader>
                <CardTitle>Generation History</CardTitle>
                <CardDescription>AI scenario generation usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Generations Used</span>
                  <Badge variant="outline">{threatModel.generationCount || 0}/3</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>New Scenarios</span>
                  <Badge variant="outline">{newGenerationCount}</Badge>
                </div>
                {threatModel.lastGenerationAt && (
                  <div className="flex items-center justify-between">
                    <span>Last Generated</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(threatModel.lastGenerationAt), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
