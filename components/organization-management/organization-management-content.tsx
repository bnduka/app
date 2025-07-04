
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users,
  RefreshCw,
  Shield,
  Settings,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Activity,
  BarChart3,
  Clock,
  UserCheck,
  Crown,
  KeyRound
} from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  sessionTimeoutMinutes: number;
  maxFailedLogins: number;
  lockoutDurationMinutes: number;
  requireTwoFactor: boolean;
  _count: {
    users: number;
  };
  users: Array<{
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    lastLoginAt: Date | null;
  }>;
  stats: {
    totalUsers: number;
    activeUsers: number;
    threatModels: number;
    findings: number;
    reports: number;
  };
}

interface User {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export function OrganizationManagementContent() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [transferOrgId, setTransferOrgId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Create organization form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    sessionTimeoutMinutes: 5,
    maxFailedLogins: 5,
    lockoutDurationMinutes: 10,
    requireTwoFactor: false,
    businessAdminEmail: ''
  });

  // Edit organization form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    sessionTimeoutMinutes: 5,
    maxFailedLogins: 5,
    lockoutDurationMinutes: 10,
    requireTwoFactor: false
  });

  useEffect(() => {
    fetchOrganizations();
    fetchAvailableUsers();
  }, [searchQuery]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/admin/organizations?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch organizations');
      
      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?organizationId=');
      if (!response.ok) throw new Error('Failed to fetch available users');
      
      const data = await response.json();
      setAvailableUsers(data.users?.filter((user: any) => !user.organization) || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name) {
      toast.error('Organization name is required');
      return;
    }

    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/admin/organizations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Organization created successfully');
        setShowCreateDialog(false);
        resetCreateForm();
        fetchOrganizations();
        fetchAvailableUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create organization');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingOrg) return;

    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/admin/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Organization updated successfully');
        setShowEditDialog(false);
        setEditingOrg(null);
        fetchOrganizations();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update organization');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!orgToDelete || confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/admin/organizations/${orgToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          confirmationText: confirmText,
          transferUsersTo: transferOrgId || undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Organization deleted successfully');
        setShowDeleteDialog(false);
        setOrgToDelete(null);
        setConfirmText('');
        setTransferOrgId('');
        fetchOrganizations();
        fetchAvailableUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete organization');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      description: '',
      sessionTimeoutMinutes: 5,
      maxFailedLogins: 5,
      lockoutDurationMinutes: 10,
      requireTwoFactor: false,
      businessAdminEmail: ''
    });
  };

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org);
    setEditForm({
      name: org.name,
      description: org.description || '',
      sessionTimeoutMinutes: org.sessionTimeoutMinutes,
      maxFailedLogins: org.maxFailedLogins,
      lockoutDurationMinutes: org.lockoutDurationMinutes,
      requireTwoFactor: org.requireTwoFactor
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (org: Organization) => {
    setOrgToDelete(org);
    setConfirmText('');
    setTransferOrgId('');
    setShowDeleteDialog(true);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getDisplayName = (user: { name: string | null; firstName: string | null; lastName: string | null; email: string | null }) => {
    if (user.name) return user.name;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email || 'No name';
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-blue-600" />
          <span className="text-sm text-muted-foreground">
            Platform Administration • Organization Management
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
          
          <Button variant="outline" onClick={fetchOrganizations}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="search">Search Organizations</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations ({organizations.length})
          </CardTitle>
          <CardDescription>
            Manage organizations, their settings, and user assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.map((org) => (
                <div key={org.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{org.name}</h3>
                          {org.description && (
                            <p className="text-sm text-muted-foreground">{org.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(org)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(org)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <Users className="h-4 w-4 text-blue-600" />
                        {org.stats.totalUsers}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Users</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        {org.stats.activeUsers}
                      </div>
                      <div className="text-xs text-muted-foreground">Active Users</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <Shield className="h-4 w-4 text-purple-600" />
                        {org.stats.threatModels}
                      </div>
                      <div className="text-xs text-muted-foreground">Threat Models</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        {org.stats.findings}
                      </div>
                      <div className="text-xs text-muted-foreground">Findings</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <BarChart3 className="h-4 w-4 text-indigo-600" />
                        {org.stats.reports}
                      </div>
                      <div className="text-xs text-muted-foreground">Reports</div>
                    </div>
                  </div>

                  {/* Settings and Business Admins */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Security Settings
                      </h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Session Timeout:</span>
                          <span>{org.sessionTimeoutMinutes} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Failed Logins:</span>
                          <span>{org.maxFailedLogins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lockout Duration:</span>
                          <span>{org.lockoutDurationMinutes} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Two-Factor Required:</span>
                          <span>
                            {org.requireTwoFactor ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                No
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Business Admins ({org.users.length})
                      </h4>
                      <div className="space-y-1">
                        {org.users.length > 0 ? (
                          org.users.map((user) => (
                            <div key={user.id} className="text-sm text-muted-foreground">
                              <div>{getDisplayName(user)}</div>
                              <div className="text-xs">{user.email}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">No business admins assigned</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
                    <span>Created: {formatDate(org.createdAt)}</span>
                    <span>Updated: {formatDate(org.updatedAt)}</span>
                  </div>
                </div>
              ))}

              {organizations.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No organizations found matching your criteria.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization with security settings and optional business admin assignment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrganization} className="space-y-4">
            <div>
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="businessAdminEmail">Business Admin Email (Optional)</Label>
              <Select 
                value={createForm.businessAdminEmail || "none"} 
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, businessAdminEmail: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user to assign as business admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignment</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.email || 'none'}>
                      {getDisplayName(user)} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Security Settings</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="1"
                    max="1440"
                    value={createForm.sessionTimeoutMinutes}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, sessionTimeoutMinutes: parseInt(e.target.value) || 5 }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxFailedLogins">Max Failed Logins</Label>
                  <Input
                    id="maxFailedLogins"
                    type="number"
                    min="1"
                    max="20"
                    value={createForm.maxFailedLogins}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxFailedLogins: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                <Input
                  id="lockoutDuration"
                  type="number"
                  min="1"
                  max="1440"
                  value={createForm.lockoutDurationMinutes}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, lockoutDurationMinutes: parseInt(e.target.value) || 10 }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireTwoFactor"
                  checked={createForm.requireTwoFactor}
                  onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, requireTwoFactor: checked as boolean }))}
                />
                <Label htmlFor="requireTwoFactor">Require Two-Factor Authentication</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Creating...' : 'Create Organization'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organization: {editingOrg?.name}</DialogTitle>
            <DialogDescription>
              Update organization settings and security configuration.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditOrganization} className="space-y-4">
            <div>
              <Label htmlFor="editName">Organization Name *</Label>
              <Input
                id="editName"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Security Settings</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="editSessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="editSessionTimeout"
                    type="number"
                    min="1"
                    max="1440"
                    value={editForm.sessionTimeoutMinutes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, sessionTimeoutMinutes: parseInt(e.target.value) || 5 }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editMaxFailedLogins">Max Failed Logins</Label>
                  <Input
                    id="editMaxFailedLogins"
                    type="number"
                    min="1"
                    max="20"
                    value={editForm.maxFailedLogins}
                    onChange={(e) => setEditForm(prev => ({ ...prev, maxFailedLogins: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editLockoutDuration">Lockout Duration (minutes)</Label>
                <Input
                  id="editLockoutDuration"
                  type="number"
                  min="1"
                  max="1440"
                  value={editForm.lockoutDurationMinutes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lockoutDurationMinutes: parseInt(e.target.value) || 10 }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editRequireTwoFactor"
                  checked={editForm.requireTwoFactor}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, requireTwoFactor: checked as boolean }))}
                />
                <Label htmlFor="editRequireTwoFactor">Require Two-Factor Authentication</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Updating...' : 'Update Organization'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization and all its settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {orgToDelete && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted">
                <div className="text-sm font-medium">Organization to delete:</div>
                <div className="text-sm text-muted-foreground mt-1">
                  <div className="font-medium">{orgToDelete.name}</div>
                  <div>{orgToDelete.description}</div>
                  <div className="mt-2">
                    <Badge variant="outline">
                      {orgToDelete.stats.totalUsers} users
                    </Badge>
                  </div>
                </div>
              </div>

              {orgToDelete.stats.totalUsers > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="transferOrg">Transfer users to organization (optional)</Label>
                  <Select value={transferOrgId || "none"} onValueChange={(value) => setTransferOrgId(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="No transfer - users will have no organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No transfer</SelectItem>
                      {organizations
                        .filter(org => org.id !== orgToDelete.id)
                        .map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This will permanently delete the organization.
                  {orgToDelete.stats.totalUsers > 0 && !transferOrgId && (
                    <> Users will be set to no organization.</>
                  )}
                  {orgToDelete.stats.totalUsers > 0 && transferOrgId && (
                    <> Users will be transferred to the selected organization.</>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="deleteConfirmText">
                  Type <code className="bg-muted px-1 py-0.5 rounded">DELETE</code> to confirm
                </Label>
                <Input
                  id="deleteConfirmText"
                  placeholder="Type DELETE to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={isProcessing || confirmText !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Deleting...' : 'Delete Organization'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
