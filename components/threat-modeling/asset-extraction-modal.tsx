
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { AssetWithDetails } from '@/lib/types';
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react';

interface AssetExtractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threatModelId: string;
  onAssetsExtracted: (assets: AssetWithDetails[]) => void;
}

export function AssetExtractionModal({
  open,
  onOpenChange,
  threatModelId,
  onAssetsExtracted
}: AssetExtractionModalProps) {
  const [documentContent, setDocumentContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractionResult, setExtractionResult] = useState<{
    success: boolean;
    message: string;
    assetsCount: number;
  } | null>(null);

  const handleExtractAssets = async () => {
    if (!documentContent.trim()) {
      toast.error('Please provide document content to extract assets from');
      return;
    }

    setLoading(true);
    setExtractionResult(null);

    try {
      const response = await fetch('/api/assets/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threatModelId,
          documentContent: documentContent.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExtractionResult({
          success: true,
          message: data.message,
          assetsCount: data.assets.length,
        });
        onAssetsExtracted(data.assets);
        toast.success(`Successfully extracted ${data.assets.length} assets`);
      } else {
        const errorData = await response.json();
        setExtractionResult({
          success: false,
          message: errorData.error || 'Asset extraction failed',
          assetsCount: 0,
        });
        toast.error(errorData.error || 'Asset extraction failed');
      }
    } catch (error) {
      console.error('Error extracting assets:', error);
      setExtractionResult({
        success: false,
        message: 'Network error occurred',
        assetsCount: 0,
      });
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setDocumentContent('');
    setExtractionResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Extract Assets from Document
          </DialogTitle>
          <DialogDescription>
            Paste your technical specification, architecture document, or system description below. 
            Our AI will automatically identify and extract relevant assets for threat modeling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Content Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Document Content <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Paste your technical specification here...

Example:
The system consists of:
- A React frontend application served by Nginx
- Node.js API server with Express framework
- PostgreSQL database for user data
- Redis cache for session management
- AWS S3 for file storage
- Stripe API for payment processing
- JWT authentication system
- REST API endpoints for user management"
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              rows={12}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include details about APIs, databases, services, components, data flows, and integrations.
            </p>
          </div>

          {/* Extraction Result */}
          {extractionResult && (
            <Alert className={extractionResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {extractionResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={extractionResult.success ? 'text-green-800' : 'text-red-800'}>
                {extractionResult.message}
                {extractionResult.success && extractionResult.assetsCount > 0 && (
                  <div className="mt-2 text-sm">
                    {extractionResult.assetsCount} assets have been added to your threat model.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Usage Tips */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Tips for better extraction:</strong>
              <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                <li>Include architectural diagrams descriptions</li>
                <li>Mention specific technologies, frameworks, and protocols</li>
                <li>Describe data flows and integration points</li>
                <li>List external dependencies and third-party services</li>
                <li>Include authentication and authorization details</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {extractionResult?.success ? 'Done' : 'Cancel'}
          </Button>
          {!extractionResult?.success && (
            <Button 
              onClick={handleExtractAssets} 
              disabled={loading || !documentContent.trim()}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Extracting Assets...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Extract Assets
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
