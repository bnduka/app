
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Plus, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  description?: string;
  userCount: number;
  domain?: string;
}

function SSOOrganizationSetupContent() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      router.push('/login');
      return;
    }
    fetchOrganizations();
  }, [userId, router]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations/public');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (organizationId: string) => {
    if (!userId) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/sso-organization-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId,
          action: 'join'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Successfully joined organization!');
        await updateSession();
        router.push('/dashboard');
      } else {
        setError(data.error || 'Failed to join organization');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!userId || !newOrgName.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/sso-organization-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'create',
          organizationName: newOrgName.trim(),
          organizationDescription: newOrgDescription.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Organization created successfully!');
        await updateSession();
        router.push('/dashboard');
      } else {
        setError(data.error || 'Failed to create organization');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Complete Your Setup</CardTitle>
          <CardDescription>
            Choose an organization to join or create a new one to get started with BGuard Suite.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Info */}
          {session?.user && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">{session.user.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  <Badge variant="outline" className="mt-1">SSO Account</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Existing Organizations */}
          {organizations.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Join Existing Organization</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedOrganizationId === org.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''
                    }`}
                    onClick={() => setSelectedOrganizationId(org.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{org.name}</h4>
                        {org.description && (
                          <p className="text-sm text-muted-foreground mt-1">{org.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {org.userCount} members
                          </span>
                          {org.domain && (
                            <span>Domain: {org.domain}</span>
                          )}
                        </div>
                      </div>
                      {selectedOrganizationId === org.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedOrganizationId && (
                <Button
                  onClick={() => handleJoinOrganization(selectedOrganizationId)}
                  disabled={submitting}
                  className="w-full mt-4"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Joining Organization...
                    </>
                  ) : (
                    <>
                      <Building2 className="mr-2 h-4 w-4" />
                      Join Selected Organization
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          {/* Create New Organization */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Create New Organization</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {isCreatingNew ? 'Cancel' : 'Create New'}
              </Button>
            </div>

            {isCreatingNew && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Enter organization name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="orgDescription">Description (Optional)</Label>
                  <Input
                    id="orgDescription"
                    value={newOrgDescription}
                    onChange={(e) => setNewOrgDescription(e.target.value)}
                    placeholder="Brief description of your organization"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleCreateOrganization}
                  disabled={!newOrgName.trim() || submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating Organization...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Organization
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Skip Option */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/dashboard')}
              disabled={submitting}
            >
              Skip for now (you can set this up later)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SSOOrganizationSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <SSOOrganizationSetupContent />
    </Suspense>
  );
}
