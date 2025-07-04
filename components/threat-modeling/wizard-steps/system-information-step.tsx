
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Brain,
  Plus,
  X,
  Eye,
  BookOpen,
  HelpCircle,
  Zap,
  Shield,
  Globe,
  Database,
  Users,
  Lock
} from 'lucide-react';
import { WizardFormData } from '../enhanced-wizard-workflow';
import { FileProcessor } from '@/lib/file-processor';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SystemInformationStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const PROMPT_TEMPLATES = [
  {
    title: 'Web Application',
    icon: Globe,
    template: `Web Application System Description:

**Application Type:** [e.g., Customer portal, E-commerce site, SaaS platform]
**User Base:** [e.g., External customers, Internal employees, Public users]
**Tech Stack:** [e.g., React frontend, Node.js backend, PostgreSQL database]
**Authentication:** [e.g., Email/password, OAuth, Multi-factor authentication]
**Data Handled:** [e.g., Personal information, Payment data, Business records]
**Infrastructure:** [e.g., AWS cloud, On-premises, Hybrid]
**Integrations:** [e.g., Payment gateways, Third-party APIs, External services]

Describe the key components, data flows, and security considerations for your web application.`
  },
  {
    title: 'API Service',
    icon: Zap,
    template: `API Service System Description:

**API Type:** [e.g., REST API, GraphQL, Microservice]
**Purpose:** [e.g., Data access, Business logic, Integration layer]
**Authentication:** [e.g., API keys, JWT tokens, OAuth 2.0]
**Data Exposure:** [e.g., User data, Financial information, System metadata]
**Rate Limiting:** [e.g., Per-user limits, Global throttling, Premium tiers]
**Dependencies:** [e.g., Databases, External APIs, Message queues]
**Deployment:** [e.g., Containerized, Serverless, Traditional servers]

Describe the API endpoints, data flow, and security mechanisms in place.`
  },
  {
    title: 'Mobile Application',
    icon: Users,
    template: `Mobile Application System Description:

**Platform:** [e.g., iOS, Android, Cross-platform]
**App Type:** [e.g., Native, Hybrid, Progressive Web App]
**User Authentication:** [e.g., Biometric, PIN, Social login]
**Data Storage:** [e.g., Local storage, Cloud sync, Encrypted databases]
**Network Communication:** [e.g., HTTPS APIs, WebSockets, P2P]
**Permissions:** [e.g., Camera, Location, Contacts, Storage]
**Backend Services:** [e.g., Cloud APIs, Push notifications, Analytics]

Describe the mobile app architecture, data handling, and security features.`
  },
  {
    title: 'Database System',
    icon: Database,
    template: `Database System Description:

**Database Type:** [e.g., Relational (PostgreSQL/MySQL), NoSQL (MongoDB), Cloud (DynamoDB)]
**Data Classification:** [e.g., Personal data, Financial records, Business intelligence]
**Access Control:** [e.g., Role-based access, Database users, Application-level]
**Encryption:** [e.g., At-rest encryption, In-transit encryption, Column-level]
**Backup Strategy:** [e.g., Automated backups, Disaster recovery, Point-in-time recovery]
**Network Access:** [e.g., VPC-only, Public with security groups, VPN access]
**Compliance:** [e.g., GDPR, HIPAA, PCI-DSS requirements]

Describe the database architecture, security controls, and data protection measures.`
  }
];

const SECURITY_REQUIREMENTS = [
  'GDPR Compliance',
  'HIPAA Compliance',
  'PCI-DSS Compliance',
  'SOC 2 Type II',
  'ISO 27001',
  'Multi-factor Authentication',
  'Data Encryption at Rest',
  'Data Encryption in Transit',
  'Role-based Access Control',
  'Regular Security Audits',
  'Penetration Testing',
  'Vulnerability Scanning',
  'Security Monitoring',
  'Incident Response Plan',
  'Business Continuity Plan'
];

export function SystemInformationStep({ formData, updateFormData }: SystemInformationStepProps) {
  const [securityReqInput, setSecurityReqInput] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const useTemplate = (template: string) => {
    updateFormData({ prompt: template });
    setShowTemplates(false);
    toast.success('Template applied successfully');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessingFiles(files.map(f => f.name));

    try {
      const processedDocuments = [];
      
      for (const file of files) {
        const validation = FileProcessor.validateFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        try {
          const content = await FileProcessor.processFile(file, 'temp-upload');
          processedDocuments.push({
            filename: file.name,
            content: content,
            mimeType: file.type
          });
          toast.success(`${file.name} processed successfully`);
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          toast.error(`Failed to process ${file.name}`);
        }
      }

      updateFormData({
        documentFiles: [...formData.documentFiles, ...files],
        documentContents: [...formData.documentContents, ...processedDocuments]
      });

    } catch (error) {
      console.error('File processing error:', error);
      toast.error('Failed to process files');
    } finally {
      setProcessingFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeDocument = (index: number) => {
    const newFiles = [...formData.documentFiles];
    const newContents = [...formData.documentContents];
    newFiles.splice(index, 1);
    newContents.splice(index, 1);
    updateFormData({
      documentFiles: newFiles,
      documentContents: newContents
    });
    toast.success('Document removed');
  };

  const addSecurityRequirement = () => {
    if (securityReqInput.trim() && !formData.securityRequirements.includes(securityReqInput.trim())) {
      updateFormData({
        securityRequirements: [...formData.securityRequirements, securityReqInput.trim()]
      });
      setSecurityReqInput('');
    }
  };

  const addPresetRequirement = (requirement: string) => {
    if (!formData.securityRequirements.includes(requirement)) {
      updateFormData({
        securityRequirements: [...formData.securityRequirements, requirement]
      });
    }
  };

  const removeSecurityRequirement = (requirement: string) => {
    updateFormData({
      securityRequirements: formData.securityRequirements.filter(r => r !== requirement)
    });
  };

  return (
    <div className="space-y-6">
      {/* System Information Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="prompt" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="prompt" 
                disabled={formData.analysisType === 'DOCUMENT'}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                System Description
              </TabsTrigger>
              <TabsTrigger 
                value="document" 
                disabled={formData.analysisType === 'PROMPT'}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Document Upload
              </TabsTrigger>
            </TabsList>

            {/* Prompt Tab */}
            <TabsContent value="prompt" className="space-y-6 mt-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium">
                    System Description {(formData.analysisType === 'PROMPT' || formData.analysisType === 'HYBRID') && '*'}
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Templates
                  </Button>
                </div>

                {showTemplates && (
                  <div className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <h4 className="font-medium mb-3">Choose a Template</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {PROMPT_TEMPLATES.map((template, index) => {
                        const Icon = template.icon;
                        return (
                          <div
                            key={index}
                            className="p-3 border rounded cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-colors"
                            onClick={() => useTemplate(template.template)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="h-4 w-4 text-blue-500" />
                              <span className="font-medium text-sm">{template.title}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Textarea
                  placeholder="Describe your system architecture, components, data flows, technologies, and security considerations..."
                  value={formData.prompt}
                  onChange={(e) => updateFormData({ prompt: e.target.value })}
                  className="min-h-[200px] text-base"
                  disabled={formData.analysisType === 'DOCUMENT'}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Provide detailed information about your system for accurate AI threat analysis
                  </p>
                  <span className="text-xs text-gray-400">
                    {formData.prompt.length} characters
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional Context
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="ml-1">
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Include deployment environment, user base, compliance requirements, etc.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <Textarea
                  placeholder="Environment details, user base, compliance requirements, constraints..."
                  value={formData.systemContext}
                  onChange={(e) => updateFormData({ systemContext: e.target.value })}
                  className="min-h-[100px] text-base"
                  disabled={formData.analysisType === 'DOCUMENT'}
                />
              </div>
            </TabsContent>

            {/* Document Tab */}
            <TabsContent value="document" className="space-y-6 mt-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Upload Documents {(formData.analysisType === 'DOCUMENT' || formData.analysisType === 'HYBRID') && '*'}
                </label>
                
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <h4 className="text-lg font-medium">Upload Technical Documentation</h4>
                    <p className="text-sm text-gray-500">
                      PDF, DOCX, or TXT files up to 10MB each
                    </p>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>• Architecture diagrams and documentation</p>
                      <p>• Technical specifications and design docs</p>
                      <p>• Security policies and procedures</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={formData.analysisType === 'PROMPT'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Uploaded Documents */}
                {formData.documentFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Uploaded Documents ({formData.documentFiles.length})</h4>
                    {formData.documentFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB • {file.type}
                            </p>
                          </div>
                          {processingFiles.includes(file.name) && (
                            <Badge variant="secondary">Processing...</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Processing Status */}
                {processingFiles.length > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                      <div className="animate-spin">
                        <Zap className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">
                        Processing {processingFiles.length} file(s)...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Security Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Requirements & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Requirements */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Common Security Requirements
            </label>
            <div className="grid gap-2 md:grid-cols-3">
              {SECURITY_REQUIREMENTS.map((requirement) => (
                <Button
                  key={requirement}
                  variant={formData.securityRequirements.includes(requirement) ? "default" : "outline"}
                  size="sm"
                  onClick={() => 
                    formData.securityRequirements.includes(requirement)
                      ? removeSecurityRequirement(requirement)
                      : addPresetRequirement(requirement)
                  }
                  className="justify-start text-xs"
                >
                  {requirement}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Requirements */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Add Custom Requirement
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Zero-trust architecture required"
                value={securityReqInput}
                onChange={(e) => setSecurityReqInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSecurityRequirement();
                  }
                }}
              />
              <Button variant="outline" onClick={addSecurityRequirement}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selected Requirements */}
          {formData.securityRequirements.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Selected Requirements ({formData.securityRequirements.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.securityRequirements.map((req, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {req}
                    <button
                      onClick={() => removeSecurityRequirement(req)}
                      className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
