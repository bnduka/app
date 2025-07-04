
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ActivityLogsContent } from '@/components/activity-logs/activity-logs-content';
import { toast } from 'sonner';
import { 
  Settings, 
  Clock, 
  Save, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle,
  Info,
  User,
  Activity,
  Building2,
  Shield
} from 'lucide-react';

interface SlaSettings {
  criticalDays: number;
  highDays: number;
  mediumDays: number;
  lowDays: number;
}

const defaultSla: SlaSettings = {
  criticalDays: 20,
  highDays: 60,
  mediumDays: 180,
  lowDays: 240,
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [slaSettings, setSlaSettings] = useState<SlaSettings>(defaultSla);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<SlaSettings>(defaultSla);

  // Role-based access control
  const isAdmin = session?.user?.role === 'ADMIN';
  const isBusinessAdmin = session?.user?.role === 'BUSINESS_ADMIN';
  const canAccessSLA = isAdmin || isBusinessAdmin;
  const canAccessActivityLogs = isAdmin || isBusinessAdmin;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && canAccessSLA) {
      fetchSlaSettings();
    } else {
      setIsLoading(false);
    }
  }, [status, router, canAccessSLA]);

  const fetchSlaSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/sla');
      
      if (response.ok) {
        const data = await response.json();
        const settings = data.slaSettings || defaultSla;
        setSlaSettings(settings);
        setOriginalSettings(settings);
      } else {
        // If no settings exist, use defaults
        setSlaSettings(defaultSla);
        setOriginalSettings(defaultSla);
      }
    } catch (error: any) {
      console.error('Error fetching SLA settings:', error);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof SlaSettings, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 1 || numValue > 365) return; // Validate range
    
    setSlaSettings(prev => ({
      ...prev,
      [field]: numValue
    }));
    setHasChanges(true);
    setError('');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');

      // Validate settings
      if (slaSettings.criticalDays >= slaSettings.highDays ||
          slaSettings.highDays >= slaSettings.mediumDays ||
          slaSettings.mediumDays >= slaSettings.lowDays) {
        throw new Error('SLA days must be in ascending order: Critical < High < Medium < Low');
      }

      const response = await fetch('/api/settings/sla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slaSettings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setOriginalSettings(slaSettings);
      setHasChanges(false);
      toast.success('SLA settings saved successfully');
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSlaSettings(originalSettings);
    setHasChanges(false);
    setError('');
  };

  const handleRestoreDefaults = () => {
    setSlaSettings(defaultSla);
    setHasChanges(true);
    setError('');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { text: 'Platform Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
      case 'BUSINESS_ADMIN':
        return { text: 'Org Admin', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'BUSINESS_USER':
        return { text: 'Business User', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
      case 'USER':
        return { text: 'User', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
      default:
        return null;
    }
  };

  // Define available tabs based on role
  const availableTabs = [
    { id: 'profile', name: 'User Profile', accessible: true },
    { id: 'sla', name: 'SLA Configuration', accessible: canAccessSLA },
    { id: 'activity', name: 'Activity Logs', accessible: canAccessActivityLogs }
  ].filter(tab => tab.accessible);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gradient">Settings</h1>
        <p className="text-muted-foreground">
          Configure your profile, preferences, and view system information.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full lg:w-auto" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}>
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* User Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                User Profile
              </CardTitle>
              <CardDescription>
                View and manage your account information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || 'User'} />
                  <AvatarFallback className="text-lg">
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{session?.user?.name || 'User'}</h3>
                  <p className="text-muted-foreground">{session?.user?.email}</p>
                  {(() => {
                    const roleBadge = getRoleBadge(session?.user?.role || '');
                    return roleBadge ? (
                      <Badge variant="outline" className={`w-fit ${roleBadge.color}`}>
                        {roleBadge.text}
                      </Badge>
                    ) : null;
                  })()}
                </div>
              </div>

              {session?.user?.organizationName && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Organization</h4>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{session.user.organizationName}</span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Email Verified</Label>
                  <p className="text-sm text-muted-foreground">
                    {session?.user?.emailVerified ? 'Yes' : 'Not verified'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {session?.user?.id || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Role-based access info */}
              {!canAccessSLA && !canAccessActivityLogs && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Some settings are restricted to admin users. Contact your administrator for access to SLA configuration and activity logs.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Configuration Tab - Admin Only */}
        {canAccessSLA && (
          <TabsContent value="sla" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  SLA Configuration
                  <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-800">
                    Admin Only
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Set the maximum number of days allowed for resolving findings based on severity levels.
                  These settings help track compliance and prioritize security issues.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    SLA days must be in ascending order: Critical &lt; High &lt; Medium &lt; Low
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Critical Severity */}
                  <div className="space-y-2">
                    <Label htmlFor="critical" className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      Critical Severity
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="critical"
                        type="number"
                        min="1"
                        max="365"
                        value={slaSettings.criticalDays}
                        onChange={(e) => handleInputChange('criticalDays', e.target.value)}
                        className="max-w-24"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Critical security issues requiring immediate attention
                    </p>
                  </div>

                  {/* High Severity */}
                  <div className="space-y-2">
                    <Label htmlFor="high" className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      High Severity
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="high"
                        type="number"
                        min="1"
                        max="365"
                        value={slaSettings.highDays}
                        onChange={(e) => handleInputChange('highDays', e.target.value)}
                        className="max-w-24"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      High priority issues with significant security impact
                    </p>
                  </div>

                  {/* Medium Severity */}
                  <div className="space-y-2">
                    <Label htmlFor="medium" className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      Medium Severity
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="medium"
                        type="number"
                        min="1"
                        max="365"
                        value={slaSettings.mediumDays}
                        onChange={(e) => handleInputChange('mediumDays', e.target.value)}
                        className="max-w-24"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Moderate security concerns requiring planned resolution
                    </p>
                  </div>

                  {/* Low Severity */}
                  <div className="space-y-2">
                    <Label htmlFor="low" className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      Low Severity
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="low"
                        type="number"
                        min="1"
                        max="365"
                        value={slaSettings.lowDays}
                        onChange={(e) => handleInputChange('lowDays', e.target.value)}
                        className="max-w-24"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Low priority improvements and best practice implementations
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className="flex-1 sm:flex-initial"
                    >
                      {isSaving ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    
                    {hasChanges && (
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={isSaving}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={handleRestoreDefaults}
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial"
                  >
                    Restore Defaults
                  </Button>
                </div>

                {hasChanges && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      You have unsaved changes. Don't forget to save your settings.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Activity Logs Tab - Admin Only */}
        {canAccessActivityLogs && (
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Activity Logs
                  <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-800">
                    Admin Only
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Track all activities and events in the system. Only administrators can view activity logs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityLogsContent />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
