
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
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { 
  DesignReviewType,
  SystemType,
  RiskLevel,
  DesignReviewRequest
} from '@/lib/types';
import { toast } from 'sonner';

interface DesignReviewFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewCreated: () => void;
  designReview?: any;
}

export function DesignReviewFormModal({ 
  open, 
  onOpenChange, 
  onReviewCreated, 
  designReview 
}: DesignReviewFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [cloudProviderInput, setCloudProviderInput] = useState('');
  const [frameworkInput, setFrameworkInput] = useState('');
  const [databaseInput, setDatabaseInput] = useState('');
  const [complianceInput, setComplianceInput] = useState('');

  const form = useForm<DesignReviewRequest>({
    defaultValues: {
      name: '',
      description: '',
      reviewType: 'ARCHITECTURE' as DesignReviewType,
      systemType: 'WEB_APPLICATION' as SystemType,
      scope: '',
      businessContext: '',
      cloudProviders: [],
      frameworks: [],
      databases: [],
      architectureDescription: '',
      complianceFrameworks: [],
      overallRisk: 'MEDIUM' as RiskLevel,
    },
  });

  useEffect(() => {
    if (designReview) {
      form.reset({
        name: designReview.name || '',
        description: designReview.description || '',
        reviewType: designReview.reviewType || 'ARCHITECTURE',
        systemType: designReview.systemType || 'WEB_APPLICATION',
        scope: designReview.scope || '',
        businessContext: designReview.businessContext || '',
        cloudProviders: designReview.cloudProviders || [],
        frameworks: designReview.frameworks || [],
        databases: designReview.databases || [],
        architectureDescription: designReview.architectureDescription || '',
        complianceFrameworks: designReview.complianceFrameworks || [],
        overallRisk: designReview.overallRisk || 'MEDIUM',
      });
    } else {
      form.reset();
    }
  }, [designReview, form]);

  const onSubmit = async (data: DesignReviewRequest) => {
    setLoading(true);
    try {
      const url = designReview ? `/api/design-reviews/${designReview.id}` : '/api/design-reviews';
      const method = designReview ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${designReview ? 'update' : 'create'} design review`);
      }

      onReviewCreated();
      toast.success(`Design review ${designReview ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving design review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save design review');
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
            {designReview ? 'Edit Design Review' : 'Create New Design Review'}
          </DialogTitle>
          <DialogDescription>
            {designReview 
              ? 'Update the design review information and scope.'
              : 'Set up a new security design review for comprehensive system assessment.'
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
                      <FormLabel>Review Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Customer Portal Security Review" {...field} />
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
                          placeholder="Brief description of the design review..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reviewType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ARCHITECTURE">Architecture</SelectItem>
                            <SelectItem value="SECURITY">Security</SelectItem>
                            <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                            <SelectItem value="PRIVACY">Privacy</SelectItem>
                            <SelectItem value="FULL_ASSESSMENT">Full Assessment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="systemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="WEB_APPLICATION">Web Application</SelectItem>
                            <SelectItem value="MOBILE_APPLICATION">Mobile Application</SelectItem>
                            <SelectItem value="API_SERVICE">API Service</SelectItem>
                            <SelectItem value="MICROSERVICES">Microservices</SelectItem>
                            <SelectItem value="DISTRIBUTED_SYSTEM">Distributed System</SelectItem>
                            <SelectItem value="CLOUD_NATIVE">Cloud Native</SelectItem>
                            <SelectItem value="LEGACY_SYSTEM">Legacy System</SelectItem>
                            <SelectItem value="IOT_SYSTEM">IoT System</SelectItem>
                            <SelectItem value="AI_ML_SYSTEM">AI/ML System</SelectItem>
                            <SelectItem value="BLOCKCHAIN">Blockchain</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="overallRisk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Risk Assessment</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="VERY_LOW">Very Low</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="VERY_HIGH">Very High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Scope and Context */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Scope & Context</h3>

                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Scope</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Define what will be included in this review..."
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
                  name="businessContext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Context</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Business requirements and context..."
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
                  name="architectureDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Architecture Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the system architecture, components, data flows..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Provide detailed system architecture information for AI analysis
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Technical Stack */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Technical Stack</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cloud Providers */}
                <FormField
                  control={form.control}
                  name="cloudProviders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cloud Providers</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add cloud provider"
                            value={cloudProviderInput}
                            onChange={(e) => setCloudProviderInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addItem(field, cloudProviderInput, setCloudProviderInput);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(field, cloudProviderInput, setCloudProviderInput)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(field.value || []).map((provider: string) => (
                            <Badge key={provider} variant="secondary" className="text-xs">
                              {provider}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-2"
                                onClick={() => removeItem(field, provider)}
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

                {/* Frameworks */}
                <FormField
                  control={form.control}
                  name="frameworks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frameworks</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add framework"
                            value={frameworkInput}
                            onChange={(e) => setFrameworkInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addItem(field, frameworkInput, setFrameworkInput);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(field, frameworkInput, setFrameworkInput)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(field.value || []).map((framework: string) => (
                            <Badge key={framework} variant="secondary" className="text-xs">
                              {framework}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-2"
                                onClick={() => removeItem(field, framework)}
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

                {/* Databases */}
                <FormField
                  control={form.control}
                  name="databases"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Databases</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add database"
                            value={databaseInput}
                            onChange={(e) => setDatabaseInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addItem(field, databaseInput, setDatabaseInput);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(field, databaseInput, setDatabaseInput)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(field.value || []).map((database: string) => (
                            <Badge key={database} variant="secondary" className="text-xs">
                              {database}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-2"
                                onClick={() => removeItem(field, database)}
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

              {/* Compliance Frameworks */}
              <FormField
                control={form.control}
                name="complianceFrameworks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compliance Frameworks</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add compliance framework (e.g., ISO 27001, SOC 2)"
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
                        {(field.value || []).map((framework: string) => (
                          <Badge key={framework} variant="outline" className="text-xs">
                            {framework}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-2"
                              onClick={() => removeItem(field, framework)}
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
                {loading ? 'Saving...' : designReview ? 'Update Review' : 'Create Review'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
