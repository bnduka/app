
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Settings, 
  Shield,
  AlertTriangle,
  Info,
  Loader2,
  Globe,
  Zap
} from 'lucide-react';
import { ApplicationAssetWithDetails } from '@/lib/types';
import { toast } from 'sonner';

interface EndpointDiscoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: ApplicationAssetWithDetails;
  onDiscoveryStarted: (sessionId: string) => void;
}

interface DiscoveryConfig {
  domain: string;
  maxDepth: number;
  includeSubdomains: boolean;
  followRedirects: boolean;
  customHeaders: Record<string, string>;
  authConfig?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials: Record<string, string>;
  };
}

export function EndpointDiscoveryModal({ 
  open, 
  onOpenChange, 
  asset, 
  onDiscoveryStarted 
}: EndpointDiscoveryModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'config' | 'advanced'>('config');
  
  const [config, setConfig] = useState<DiscoveryConfig>({
    domain: '',
    maxDepth: 3,
    includeSubdomains: false,
    followRedirects: true,
    customHeaders: {},
    authConfig: undefined,
  });

  const [customHeaderKey, setCustomHeaderKey] = useState('');
  const [customHeaderValue, setCustomHeaderValue] = useState('');
  const [authType, setAuthType] = useState<'none' | 'basic' | 'bearer' | 'cookie'>('none');
  const [authCredentials, setAuthCredentials] = useState<Record<string, string>>({});

  // Initialize domain from asset URL
  useEffect(() => {
    if (asset?.applicationUrl && open) {
      try {
        const url = new URL(asset.applicationUrl.startsWith('http') 
          ? asset.applicationUrl 
          : `https://${asset.applicationUrl}`);
        const hostname = url.hostname;
        setConfig(prev => ({ 
          ...prev, 
          domain: hostname || asset.applicationUrl || 'example.com' 
        }));
      } catch (error) {
        // If URL parsing fails, use the raw applicationUrl
        setConfig(prev => ({ 
          ...prev, 
          domain: asset.applicationUrl || 'example.com' 
        }));
      }
    }
  }, [asset, open]);

  const handleAddCustomHeader = () => {
    if (customHeaderKey && customHeaderValue) {
      setConfig(prev => ({
        ...prev,
        customHeaders: {
          ...prev.customHeaders,
          [customHeaderKey]: customHeaderValue,
        },
      }));
      setCustomHeaderKey('');
      setCustomHeaderValue('');
    }
  };

  const handleRemoveCustomHeader = (key: string) => {
    setConfig(prev => {
      const newHeaders = { ...prev.customHeaders };
      delete newHeaders[key];
      return { ...prev, customHeaders: newHeaders };
    });
  };

  const handleAuthConfigChange = (field: string, value: string) => {
    setAuthCredentials(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStartDiscovery = async () => {
    if (!config.domain) {
      toast.error('Please enter a domain to scan');
      return;
    }

    setLoading(true);

    try {
      const requestBody = {
        applicationAssetId: asset.id,
        domain: config.domain,
        maxDepth: config.maxDepth,
        includeSubdomains: config.includeSubdomains,
        followRedirects: config.followRedirects,
        customHeaders: Object.keys(config.customHeaders).length > 0 ? config.customHeaders : undefined,
        authConfig: authType !== 'none' ? {
          type: authType,
          credentials: authCredentials,
        } : undefined,
      };

      const response = await fetch('/api/assets/endpoint-discovery/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start endpoint discovery');
      }

      toast.success('Endpoint discovery started successfully');
      onDiscoveryStarted(data.sessionId);
      onOpenChange(false);

    } catch (error) {
      console.error('Failed to start endpoint discovery:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start discovery');
    } finally {
      setLoading(false);
    }
  };

  const renderConfigStep = () => (
    <div className="space-y-6">
      {/* Domain Configuration */}
      <div className="space-y-3">
        <Label htmlFor="domain" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Target Domain
        </Label>
        <Input
          id="domain"
          value={config.domain}
          onChange={(e) => setConfig(prev => ({ ...prev, domain: e.target.value }))}
          placeholder="example.com"
          className="font-mono"
        />
        <p className="text-sm text-muted-foreground">
          The domain will be crawled to discover all accessible endpoints
        </p>
      </div>

      {/* Basic Configuration */}
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Scan Configuration
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxDepth">Max Crawl Depth</Label>
            <Select
              value={config.maxDepth.toString()}
              onValueChange={(value) => setConfig(prev => ({ ...prev, maxDepth: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 level</SelectItem>
                <SelectItem value="2">2 levels</SelectItem>
                <SelectItem value="3">3 levels</SelectItem>
                <SelectItem value="4">4 levels</SelectItem>
                <SelectItem value="5">5 levels (extensive)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scan Options</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="subdomains" className="text-sm">Include Subdomains</Label>
                <Switch
                  id="subdomains"
                  checked={config.includeSubdomains}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeSubdomains: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="redirects" className="text-sm">Follow Redirects</Label>
                <Switch
                  id="redirects"
                  checked={config.followRedirects}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, followRedirects: checked }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Security Notice
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Only scan domains you own or have explicit permission to test. 
              Unauthorized scanning may violate terms of service or local laws.
            </p>
          </div>
        </div>
      </div>

      {/* AI Classification Info */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              AI-Powered Analysis
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Discovered endpoints will be automatically classified by AI for risk assessment, 
              sensitivity analysis, and anomaly detection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedStep = () => (
    <div className="space-y-6">
      {/* Custom Headers */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Custom Headers
        </Label>
        
        {Object.entries(config.customHeaders).length > 0 && (
          <div className="space-y-2">
            {Object.entries(config.customHeaders).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded">
                <Badge variant="outline" className="font-mono text-xs">
                  {key}: {value}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCustomHeader(key)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Header name"
            value={customHeaderKey}
            onChange={(e) => setCustomHeaderKey(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Header value"
            value={customHeaderValue}
            onChange={(e) => setCustomHeaderValue(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleAddCustomHeader}
            disabled={!customHeaderKey || !customHeaderValue}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Authentication Configuration */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Authentication
        </Label>
        
        <Select
          value={authType}
          onValueChange={(value) => {
            setAuthType(value as typeof authType);
            setAuthCredentials({});
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select authentication type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Authentication</SelectItem>
            <SelectItem value="basic">Basic Authentication</SelectItem>
            <SelectItem value="bearer">Bearer Token</SelectItem>
            <SelectItem value="cookie">Cookie-based</SelectItem>
          </SelectContent>
        </Select>

        {authType === 'basic' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={authCredentials.username || ''}
                onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                placeholder="Username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={authCredentials.password || ''}
                onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                placeholder="Password"
              />
            </div>
          </div>
        )}

        {authType === 'bearer' && (
          <div>
            <Label htmlFor="token">Bearer Token</Label>
            <Input
              id="token"
              value={authCredentials.token || ''}
              onChange={(e) => handleAuthConfigChange('token', e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="font-mono"
            />
          </div>
        )}

        {authType === 'cookie' && (
          <div>
            <Label htmlFor="cookies">Session Cookies</Label>
            <Textarea
              id="cookies"
              value={authCredentials.cookies || ''}
              onChange={(e) => handleAuthConfigChange('cookies', e.target.value)}
              placeholder="name1=value1; name2=value2"
              rows={3}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter cookies in the format: name1=value1; name2=value2
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Endpoint Discovery
          </DialogTitle>
          <DialogDescription>
            Automatically discover and classify endpoints for {asset?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step Navigation */}
          <div className="flex gap-1 mb-6">
            <Button
              variant={step === 'config' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep('config')}
            >
              Configuration
            </Button>
            <Button
              variant={step === 'advanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep('advanced')}
            >
              Advanced
            </Button>
          </div>

          {step === 'config' && renderConfigStep()}
          {step === 'advanced' && renderAdvancedStep()}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            Estimated scan time: 2-10 minutes
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartDiscovery}
              disabled={loading || !config.domain}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Discovery
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
