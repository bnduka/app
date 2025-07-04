
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Calendar,
  User,
  Shield,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Eye,
  Plus,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  format: string;
  createdAt: string;
  downloadCount: number;
  lastDownloaded: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  threatModel: {
    id: string;
    name: string;
    status: string;
  };
}

interface ThreatModel {
  id: string;
  name: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  findingsCount?: number;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [threatModels, setThreatModels] = useState<ThreatModel[]>([]);
  const [selectedThreatModelId, setSelectedThreatModelId] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('PDF');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThreatModels, setIsLoadingThreatModels] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchReports();
      fetchThreatModels();
    }
  }, [status, router]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/reports');
      
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        throw new Error('Failed to fetch reports');
      }
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThreatModels = async () => {
    try {
      setIsLoadingThreatModels(true);
      const response = await fetch('/api/threat-models');
      
      if (response.ok) {
        const data = await response.json();
        // Only include threat models that have some findings for meaningful reports
        const modelsWithFindings = data.threatModels?.filter((tm: ThreatModel) => 
          tm.status === 'COMPLETED' || (tm.findingsCount && tm.findingsCount > 0)
        ) || [];
        setThreatModels(modelsWithFindings);
      } else {
        console.error('Failed to fetch threat models');
      }
    } catch (error: any) {
      console.error('Error fetching threat models:', error);
    } finally {
      setIsLoadingThreatModels(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedThreatModelId) {
      toast.error('Please select a threat model');
      return;
    }

    if (!selectedFormat) {
      toast.error('Please select a report format');
      return;
    }

    try {
      setIsGenerating(true);
      
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threatModelId: selectedThreatModelId,
          format: selectedFormat,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `${selectedFormat} report generated successfully`);
        
        // Reset form
        setSelectedThreatModelId('');
        setSelectedFormat('PDF');
        
        // Refresh reports list
        fetchReports();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (reportId: string, format: string, reportName: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${reportName.replace(/[^a-zA-Z0-9]/g, '_')}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${format.toUpperCase()} report downloaded successfully`);
      
      // Refresh reports to update download count
      fetchReports();
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setDeletingReportId(reportId);
      
      const response = await fetch(`/api/reports/${reportId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete report');
      }

      toast.success('Report deleted successfully');
      
      // Remove from local state
      setReports(prev => prev.filter(report => report.id !== reportId));
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message);
    } finally {
      setDeletingReportId(null);
    }
  };

  const getFormatBadge = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return <Badge className="bg-red-100 text-red-800">PDF</Badge>;
      case 'excel':
        return <Badge className="bg-green-100 text-green-800">Excel</Badge>;
      case 'html':
        return <Badge className="bg-blue-100 text-blue-800">HTML</Badge>;
      default:
        return <Badge variant="outline">{format}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'DRAFT':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case 'ANALYZING':
        return <Badge className="bg-blue-100 text-blue-800">Analyzing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isAdmin = ['ADMIN', 'BUSINESS_ADMIN'].includes(session?.user?.role || '');
  const canDeleteReport = (report: Report) => {
    // Admin can delete any report regardless of status
    if (isAdmin) return true;
    // Users can only delete their own reports
    return report.user.id === session?.user?.id;
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gradient">Reports</h1>
        <p className="text-muted-foreground">
          Generate comprehensive threat analysis reports and manage your report library.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Generate New Report
          </CardTitle>
          <CardDescription>
            Create comprehensive PDF or Excel reports for your completed threat models.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Threat Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="threat-model-select">Select Threat Model</Label>
              <Select 
                value={selectedThreatModelId} 
                onValueChange={setSelectedThreatModelId}
                disabled={isLoadingThreatModels || isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a threat model..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingThreatModels ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Loading threat models...
                      </div>
                    </SelectItem>
                  ) : threatModels.length === 0 ? (
                    <SelectItem value="no-models" disabled>
                      No threat models available for reporting
                    </SelectItem>
                  ) : (
                    threatModels.map((tm) => (
                      <SelectItem key={tm.id} value={tm.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{tm.name}</span>
                          <div className="flex items-center gap-2 ml-2">
                            {tm.status === 'COMPLETED' && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                            {tm.status === 'ANALYZING' && (
                              <Clock className="h-3 w-3 text-blue-500" />
                            )}
                            {tm.status === 'DRAFT' && (
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                            )}
                            <Badge variant="outline" className="text-xs">
                              {tm.findingsCount || 0} findings
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedThreatModelId && threatModels.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const selectedModel = threatModels.find(tm => tm.id === selectedThreatModelId);
                    return selectedModel ? (
                      <div className="flex items-center gap-2 pt-2">
                        <Shield className="h-4 w-4" />
                        <span>
                          <strong>{selectedModel.name}</strong> - {selectedModel.status} 
                          {selectedModel.findingsCount && (
                            <span> • {selectedModel.findingsCount} findings</span>
                          )}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Report Format</Label>
              <RadioGroup 
                value={selectedFormat} 
                onValueChange={setSelectedFormat}
                disabled={isGenerating}
                className="flex flex-col space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="PDF" id="pdf" />
                  <Label htmlFor="pdf" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-500" />
                      <div>
                        <div className="font-medium">PDF Report</div>
                        <div className="text-sm text-muted-foreground">
                          Professional formatted document with executive summary, detailed findings, and recommendations
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="EXCEL" id="excel" />
                  <Label htmlFor="excel" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">Excel Workbook</div>
                        <div className="text-sm text-muted-foreground">
                          Multi-sheet spreadsheet with data analysis, STRIDE breakdown, and risk assessment
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleGenerateReport}
              disabled={!selectedThreatModelId || !selectedFormat || isGenerating}
              size="lg"
              className="min-w-[150px]"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Report History Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Report History</h2>
          <p className="text-muted-foreground">
            Previously generated reports ready for download.
          </p>
        </div>

        {/* Reports Grid */}
        {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Reports will appear here once you generate them from your threat models.
              Start by creating a threat model and generating its security report.
            </p>
            <Button className="mt-4" onClick={() => router.push('/threat-models')}>
              <Shield className="mr-2 h-4 w-4" />
              View Threat Models
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">
                    {report.name}
                  </CardTitle>
                  {getFormatBadge(report.format)}
                </div>
                <CardDescription className="space-y-1">
                  <div className="flex items-center gap-1 text-xs">
                    <Shield className="h-3 w-3" />
                    <span>{report.threatModel.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <User className="h-3 w-3" />
                    <span>{`${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() || report.user.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Threat Model Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(report.threatModel.status)}
                </div>

                {/* Download Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Downloads:</span>
                  <span className="font-medium">{report.downloadCount}</span>
                </div>

                {report.lastDownloaded && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last downloaded:</span>
                    <span className="font-medium">
                      {new Date(report.lastDownloaded).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleDownload(report.id, 'pdf', report.name)}
                    className="flex-1"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(report.id, 'excel', report.name)}
                    className="flex-1"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Excel
                  </Button>
                </div>

                {/* Admin Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/threat-models?id=${report.threatModel.id}`)}
                    className="flex-1"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View Model
                  </Button>
                  
                  {canDeleteReport(report) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingReportId === report.id}
                        >
                          {deletingReportId === report.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Report</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this report? This action cannot be undone.
                            {isAdmin && report.user.id !== session?.user?.id && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-sm text-yellow-800">
                                  <strong>Admin Action:</strong> You are deleting a report created by {`${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() || report.user.email}.
                                </p>
                              </div>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteReport(report.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Report
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
