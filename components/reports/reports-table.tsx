
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ReportViewer } from './report-viewer';
import { toast } from 'sonner';
import { Eye, Download, FileText, Plus, FileSpreadsheet } from 'lucide-react';
import { ReportWithDetails, ReportFormat } from '@/lib/types';

export function ReportsTable() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithDetails[]>([]);
  const [threatModels, setThreatModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportingModel, setExportingModel] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    format: 'all',
  });

  useEffect(() => {
    fetchReports();
    fetchThreatModels();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        toast.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error fetching reports');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThreatModels = async () => {
    try {
      const response = await fetch('/api/threat-models?status=COMPLETED');
      if (response.ok) {
        const data = await response.json();
        setThreatModels(data.threatModels || []);
      }
    } catch (error) {
      console.error('Error fetching threat models:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(report => 
        report.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.threatModel.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Format filter
    if (filters.format !== 'all') {
      filtered = filtered.filter(report => report.format === filters.format);
    }

    setFilteredReports(filtered);
  };

  const generateReport = async (threatModelId: string, format: ReportFormat) => {
    setIsGenerating(true);
    setExportingModel(threatModelId);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threatModelId, format }),
      });

      if (response.ok) {
        const newReport = await response.json();
        setReports(prev => [newReport.report, ...prev]);
        toast.success(`${format} report generated successfully`);
        await fetchReports(); // Refresh the reports list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error generating report');
    } finally {
      setIsGenerating(false);
      setExportingModel(null);
    }
  };

  const exportDirectly = async (threatModelId: string, format: ReportFormat) => {
    setExportingModel(threatModelId);
    try {
      const endpoint = format === 'EXCEL' ? '/api/reports/export/excel' : '/api/reports/export/pdf';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threatModelId }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const threatModel = threatModels.find(tm => tm.id === threatModelId);
        const fileName = `${threatModel?.name || 'threat-model'}-report.${format === 'EXCEL' ? 'xlsx' : 'pdf'}`;
        
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`${format} report downloaded successfully`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Failed to export ${format} report`);
      }
    } catch (error) {
      console.error(`Error exporting ${format} report:`, error);
      toast.error(`Error exporting ${format} report`);
    } finally {
      setExportingModel(null);
    }
  };

  const downloadReport = async (reportId: string, format: ReportFormat, name: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report downloaded successfully');
      } else {
        toast.error('Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Error downloading report');
    }
  };

  const getFormatBadgeColor = (format: ReportFormat) => {
    switch (format) {
      case 'PDF': return 'bg-red-100 text-red-800 border-red-200';
      case 'HTML': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EXCEL': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export New Reports Section */}
      {threatModels.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4 border">
          <h3 className="font-semibold mb-3 flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5 text-blue-600" />
            Export New Reports
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Generate and download reports in Excel or PDF format from your completed threat models
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {threatModels.slice(0, 6).map((model) => (
              <div key={model.id} className="bg-background rounded border p-3">
                <h4 className="font-medium text-sm mb-2 truncate">{model.name}</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {model.findings?.length || 0} findings • {new Date(model.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportDirectly(model.id, 'EXCEL')}
                    disabled={exportingModel === model.id}
                    className="flex-1"
                  >
                    {exportingModel === model.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <FileSpreadsheet className="h-3 w-3" />
                    )}
                    <span className="ml-1 text-xs">Excel</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportDirectly(model.id, 'PDF')}
                    disabled={exportingModel === model.id}
                    className="flex-1"
                  >
                    {exportingModel === model.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    <span className="ml-1 text-xs">PDF</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {threatModels.length > 6 && (
            <p className="text-xs text-muted-foreground mt-3">
              Showing 6 of {threatModels.length} completed threat models
            </p>
          )}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex-1">
            <Input
              placeholder="Search reports..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <Select value={filters.format} onValueChange={(value) => setFilters(prev => ({ ...prev, format: value }))}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="PDF">PDF</SelectItem>
              <SelectItem value="HTML">HTML</SelectItem>
              <SelectItem value="EXCEL">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredReports.length} of {reports.length} reports
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Name</TableHead>
              <TableHead>Threat Model</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-50" />
                    <p>No reports found</p>
                    <p className="text-sm">Generate your first report from a threat model</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <div className="max-w-[200px]">
                      <p className="truncate">{report.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px]">
                      <p className="text-sm truncate">{report.threatModel.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getFormatBadgeColor(report.format)}>
                      {report.format}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(report.fileSize)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadReport(report.id, report.format, report.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
