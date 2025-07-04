
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Edit, 
  Trash2, 
  Play,
  BarChart3, 
  FileText, 
  Shield,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { DesignReviewWithDetails } from '@/lib/types';
import { DesignReviewFormModal } from './design-review-form-modal';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface DesignReviewDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designReview: DesignReviewWithDetails;
  onReviewUpdated: () => void;
  onReviewDeleted: () => void;
}

export function DesignReviewDetailModal({
  open,
  onOpenChange,
  designReview,
  onReviewUpdated,
  onReviewDeleted,
}: DesignReviewDetailModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/design-reviews/${designReview.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete design review');
      }

      onReviewDeleted();
      toast.success('Design review deleted successfully');
    } catch (error) {
      console.error('Error deleting design review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete design review');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!designReview.architectureDescription) {
      toast.error('Architecture description is required for analysis');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch(`/api/design-reviews/${designReview.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          architectureDescription: designReview.architectureDescription,
          techStack: designReview.techStack,
          systemType: designReview.systemType,
          complianceFrameworks: designReview.complianceFrameworks,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start analysis');
      }

      onReviewUpdated();
      toast.success('Design analysis completed successfully');
    } catch (error) {
      console.error('Error starting analysis:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      DRAFT: { variant: 'secondary' },
      IN_PROGRESS: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      UNDER_REVIEW: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      COMPLETED: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      CANCELLED: { variant: 'destructive' },
      ARCHIVED: { variant: 'outline' },
    };

    const config = variants[status] || { variant: 'secondary' };
    return (
      <Badge {...config}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return null;

    const variants: Record<string, any> = {
      A: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      B: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      C: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      D: { variant: 'outline', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      F: { variant: 'destructive' },
    };

    const config = variants[grade] || { variant: 'secondary' };
    return (
      <Badge {...config} className="text-lg px-3 py-1">
        Grade {grade}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, any> = {
      VERY_LOW: { variant: 'outline', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      LOW: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      MEDIUM: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      HIGH: { variant: 'outline', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      VERY_HIGH: { variant: 'destructive' },
      CRITICAL: { variant: 'destructive' },
    };

    const config = variants[risk] || { variant: 'secondary' };
    return (
      <Badge {...config}>
        {risk.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const securityFindings = designReview.securityFindings 
    ? JSON.parse(designReview.securityFindings) 
    : [];
  const recommendations = designReview.recommendations 
    ? JSON.parse(designReview.recommendations) 
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-2xl">{designReview.name}</DialogTitle>
                <div className="flex items-center gap-2">
                  {getStatusBadge(designReview.status)}
                  {getRiskBadge(designReview.overallRisk)}
                  <Badge variant="outline">{designReview.reviewType.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline">{designReview.systemType.replace(/_/g, ' ')}</Badge>
                  {designReview.securityGrade && getGradeBadge(designReview.securityGrade)}
                </div>
                {designReview.description && (
                  <DialogDescription className="text-base">
                    {designReview.description}
                  </DialogDescription>
                )}
              </div>
              <div className="flex gap-2">
                {designReview.status !== 'COMPLETED' && designReview.architectureDescription && (
                  <Button 
                    variant="default" 
                    onClick={handleStartAnalysis}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the design review
                        and all associated analysis results.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {loading ? 'Deleting...' : 'Delete Review'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analysis">Analysis Results</TabsTrigger>
              <TabsTrigger value="technical">Technical Details</TabsTrigger>
              <TabsTrigger value="assets">Linked Assets</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Progress & Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Progress & Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm font-medium">{designReview.progress}%</span>
                      </div>
                      <Progress value={designReview.progress} className="w-full" />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Current Status
                        </label>
                        <div className="mt-1">
                          {getStatusBadge(designReview.status)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Risk Level
                        </label>
                        <div className="mt-1">
                          {getRiskBadge(designReview.overallRisk)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Security Assessment */}
                {designReview.securityScore && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Security Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center space-y-2">
                        <div className="text-3xl font-bold">{designReview.securityScore}/100</div>
                        {designReview.securityGrade && getGradeBadge(designReview.securityGrade)}
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        {[
                          { label: 'Authentication', score: designReview.authenticationScore },
                          { label: 'Authorization', score: designReview.authorizationScore },
                          { label: 'Data Protection', score: designReview.dataProtectionScore },
                          { label: 'Input Validation', score: designReview.inputValidationScore },
                          { label: 'Logging & Monitoring', score: designReview.loggingMonitoringScore },
                          { label: 'Secure Design', score: designReview.secureDesignScore },
                        ].map(({ label, score }) => (
                          <div key={label} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{label}</span>
                              <span className="font-medium">{score}/100</span>
                            </div>
                            <Progress value={score || 0} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Review Details */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Review Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Review Type
                        </label>
                        <p className="text-sm font-medium">{designReview.reviewType.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          System Type
                        </label>
                        <p className="text-sm font-medium">{designReview.systemType.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Created
                        </label>
                        <p className="text-sm">{format(new Date(designReview.createdAt), 'MMM dd, yyyy')}</p>
                      </div>
                      {designReview.reviewCompletedDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Completed
                          </label>
                          <p className="text-sm">{format(new Date(designReview.reviewCompletedDate), 'MMM dd, yyyy')}</p>
                        </div>
                      )}
                    </div>

                    {(designReview.scope || designReview.businessContext) && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          {designReview.scope && (
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Scope
                              </label>
                              <p className="text-sm mt-1">{designReview.scope}</p>
                            </div>
                          )}
                          {designReview.businessContext && (
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Business Context
                              </label>
                              <p className="text-sm mt-1">{designReview.businessContext}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {designReview.status === 'COMPLETED' && (securityFindings.length > 0 || recommendations.length > 0) ? (
                <div className="space-y-6">
                  {/* Security Findings */}
                  {securityFindings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Security Findings
                          <Badge variant="secondary">{securityFindings.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {securityFindings.map((finding: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium">{finding.title}</h4>
                                <Badge variant={
                                  finding.severity === 'CRITICAL' ? 'destructive' :
                                  finding.severity === 'HIGH' ? 'destructive' :
                                  finding.severity === 'MEDIUM' ? 'outline' : 'secondary'
                                }>
                                  {finding.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {finding.description}
                              </p>
                              {finding.recommendation && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                  <p className="text-sm">
                                    <strong>Recommendation:</strong> {finding.recommendation}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Security Recommendations
                          <Badge variant="secondary">{recommendations.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {recommendations.map((rec: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium">{rec.title}</h4>
                                <Badge variant={
                                  rec.priority === 'HIGH' ? 'destructive' :
                                  rec.priority === 'MEDIUM' ? 'outline' : 'secondary'
                                }>
                                  {rec.priority} Priority
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {rec.description}
                              </p>
                              <div className="flex gap-4 text-xs text-gray-500">
                                <span>Effort: {rec.effort}</span>
                                <span>Impact: {rec.impact}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
                  <p className="mb-4">
                    {!designReview.architectureDescription 
                      ? 'Add an architecture description and start the security analysis.'
                      : 'Click "Start Analysis" to begin the security assessment.'
                    }
                  </p>
                  {designReview.architectureDescription && designReview.status !== 'COMPLETED' && (
                    <Button onClick={handleStartAnalysis} disabled={analyzing}>
                      {analyzing ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Start Analysis
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="technical" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Architecture Description */}
                {designReview.architectureDescription && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Architecture Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{designReview.architectureDescription}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Technical Stack */}
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Stack</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {designReview.cloudProviders && designReview.cloudProviders.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Cloud Providers
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {designReview.cloudProviders.map((provider) => (
                            <Badge key={provider} variant="outline">{provider}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {designReview.frameworks && designReview.frameworks.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Frameworks
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {designReview.frameworks.map((framework) => (
                            <Badge key={framework} variant="outline">{framework}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {designReview.databases && designReview.databases.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Databases
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {designReview.databases.map((database) => (
                            <Badge key={database} variant="outline">{database}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Compliance */}
                {designReview.complianceFrameworks && designReview.complianceFrameworks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Compliance Frameworks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {designReview.complianceFrameworks.map((framework) => (
                          <Badge key={framework} variant="secondary">{framework}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="assets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Linked Assets
                    <Badge variant="secondary">{designReview.linkedAssets?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {designReview.linkedAssets && designReview.linkedAssets.length > 0 ? (
                    <div className="space-y-3">
                      {designReview.linkedAssets.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{link.applicationAsset.name}</p>
                            <p className="text-sm text-gray-500">
                              Type: {link.applicationAsset.assetType.replace(/_/g, ' ')} • 
                              Environment: {link.applicationAsset.environment}
                            </p>
                          </div>
                          <Badge variant="outline">{link.linkStatus}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Building className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No assets linked to this design review</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Link Assets
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <DesignReviewFormModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onReviewCreated={onReviewUpdated}
        designReview={designReview}
      />
    </>
  );
}
