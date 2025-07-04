
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { TagWithDetails } from '@/lib/types';
import { Tag as TagIcon } from 'lucide-react';

interface TaggingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingId: string;
  availableTags: TagWithDetails[];
  onTagAdded: () => void;
}

export function TaggingModal({
  open,
  onOpenChange,
  findingId,
  availableTags,
  onTagAdded
}: TaggingModalProps) {
  const [selectedTagId, setSelectedTagId] = useState('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddTag = async () => {
    if (!selectedTagId) {
      toast.error('Please select a tag to apply');
      return;
    }

    const selectedTag = availableTags.find(tag => tag.id === selectedTagId);
    const requiresJustification = selectedTag && ['False Positive', 'Not Applicable'].includes(selectedTag.name);

    if (requiresJustification && !justification.trim()) {
      toast.error(`Justification is required for "${selectedTag?.name}" tag`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/findings/${findingId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagId: selectedTagId,
          justification: justification.trim() || undefined,
        }),
      });

      if (response.ok) {
        toast.success('Tag applied successfully');
        onTagAdded();
        onOpenChange(false);
        setSelectedTagId('');
        setJustification('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to apply tag');
      }
    } catch (error) {
      console.error('Error applying tag:', error);
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedTag = availableTags.find(tag => tag.id === selectedTagId);
  const requiresJustification = selectedTag && ['False Positive', 'Not Applicable'].includes(selectedTag.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            Apply Tag to Finding
          </DialogTitle>
          <DialogDescription>
            Add a tag to categorize or mark the status of this finding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tag Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Tag</label>
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a tag..." />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: tag.color || '#6b7280' }}
                      />
                      <span>{tag.name}</span>
                      {tag.isSystemTag && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Tag Details */}
          {selectedTag && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <div 
                  className="w-4 h-4 rounded-full border mt-0.5"
                  style={{ backgroundColor: selectedTag.color || '#6b7280' }}
                />
                <div className="flex-1">
                  <div className="font-medium">{selectedTag.name}</div>
                  {selectedTag.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedTag.description}
                    </div>
                  )}
                  {selectedTag.isSystemTag && (
                    <Badge variant="outline" className="text-xs mt-2">
                      System Tag
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Justification Field */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Justification
              {requiresJustification && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <Textarea
              placeholder={
                requiresJustification
                  ? `Please provide justification for applying "${selectedTag?.name}" tag...`
                  : "Optional: Provide additional context for this tag..."
              }
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {requiresJustification && (
              <p className="text-xs text-muted-foreground mt-1">
                Justification is required for "{selectedTag?.name}" tags
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddTag} disabled={loading || !selectedTagId}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Applying...
              </>
            ) : (
              <>
                <TagIcon className="h-4 w-4 mr-2" />
                Apply Tag
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
