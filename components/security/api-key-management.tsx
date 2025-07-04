
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  
  // Form state
  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const availableScopes = [
    { value: 'threat-models:read', label: 'Read Threat Models' },
    { value: 'threat-models:write', label: 'Write Threat Models' },
    { value: 'threat-models:delete', label: 'Delete Threat Models' },
    { value: 'findings:read', label: 'Read Findings' },
    { value: 'findings:write', label: 'Write Findings' },
    { value: 'findings:delete', label: 'Delete Findings' },
    { value: 'reports:read', label: 'Read Reports' },
    { value: 'reports:generate', label: 'Generate Reports' },
    { value: 'uploads:read', label: 'Read Uploads' },
    { value: 'uploads:write', label: 'Write Uploads' },
  ];

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/security/api-keys');
      const data = await response.json();
      
      if (response.ok) {
        setApiKeys(data.apiKeys.map((key: any) => ({
          ...key,
          lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : undefined,
          expiresAt: key.expiresAt ? new Date(key.expiresAt) : undefined,
          createdAt: new Date(key.createdAt),
        })));
      } else {
        toast.error('Failed to fetch API keys');
      }
    } catch (error) {
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/security/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: keyName,
          scopes: selectedScopes,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewKey({ key: data.apiKey.key, name: data.apiKey.name });
        setCreateDialogOpen(false);
        setKeyName('');
        setSelectedScopes([]);
        setExpiresInDays('');
        await fetchApiKeys();
        toast.success('API key created successfully');
      } else {
        toast.error(data.error || 'Failed to create API key');
      }
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/security/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchApiKeys();
        toast.success('API key deleted successfully');
      } else {
        toast.error('Failed to delete API key');
      }
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const handleRotateApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/security/api-keys/${keyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'rotate' }),
      });

      const data = await response.json();

      if (data.success) {
        setNewKey({ key: data.apiKey.key, name: data.apiKey.name });
        await fetchApiKeys();
        toast.success('API key rotated successfully');
      } else {
        toast.error('Failed to rotate API key');
      }
    } catch (error) {
      toast.error('Failed to rotate API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleScopeToggle = (scope: string, checked: boolean) => {
    if (checked) {
      setSelectedScopes([...selectedScopes, scope]);
    } else {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    }
  };

  const isKeyExpired = (key: ApiKey) => {
    return key.expiresAt && key.expiresAt < new Date();
  };

  const isKeyExpiringSoon = (key: ApiKey) => {
    if (!key.expiresAt) return false;
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return key.expiresAt < sevenDaysFromNow && key.expiresAt > new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Key Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create and manage API keys for accessing BGuard programmatically.
              </p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., CI/CD Pipeline, Mobile App"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Scopes (Permissions)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableScopes.map((scope) => (
                        <div key={scope.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={scope.value}
                            checked={selectedScopes.includes(scope.value)}
                            onCheckedChange={(checked) => 
                              handleScopeToggle(scope.value, checked as boolean)
                            }
                          />
                          <Label htmlFor={scope.value} className="text-sm">
                            {scope.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry (Optional)</Label>
                    <Select value={expiresInDays || "never"} onValueChange={(value) => setExpiresInDays(value === "never" ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Never expires" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never expires</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateApiKey} disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create API Key'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                Create your first API key to start using the BGuard API.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{key.name}</h4>
                      {isKeyExpired(key) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                      {isKeyExpiringSoon(key) && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          Expiring Soon
                        </Badge>
                      )}
                      {!key.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Scopes: {key.scopes.length > 0 ? key.scopes.join(', ') : 'No scopes'}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created: {format(key.createdAt, 'MMM d, yyyy')}
                        </span>
                        
                        {key.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires: {format(key.expiresAt, 'MMM d, yyyy')}
                          </span>
                        )}
                        
                        {key.lastUsedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Last used: {format(key.lastUsedAt, 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRotateApiKey(key.id)}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Rotate
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteApiKey(key.id)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New API Key Dialog */}
      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              API Key Created Successfully
            </DialogTitle>
          </DialogHeader>
          
          {newKey && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 mb-2">
                  <strong>Important:</strong> This is the only time you'll see this API key. 
                  Make sure to copy it now and store it securely.
                </p>
              </div>

              <div className="space-y-2">
                <Label>API Key for: {newKey.name}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newKey.key}
                    readOnly
                    type={showNewKey ? 'text' : 'password'}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewKey(!showNewKey)}
                  >
                    {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newKey.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>
              I've Saved the Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
