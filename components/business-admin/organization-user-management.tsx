
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Users, Shield, Search, ChevronDown, ChevronUp, Edit3, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { UserRole, Organization, BillingStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  billingStatus: BillingStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  organization?: {
    id: string;
    name: string;
  } | null;
}

interface OrganizationUserManagementProps {
  organization: (Organization & { _count: { users: number } }) | null;
  userRole: UserRole;
  isGlobalAdmin: boolean;
}

export function OrganizationUserManagement({
  organization,
  userRole,
  isGlobalAdmin
}: OrganizationUserManagementProps) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>(organization?.id || '');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('BUSINESS_USER');
  const [newOrgId, setNewOrgId] = useState<string>('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    fetchUsers();
    if (isGlobalAdmin) {
      fetchOrganizations();
    }
  }, [selectedOrg]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (!isGlobalAdmin && organization?.id) {
        params.set('organizationId', organization.id);
      } else if (selectedOrg) {
        params.set('organizationId', selectedOrg);
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/users/manage?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      
      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole, newOrgId?: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: newRole,
          organizationId: newOrgId 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user role');
      }

      toast.success('User role updated successfully');
      fetchUsers();
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error(error.message || 'Failed to update user role');
    }
  };

  const handleOrganizationChange = async (userId: string, organizationId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/organization`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user organization');
      }

      toast.success('User organization updated successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user organization:', error);
      toast.error(error.message || 'Failed to update user organization');
    }
  };

  const deleteUser = async (userId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${userId}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationText: confirmText,
        }),
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        toast.success('User deleted successfully');
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
        setConfirmText('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
    setConfirmText('');
  };

  const handleStatusChange = async (userId: string, newStatus: BillingStatus) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user status');
      }

      toast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'} successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error(error.message || 'Failed to update user status');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'BUSINESS_ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'BUSINESS_USER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'USER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusBadge = (status: BillingStatus) => {
    switch (status) {
      case 'ACTIVE':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: CheckCircle,
          text: 'Active'
        };
      case 'SUSPENDED':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          icon: XCircle,
          text: 'Suspended'
        };
      case 'TRIAL':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          icon: CheckCircle,
          text: 'Trial'
        };
      case 'EXPIRED':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
          icon: XCircle,
          text: 'Expired'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
          icon: CheckCircle,
          text: 'Unknown'
        };
    }
  };

  const canEditUser = (targetUser: User) => {
    if (isGlobalAdmin) return true;
    if (userRole === 'BUSINESS_ADMIN') {
      // Business admin can manage users in their organization (except other admins)
      return targetUser.role !== 'ADMIN' && targetUser.role !== 'BUSINESS_ADMIN';
    }
    return false;
  };

  const getAvailableRoles = (targetUser: User): UserRole[] => {
    if (isGlobalAdmin) {
      return ['USER', 'BUSINESS_USER', 'BUSINESS_ADMIN', 'ADMIN'];
    }
    if (userRole === 'BUSINESS_ADMIN') {
      return ['BUSINESS_USER'];
    }
    return [];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            {isGlobalAdmin 
              ? 'Manage users across all organizations'
              : `Manage users in ${organization?.name || 'your organization'}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isGlobalAdmin && (
              <div className="w-64">
                <Label htmlFor="organization">Organization</Label>
                <Select value={selectedOrg || "all"} onValueChange={setSelectedOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={fetchUsers} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    {isGlobalAdmin && <TableHead>Organization</TableHead>}
                    <TableHead>Last Login</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const statusBadge = getStatusBadge(user.billingStatus);
                            const StatusIcon = statusBadge.icon;
                            return (
                              <Badge className={statusBadge.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusBadge.text}
                              </Badge>
                            );
                          })()}
                          {canEditUser(user) && (
                            <Switch
                              checked={user.billingStatus === 'ACTIVE'}
                              onCheckedChange={(checked) => 
                                handleStatusChange(user.id, checked ? 'ACTIVE' : 'SUSPENDED')
                              }
                              title={user.billingStatus === 'ACTIVE' ? 'Suspend account' : 'Activate account'}
                            />
                          )}
                        </div>
                      </TableCell>
                      {isGlobalAdmin && (
                        <TableCell>
                          {user.organization?.name || (
                            <span className="text-muted-foreground">No organization</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canEditUser(user) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setNewRole(user.role);
                                setNewOrgId(user.organization?.id || '');
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Protected</span>
                          )}
                          
                          {canEditUser(user) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No users found matching your criteria.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.name || editingUser?.email}</DialogTitle>
            <DialogDescription>
              Update user role and organization assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles(editingUser!).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isGlobalAdmin && (
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Select value={newOrgId || "none"} onValueChange={(value) => setNewOrgId(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No organization</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleRoleChange(editingUser!.id, newRole, newOrgId)}
              disabled={!editingUser}
            >
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account and transfer their threat models and findings to you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {userToDelete && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted">
                <div className="text-sm font-medium">User to delete:</div>
                <div className="text-sm text-muted-foreground mt-1">
                  <div>{userToDelete.name || 'No name'}</div>
                  <div>{userToDelete.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRoleBadgeColor(userToDelete.role)}>
                      {userToDelete.role.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This will delete the user account and transfer their work to you.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="confirmText">
                  Type <code className="bg-muted px-1 py-0.5 rounded">DELETE</code> to confirm
                </Label>
                <Input
                  id="confirmText"
                  placeholder="Type DELETE to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isDeleting}
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUser(userToDelete.id)}
              disabled={isDeleting || confirmText !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
