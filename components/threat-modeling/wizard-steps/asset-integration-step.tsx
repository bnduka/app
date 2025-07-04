
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building,
  Search,
  Users,
  Globe,
  Database,
  Settings,
  Target,
  HelpCircle,
  Filter
} from 'lucide-react';
import { WizardFormData } from '../enhanced-wizard-workflow';
import { ApplicationAssetWithDetails } from '@/lib/types';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AssetIntegrationStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const ENVIRONMENT_OPTIONS = [
  { value: 'production', label: 'Production', description: 'Live production environment' },
  { value: 'staging', label: 'Staging', description: 'Pre-production staging' },
  { value: 'development', label: 'Development', description: 'Development environment' },
  { value: 'testing', label: 'Testing', description: 'Testing and QA environment' },
  { value: 'hybrid', label: 'Hybrid', description: 'Multiple environments' }
];

const SCALE_OPTIONS = [
  { value: 'small', label: 'Small Scale', description: '< 1,000 users, simple architecture' },
  { value: 'medium', label: 'Medium Scale', description: '1,000 - 100,000 users, moderate complexity' },
  { value: 'large', label: 'Large Scale', description: '100,000+ users, complex architecture' },
  { value: 'enterprise', label: 'Enterprise', description: 'Multi-million users, enterprise-grade' }
];

const USER_BASE_OPTIONS = [
  { value: 'internal', label: 'Internal Users', description: 'Employees and internal stakeholders' },
  { value: 'external', label: 'External Customers', description: 'External customers and partners' },
  { value: 'public', label: 'Public Users', description: 'General public, anonymous users' },
  { value: 'mixed', label: 'Mixed User Base', description: 'Combination of user types' }
];

const PRIORITY_FOCUS_OPTIONS = [
  'Data Protection',
  'Authentication Security',
  'Authorization Controls',
  'Network Security',
  'API Security',
  'Infrastructure Security',
  'Compliance Requirements',
  'Business Logic Security',
  'Third-party Integrations',
  'Mobile Security',
  'Cloud Security',
  'DevOps Security'
];

export function AssetIntegrationStep({ formData, updateFormData }: AssetIntegrationStepProps) {
  const [availableAssets, setAvailableAssets] = useState<ApplicationAssetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAvailableAssets(data.assets || []);
      } else {
        toast.error('Failed to load assets');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = availableAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.team?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || asset.assetType === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleAssetToggle = (assetId: string) => {
    const isSelected = formData.selectedAssets.includes(assetId);
    if (isSelected) {
      updateFormData({
        selectedAssets: formData.selectedAssets.filter(id => id !== assetId)
      });
    } else {
      updateFormData({
        selectedAssets: [...formData.selectedAssets, assetId]
      });
    }
  };

  const handlePriorityFocusToggle = (focus: string) => {
    const isSelected = formData.priorityFocus.includes(focus);
    if (isSelected) {
      updateFormData({
        priorityFocus: formData.priorityFocus.filter(f => f !== focus)
      });
    } else {
      updateFormData({
        priorityFocus: [...formData.priorityFocus, focus]
      });
    }
  };

  const selectAllAssets = () => {
    updateFormData({
      selectedAssets: filteredAssets.map(asset => asset.id)
    });
    toast.success(`Selected ${filteredAssets.length} assets`);
  };

  const clearAssetSelection = () => {
    updateFormData({ selectedAssets: [] });
    toast.success('Cleared asset selection');
  };

  const assetTypes = Array.from(new Set(availableAssets.map(asset => asset.assetType)));

  return (
    <div className="space-y-6">
      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Environment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Deployment Environment */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Deployment Environment
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="ml-1">
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Primary environment where the system operates</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select 
                value={formData.deploymentEnvironment} 
                onValueChange={(value) => updateFormData({ deploymentEnvironment: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Scale */}
            <div>
              <label className="block text-sm font-medium mb-2">
                System Scale
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="ml-1">
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expected scale and complexity of the system</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select 
                value={formData.systemScale} 
                onValueChange={(value) => updateFormData({ systemScale: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scale" />
                </SelectTrigger>
                <SelectContent>
                  {SCALE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Base */}
            <div>
              <label className="block text-sm font-medium mb-2">
                User Base
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="ml-1">
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Primary user types who will access the system</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select 
                value={formData.userBase} 
                onValueChange={(value) => updateFormData({ userBase: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user base" />
                </SelectTrigger>
                <SelectContent>
                  {USER_BASE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Analysis Depth */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Analysis Depth
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="ml-1">
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Depth of AI analysis - more comprehensive analysis takes longer but provides more detailed results</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { 
                  value: 'BASIC', 
                  title: 'Basic Analysis', 
                  description: 'Quick analysis with core threats',
                  time: '~2-3 minutes'
                },
                { 
                  value: 'COMPREHENSIVE', 
                  title: 'Comprehensive Analysis', 
                  description: 'Detailed STRIDE analysis with recommendations',
                  time: '~5-7 minutes'
                },
                { 
                  value: 'EXPERT', 
                  title: 'Expert Analysis', 
                  description: 'In-depth analysis with advanced scenarios',
                  time: '~10-15 minutes'
                }
              ].map((option) => (
                <div
                  key={option.value}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.analysisDepth === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                  onClick={() => updateFormData({ analysisDepth: option.value as any })}
                >
                  <h4 className="font-medium text-sm">{option.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                  <Badge variant="secondary" className="text-xs mt-2">
                    {option.time}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Priority Focus Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium mb-3">
              Select areas to prioritize in the threat analysis
            </label>
            <div className="grid gap-2 md:grid-cols-3">
              {PRIORITY_FOCUS_OPTIONS.map((focus) => (
                <div
                  key={focus}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.priorityFocus.includes(focus)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                  onClick={() => handlePriorityFocusToggle(focus)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.priorityFocus.includes(focus)}
                      onChange={() => {}} // Handled by onClick above
                    />
                    <span className="text-sm font-medium">{focus}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selected: {formData.priorityFocus.length} focus areas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Asset Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Link Application Assets
            <Badge variant="secondary">{formData.selectedAssets.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading assets...</p>
            </div>
          ) : availableAssets.length > 0 ? (
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search assets by name, description, or team..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {assetTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllAssets}
                  disabled={filteredAssets.length === 0}
                >
                  Select All ({filteredAssets.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAssetSelection}
                  disabled={formData.selectedAssets.length === 0}
                >
                  Clear Selection
                </Button>
              </div>

              {/* Asset List */}
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.selectedAssets.includes(asset.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                      onClick={() => handleAssetToggle(asset.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={formData.selectedAssets.includes(asset.id)}
                            onChange={() => {}} // Handled by onClick above
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{asset.name}</h4>
                            {asset.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {asset.description}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {asset.assetType.replace(/_/g, ' ')}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {asset.environment}
                              </Badge>
                              {asset.businessCriticality && (
                                <Badge 
                                  variant={asset.businessCriticality === 'HIGH' ? 'destructive' : 'secondary'} 
                                  className="text-xs"
                                >
                                  {asset.businessCriticality}
                                </Badge>
                              )}
                            </div>
                            {asset.team && (
                              <p className="text-xs text-gray-500 mt-1">
                                Team: {asset.team}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Building className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No assets match your search criteria</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h4 className="font-medium mb-2">No Assets Available</h4>
              <p className="text-sm mb-4">
                Create application assets first to link them to your threat model
              </p>
              <Button
                variant="outline"
                onClick={() => window.open('/assets', '_blank')}
                className="flex items-center gap-2"
              >
                <Building className="h-4 w-4" />
                Manage Assets
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-300">
            Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-2">
                Environment Settings
              </h4>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                <p><span className="font-medium">Environment:</span> {formData.deploymentEnvironment || 'Not set'}</p>
                <p><span className="font-medium">Scale:</span> {formData.systemScale || 'Not set'}</p>
                <p><span className="font-medium">User Base:</span> {formData.userBase || 'Not set'}</p>
                <p><span className="font-medium">Analysis Depth:</span> {formData.analysisDepth}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-2">
                Integration Status
              </h4>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                <p><span className="font-medium">Linked Assets:</span> {formData.selectedAssets.length}</p>
                <p><span className="font-medium">Priority Areas:</span> {formData.priorityFocus.length}</p>
                <p><span className="font-medium">Security Requirements:</span> {formData.securityRequirements.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
