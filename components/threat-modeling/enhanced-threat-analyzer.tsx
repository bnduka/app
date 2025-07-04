
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedFindingDetail } from '@/components/findings/enhanced-finding-detail';
import { toast } from 'sonner';
import {
  Shield,
  Brain,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Database,
  Network,
  Lock,
  Users,
  Zap,
  BookOpen,
  ExternalLink,
  BarChart3
} from 'lucide-react';

interface ThreatModelContext {
  systemType: string;
  dataClassification: string;
  networkExposure: string;
  authenticationMethods: string[];
  dataStores: string[];
  trustedBoundaries: string[];
}

interface EnhancedFinding {
  id: string;
  title: string;
  description: string;
  severity: string;
  strideCategory: string;
  recommendation: string;
  nistControls: string[];
  owaspCategory?: string;
  cvssScore: number;
  asvsLevel: number;
  tags: string[];
  mitigationStrategies: string[];
  references: string[];
}

interface EnhancedThreatAnalyzerProps {
  threatModelId?: string;
  initialPrompt?: string;
  onAnalysisComplete?: (findings: EnhancedFinding[]) => void;
}

export function EnhancedThreatAnalyzer({ 
  threatModelId, 
  initialPrompt = '', 
  onAnalysisComplete 
}: EnhancedThreatAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [findings, setFindings] = useState<EnhancedFinding[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<EnhancedFinding | null>(null);
  const [error, setError] = useState('');
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [context, setContext] = useState<ThreatModelContext>({
    systemType: 'web-application',
    dataClassification: 'sensitive',
    networkExposure: 'public',
    authenticationMethods: ['password'],
    dataStores: ['database'],
    trustedBoundaries: ['internal-network', 'dmz']
  });

  const systemTypes = [
    { value: 'web-application', label: 'Web Application' },
    { value: 'mobile-app', label: 'Mobile Application' },
    { value: 'api-service', label: 'API Service' },
    { value: 'desktop-app', label: 'Desktop Application' },
    { value: 'iot-device', label: 'IoT Device' },
    { value: 'cloud-service', label: 'Cloud Service' },
    { value: 'microservice', label: 'Microservice' },
    { value: 'database', label: 'Database System' }
  ];

  const dataClassifications = [
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Internal' },
    { value: 'confidential', label: 'Confidential' },
    { value: 'restricted', label: 'Restricted' },
    { value: 'sensitive', label: 'Sensitive' }
  ];

  const networkExposures = [
    { value: 'internal', label: 'Internal Only' },
    { value: 'private', label: 'Private Network' },
    { value: 'public', label: 'Public Internet' },
    { value: 'hybrid', label: 'Hybrid' }
  ];

  const authMethods = [
    'password', 'multi-factor', 'sso', 'certificate', 'api-key', 'oauth', 'ldap', 'saml'
  ];

  const dataStoreTypes = [
    'database', 'file-system', 'cloud-storage', 'cache', 'message-queue', 'data-warehouse'
  ];

  const trustBoundaries = [
    'internal-network', 'dmz', 'external-api', 'user-interface', 'admin-interface', 'service-mesh'
  ];

  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      toast.error('Please provide a system description');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError('');

      const response = await fetch('/api/threat-models/enhanced-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context,
          threatModelId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setFindings(data.findings || []);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.findings || []);
      }

      toast.success(`Analysis complete! Found ${data.findings?.length || 0} security findings.`);
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'MEDIUM': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'LOW': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Analysis Configuration */}
      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Analysis Configuration</TabsTrigger>
          <TabsTrigger value="context">System Context</TabsTrigger>
          <TabsTrigger value="results">Analysis Results</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                Enhanced Threat Analysis
              </CardTitle>
              <CardDescription>
                Powered by Microsoft Threat Modeling Tool and OWASP Threat Dragon methodologies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt">System Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe your system architecture, components, data flows, and security concerns..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Provide details about your system's architecture, data flows, user roles, and external dependencies.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>System Type</Label>
                  <Select
                    value={context.systemType}
                    onValueChange={(value) => setContext(prev => ({ ...prev, systemType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {systemTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data Classification</Label>
                  <Select
                    value={context.dataClassification}
                    onValueChange={(value) => setContext(prev => ({ ...prev, dataClassification: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataClassifications.map(classification => (
                        <SelectItem key={classification.value} value={classification.value}>
                          {classification.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Network Exposure</Label>
                  <Select
                    value={context.networkExposure}
                    onValueChange={(value) => setContext(prev => ({ ...prev, networkExposure: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {networkExposures.map(exposure => (
                        <SelectItem key={exposure.value} value={exposure.value}>
                          {exposure.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Analyzing System...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Start Enhanced Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Context Tab */}
        <TabsContent value="context" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-600" />
                  Authentication & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Authentication Methods</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {authMethods.map(method => (
                      <label key={method} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={context.authenticationMethods.includes(method)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setContext(prev => ({
                                ...prev,
                                authenticationMethods: [...prev.authenticationMethods, method]
                              }));
                            } else {
                              setContext(prev => ({
                                ...prev,
                                authenticationMethods: prev.authenticationMethods.filter(m => m !== method)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{method.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  Data Stores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Storage Types</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dataStoreTypes.map(store => (
                      <label key={store} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={context.dataStores.includes(store)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setContext(prev => ({
                                ...prev,
                                dataStores: [...prev.dataStores, store]
                              }));
                            } else {
                              setContext(prev => ({
                                ...prev,
                                dataStores: prev.dataStores.filter(s => s !== store)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{store.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-orange-600" />
                  Trust Boundaries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Network Trust Boundaries</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {trustBoundaries.map(boundary => (
                      <label key={boundary} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={context.trustedBoundaries.includes(boundary)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setContext(prev => ({
                                ...prev,
                                trustedBoundaries: [...prev.trustedBoundaries, boundary]
                              }));
                            } else {
                              setContext(prev => ({
                                ...prev,
                                trustedBoundaries: prev.trustedBoundaries.filter(b => b !== boundary)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{boundary.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedFinding ? (
            <Card>
              <CardHeader>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedFinding(null)}
                  className="mb-4"
                >
                  ← Back to Results
                </Button>
              </CardHeader>
              <CardContent>
                <EnhancedFindingDetail 
                  finding={selectedFinding}
                  onUpdate={(updated) => {
                    setFindings(prev => prev.map(f => f.id === updated.id ? updated : f));
                    setSelectedFinding(updated);
                  }}
                  onClose={() => setSelectedFinding(null)}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {findings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Analysis Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => {
                        const count = findings.filter(f => f.severity === severity).length;
                        return (
                          <div key={severity} className="text-center">
                            <div className={`rounded-lg p-4 ${getSeverityColor(severity)}`}>
                              <div className="flex items-center justify-center mb-2">
                                {getSeverityIcon(severity)}
                              </div>
                              <div className="text-2xl font-bold">{count}</div>
                              <div className="text-sm capitalize">{severity.toLowerCase()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {findings.length === 0 && !isAnalyzing ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Search className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Results</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      Run the enhanced threat analysis to identify security findings using industry-standard methodologies.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {findings.map((finding) => (
                    <Card 
                      key={finding.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedFinding(finding)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base leading-tight">
                            {finding.title}
                          </CardTitle>
                          <Badge className={getSeverityColor(finding.severity)}>
                            {finding.severity}
                          </Badge>
                        </div>
                        <CardDescription>
                          <Badge variant="outline" className="mt-1">
                            {finding.strideCategory}
                          </Badge>
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {finding.description}
                        </p>
                        
                        <div className="space-y-2">
                          {finding.cvssScore > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">CVSS Score:</span>
                              <Badge variant="outline">{finding.cvssScore}</Badge>
                            </div>
                          )}
                          
                          {finding.owaspCategory && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">OWASP:</span>
                              <Badge variant="outline" className="bg-orange-50 text-orange-800">
                                {finding.owaspCategory}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {finding.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {finding.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{finding.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
