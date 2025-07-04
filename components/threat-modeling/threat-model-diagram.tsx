
'use client';

import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, RotateCcw, ZoomIn, ZoomOut, Maximize2, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ThreatModelDiagramProps {
  threatModel: {
    id: string;
    name: string;
    description?: string;
    findings: Array<{
      id: string;
      threatScenario: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      strideCategory: string;
      status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    }>;
  };
  className?: string;
}

interface DiagramNode {
  id: string;
  label: string;
  shape: string;
  color: {
    background: string;
    border: string;
    highlight: {
      background: string;
      border: string;
    };
  };
  font: {
    color: string;
    size: number;
  };
  size?: number;
  level?: number;
}

interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  color: {
    color: string;
    highlight: string;
  };
  arrows: {
    to: {
      enabled: boolean;
      scaleFactor: number;
    };
  };
  width?: number;
}

const SEVERITY_COLORS = {
  LOW: { bg: '#10b981', border: '#065f46' },
  MEDIUM: { bg: '#f59e0b', border: '#92400e' },
  HIGH: { bg: '#f97316', border: '#9a3412' },
  CRITICAL: { bg: '#dc2626', border: '#7f1d1d' },
};

const STRIDE_COLORS = {
  SPOOFING: '#8b5cf6',
  TAMPERING: '#06b6d4',
  REPUDIATION: '#84cc16',
  INFORMATION_DISCLOSURE: '#f59e0b',
  DENIAL_OF_SERVICE: '#f97316',
  ELEVATION_OF_PRIVILEGE: '#dc2626',
};

export function ThreatModelDiagram({ threatModel, className }: ThreatModelDiagramProps) {
  const networkRef = useRef<HTMLDivElement>(null);
  const network = useRef<Network | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const generateDiagramData = () => {
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];

    // Central system node
    nodes.push({
      id: 'system',
      label: threatModel.name,
      shape: 'box',
      color: {
        background: '#3b82f6',
        border: '#1e40af',
        highlight: {
          background: '#60a5fa',
          border: '#2563eb',
        },
      },
      font: {
        color: '#ffffff',
        size: 16,
      },
      size: 30,
      level: 0,
    });

    // Group findings by STRIDE category
    const findingsByStride = threatModel.findings.reduce((acc, finding) => {
      if (!acc[finding.strideCategory]) {
        acc[finding.strideCategory] = [];
      }
      acc[finding.strideCategory].push(finding);
      return acc;
    }, {} as Record<string, typeof threatModel.findings>);

    // Create STRIDE category nodes
    Object.entries(findingsByStride).forEach(([category, findings], categoryIndex) => {
      const categoryId = `stride_${category}`;
      const categoryColor = STRIDE_COLORS[category as keyof typeof STRIDE_COLORS] || '#6b7280';
      
      nodes.push({
        id: categoryId,
        label: category.replace(/_/g, ' '),
        shape: 'ellipse',
        color: {
          background: categoryColor,
          border: categoryColor,
          highlight: {
            background: categoryColor + '88',
            border: categoryColor,
          },
        },
        font: {
          color: '#ffffff',
          size: 12,
        },
        size: 20,
        level: 1,
      });

      // Connect category to system
      edges.push({
        id: `edge_system_${categoryId}`,
        from: 'system',
        to: categoryId,
        color: {
          color: categoryColor,
          highlight: categoryColor,
        },
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 1,
          },
        },
        width: 2,
      });

      // Create finding nodes for this category
      findings.forEach((finding, findingIndex) => {
        const findingId = `finding_${finding.id}`;
        const severityColor = SEVERITY_COLORS[finding.severity];
        
        nodes.push({
          id: findingId,
          label: finding.threatScenario.length > 30 ? finding.threatScenario.substring(0, 30) + '...' : finding.threatScenario,
          shape: 'dot',
          color: {
            background: severityColor.bg,
            border: severityColor.border,
            highlight: {
              background: severityColor.bg + '88',
              border: severityColor.border,
            },
          },
          font: {
            color: '#000000',
            size: 10,
          },
          size: finding.severity === 'CRITICAL' ? 25 : finding.severity === 'HIGH' ? 20 : finding.severity === 'MEDIUM' ? 15 : 10,
          level: 2,
        });

        // Connect finding to category
        edges.push({
          id: `edge_${categoryId}_${findingId}`,
          from: categoryId,
          to: findingId,
          label: finding.severity,
          color: {
            color: severityColor.bg,
            highlight: severityColor.bg,
          },
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.8,
            },
          },
          width: 1,
        });
      });
    });

    return {
      nodes: new DataSet(nodes),
      edges: new DataSet(edges),
    };
  };

  const initializeNetwork = () => {
    if (!networkRef.current) return;

    try {
      const data = generateDiagramData();
      
      const options = {
        layout: {
          hierarchical: {
            enabled: true,
            levelSeparation: 150,
            nodeSpacing: 100,
            direction: 'UD',
            sortMethod: 'directed',
          },
        },
        physics: {
          enabled: true,
          stabilization: { iterations: 100 },
          hierarchicalRepulsion: {
            nodeDistance: 120,
            centralGravity: 0.3,
            springLength: 100,
            springConstant: 0.01,
            damping: 0.09,
          },
        },
        nodes: {
          borderWidth: 2,
          borderWidthSelected: 3,
          chosen: true,
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.3)',
            size: 10,
            x: 2,
            y: 2,
          },
        },
        edges: {
          width: 2,
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.2)',
            size: 5,
            x: 1,
            y: 1,
          },
          smooth: {
            enabled: true,
            type: 'continuous',
            roundness: 0.5,
          },
        },
        interaction: {
          dragNodes: true,
          dragView: true,
          zoomView: true,
          selectConnectedEdges: false,
          tooltipDelay: 300,
        },
      };

      network.current = new Network(networkRef.current, data, options);

      // Add event listeners
      network.current.on('click', (params: any) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          if (nodeId.startsWith('finding_')) {
            const findingId = nodeId.replace('finding_', '');
            const finding = threatModel.findings.find(f => f.id === findingId);
            if (finding) {
              // You could implement a modal or tooltip here to show finding details
              console.log('Selected finding:', finding);
            }
          }
        }
      });

      network.current.on('stabilizationIterationsDone', () => {
        setIsLoading(false);
      });

      network.current.on('stabilizationProgress', (params: any) => {
        // You could add a progress indicator here
      });

      setError('');
    } catch (err) {
      console.error('Error initializing network:', err);
      setError('Failed to initialize diagram. Please try again.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeNetwork();

    return () => {
      if (network.current) {
        network.current.destroy();
        network.current = null;
      }
    };
  }, [threatModel]);

  const handleZoomIn = () => {
    if (network.current) {
      const scale = network.current.getScale();
      network.current.moveTo({ scale: scale * 1.2 });
    }
  };

  const handleZoomOut = () => {
    if (network.current) {
      const scale = network.current.getScale();
      network.current.moveTo({ scale: scale * 0.8 });
    }
  };

  const handleFit = () => {
    if (network.current) {
      network.current.fit();
    }
  };

  const handleReset = () => {
    setIsLoading(true);
    setError('');
    initializeNetwork();
  };

  const handleExportPNG = async () => {
    if (!networkRef.current) return;

    try {
      const canvas = await html2canvas(networkRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `threat-model-diagram-${threatModel.name}-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error('Error exporting diagram:', err);
      setError('Failed to export diagram. Please try again.');
    }
  };

  const getSeverityStats = () => {
    const stats = threatModel.findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats).map(([severity, count]) => ({
      severity: severity as keyof typeof SEVERITY_COLORS,
      count,
    }));
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Diagram Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleReset} className="mt-4">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Threat Model Diagram</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleFit}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPNG}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Severity Legend */}
        <div className="flex flex-wrap gap-2 mt-2">
          {getSeverityStats().map(({ severity, count }) => (
            <Badge
              key={severity}
              variant="outline"
              style={{
                backgroundColor: SEVERITY_COLORS[severity].bg + '20',
                borderColor: SEVERITY_COLORS[severity].border,
              }}
            >
              {severity}: {count}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                <span>Generating diagram...</span>
              </div>
            </div>
          )}
          
          <div
            ref={networkRef}
            className="w-full h-96 border border-border rounded-lg bg-background"
            style={{ minHeight: '400px' }}
          />
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>• Click and drag to pan around the diagram</p>
          <p>• Use mouse wheel to zoom in/out</p>
          <p>• Click on findings to view details</p>
          <p>• Node size represents threat severity level</p>
        </div>
      </CardContent>
    </Card>
  );
}
