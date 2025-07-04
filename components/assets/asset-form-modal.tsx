
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { 
  ApplicationAssetType,
  ApplicationAssetStatus,
  BusinessCriticality,
  DataClassification,
  HostingType,
  Environment,
  ApplicationAssetRequest
} from '@/lib/types';
import { toast } from 'sonner';

interface AssetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssetCreated: () => void;
  asset?: any;
}

export function AssetFormModal({ open, onOpenChange, onAssetCreated, asset }: AssetFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [techStackInput, setTechStackInput] = useState('');
  const [authMethodInput, setAuthMethodInput] = useState('');
  const [complianceInput, setComplianceInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const form = useForm<ApplicationAssetRequest>({
    defaultValues: {
      name: '',
      description: '',
      assetType: 'WEB_APPLICATION' as ApplicationAssetType,
      status: 'ACTIVE' as ApplicationAssetStatus,
      businessCriticality: 'MEDIUM' as BusinessCriticality,
      dataClassification: 'INTERNAL' as DataClassification,
      environment: 'PRODUCTION' as Environment,
      techStack: [],
      authenticationMethods: [],
      complianceRequirements: [],
      tags: [],
      hasAuthentication: false,
      hasAuthorization: false,
      encryptionInTransit: false,
      encryptionAtRest: false,
      upstreamAssets: [],
      downstreamAssets: [],
      integrations: [],
    },
  });

  useEffect(() => {
    if (asset) {
      form.reset({
        name: asset.name || '',
        description: asset.description || '',
        assetType: asset.assetType || 'WEB_APPLICATION',
        status: asset.status || 'ACTIVE',
        businessCriticality: asset.businessCriticality || 'MEDIUM',
        dataClassification: asset.dataClassification || 'INTERNAL',
        owner: asset.owner || '',
        team: asset.team || '',
        businessUnit: asset.businessUnit || '',
        hostingType: asset.hostingType,
        hostingProvider: asset.hostingProvider || '',
        environment: asset.environment || 'PRODUCTION',
        techStack: asset.techStack || [],
        authenticationMethods: asset.authenticationMethods || [],
        complianceRequirements: asset.complianceRequirements || [],
        tags: asset.tags || [],
        hasAuthentication: asset.hasAuthentication || false,
        hasAuthorization: asset.hasAuthorization || false,
        encryptionInTransit: asset.encryptionInTransit || false,
        encryptionAtRest: asset.encryptionAtRest || false,
        applicationUrl: asset.applicationUrl || '',
        documentationUrl: asset.documentationUrl || '',
        repositoryUrl: asset.repositoryUrl || '',
        upstreamAssets: asset.upstreamAssets || [],
        downstreamAssets: asset.downstreamAssets || [],
        integrations: asset.integrations || [],
      });
    } else {
      form.reset();
    }
  }, [asset, form]);

  const onSubmit = async (data: ApplicationAssetRequest) => {
    setLoading(true);
    try {
      const url = asset ? `/api/assets/${asset.id}` : '/api/assets';
      const method = asset ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${asset ? 'update' : 'create'} asset`);
      }

      onAssetCreated();
      toast.success(`Asset ${asset ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (field: any, input: string, setInput: (value: string) => void) => {
    if (input.trim()) {
      const currentValues = form.getValues(field.name) || [];
      if (!currentValues.includes(input.trim())) {
        field.onChange([...currentValues, input.trim()]);
      }
      setInput('');
    }
  };

  const removeItem = (field: any, item: string) => {
    const currentValues = form.getValues(field.name) || [];
    field.onChange(currentValues.filter((value: string) => value !== item));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {asset ? 'Edit Asset' : 'Create New Asset'}
          </DialogTitle>
          <DialogDescription>
            {asset 
              ? 'Update the asset information and security details.'
              : 'Add a new application asset to your inventory for security tracking.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Customer Portal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the asset..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WEB_APPLICATION">Web Application</SelectItem>
                          <SelectItem value="MOBILE_APP_IOS">Mobile App (iOS)</SelectItem>
                          <SelectItem value="MOBILE_APP_ANDROID">Mobile App (Android)</SelectItem>
                          <SelectItem value="API_SERVICE">API Service</SelectItem>
                          <SelectItem value="MICROSERVICE">Microservice</SelectItem>
                          <SelectItem value="DATABASE">Database</SelectItem>
                          <SelectItem value="WEBHOOK">Webhook</SelectItem>
                          <SelectItem value="INTEGRATION">Integration</SelectItem>
                          <SelectItem value="THIRD_PARTY_SERVICE">Third-Party Service</SelectItem>
                          <SelectItem value="INFRASTRUCTURE">Infrastructure</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                            <SelectItem value="DEPRECATED">Deprecated</SelectItem>
                            <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                            <SelectItem value="PLANNED">Planned</SelectItem>
                            <SelectItem value="DEVELOPMENT">Development</SelectItem>
                            <SelectItem value="TESTING">Testing</SelectItem>
                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="environment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Environment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PRODUCTION">Production</SelectItem>
                            <SelectItem value="STAGING">Staging</SelectItem>
                            <SelectItem value="DEVELOPMENT">Development</SelectItem>
                            <SelectItem value="TESTING">Testing</SelectItem>
                            <SelectItem value="QA">QA</SelectItem>
                            <SelectItem value="UAT">UAT</SelectItem>
                            <SelectItem value="SANDBOX">Sandbox</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Risk and Classification */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Risk & Classification</h3>

                <FormField
                  control={form.control}
                  name="businessCriticality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Criticality</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="VERY_HIGH">Very High</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="VERY_LOW">Very Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataClassification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Classification</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PUBLIC">Public</SelectItem>
                          <SelectItem value="INTERNAL">Internal</SelectItem>
                          <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                          <SelectItem value="RESTRICTED">Restricted</SelectItem>
                          <SelectItem value="SECRET">Secret</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner</FormLabel>
                        <FormControl>
                          <Input placeholder="Asset owner name or email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="team"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <FormControl>
                          <Input placeholder="Responsible team" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="Business unit or department" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Technical Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="hostingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hosting Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select hosting type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CLOUD">Cloud</SelectItem>
                            <SelectItem value="ON_PREMISE">On-Premise</SelectItem>
                            <SelectItem value="HYBRID">Hybrid</SelectItem>
                            <SelectItem value="SAAS">SaaS</SelectItem>
                            <SelectItem value="PAAS">PaaS</SelectItem>
                            <SelectItem value="IAAS">IaaS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hostingProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hosting Provider</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., AWS, Azure, GCP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="applicationUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repositoryUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repository URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Tech Stack */}
              <FormField
                control={form.control}
                name="techStack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technology Stack</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add technology (e.g., React, Node.js)"
                          value={techStackInput}
                          onChange={(e) => setTechStackInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addItem(field, techStackInput, setTechStackInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(field, techStackInput, setTechStackInput)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((tech: string) => (
                          <Badge key={tech} variant="secondary" className="text-xs">
                            {tech}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-2"
                              onClick={() => removeItem(field, tech)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Security Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Security Features</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="hasAuthentication"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Authentication</FormLabel>
                        <FormDescription className="text-xs">
                          Has authentication
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasAuthorization"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Authorization</FormLabel>
                        <FormDescription className="text-xs">
                          Has authorization
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="encryptionInTransit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Encryption</FormLabel>
                        <FormDescription className="text-xs">
                          In transit
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="encryptionAtRest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Encryption</FormLabel>
                        <FormDescription className="text-xs">
                          At rest
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Authentication Methods */}
              <FormField
                control={form.control}
                name="authenticationMethods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authentication Methods</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add authentication method (e.g., OAuth, SAML)"
                          value={authMethodInput}
                          onChange={(e) => setAuthMethodInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addItem(field, authMethodInput, setAuthMethodInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(field, authMethodInput, setAuthMethodInput)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((method: string) => (
                          <Badge key={method} variant="secondary" className="text-xs">
                            {method}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-2"
                              onClick={() => removeItem(field, method)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Compliance Requirements */}
              <FormField
                control={form.control}
                name="complianceRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compliance Requirements</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add compliance requirement (e.g., GDPR, SOC2)"
                          value={complianceInput}
                          onChange={(e) => setComplianceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addItem(field, complianceInput, setComplianceInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(field, complianceInput, setComplianceInput)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((req: string) => (
                          <Badge key={req} variant="secondary" className="text-xs">
                            {req}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-2"
                              onClick={() => removeItem(field, req)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag"
                          value={tagsInput}
                          onChange={(e) => setTagsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addItem(field, tagsInput, setTagsInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(field, tagsInput, setTagsInput)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-2"
                              onClick={() => removeItem(field, tag)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : asset ? 'Update Asset' : 'Create Asset'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
