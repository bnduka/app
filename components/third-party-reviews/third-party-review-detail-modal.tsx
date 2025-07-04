
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit, 
  Trash2, 
  ExternalLink, 
  Globe,
  BarChart3,
  Scan,
  Calendar,
  Building,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { ThirdPartyReviewWithDetails } from '@/lib/types';
import { ThirdPartyReviewFormModal } from './third-party-review-form-modal';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface ThirdPartyReviewDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thirdPartyReview: ThirdPartyReviewWithDetails;
  onReviewUpdated: () => void;
  onReviewDeleted: () => void;
}

export function ThirdPartyReviewDetailModal({
  open,
  onOpenChange,
  thirdPartyReview,
  onReviewUpdated,
  onReviewDeleted,
}: ThirdPartyReviewDetailModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleStartScan = async () => {
    setScanning(true);
    try {
      const response = await fetch(`/api/third-party-reviews/${thirdPartyReview.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: thirdPartyReview.applicationUrl,
          scanType: 'COMPREHENSIVE',
          includeHeaders: true,
          includeCookies: true,
          includePrivacyPolicy: true,
          includeTermsOfService: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start scan');
      }

      onReviewUpdated();
      toast.success('Security scan completed successfully');
    } catch (error) {
      console.error('Error starting scan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start scan');
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-2xl">{thirdPartyReview.name}</DialogTitle>
                <div className="flex items-center gap-2">
                  <a
                    href={thirdPartyReview.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    <Globe className="h-4 w-4" />
                    {new URL(thirdPartyReview.applicationUrl).hostname}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {thirdPartyReview.description && (
                  <DialogDescription className="text-base">
                    {thirdPartyReview.description}
                  </DialogDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  onClick={handleStartScan}
                  disabled={scanning}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  {scanning ? 'Scanning...' : 'Start Scan'}
                </Button>
                <Button variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Security Assessment */}
            {thirdPartyReview.overallScore && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold">{thirdPartyReview.overallScore}/100</div>
                    {thirdPartyReview.securityGrade && (
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Grade {thirdPartyReview.securityGrade}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Risk Level</span>
                      <Badge variant={
                        thirdPartyReview.riskLevel === 'HIGH' || thirdPartyReview.riskLevel === 'VERY_HIGH' 
                          ? 'destructive' : 'outline'
                      }>
                        {thirdPartyReview.riskLevel.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {thirdPartyReview.tlsGrade && (
                      <div className="flex justify-between text-sm">
                        <span>TLS Grade</span>
                        <span className="font-medium">{thirdPartyReview.tlsGrade}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Application Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {thirdPartyReview.vendor && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Vendor
                      </label>
                      <p className="text-sm font-medium">{thirdPartyReview.vendor}</p>
                    </div>
                  )}
                  {thirdPartyReview.applicationCategory && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Category
                      </label>
                      <p className="text-sm font-medium">{thirdPartyReview.applicationCategory}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Business Criticality
                    </label>
                    <Badge variant="outline">{thirdPartyReview.businessCriticality.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Data Classification
                    </label>
                    <Badge variant="outline">{thirdPartyReview.dataClassification}</Badge>
                  </div>
                </div>
                
                {thirdPartyReview.businessPurpose && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Business Purpose
                    </label>
                    <p className="text-sm mt-1">{thirdPartyReview.businessPurpose}</p>
                  </div>
                )}

                {thirdPartyReview.dataTypes && thirdPartyReview.dataTypes.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Data Types Shared
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {thirdPartyReview.dataTypes.map((dataType) => (
                        <Badge key={dataType} variant="secondary" className="text-xs">
                          {dataType}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span>SSO Support</span>
                    <Badge variant={thirdPartyReview.supportsSSO ? 'default' : 'secondary'}>
                      {thirdPartyReview.supportsSSO ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>MFA Support</span>
                    <Badge variant={thirdPartyReview.supportsMFA ? 'default' : 'secondary'}>
                      {thirdPartyReview.supportsMFA ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Encryption in Transit</span>
                    <Badge variant={thirdPartyReview.encryptionInTransit ? 'default' : 'secondary'}>
                      {thirdPartyReview.encryptionInTransit ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Encryption at Rest</span>
                    <Badge variant={thirdPartyReview.encryptionAtRest ? 'default' : 'secondary'}>
                      {thirdPartyReview.encryptionAtRest ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>

                {thirdPartyReview.certifications && thirdPartyReview.certifications.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Certifications
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {thirdPartyReview.certifications.map((cert) => (
                        <Badge key={cert} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scan History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Scan History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Last Scan</span>
                    <span>
                      {thirdPartyReview.lastScanDate 
                        ? formatDistanceToNow(new Date(thirdPartyReview.lastScanDate), { addSuffix: true })
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Scan</span>
                    <span>
                      {thirdPartyReview.nextScanDate 
                        ? formatDistanceToNow(new Date(thirdPartyReview.nextScanDate), { addSuffix: true })
                        : 'Not scheduled'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scan Frequency</span>
                    <Badge variant="outline" className="text-xs">
                      {thirdPartyReview.scanFrequency}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <ThirdPartyReviewFormModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onReviewCreated={onReviewUpdated}
        thirdPartyReview={thirdPartyReview}
      />
    </>
  );
}
