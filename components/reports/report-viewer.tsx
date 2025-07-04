
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Calendar, User } from 'lucide-react';
import { ReportWithDetails } from '@/lib/types';

interface ReportViewerProps {
  report: ReportWithDetails;
  onClose: () => void;
}

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  const downloadReport = async () => {
    try {
      const response = await fetch(`/api/reports/${report.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}.${report.format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatBadgeColor = () => {
    switch (report.format) {
      case 'PDF': return 'bg-red-100 text-red-800 border-red-200';
      case 'HTML': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            {report.name}
          </DialogTitle>
          <DialogDescription>
            View and download this threat analysis report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={getFormatBadgeColor()}>
                {report.format}
              </Badge>
              <Badge variant="outline">
                {formatFileSize(report.fileSize)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Threat Model:</span>
                <span className="font-medium">{report.threatModel.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created by:</span>
                <span className="font-medium">{`${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() || report.user.name || report.user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Generated:</span>
                <span className="font-medium">{new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Report Content Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Report Preview</h3>
            {report.format === 'HTML' ? (
              <div 
                className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: report.content }}
              />
            ) : (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>PDF preview not available</p>
                  <p className="text-sm">Download the report to view the full content</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={downloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
