
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import {
  ApplicationAssetType,
  ApplicationAssetStatus,
  BusinessCriticality,
  Environment,
  ThreatModelLinkStatus,
  DesignReviewLinkStatus,
} from '@/lib/types';

interface AssetFiltersProps {
  onApply: (filters: any) => void;
}

export function AssetFilters({ onApply }: AssetFiltersProps) {
  const [filters, setFilters] = useState({
    assetType: [] as ApplicationAssetType[],
    status: [] as ApplicationAssetStatus[],
    businessCriticality: [] as BusinessCriticality[],
    environment: [] as Environment[],
    threatModelStatus: [] as ThreatModelLinkStatus[],
    designReviewStatus: [] as DesignReviewLinkStatus[],
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');

  const addToFilter = (field: keyof typeof filters, value: string) => {
    const currentValues = filters[field] as string[];
    if (!currentValues.includes(value)) {
      setFilters(prev => ({
        ...prev,
        [field]: [...currentValues, value]
      }));
    }
  };

  const removeFromFilter = (field: keyof typeof filters, value: string) => {
    const currentValues = filters[field] as string[];
    setFilters(prev => ({
      ...prev,
      [field]: currentValues.filter(v => v !== value)
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !filters.tags.includes(tagInput.trim())) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const clearAllFilters = () => {
    setFilters({
      assetType: [],
      status: [],
      businessCriticality: [],
      environment: [],
      threatModelStatus: [],
      designReviewStatus: [],
      tags: [],
    });
  };

  const handleApply = () => {
    // Convert arrays to comma-separated strings for URL params
    const filterParams: any = {};
    Object.entries(filters).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        filterParams[key] = values.join(',');
      }
    });
    onApply(filterParams);
  };

  const hasActiveFilters = Object.values(filters).some(arr => Array.isArray(arr) && arr.length > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Asset Type Filter */}
        <div className="space-y-2">
          <Label>Asset Type</Label>
          <Select onValueChange={(value) => addToFilter('assetType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
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
          {filters.assetType.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.assetType.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type.replace(/_/g, ' ')}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => removeFromFilter('assetType', type)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select onValueChange={(value) => addToFilter('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
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
          {filters.status.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.status.map(status => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {status.replace(/_/g, ' ')}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => removeFromFilter('status', status)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Business Criticality Filter */}
        <div className="space-y-2">
          <Label>Business Criticality</Label>
          <Select onValueChange={(value) => addToFilter('businessCriticality', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select criticality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VERY_HIGH">Very High</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="VERY_LOW">Very Low</SelectItem>
            </SelectContent>
          </Select>
          {filters.businessCriticality.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.businessCriticality.map(criticality => (
                <Badge key={criticality} variant="secondary" className="text-xs">
                  {criticality.replace(/_/g, ' ')}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => removeFromFilter('businessCriticality', criticality)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Environment Filter */}
        <div className="space-y-2">
          <Label>Environment</Label>
          <Select onValueChange={(value) => addToFilter('environment', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
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
          {filters.environment.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.environment.map(env => (
                <Badge key={env} variant="secondary" className="text-xs">
                  {env}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => removeFromFilter('environment', env)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Threat Model Status Filter */}
        <div className="space-y-2">
          <Label>Threat Model Status</Label>
          <Select onValueChange={(value) => addToFilter('threatModelStatus', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select TM status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
            </SelectContent>
          </Select>
          {filters.threatModelStatus.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.threatModelStatus.map(status => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {status.replace(/_/g, ' ')}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => removeFromFilter('threatModelStatus', status)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Design Review Status Filter */}
        <div className="space-y-2">
          <Label>Design Review Status</Label>
          <Select onValueChange={(value) => addToFilter('designReviewStatus', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select DR status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
            </SelectContent>
          </Select>
          {filters.designReviewStatus.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.designReviewStatus.map(status => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {status.replace(/_/g, ' ')}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => removeFromFilter('designReviewStatus', status)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Tags Filter */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag filter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => removeFromFilter('tags', tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-500">
          {hasActiveFilters ? 'Filters applied' : 'No filters applied'}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearAllFilters} disabled={!hasActiveFilters}>
            Clear All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
