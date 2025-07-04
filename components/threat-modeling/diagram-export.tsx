
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';

interface DiagramExportProps {
  threatModelId: string;
  threatModelName: string;
  onExport?: (format: string) => void;
}

export function DiagramExport({ threatModelId, threatModelName, onExport }: DiagramExportProps) {
  const [exportFormat, setExportFormat] = useState('png');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!onExport) return;
    
    setIsExporting(true);
    try {
      await onExport(exportFormat);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    { value: 'png', label: 'PNG Image', icon: FileImage, description: 'High-quality raster image' },
    { value: 'svg', label: 'SVG Vector', icon: FileText, description: 'Scalable vector graphics' },
    { value: 'pdf', label: 'PDF Document', icon: FileText, description: 'Printable document format' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Download className="h-5 w-5 mr-2" />
          Export Diagram
        </CardTitle>
        <CardDescription>
          Export the threat model diagram in various formats for documentation and reporting
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="export-format">Export Format</Label>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger>
              <SelectValue placeholder="Select export format" />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center">
                    <option.icon className="h-4 w-4 mr-2" />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleExport} 
          className="w-full" 
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export as {exportFormat.toUpperCase()}
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• PNG: Best for embedding in presentations and documents</p>
          <p>• SVG: Ideal for web use and scaling without quality loss</p>
          <p>• PDF: Perfect for formal reports and printing</p>
        </div>
      </CardContent>
    </Card>
  );
}
