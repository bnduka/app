
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { AssetWithDetails } from '@/lib/types';
import { Link as LinkIcon } from 'lucide-react';

interface AssetLinkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingId: string;
  availableAssets: AssetWithDetails[];
  onAssetLinked: () => void;
}

export function AssetLinkingModal({
  open,
  onOpenChange,
  findingId,
  availableAssets,
  onAssetLinked
}: AssetLinkingModalProps) {
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedImpact, setSelectedImpact] = useState<'DIRECT' | 'INDIRECT' | 'CASCADING'>('DIRECT');
  const [loading, setLoading] = useState(false);

  const handleLinkAsset = async () => {
    if (!selectedAssetId) {
      toast.error('Please select an asset to link');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/findings/${findingId}/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: selectedAssetId,
          impact: selectedImpact,
        }),
      });

      if (response.ok) {
        toast.success('Asset linked successfully');
        onAssetLinked();
        onOpenChange(false);
        setSelectedAssetId('');
        setSelectedImpact('DIRECT');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to link asset');
      }
    } catch (error) {
      console.error('Error linking asset:', error);
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedAsset = availableAssets.find(asset => asset.id === selectedAssetId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link Asset to Finding
          </DialogTitle>
          <DialogDescription>
            Connect this finding to an affected asset and specify the impact level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Asset</label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an asset..." />
              </SelectTrigger>
              <SelectContent>
                {availableAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {asset.type.replace(/_/g, ' ')}
                      </Badge>
                      <span>{asset.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Asset Details */}
          {selectedAsset && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <Badge variant="outline">
                  {selectedAsset.type.replace(/_/g, ' ')}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium">{selectedAsset.name}</div>
                  {selectedAsset.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedAsset.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Impact Level Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Impact Level</label>
            <Select value={selectedImpact} onValueChange={(value: any) => setSelectedImpact(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIRECT">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Direct</span>
                    <span className="text-xs text-muted-foreground">
                      Finding directly affects this asset
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="INDIRECT">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Indirect</span>
                    <span className="text-xs text-muted-foreground">
                      Finding indirectly affects this asset
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="CASCADING">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Cascading</span>
                    <span className="text-xs text-muted-foreground">
                      Finding can cascade to affect this asset
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLinkAsset} disabled={loading || !selectedAssetId}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Linking...
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Link Asset
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
