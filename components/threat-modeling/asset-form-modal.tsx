
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { AssetWithDetails, AssetType } from '@/lib/types';
import { Plus, Edit } from 'lucide-react';

interface AssetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threatModelId: string;
  asset?: AssetWithDetails | null;
  onAssetCreated: (asset: AssetWithDetails) => void;
  onAssetUpdated: (asset: AssetWithDetails) => void;
}

export function AssetFormModal({
  open,
  onOpenChange,
  threatModelId,
  asset,
  onAssetCreated,
  onAssetUpdated
}: AssetFormModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('OTHER');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!asset;

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setType(asset.type);
      setDescription(asset.description || '');
      setProperties(asset.properties || '');
    } else {
      setName('');
      setType('OTHER');
      setDescription('');
      setProperties('');
    }
  }, [asset, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        properties: properties.trim() || undefined,
        threatModelId,
      };

      const url = isEditing ? `/api/assets/${asset.id}` : '/api/assets';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        if (isEditing) {
          onAssetUpdated(data.asset);
          toast.success('Asset updated successfully');
        } else {
          onAssetCreated(data.asset);
          toast.success('Asset created successfully');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save asset');
      }
    } catch (error) {
      console.error('Error saving asset:', error);
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const assetTypes: { value: AssetType; label: string; description: string }[] = [
    { value: 'API', label: 'API', description: 'REST/GraphQL endpoints, web services' },
    { value: 'DATABASE', label: 'Database', description: 'Data storage systems, repositories' },
    { value: 'SERVICE', label: 'Service', description: 'Backend services, business logic' },
    { value: 'COMPONENT', label: 'Component', description: 'System components, modules' },
    { value: 'DATA_FLOW', label: 'Data Flow', description: 'Data transmission paths, pipelines' },
    { value: 'EXTERNAL_DEPENDENCY', label: 'External Dependency', description: 'Third-party services, external systems' },
    { value: 'USER_INTERFACE', label: 'User Interface', description: 'Frontend applications, dashboards' },
    { value: 'AUTHENTICATION_SYSTEM', label: 'Authentication System', description: 'Auth services, identity providers' },
    { value: 'FILE_SYSTEM', label: 'File System', description: 'File storage, document management' },
    { value: 'NETWORK_COMPONENT', label: 'Network Component', description: 'Proxies, gateways, routers' },
    { value: 'THIRD_PARTY_INTEGRATION', label: 'Third Party Integration', description: 'External APIs, payment systems' },
    { value: 'MICROSERVICE', label: 'Microservice', description: 'Individual microservices' },
    { value: 'MESSAGE_QUEUE', label: 'Message Queue', description: 'Event systems, message brokers' },
    { value: 'CACHE', label: 'Cache', description: 'Caching layers, temporary storage' },
    { value: 'LOAD_BALANCER', label: 'Load Balancer', description: 'Traffic distribution systems' },
    { value: 'OTHER', label: 'Other', description: 'Other types of assets' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5" />
                Edit Asset
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add New Asset
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the asset information below.'
              : 'Add a new asset to this threat model.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Asset Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., User Authentication API"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Asset Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Asset Type <span className="text-red-500">*</span>
            </label>
            <Select value={type} onValueChange={(value: AssetType) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assetTypes.map((assetType) => (
                  <SelectItem key={assetType.value} value={assetType.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{assetType.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {assetType.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Describe the asset's purpose and functionality..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Properties */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Technical Properties
            </label>
            <Textarea
              placeholder="e.g., {&quot;endpoints&quot;: [&quot;/login&quot;, &quot;/logout&quot;], &quot;authentication&quot;: &quot;JWT&quot;, &quot;rateLimit&quot;: &quot;100/min&quot;}"
              value={properties}
              onChange={(e) => setProperties(e.target.value)}
              rows={3}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: JSON format for technical details like endpoints, protocols, etc.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {isEditing ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Asset
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Asset
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
