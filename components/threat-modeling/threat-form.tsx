
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Shield, AlertCircle, CheckCircle, Zap } from 'lucide-react';

interface ThreatFormProps {
  onSuccess?: () => void;
}

export function ThreatForm({ onSuccess }: ThreatFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
    setError('');

    try {
      if (!formData.name || !formData.prompt) {
        throw new Error('Name and system description are required');
      }

      const response = await fetch('/api/threat-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create threat model');
      }

      setSuccess(true);
      setFormData({ name: '', description: '', prompt: '' });
      toast.success('Threat model created successfully!');
      
      if (onSuccess) {
        onSuccess();
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.');
      toast.error(error.message || 'Failed to create threat model');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            Threat model created successfully! AI analysis is in progress.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="e.g., E-commerce API System"
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

      <div className="space-y-2">
        <Label htmlFor="prompt">System Description *</Label>
        <Textarea
          id="prompt"
          name="prompt"
          placeholder="Describe your system architecture, components, data flows, user interactions, and security considerations. Include details about:
          
• System components and their interactions
• Data storage and processing mechanisms  
• User authentication and authorization
• External integrations and APIs
• Network architecture and boundaries
• Critical business processes
• Compliance requirements"
          value={formData.prompt}
          onChange={handleInputChange}
          className="min-h-[200px] resize-vertical"
          required
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Provide detailed information for more accurate threat analysis. The more context you provide, the better the AI can identify potential security risks.
        </p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Analyzing Threats...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Start AI Analysis
          </>
        )}
      </Button>
    </form>
  );
}
