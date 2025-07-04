
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertTriangle, Calendar, User, Shield } from 'lucide-react';
import { FindingWithDetails, FindingStatus } from '@/lib/types';

interface FindingDetailProps {
  finding: FindingWithDetails;
  onUpdate: (findingId: string, updates: Partial<FindingWithDetails>) => Promise<void>;
  onClose: () => void;
}

export function FindingDetail({ finding, onUpdate, onClose }: FindingDetailProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<FindingStatus>(finding.status);
  const [comments, setComments] = useState(finding.comments || '');

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(finding.id, { status, comments });
      onClose();
    } catch (error) {
      console.error('Error updating finding:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getSeverityIcon = () => {
    switch (finding.severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSeverityIcon()}
            {finding.threatScenario}
          </DialogTitle>
          <DialogDescription>
            Manage this security finding and track its resolution progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Finding Overview */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={finding.severity} />
              <StatusBadge status={finding.strideCategory} />
              <StatusBadge status={finding.status} />
            </div>

            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {finding.description}
              </p>
            </div>

            {finding.recommendation && (
              <div>
                <Label className="text-sm font-medium">Recommendation</Label>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {finding.recommendation}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Threat Model:</span>
              <span className="font-medium">{finding.threatModel.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created by:</span>
              <span className="font-medium">{`${finding.user.firstName || ''} ${finding.user.lastName || ''}`.trim() || finding.user.name || finding.user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{new Date(finding.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Updated:</span>
              <span className="font-medium">{new Date(finding.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <Separator />

          {/* Update Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: FindingStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments / Notes</Label>
              <Textarea
                id="comments"
                placeholder="Add comments about the resolution progress, implementation details, or any additional notes..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Updating...
              </>
            ) : (
              'Update Finding'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
