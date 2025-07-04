
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  Shield,
  FileText,
  Download,
  Eye,
  Target,
  TrendingUp,
  Users,
  Database,
  Globe,
  Lock,
  Key,
  Activity,
  Loader2,
  ExternalLink,
  ArrowRight,
  Brain
} from 'lucide-react';
import { WizardFormData } from '../enhanced-wizard-workflow';
import { AIAnalysisResponse } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AnalysisResultsStepProps {
  formData: WizardFormData;
  loading: boolean;
  analysisResults: AIAnalysisResponse | null;
  threatModelId: string | null;
  findingsCount: number;
  onSubmit: () => void;
  onFinish: () => void;
}

const STRIDE_CATEGORIES = {
  'SPOOFING': {
    title: 'Spoofing',
    description: 'Identity spoofing and impersonation threats',
    icon: Users,
    color: 'bg-red-500'
  },
  'TAMPERING': {
    title: 'Tampering',
    description: 'Data and system integrity threats',
    icon: Database,
    color: 'bg-orange-500'
  },
  'REPUDIATION': {
    title: 'Repudiation',
    description: 'Non-repudiation and audit trail threats',
    icon: FileText,
    color: 'bg-yellow-500'
  },
  'INFORMATION_DISCLOSURE': {
    title: 'Information Disclosure',
    description: 'Confidentiality and data leak threats',
    icon: Eye,
    color: 'bg-blue-500'
  },
  'DENIAL_OF_SERVICE': {
    title: 'Denial of Service',
    description: 'Availability and performance threats',
    icon: Activity,
    color: 'bg-purple-500'
  },
  'ELEVATION_OF_PRIVILEGE': {
    title: 'Elevation of Privilege',
    description: 'Authorization and privilege escalation threats',
    icon: Key,
    color: 'bg-green-500'
  }
};

const SEVERITY_COLORS = {
  'LOW': 'bg-green-100 text-green-800 border-green-200',
  'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'HIGH': 'bg-orange-100 text-orange-800 border-orange-200',
  'CRITICAL': 'bg-red-100 text-red-800 border-red-200'
};

export function AnalysisResultsStep({
  formData,
  loading,
  analysisResults,
  threatModelId,
  findingsCount,
  onSubmit,
  onFinish
}: AnalysisResultsStepProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const severityDistribution = analysisResults?.strideAnalysis?.reduce((acc, analysis) => {
    analysis.threats?.forEach(threat => {
      acc[threat.severity] = (acc[threat.severity] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>) || {};

  const totalThreats = Object.values(severityDistribution).reduce((sum, count) => sum + count, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* AI Processing Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Creating Your Threat Model</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Our AI is analyzing your system using advanced STRIDE methodology
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Analysis Progress</span>
                    <span>Processing...</span>
                  </div>
                  <Progress value={65} className="w-full" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    System parsed
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Context analyzed
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    STRIDE analysis
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="h-4 w-4" />
                    Generating findings
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Analysis Type:</strong> {formData.analysisType}
                  {formData.analysisDepth && (
                    <>
                      <br />
                      <strong>Depth:</strong> {formData.analysisDepth}
                    </>
                  )}
                  {formData.selectedAssets.length > 0 && (
                    <>
                      <br />
                      <strong>Linked Assets:</strong> {formData.selectedAssets.length}
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Happening */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Analysis Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'System Understanding',
                  description: 'Analyzing system architecture and components',
                  status: 'completed'
                },
                {
                  step: 2,
                  title: 'Context Processing',
                  description: 'Processing security requirements and environment details',
                  status: 'completed'
                },
                {
                  step: 3,
                  title: 'STRIDE Analysis',
                  description: 'Identifying threats across all STRIDE categories',
                  status: 'processing'
                },
                {
                  step: 4,
                  title: 'Risk Assessment',
                  description: 'Evaluating threat severity and impact',
                  status: 'pending'
                },
                {
                  step: 5,
                  title: 'Recommendations',
                  description: 'Generating actionable security recommendations',
                  status: 'pending'
                }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    item.status === 'completed' 
                      ? 'bg-green-100 text-green-600' 
                      : item.status === 'processing'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {item.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : item.status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      item.step
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysisResults) {
    return (
      <div className="space-y-6">
        {/* Ready to Start */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Ready to Create Threat Model</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Review your configuration and start the AI analysis
                </p>
              </div>

              <Button
                onClick={onSubmit}
                size="lg"
                className="min-w-[200px]"
              >
                <Zap className="h-4 w-4 mr-2" />
                Start AI Analysis
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Review */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Threat Model</h4>
                  <p className="text-sm text-gray-600">{formData.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Analysis Type</h4>
                  <Badge variant="outline">{formData.analysisType}</Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Analysis Depth</h4>
                  <Badge variant="outline">{formData.analysisDepth}</Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Linked Assets</h4>
                  <p className="text-sm text-gray-600">{formData.selectedAssets.length} assets</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Security Requirements</h4>
                  <p className="text-sm text-gray-600">{formData.securityRequirements.length} requirements</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Priority Focus</h4>
                  <p className="text-sm text-gray-600">{formData.priorityFocus.length} areas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                Threat Model Created Successfully!
              </h3>
              <p className="text-green-700 dark:text-green-400">
                Generated {findingsCount} threat findings with AI-powered STRIDE analysis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Summary */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{totalThreats}</div>
            <div className="text-sm text-gray-500">Total Threats</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-2xl font-bold">{severityDistribution['CRITICAL'] || 0}</div>
            <div className="text-sm text-gray-500">Critical</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">{severityDistribution['HIGH'] || 0}</div>
            <div className="text-sm text-gray-500">High</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold">{analysisResults.recommendations?.length || 0}</div>
            <div className="text-sm text-gray-500">Recommendations</div>
          </CardContent>
        </Card>
      </div>

      {/* STRIDE Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            STRIDE Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisResults.strideAnalysis?.map((strideCategory, index) => {
              const categoryInfo = STRIDE_CATEGORIES[strideCategory.category as keyof typeof STRIDE_CATEGORIES];
              const Icon = categoryInfo?.icon || Shield;
              const isExpanded = expandedSections.includes(strideCategory.category);

              return (
                <Collapsible key={index}>
                  <CollapsibleTrigger
                    className="w-full"
                    onClick={() => toggleSection(strideCategory.category)}
                  >
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${categoryInfo?.color || 'bg-gray-500'} text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-medium">{categoryInfo?.title || strideCategory.category}</h4>
                          <p className="text-sm text-gray-500">{categoryInfo?.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {strideCategory.threats?.length || 0} threats
                        </Badge>
                        <ArrowRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="ml-4 mt-2 space-y-3">
                      {strideCategory.threats?.map((threat, threatIndex) => (
                        <div key={threatIndex} className="p-4 border-l-4 border-gray-200 bg-gray-50 dark:bg-gray-800 rounded-r-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-sm">{threat.title}</h5>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS] || 'bg-gray-100'}`}
                            >
                              {threat.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {threat.description}
                          </p>
                          <div className="text-xs">
                            <strong className="text-blue-600 dark:text-blue-400">Recommendation:</strong>
                            <span className="ml-1 text-gray-600 dark:text-gray-400">
                              {threat.recommendation}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      {analysisResults.recommendations && analysisResults.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Security Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisResults.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => window.open(`/threat-models`, '_blank')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Full Threat Model
            </Button>
            
            <Button
              onClick={() => window.open(`/findings`, '_blank')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View All Findings
            </Button>
            
            <Button
              onClick={onFinish}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Continue to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
