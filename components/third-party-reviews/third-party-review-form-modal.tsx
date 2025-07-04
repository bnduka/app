
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  ScanFrequency,
  DataClassification,
  BusinessCriticality,
  ContractStatus,
  ThirdPartyReviewRequest
} from '@/lib/types';
import { toast } from 'sonner';

interface ThirdPartyReviewFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewCreated: () => void;
  thirdPartyReview?: any;
}

export function ThirdPartyReviewFormModal({ 
  open, 
  onOpenChange, 
  onReviewCreated, 
  thirdPartyReview 
}: ThirdPartyReviewFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [dataTypesInput, setDataTypesInput] = useState('');
  const [contractExpiry, setContractExpiry] = useState<Date>();

  const form = useForm<ThirdPartyReviewRequest>({
    defaultValues: {
      name: '',
      description: '',
      applicationUrl: '',
      additionalUrls: [],
      vendor: '',
      applicationCategory: '',
      businessPurpose: '',
      dataTypes: [],
      scanFrequency: 'MANUAL' as ScanFrequency,
      businessOwner: '',
      technicalContact: '',
      contractStatus: 'ACTIVE' as ContractStatus,
      dataProcessingAgreement: false,
      dataClassification: 'INTERNAL' as DataClassification,
      businessCriticality: 'MEDIUM' as BusinessCriticality,
    },
  });

  useEffect(() => {
    if (thirdPartyReview) {
      form.reset({
        name: thirdPartyReview.name || '',
        description: thirdPartyReview.description || '',
        applicationUrl: thirdPartyReview.applicationUrl || '',
        additionalUrls: thirdPartyReview.additionalUrls || [],
        vendor: thirdPartyReview.vendor || '',
        applicationCategory: thirdPartyReview.applicationCategory || '',
        businessPurpose: thirdPartyReview.businessPurpose || '',
        dataTypes: thirdPartyReview.dataTypes || [],
        scanFrequency: thirdPartyReview.scanFrequency || 'MANUAL',
        businessOwner: thirdPartyReview.businessOwner || '',
        technicalContact: thirdPartyReview.technicalContact || '',
        contractStatus: thirdPartyReview.contractStatus || 'ACTIVE',
        dataProcessingAgreement: thirdPartyReview.dataProcessingAgreement || false,
        dataClassification: thirdPartyReview.dataClassification || 'INTERNAL',
        businessCriticality: thirdPartyReview.businessCriticality || 'MEDIUM',
      });
      if (thirdPartyReview.contractExpiry) {
        setContractExpiry(new Date(thirdPartyReview.contractExpiry));
      }
    } else {
      form.reset();
      setContractExpiry(undefined);
    }
  }, [thirdPartyReview, form]);

  const onSubmit = async (data: ThirdPartyReviewRequest) => {
    setLoading(true);
    try {
      const submitData = {
        ...data,
        contractExpiry: contractExpiry?.toISOString(),
      };

      const url = thirdPartyReview ? `/api/third-party-reviews/${thirdPartyReview.id}` : '/api/third-party-reviews';
      const method = thirdPartyReview ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${thirdPartyReview ? 'update' : 'create'} third-party review`);
      }

      onReviewCreated();
      toast.success(`Third-party review ${thirdPartyReview ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving third-party review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save third-party review');
    } finally {
      setLoading(false);
    }
  };

  const addDataType = () => {
    if (dataTypesInput.trim()) {
      const currentValues = form.getValues('dataTypes') || [];
      if (!currentValues.includes(dataTypesInput.trim())) {
        form.setValue('dataTypes', [...currentValues, dataTypesInput.trim()]);
      }
      setDataTypesInput('');
    }
  };

  const removeDataType = (dataType: string) => {
    const currentValues = form.getValues('dataTypes') || [];
    form.setValue('dataTypes', currentValues.filter(value => value !== dataType));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {thirdPartyReview ? 'Edit Third-Party Review' : 'Create New Third-Party Review'}
          </DialogTitle>
          <DialogDescription>
            {thirdPartyReview 
              ? 'Update the third-party application information and security settings.'
              : 'Add a new third-party application for security assessment and monitoring.'
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
                      <FormLabel>Application Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Slack, Salesforce" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicationUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application URL *</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input placeholder="Company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicationCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SaaS, API, Tool" {...field} />
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
                          placeholder="Brief description of the application..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Business Information</h3>

                <FormField
                  control={form.control}
                  name="businessPurpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Purpose</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="How is this application used in your business?"
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessOwner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Owner</FormLabel>
                        <FormControl>
                          <Input placeholder="Name or email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="technicalContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Technical Contact</FormLabel>
                        <FormControl>
                          <Input placeholder="Name or email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Data Types */}
                <FormField
                  control={form.control}
                  name="dataTypes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Types Shared</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add data type (e.g., PII, Financial)"
                            value={dataTypesInput}
                            onChange={(e) => setDataTypesInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addDataType();
                              }
                            }}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={addDataType}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(field.value || []).map((dataType: string) => (
                            <Badge key={dataType} variant="secondary" className="text-xs">
                              {dataType}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-2"
                                onClick={() => removeDataType(dataType)}
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
            </div>

            {/* Contract & Monitoring */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contract & Monitoring</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="contractStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="EXPIRED">Expired</SelectItem>
                          <SelectItem value="PENDING_RENEWAL">Pending Renewal</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                          <SelectItem value="NEGOTIATING">Negotiating</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scanFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scan Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MANUAL">Manual</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Contract Expiry</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !contractExpiry && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {contractExpiry ? format(contractExpiry, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={contractExpiry}
                        onSelect={setContractExpiry}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <FormField
                control={form.control}
                name="dataProcessingAgreement"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Data Processing Agreement</FormLabel>
                      <FormDescription>
                        Is there a data processing agreement in place?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : thirdPartyReview ? 'Update Review' : 'Create Review'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
