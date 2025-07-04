
'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Shield, AlertCircle, CheckCircle, Zap, Upload, FileText, X, 
  Brain, FileSearch, Paperclip 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgressNotification, useProgressNotification } from '@/components/ui/progress-notification';

interface UploadedFile {
  id: string;
  fileId: string | null;
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  extractedContent?: string;
}

interface IntegratedThreatFormProps {
  onSuccess?: () => void;
}

export function IntegratedThreatForm({ onSuccess }: IntegratedThreatFormProps) {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressNotification = useProgressNotification();

  // Check authentication status
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You must be signed in to create threat models. Please sign in to continue.
        </AlertDescription>
      </Alert>
    );
  }

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File) => {
    if (file.size > maxFileSize) {
      return 'File size must be less than 10MB';
    }
    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOCX, TXT, CSV, or image files.';
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<void> => {
    // Check authentication before uploading
    if (!session?.user?.id) {
      toast.error('You must be signed in to upload files');
      return;
    }

    const fileId = Math.random().toString(36).substr(2, 9);
    
    const uploadedFile: UploadedFile = {
      id: fileId,
      fileId: null,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
    };

    setFiles(prev => [...prev, uploadedFile]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress: Math.min(f.progress + Math.random() * 30, 90) }
            : f
        ));
      }, 500);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Ensure cookies are sent
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 401) {
          errorMessage = 'Authentication required. Please sign in again.';
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();

      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'success', 
              progress: 100,
              fileId: result.fileId,
              extractedContent: result.extractedContent
            }
          : f
      ));

      toast.success(`${file.name} uploaded successfully`);
    } catch (error: any) {
      console.error('File upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', progress: 0, error: error.message }
          : f
      ));
      
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
    }
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach(file => {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        return;
      }
      uploadFile(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsAnalyzing(true);
    setError('');

    try {
      if (!formData.name || !formData.prompt) {
        throw new Error('Name and system description are required');
      }

      // Show progress notification
      progressNotification.showProgress(
        'Creating Threat Model',
        'Initializing AI analysis for your system...',
        10
      );

      // Get successful file IDs
      const successfulFiles = files.filter(f => f.status === 'success' && f.fileId);
      const fileIds = successfulFiles.map(f => f.fileId).filter(Boolean);

      // Update progress
      progressNotification.updateProgress(30);

      const response = await fetch('/api/threat-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          fileIds: fileIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create threat model');
      }

      // Update progress
      progressNotification.updateProgress(60);

      // Simulate AI analysis progress
      const progressSteps = [70, 85, 95, 100];
      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        progressNotification.updateProgress(step);
      }

      // Show completion notification
      progressNotification.showCompleted(
        'Threat Model Completed!',
        `"${formData.name}" has been successfully analyzed with ${data.findingsCount || 0} findings identified.`,
        () => {
          // Navigate to findings page for this threat model
          window.open(`/findings?threatModel=${data.threatModel.id}`, '_blank');
        }
      );

      setSuccess(true);
      setFormData({ name: '', description: '', prompt: '' });
      setFiles([]);
      
      if (onSuccess) {
        onSuccess();
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setIsAnalyzing(false);
      }, 3000);
    } catch (error: any) {
      progressNotification.showError(
        'Threat Model Creation Failed',
        error.message || 'An error occurred while creating the threat model. Please try again.'
      );
      setError(error.message || 'An error occurred. Please try again.');
      setIsAnalyzing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const hasSuccessfulUploads = files.some(f => f.status === 'success');

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Brain className="h-12 w-12 mx-auto mb-4 text-blue-500" />
        <h2 className="text-2xl font-bold mb-2">AI-Powered Threat Modeling</h2>
        <p className="text-muted-foreground">
          Analyze your system security using advanced AI and the STRIDE methodology
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              {isAnalyzing ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Threat model created! AI is analyzing your system for security threats...</span>
                </div>
              ) : (
                "Threat model analysis completed successfully!"
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Project Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Web Application System"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input
                id="description"
                name="description"
                type="text"
                placeholder="Brief overview of the system"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <FileSearch className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Supporting Documents</h3>
            <span className="text-sm text-muted-foreground">(Optional)</span>
          </div>
          
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors",
              isDragOver && "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
              "hover:border-muted-foreground/50 cursor-pointer"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h4 className="font-medium mb-2">Upload System Documentation</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Architecture diagrams, requirements, design docs, etc.
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF, DOCX, TXT, CSV, and image files up to 10MB
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.csv,.jpg,.jpeg,.png,.gif"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center">
                <Paperclip className="h-4 w-4 mr-1" />
                Uploaded Files ({files.length})
              </h4>
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/30">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center space-x-2">
                          {file.status === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {file.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            disabled={isLoading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                        {file.status === 'uploading' && (
                          <div className="flex-1">
                            <Progress value={file.progress} className="h-1" />
                          </div>
                        )}
                      </div>
                      
                      {file.error && (
                        <p className="text-xs text-red-500 mt-1">{file.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasSuccessfulUploads && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Files uploaded successfully and will be included in the AI analysis.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* System Description */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">System Description</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="prompt">Describe Your System *</Label>
            <Textarea
              id="prompt"
              name="prompt"
              placeholder="Provide a detailed description of your system for comprehensive threat analysis:

• System architecture and key components
• Data storage and processing mechanisms  
• User authentication and authorization flows
• External integrations and third-party APIs
• Network architecture and security boundaries
• Critical business processes and data flows
• Compliance requirements (GDPR, HIPAA, etc.)
• Current security measures in place

The more detail you provide, the more accurate and comprehensive the threat analysis will be."
              value={formData.prompt}
              onChange={handleInputChange}
              className="min-h-[250px] resize-vertical"
              required
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Include technical details about your architecture, data flows, and user interactions. 
              {hasSuccessfulUploads && " Your uploaded documents will provide additional context for the AI analysis."}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button 
            type="submit" 
            disabled={isLoading || files.some(f => f.status === 'uploading')} 
            className="flex-1 sm:flex-initial"
            size="lg"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isAnalyzing ? 'Analyzing Threats...' : 'Creating Threat Model...'}
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Begin Threat Model
              </>
            )}
          </Button>
          
          {hasSuccessfulUploads && (
            <p className="text-sm text-muted-foreground self-center">
              {files.filter(f => f.status === 'success').length} file(s) will be analyzed
            </p>
          )}
        </div>
      </form>

      {/* Progress Notification */}
      {progressNotification.notification && (
        <ProgressNotification {...progressNotification.notification} />
      )}
    </div>
  );
}
