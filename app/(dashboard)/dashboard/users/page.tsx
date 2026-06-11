'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Users, Plus, Search, Edit, Trash2, Loader2, AlertCircle, Key, UserCheck, ShieldAlert } from 'lucide-react';
import { getApiBaseUrl, encryptValue } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BaseDialog } from '@/components/shared/BaseDialog';
import { BaseConfirmDialog } from '@/components/shared/BaseConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserRecord {
  id: number;
  employee_id: string | null;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  region_id: number | null;
  branch_id: number | null;
  franchise_id: number | null;
  region_name?: string | null;
  branch_name?: string | null;
  franchise_name?: string | null;
}

interface Region {
  region_id: number;
  name: string;
}

interface Branch {
  branch_id: number;
  name: string;
}

interface Franchise {
  franchise_id: number;
  name: string;
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'REGION_HEAD', label: 'Region Head' },
  { value: 'BRANCH_HEAD', label: 'Branch Head' },
  { value: 'FRANCHISE_HEAD', label: 'Franchise Head' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'QUALITY_INSPECTOR', label: 'Quality Inspector' },
  { value: 'SAFETY_OFFICER', label: 'Safety Officer' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelection, setRoleSelection] = useState('EMPLOYEE');
  const [regionId, setRegionId] = useState<number | ''>('');
  const [branchId, setBranchId] = useState<number | ''>('');
  const [franchiseId, setFranchiseId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Fetch users
      const usersRes = await fetch(`${apiBase}/auth/users`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersJson = await usersRes.json();

      // Fetch regions
      const regionsRes = await fetch(`${apiBase}/regions`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const regionsJson = await regionsRes.json();

      // Fetch branches
      const branchesRes = await fetch(`${apiBase}/branches`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const branchesJson = await branchesRes.json();

      // Fetch franchises
      const franchisesRes = await fetch(`${apiBase}/franchises`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const franchisesJson = await franchisesRes.json();

      if (usersJson.success) {
        setUsers(usersJson.data || []);
      }
      if (regionsJson.success) {
        setRegions(regionsJson.data || []);
      }
      if (branchesJson.success) {
        setBranches(branchesJson.data || []);
      }
      if (franchisesJson.success) {
        setFranchises(franchisesJson.data || []);
      }
    } catch (error) {
      console.error('Error fetching users management data:', error);
      toast.error('Unable to fetch users data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiBase]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const nameMatch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const codeMatch = u.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const roleMatch = u.role.toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || emailMatch || codeMatch || roleMatch;
    });
  }, [users, searchQuery]);

  const openAddModal = () => {
    setName('');
    setEmployeeId('');
    setEmail('');
    setPassword('');
    setRoleSelection('EMPLOYEE');
    setRegionId('');
    setBranchId('');
    setFranchiseId('');
    setIsActive(true);
    setIsAddOpen(true);
  };

  const openEditModal = (user: UserRecord) => {
    setSelectedUser(user);
    setName(user.name);
    setEmployeeId(user.employee_id || '');
    setEmail(user.email);
    setPassword(''); // Leave empty unless resetting
    setRoleSelection(user.role);
    setRegionId(user.region_id || '');
    setBranchId(user.branch_id || '');
    setFranchiseId(user.franchise_id || '');
    setIsActive(user.is_active);
    setIsEditOpen(true);
  };

  const openDeleteModal = (user: UserRecord) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Full name is required');
    if (!email.trim()) return toast.error('Email is required');
    if (!password.trim()) return toast.error('Password is required');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');

    // Validation checks for assignments based on role
    if (roleSelection === 'REGION_HEAD' && !regionId) {
      return toast.error('Please assign a Region for Region Head role');
    }
    if (roleSelection === 'BRANCH_HEAD' && !branchId) {
      return toast.error('Please assign a Branch for Branch Head role');
    }
    if (roleSelection === 'FRANCHISE_HEAD' && !franchiseId) {
      return toast.error('Please assign a Franchise for Franchise Head role');
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          employee_id: employeeId.trim() || undefined,
          email: email.toLowerCase().trim(),
          password: encryptValue(password),
          role: roleSelection,
          region_id: roleSelection === 'REGION_HEAD' ? Number(regionId) : null,
          branch_id: roleSelection === 'BRANCH_HEAD' ? Number(branchId) : null,
          franchise_id: roleSelection === 'FRANCHISE_HEAD' ? Number(franchiseId) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create user account');
      }

      toast.success('User created successfully!');
      setIsAddOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!name.trim()) return toast.error('Full name is required');
    if (!email.trim()) return toast.error('Email is required');

    if (roleSelection === 'REGION_HEAD' && !regionId) {
      return toast.error('Please assign a Region for Region Head role');
    }
    if (roleSelection === 'BRANCH_HEAD' && !branchId) {
      return toast.error('Please assign a Branch for Branch Head role');
    }
    if (roleSelection === 'FRANCHISE_HEAD' && !franchiseId) {
      return toast.error('Please assign a Franchise for Franchise Head role');
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          employee_id: employeeId.trim() || null,
          email: email.toLowerCase().trim(),
          role: roleSelection,
          region_id: roleSelection === 'REGION_HEAD' ? Number(regionId) : null,
          branch_id: roleSelection === 'BRANCH_HEAD' ? Number(branchId) : null,
          franchise_id: roleSelection === 'FRANCHISE_HEAD' ? Number(franchiseId) : null,
          is_active: isActive,
          password: password.trim() ? encryptValue(password) : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update user account');
      }

      toast.success('User updated successfully!');
      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/auth/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete user');
      }

      toast.success('User deleted successfully!');
      setIsDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'REGION_HEAD':
        return 'bg-indigo-500 hover:bg-indigo-600 text-white';
      case 'BRANCH_HEAD':
        return 'bg-sky-500 hover:bg-sky-600 text-white';
      case 'FRANCHISE_HEAD':
        return 'bg-emerald-500 hover:bg-emerald-600 text-white';
      default:
        return 'bg-zinc-500 hover:bg-zinc-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" /> User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register and manage Region Heads, Branch Heads, Franchise Heads, and staff logins.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer h-10 px-4 text-xs font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add User
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-bold">User Accounts List</CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by name, email, role, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/30 border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs">Loading accounts...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-1">
              <AlertCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-650" />
              <span className="text-sm font-semibold">No Users Found</span>
              <span className="text-xs text-zinc-400">Add a new user to populate this list.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
                  <TableRow>
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Employee Code</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Assignment</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10 border-b border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-200">
                      <TableCell className="pl-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        {user.employee_id || <span className="text-zinc-400 italic">None</span>}
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                        {user.name}
                      </TableCell>
                      <TableCell className="py-4 text-xs text-zinc-600 dark:text-zinc-400">
                        {user.email}
                      </TableCell>
                      <TableCell className="py-4 text-xs">
                        <Badge className={`${getRoleBadgeColor(user.role)} text-[10px] px-2 py-0.5 rounded-full font-semibold border-none`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-xs text-zinc-600 dark:text-zinc-400">
                        {user.role === 'REGION_HEAD' && (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">Region: {user.region_name || 'Unassigned'}</span>
                        )}
                        {user.role === 'BRANCH_HEAD' && (
                          <span className="font-semibold text-sky-600 dark:text-sky-400">Branch: {user.branch_name || 'Unassigned'}</span>
                        )}
                        {user.role === 'FRANCHISE_HEAD' && (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Franchise: {user.franchise_name || 'Unassigned'}</span>
                        )}
                        {!['REGION_HEAD', 'BRANCH_HEAD', 'FRANCHISE_HEAD'].includes(user.role) && (
                          <span className="text-zinc-400 italic">Global Access</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-xs">
                        <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => openEditModal(user)}
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-zinc-600 hover:text-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => openDeleteModal(user)}
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/10 border-zinc-200 dark:border-zinc-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <BaseDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add New Enterprise User"
        description="Register a new employee/agency login credential with role-based dashboard assignments."
        className="sm:max-w-xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-user-form"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer h-10 px-4 text-xs font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
            </Button>
          </>
        }
      >
        <form id="add-user-form" onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Full Name *</label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Urvesh Vernekar"
                className="h-10 text-xs rounded-xl"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="employee_id" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Employee Code</label>
              <Input
                id="employee_id"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. 10005524"
                className="h-10 text-xs rounded-xl"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address *</label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@ifbglobal.com"
                className="h-10 text-xs rounded-xl"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="role" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">User Role *</label>
              <Select value={roleSelection} onValueChange={(val) => {
                setRoleSelection(val);
                setRegionId('');
                setBranchId('');
                setFranchiseId('');
              }} disabled={isSubmitting}>
                <SelectTrigger id="role" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="rounded-lg cursor-pointer text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Assignment Inputs */}
          {roleSelection === 'REGION_HEAD' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label htmlFor="region" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Assigned Region *</label>
              <Select value={regionId === '' ? '' : String(regionId)} onValueChange={(val) => setRegionId(val === '' ? '' : Number(val))} disabled={isSubmitting}>
                <SelectTrigger id="region" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  {regions.map((r) => (
                    <SelectItem key={r.region_id} value={String(r.region_id)} className="rounded-lg cursor-pointer text-xs">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {roleSelection === 'BRANCH_HEAD' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label htmlFor="branch" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Assigned Branch *</label>
              <Select value={branchId === '' ? '' : String(branchId)} onValueChange={(val) => setBranchId(val === '' ? '' : Number(val))} disabled={isSubmitting}>
                <SelectTrigger id="branch" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={String(b.branch_id)} className="rounded-lg cursor-pointer text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {roleSelection === 'FRANCHISE_HEAD' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label htmlFor="franchise" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Assigned Franchise *</label>
              <Select value={franchiseId === '' ? '' : String(franchiseId)} onValueChange={(val) => setFranchiseId(val === '' ? '' : Number(val))} disabled={isSubmitting}>
                <SelectTrigger id="franchise" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Franchise" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  {franchises.map((f) => (
                    <SelectItem key={f.franchise_id} value={String(f.franchise_id)} className="rounded-lg cursor-pointer text-xs">{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Login Password *</label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="h-10 text-xs rounded-xl"
              disabled={isSubmitting}
            />
          </div>
        </form>
      </BaseDialog>

      {/* Edit User Modal */}
      <BaseDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Enterprise User"
        description="Update user account profile, role permissions, assignments, or update password."
        className="sm:max-w-xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-user-form"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer h-10 px-4 text-xs font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="name-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Full Name *</label>
              <Input
                id="name-edit"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Urvesh Vernekar"
                className="h-10 text-xs rounded-xl"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="employee_id-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Employee Code</label>
              <Input
                id="employee_id-edit"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. 10005524"
                className="h-10 text-xs rounded-xl"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="email-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address *</label>
              <Input
                id="email-edit"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@ifbglobal.com"
                className="h-10 text-xs rounded-xl"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="role-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">User Role *</label>
              <Select value={roleSelection} onValueChange={(val) => {
                setRoleSelection(val);
                setRegionId('');
                setBranchId('');
                setFranchiseId('');
              }} disabled={isSubmitting}>
                <SelectTrigger id="role-edit" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="rounded-lg cursor-pointer text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Assignment Inputs */}
          {roleSelection === 'REGION_HEAD' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label htmlFor="region-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Assigned Region *</label>
              <Select value={regionId === '' ? '' : String(regionId)} onValueChange={(val) => setRegionId(val === '' ? '' : Number(val))} disabled={isSubmitting}>
                <SelectTrigger id="region-edit" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  {regions.map((r) => (
                    <SelectItem key={r.region_id} value={String(r.region_id)} className="rounded-lg cursor-pointer text-xs">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {roleSelection === 'BRANCH_HEAD' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label htmlFor="branch-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Assigned Branch *</label>
              <Select value={branchId === '' ? '' : String(branchId)} onValueChange={(val) => setBranchId(val === '' ? '' : Number(val))} disabled={isSubmitting}>
                <SelectTrigger id="branch-edit" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={String(b.branch_id)} className="rounded-lg cursor-pointer text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {roleSelection === 'FRANCHISE_HEAD' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label htmlFor="franchise-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Assigned Franchise *</label>
              <Select value={franchiseId === '' ? '' : String(franchiseId)} onValueChange={(val) => setFranchiseId(val === '' ? '' : Number(val))} disabled={isSubmitting}>
                <SelectTrigger id="franchise-edit" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Franchise" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  {franchises.map((f) => (
                    <SelectItem key={f.franchise_id} value={String(f.franchise_id)} className="rounded-lg cursor-pointer text-xs">{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Reset Password (Leave blank to keep current)</label>
            <Input
              id="password-edit"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password to reset"
              className="h-10 text-xs rounded-xl"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="is_active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="is_active" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none">
              Mark account as Active
            </label>
          </div>
        </form>
      </BaseDialog>

      {/* Delete Confirmation Modal */}
      <BaseConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete User Account?"
        description={`This will hard delete the user account for "${selectedUser?.name || ''}" (${selectedUser?.email || ''}). This action is permanent and cannot be undone. Are you sure you want to delete this user?`}
        onConfirm={handleDeleteUser}
        confirmText="Yes, Delete Account"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isSubmitting}
      />
    </div>
  );
}
