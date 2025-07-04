
'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  FileText, 
  Zap, 
  Shield,
  Brain,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building,
  Plus,
  Eye,
  Download,
  Search,
  X,
  Loader2,
  BookOpen,
  Target,
  Users,
  Globe
} from 'lucide-react';
import { ThreatModelCreationRequest, ApplicationAssetWithDetails, AIAnalysisResponse } from '@/lib/types';
import { toast } from 'sonner';
import { FileProcessor } from '@/lib/file-processor';
import { ProjectSetupStep } from './wizard-steps/project-setup-step';
import { SystemInformationStep } from './wizard-steps/system-information-step';
import { AssetIntegrationStep } from './wizard-steps/asset-integration-step';
import { AnalysisResultsStep } from './wizard-steps/analysis-results-step';

export interface WizardFormData {
  // Project Setup
  name: string;
  description: string;
  analysisType: 'PROMPT' | 'DOCUMENT' | 'HYBRID';
  
  // System Information
  prompt: string;
  systemContext: string;
  documentFiles: File[];
  documentContents: { filename: string; content: string; mimeType: string }[];
  securityRequirements: string[];
  
  // Asset Integration
  selectedAssets: string[];
  deploymentEnvironment: string;
  systemScale: string;
  userBase: string;
  
  // Configuration
  analysisDepth: 'BASIC' | 'COMPREHENSIVE' | 'EXPERT';
  priorityFocus: string[];
}

const STEPS = [
  { id: 1, title: 'Project Setup', description: 'Basic information and analysis type' },
  { id: 2, title: 'System Information', description: 'Describe your system or upload documents' },
  { id: 3, title: 'Asset Integration', description: 'Link assets and configure environment' },
  { id: 4, title: 'Analysis & Results', description: 'AI processing and threat analysis' },
];

export function EnhancedWizardWorkflow() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AIAnalysisResponse | null>(null);
  const [threatModelId, setThreatModelId] = useState<string | null>(null);
  const [findingsCount, setFindingsCount] = useState(0);
  
  const [formData, setFormData] = useState<WizardFormData>({
    name: '',
    description: '',
    analysisType: 'PROMPT',
    prompt: '',
    systemContext: '',
    documentFiles: [],
    documentContents: [],
    securityRequirements: [],
    selectedAssets: [],
    deploymentEnvironment: '',
    systemScale: '',
    userBase: '',
    analysisDepth: 'COMPREHENSIVE',
    priorityFocus: [],
  });

  const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const validateStep = (step: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!formData.name.trim()) errors.push('Threat model name is required');
        if (!formData.analysisType) errors.push('Analysis type must be selected');
        break;
      
      case 2:
        if (formData.analysisType === 'PROMPT' && !formData.prompt.trim()) {
          errors.push('System description is required for prompt-based analysis');
        }
        if (formData.analysisType === 'DOCUMENT' && formData.documentFiles.length === 0) {
          errors.push('At least one document is required for document-based analysis');
        }
        if (formData.analysisType === 'HYBRID' && (!formData.prompt.trim() || formData.documentFiles.length === 0)) {
          errors.push('Both system description and documents are required for hybrid analysis');
        }
        break;
      
      case 3:
        // Asset integration is optional, so no strict validation needed
        break;
    }

    return { isValid: errors.length === 0, errors };
  };

  const nextStep = () => {
    const validation = validateStep(currentStep);
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const validation = validateStep(currentStep - 1);
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    setLoading(true);
    try {
      // Prepare combined document content
      let combinedDocumentContent = '';
      if (formData.documentContents.length > 0) {
        combinedDocumentContent = formData.documentContents
          .map(doc => `Document: ${doc.filename}\n${doc.content}`)
          .join('\n\n---\n\n');
      }

      const requestData: ThreatModelCreationRequest = {
        name: formData.name,
        description: formData.description,
        prompt: formData.prompt,
        linkedAssetIds: formData.selectedAssets,
        analysisType: formData.analysisType,
        documentContent: combinedDocumentContent,
        systemContext: formData.systemContext,
        securityRequirements: formData.securityRequirements,
      };

      const response = await fetch('/api/threat-models/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create threat model');
      }

      const result = await response.json();
      setAnalysisResults(result.analysis);
      setThreatModelId(result.threatModel.id);
      setFindingsCount(result.analysis.findingsCount);
      
      toast.success(`Threat model created with ${result.analysis.findingsCount} findings`);
    } catch (error) {
      console.error('Error creating threat model:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create threat model');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    router.push('/threat-models');
  };

  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/threat-models')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Threat Models
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            New Threat Model
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Create comprehensive threat models with AI-powered STRIDE analysis
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Progress</h3>
                <span className="text-sm text-gray-500">
                  Step {currentStep} of {STEPS.length}
                </span>
              </div>
              
              <Progress value={progressPercentage} className="w-full" />
              
              <div className="grid grid-cols-4 gap-4">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={`text-center p-3 rounded-lg border ${
                      step.id === currentStep
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : step.id < currentStep
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-medium ${
                      step.id === currentStep
                        ? 'bg-blue-500 text-white'
                        : step.id < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {step.id < currentStep ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            <ProjectSetupStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          
          {currentStep === 2 && (
            <SystemInformationStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          
          {currentStep === 3 && (
            <AssetIntegrationStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          
          {currentStep === 4 && (
            <AnalysisResultsStep
              formData={formData}
              loading={loading}
              analysisResults={analysisResults}
              threatModelId={threatModelId}
              findingsCount={findingsCount}
              onSubmit={handleSubmit}
              onFinish={handleFinish}
            />
          )}
        </div>

        {/* Navigation */}
        {currentStep < 4 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <Button
                  onClick={nextStep}
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
