
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  Shield, 
  Clock, 
  Lock,
  Users,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface SecuritySettingsData {
  organization: {
    id: string;
    name: string;
    sessionTimeoutMinutes: number;
    maxFailedLogins: number;
    lockoutDurationMinutes: number;
    requireTwoFactor: boolean;
    securitySettings?: {
      passwordMinLength: number;
      passwordRequireUpper: boolean;
      passwordRequireLower: boolean;
      passwordRequireNumber: boolean;
      passwordRequireSymbol: boolean;
      maxConcurrentSessions: number;
      enableDeviceTracking: boolean;
      alertOnSuspiciousLogin: boolean;
    };
  };
}

interface SecuritySettingsProps {
  isAdmin?: boolean;
  organizationId?: string;
}

export function SecuritySettings({ isAdmin = false, organizationId }: SecuritySettingsProps) {
  const [data, setData] = useState<SecuritySettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [sessionTimeout, setSessionTimeout] = useState(5);
  const [maxFailedLogins, setMaxFailedLogins] = useState(5);
  const [lockoutDuration, setLockoutDuration] = useState(10);
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [passwordRequireUpper, setPasswordRequireUpper] = useState(true);
  const [passwordRequireLower, setPasswordRequireLower] = useState(true);
  const [passwordRequireNumber, setPasswordRequireNumber] = useState(true);
  const [passwordRequireSymbol, setPasswordRequireSymbol] = useState(true);
  const [maxConcurrentSessions, setMaxConcurrentSessions] = useState(5);
  const [enableDeviceTracking, setEnableDeviceTracking] = useState(true);
  const [alertOnSuspiciousLogin, setAlertOnSuspiciousLogin] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (data) {
      const org = data.organization;
      const security = org.securitySettings;
      
      setSessionTimeout(org.sessionTimeoutMinutes);
      setMaxFailedLogins(org.maxFailedLogins);
      setLockoutDuration(org.lockoutDurationMinutes);
      setRequireTwoFactor(org.requireTwoFactor);
      
      if (security) {
        setPasswordMinLength(security.passwordMinLength);
        setPasswordRequireUpper(security.passwordRequireUpper);
        setPasswordRequireLower(security.passwordRequireLower);
        setPasswordRequireNumber(security.passwordRequireNumber);
        setPasswordRequireSymbol(security.passwordRequireSymbol);
        setMaxConcurrentSessions(security.maxConcurrentSessions);
        setEnableDeviceTracking(security.enableDeviceTracking);
        setAlertOnSuspiciousLogin(security.alertOnSuspiciousLogin);
      }
    }
  }, [data]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/security/organization/settings');
      const result = await response.json();
      
      if (response.ok) {
        setData(result);
      } else {
        toast.error('Failed to fetch security settings');
      }
    } catch (error) {
      toast.error('Failed to fetch security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/security/organization/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionTimeoutMinutes: sessionTimeout,
          maxFailedLogins,
          lockoutDurationMinutes: lockoutDuration,
          requireTwoFactor,
          passwordMinLength,
          passwordRequireUpper,
          passwordRequireLower,
          passwordRequireNumber,
          passwordRequireSymbol,
          maxConcurrentSessions,
          enableDeviceTracking,
          alertOnSuspiciousLogin,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result);
        setHasChanges(false);
        toast.success('Security settings updated successfully');
      } else {
        toast.error(result.error || 'Failed to update security settings');
      }
    } catch (error) {
      toast.error('Failed to update security settings');
    } finally {
      setSaving(false);
    }
  };

  const getPasswordStrengthScore = () => {
    let score = 0;
    if (passwordMinLength >= 8) score += 20;
    if (passwordMinLength >= 12) score += 10;
    if (passwordRequireUpper) score += 20;
    if (passwordRequireLower) score += 20;
    if (passwordRequireNumber) score += 15;
    if (passwordRequireSymbol) score += 15;
    return Math.min(100, score);
  };

  const getPasswordStrengthLabel = (score: number) => {
    if (score >= 90) return { label: 'Very Strong', color: 'text-green-600' };
    if (score >= 70) return { label: 'Strong', color: 'text-blue-600' };
    if (score >= 50) return { label: 'Medium', color: 'text-yellow-600' };
    return { label: 'Weak', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load security settings. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const passwordStrength = getPasswordStrengthScore();
  const strengthInfo = getPasswordStrengthLabel(passwordStrength);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Settings</h2>
          <p className="text-muted-foreground">
            Configure security policies for {data.organization.name}
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Session Timeout</Label>
            <div className="space-y-4">
              <Slider
                value={[sessionTimeout]}
                onValueChange={(value) => {
                  setSessionTimeout(value[0]);
                  setHasChanges(true);
                }}
                min={5}
                max={30}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>5 minutes</span>
                <span className="font-medium">{sessionTimeout} minutes</span>
                <span>30 minutes</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Users will be automatically logged out after this period of inactivity.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Maximum Concurrent Sessions</Label>
            <Select
              value={maxConcurrentSessions.toString()}
              onValueChange={(value) => {
                setMaxConcurrentSessions(parseInt(value));
                setHasChanges(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 session</SelectItem>
                <SelectItem value="3">3 sessions</SelectItem>
                <SelectItem value="5">5 sessions</SelectItem>
                <SelectItem value="10">10 sessions</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Maximum number of simultaneous sessions per user.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Account Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Maximum Failed Login Attempts</Label>
            <Select
              value={maxFailedLogins.toString()}
              onValueChange={(value) => {
                setMaxFailedLogins(parseInt(value));
                setHasChanges(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 attempts</SelectItem>
                <SelectItem value="5">5 attempts</SelectItem>
                <SelectItem value="10">10 attempts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account Lockout Duration</Label>
            <Select
              value={lockoutDuration.toString()}
              onValueChange={(value) => {
                setLockoutDuration(parseInt(value));
                setHasChanges(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Require Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Enforce 2FA for all users in this organization
              </p>
            </div>
            <Switch
              checked={requireTwoFactor}
              onCheckedChange={(checked) => {
                setRequireTwoFactor(checked);
                setHasChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Password Policy
            <Badge 
              variant="outline" 
              className={strengthInfo.color}
            >
              {strengthInfo.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Minimum Password Length</Label>
            <Select
              value={passwordMinLength.toString()}
              onValueChange={(value) => {
                setPasswordMinLength(parseInt(value));
                setHasChanges(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 characters</SelectItem>
                <SelectItem value="10">10 characters</SelectItem>
                <SelectItem value="12">12 characters</SelectItem>
                <SelectItem value="16">16 characters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label>Require Uppercase</Label>
              <Switch
                checked={passwordRequireUpper}
                onCheckedChange={(checked) => {
                  setPasswordRequireUpper(checked);
                  setHasChanges(true);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Require Lowercase</Label>
              <Switch
                checked={passwordRequireLower}
                onCheckedChange={(checked) => {
                  setPasswordRequireLower(checked);
                  setHasChanges(true);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Require Numbers</Label>
              <Switch
                checked={passwordRequireNumber}
                onCheckedChange={(checked) => {
                  setPasswordRequireNumber(checked);
                  setHasChanges(true);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Require Symbols</Label>
              <Switch
                checked={passwordRequireSymbol}
                onCheckedChange={(checked) => {
                  setPasswordRequireSymbol(checked);
                  setHasChanges(true);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Device Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track and manage user devices for enhanced security
              </p>
            </div>
            <Switch
              checked={enableDeviceTracking}
              onCheckedChange={(checked) => {
                setEnableDeviceTracking(checked);
                setHasChanges(true);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Alert on Suspicious Login</Label>
              <p className="text-sm text-muted-foreground">
                Send alerts when suspicious login activity is detected
              </p>
            </div>
            <Switch
              checked={alertOnSuspiciousLogin}
              onCheckedChange={(checked) => {
                setAlertOnSuspiciousLogin(checked);
                setHasChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to apply them.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
