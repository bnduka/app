
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Zap, 
  Shield,
  Brain,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building,
  Plus
} from 'lucide-react';
import { ThreatModelCreationRequest, ApplicationAssetWithDetails } from '@/lib/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function EnhancedThreatModelingWorkflow() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<ApplicationAssetWithDetails[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState<'PROMPT' | 'DOCUMENT' | 'HYBRID'>('PROMPT');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
    documentContent: '',
    systemContext: '',
    securityRequirements: [] as string[],
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [securityReqInput, setSecurityReqInput] = useState('');

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets?limit=50');
      if (response.ok) {
        const data = await response.json();
        setAvailableAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  useState(() => {
    if (session) {
      fetchAssets();
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setDocumentFile(file);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFormData(prev => ({ ...prev, documentContent: content }));
      toast.success('Document uploaded successfully');
    };
    reader.readAsText(file);
  };

  const addSecurityRequirement = () => {
    if (securityReqInput.trim()) {
      setFormData(prev => ({
        ...prev,
        securityRequirements: [...prev.securityRequirements, securityReqInput.trim()]
      }));
      setSecurityReqInput('');
    }
  };

  const removeSecurityRequirement = (req: string) => {
    setFormData(prev => ({
      ...prev,
      securityRequirements: prev.securityRequirements.filter(r => r !== req)
    }));
  };

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please provide a threat model name');
      return;
    }

    if (analysisType === 'PROMPT' && !formData.prompt) {
      toast.error('Please provide a system description for prompt-based analysis');
      return;
    }

    if (analysisType === 'DOCUMENT' && !formData.documentContent) {
      toast.error('Please upload a document for document-based analysis');
      return;
    }

    if (analysisType === 'HYBRID' && (!formData.prompt || !formData.documentContent)) {
      toast.error('Please provide both system description and document for hybrid analysis');
      return;
    }

    setLoading(true);
    try {
      const requestData: ThreatModelCreationRequest = {
        name: formData.name,
        description: formData.description,
        prompt: formData.prompt,
        linkedAssetIds: selectedAssets,
        analysisType,
        documentContent: formData.documentContent,
        systemContext: formData.systemContext,
        securityRequirements: formData.securityRequirements,
      };

      const response = await fetch('/api/threat-models/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create threat model');
      }

      const result = await response.json();
      toast.success(`Threat model created with ${result.analysis.findingsCount} findings`);
      
      // Redirect to threat models page
      router.push('/threat-models');
    } catch (error) {
      console.error('Error creating threat model:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create threat model');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          New Threat Model
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create comprehensive threat models with AI-powered analysis and document processing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Threat Model Name *
                </label>
                <Input
                  placeholder="e.g., Customer Portal Security Assessment"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Brief description of what this threat model covers..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Analysis Type *
                </label>
                <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROMPT">Prompt-Based Analysis</SelectItem>
                    <SelectItem value="DOCUMENT">Document-Based Analysis</SelectItem>
                    <SelectItem value="HYBRID">Hybrid Analysis (Prompt + Document)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose how you want to provide system information for analysis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="prompt" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="prompt" disabled={analysisType === 'DOCUMENT'}>
                    System Description
                  </TabsTrigger>
                  <TabsTrigger value="document" disabled={analysisType === 'PROMPT'}>
                    Document Upload
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="prompt" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      System Description {(analysisType === 'PROMPT' || analysisType === 'HYBRID') && '*'}
                    </label>
                    <Textarea
                      placeholder="Describe your system architecture, components, data flows, and technologies..."
                      value={formData.prompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                      className="min-h-[150px]"
                      disabled={analysisType === 'DOCUMENT'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Provide detailed information about your system for AI threat analysis
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Additional Context
                    </label>
                    <Textarea
                      placeholder="Any additional context about the system, environment, or constraints..."
                      value={formData.systemContext}
                      onChange={(e) => setFormData(prev => ({ ...prev, systemContext: e.target.value }))}
                      className="min-h-[80px]"
                      disabled={analysisType === 'DOCUMENT'}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="document" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Upload Document {(analysisType === 'DOCUMENT' || analysisType === 'HYBRID') && '*'}
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <label htmlFor="document-upload" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                              Upload technical documentation
                            </span>
                            <span className="mt-1 block text-xs text-gray-500">
                              PDF, DOCX, or TXT files up to 10MB
                            </span>
                          </label>
                          <input
                            id="document-upload"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.docx,.doc,.txt"
                            onChange={handleFileUpload}
                            disabled={analysisType === 'PROMPT'}
                          />
                        </div>
                      </div>
                    </div>
                    {documentFile && (
                      <div className="flex items-center gap-2 mt-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{documentFile.name}</span>
                        <Badge variant="secondary">{(documentFile.size / 1024).toFixed(1)} KB</Badge>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Security Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Add Security Requirements
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Must comply with GDPR, PCI-DSS required"
                    value={securityReqInput}
                    onChange={(e) => setSecurityReqInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSecurityRequirement();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={addSecurityRequirement}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {formData.securityRequirements.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Security Requirements ({formData.securityRequirements.length})
                  </label>
                  <div className="space-y-2">
                    {formData.securityRequirements.map((req, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{req}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSecurityRequirement(req)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              size="lg"
              className="min-w-[200px]"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Creating Threat Model...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Create Threat Model
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Linked Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Link Assets
                <Badge variant="secondary">{selectedAssets.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableAssets.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`asset-${asset.id}`}
                        checked={selectedAssets.includes(asset.id)}
                        onChange={() => handleAssetToggle(asset.id)}
                        className="rounded"
                      />
                      <label 
                        htmlFor={`asset-${asset.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        <div className="font-medium">{asset.name}</div>
                        <div className="text-xs text-gray-500">
                          {asset.assetType.replace(/_/g, ' ')} • {asset.environment}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Building className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No assets available</p>
                  <p className="text-xs">Create assets first to link them</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Process Overview */}
          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">AI Analysis</p>
                  <p className="text-xs text-gray-500">
                    Advanced AI analyzes your system using STRIDE methodology
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Threat Scenarios</p>
                  <p className="text-xs text-gray-500">
                    Generate specific threat scenarios with severity ratings
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Recommendations</p>
                  <p className="text-xs text-gray-500">
                    Receive actionable security recommendations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">4</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Asset Integration</p>
                  <p className="text-xs text-gray-500">
                    Link findings to your application assets
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
