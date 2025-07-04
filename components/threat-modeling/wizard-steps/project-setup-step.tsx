
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Brain, Zap, HelpCircle } from 'lucide-react';
import { WizardFormData } from '../enhanced-wizard-workflow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProjectSetupStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function ProjectSetupStep({ formData, updateFormData }: ProjectSetupStepProps) {
  const analysisTypes = [
    {
      value: 'PROMPT',
      title: 'Prompt-Based Analysis',
      description: 'Describe your system in natural language',
      icon: Brain,
      color: 'bg-blue-500',
      features: ['Natural language input', 'AI-guided analysis', 'Quick setup']
    },
    {
      value: 'DOCUMENT',
      title: 'Document-Based Analysis', 
      description: 'Upload technical documentation',
      icon: FileText,
      color: 'bg-green-500',
      features: ['PDF/DOCX support', 'Automated extraction', 'Comprehensive analysis']
    },
    {
      value: 'HYBRID',
      title: 'Hybrid Analysis',
      description: 'Combine prompts with documents',
      icon: Zap,
      color: 'bg-purple-500',
      features: ['Best of both approaches', 'Enhanced accuracy', 'Complete context']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Threat Model Name *
            </label>
            <Input
              placeholder="e.g., Customer Portal Security Assessment"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              className="text-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a descriptive name that identifies the system being analyzed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <Textarea
              placeholder="Brief description of what this threat model covers, scope, and objectives..."
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              className="min-h-[100px] text-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide context about the scope and objectives of this threat analysis
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Analysis Type *
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Choose how you want to provide system information for AI analysis</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {analysisTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.analysisType === type.value;
              
              return (
                <div
                  key={type.value}
                  className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                  onClick={() => updateFormData({ analysisType: type.value as any })}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${type.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{type.title}</h3>
                        {isSelected && (
                          <Badge variant="secondary" className="mt-1">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {type.description}
                    </p>
                    
                    <div className="space-y-1">
                      {type.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              Recommended Approach
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              <strong>New to threat modeling?</strong> Start with <strong>Prompt-Based Analysis</strong> for quick results.
              <br />
              <strong>Have technical docs?</strong> Use <strong>Document-Based Analysis</strong> for detailed extraction.
              <br />
              <strong>Want comprehensive analysis?</strong> Choose <strong>Hybrid Analysis</strong> for the most thorough assessment.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <HelpCircle className="h-5 w-5" />
            Getting Started Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-amber-800 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Be specific:</strong> Detailed system descriptions lead to more accurate threat analysis
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Include context:</strong> Mention user types, data sensitivity, and compliance requirements
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Document quality:</strong> For document analysis, ensure your files contain architectural details
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
