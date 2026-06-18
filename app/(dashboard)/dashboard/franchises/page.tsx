'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Store, Plus, Search, Edit, Trash2, Loader2, Filter } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BaseDialog } from '@/components/shared/BaseDialog';
import { BaseConfirmDialog } from '@/components/shared/BaseConfirmDialog';
import { BaseTable, Column } from '@/components/shared/BaseTable';

interface Franchise {
  franchise_id: number;
  branch_id: number;
  name: string;
  code: string | null;
  contact_person: string | null;
  contact_email: string | null;
  address: string | null;
  is_active: boolean;
  branch_name?: string;
  region_name?: string;
}

interface Branch {
  branch_id: number;
  name: string;
  code: string | null;
}

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<number | ''>('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null);
  const [branchId, setBranchId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  // Check user role
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const dataStr = sessionStorage.getItem('logindata');
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        setIsAdmin(data.role === 'ADMIN');
        setRole(data.role || null);
      } catch (e) {
        console.error('Failed to parse user logindata:', e);
      }
    }
  }, []);

  const canManage = useMemo(() => {
    return role === 'ADMIN' || role === 'REGION_HEAD' || role === 'BRANCH_HEAD';
  }, [role]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Fetch franchises (pass branchFilter if selected)
      let franchisesUrl = `${apiBase}/franchises`;
      if (branchFilter) {
        franchisesUrl += `?branch_id=${branchFilter}`;
      }

      const franchisesRes = await fetch(franchisesUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const franchisesJson = await franchisesRes.json();

      // Fetch branches for selection dropdown
      const branchesRes = await fetch(`${apiBase}/branches`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const branchesJson = await branchesRes.json();

      if (franchisesJson.success) {
        setFranchises(franchisesJson.data || []);
      }
      if (branchesJson.success) {
        setBranches(branchesJson.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Unable to fetch franchises data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiBase, branchFilter]);

  const filteredFranchises = useMemo(() => {
    return franchises.filter((f) => {
      const nameMatch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const codeMatch = f.code?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const contactPersonMatch = f.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const contactEmailMatch = f.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const branchMatch = f.branch_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return nameMatch || codeMatch || contactPersonMatch || contactEmailMatch || branchMatch;
    });
  }, [franchises, searchQuery]);

  const columns: Column<Franchise>[] = useMemo(() => {
    const cols: Column<Franchise>[] = [
      {
        header: 'Code',
        className: 'pl-6 font-mono font-bold text-zinc-900 dark:text-zinc-100',
        render: (franchise) => franchise.code,
      },
      {
        header: 'Name',
        className: 'font-semibold text-zinc-800 dark:text-zinc-200',
        render: (franchise) => franchise.name,
      },
      {
        header: 'Linked Branch',
        className: 'text-zinc-650 dark:text-zinc-400',
        render: (franchise) => franchise.branch_name || <span className="text-zinc-400 italic">None</span>,
      },
      {
        header: 'Contact Person',
        className: 'text-zinc-600 dark:text-zinc-400',
        render: (franchise) => franchise.contact_person || <span className="text-zinc-400 italic">None</span>,
      },
      {
        header: 'Contact Email',
        className: 'text-zinc-500 dark:text-zinc-400 font-mono',
        render: (franchise) => franchise.contact_email || <span className="text-zinc-400 italic">None</span>,
      },
      {
        header: 'Status',
        render: (franchise) => (
          <Badge variant={franchise.is_active ? 'default' : 'destructive'} className="text-[10px] px-2 py-0.5 rounded-full font-semibold">
            {franchise.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
    ];

    if (canManage) {
      cols.push({
        header: 'Actions',
        className: 'text-right pr-6',
        render: (franchise) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => openEditModal(franchise)}
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg text-blue-600 hover:text-blue-900 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => openDeleteModal(franchise)}
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/10 border-red-200 dark:border-red-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ),
      });
    }

    return cols;
  }, [canManage]);

  const openAddModal = () => {
    setBranchId(branches.length === 1 ? branches[0].branch_id : '');
    setName('');
    setCode('');
    setContactPerson('');
    setContactEmail('');
    setAddress('');
    setIsActive(true);
    setIsAddOpen(true);
  };

  const openEditModal = (franchise: Franchise) => {
    setSelectedFranchise(franchise);
    setBranchId(franchise.branch_id);
    setName(franchise.name);
    setCode(franchise.code || '');
    setContactPerson(franchise.contact_person || '');
    setContactEmail(franchise.contact_email || '');
    setAddress(franchise.address || '');
    setIsActive(franchise.is_active);
    setIsEditOpen(true);
  };

  const openDeleteModal = (franchise: Franchise) => {
    setSelectedFranchise(franchise);
    setIsDeleteOpen(true);
  };

  const handleAddFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast.error('Please select a Branch');
      return;
    }
    if (!name.trim()) {
      toast.error('Franchise name is required');
      return;
    }
    if (!code.trim()) {
      toast.error('Franchise code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/franchises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branch_id: Number(branchId),
          name: name.trim(),
          code: code.trim(),
          contact_person: contactPerson.trim() || null,
          contact_email: contactEmail.trim() || null,
          address: address.trim() || null,
          is_active: isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to create franchise';
        throw new Error(detailMsg);
      }

      toast.success('Franchise created successfully!');
      setIsAddOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create franchise');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchise) return;
    if (!branchId) {
      toast.error('Please select a Branch');
      return;
    }
    if (!name.trim()) {
      toast.error('Franchise name is required');
      return;
    }
    if (!code.trim()) {
      toast.error('Franchise code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/franchises/${selectedFranchise.franchise_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branch_id: Number(branchId),
          name: name.trim(),
          code: code.trim(),
          contact_person: contactPerson.trim() || null,
          contact_email: contactEmail.trim() || null,
          address: address.trim() || null,
          is_active: isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to update franchise';
        throw new Error(detailMsg);
      }

      toast.success('Franchise updated successfully!');
      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update franchise');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFranchise = async () => {
    if (!selectedFranchise) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/franchises/${selectedFranchise.franchise_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to delete franchise';
        throw new Error(detailMsg);
      }

      toast.success('Franchise deleted successfully!');
      setIsDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete franchise');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Store className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Franchises Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure dealership franchises and local partner mappings.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={openAddModal}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer h-10 px-4 text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Franchise
          </Button>
        )}
      </div>

      {/* Main Datatable Card */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-bold">Franchises List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:max-w-md">
              {/* Filter by Branch select */}
              <div className="relative flex-1 sm:max-w-[200px]">
                <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 z-10 pointer-events-none" />
                <Select value={branchFilter === '' ? 'All Branches' : String(branchFilter)} onValueChange={(val) => setBranchFilter(val === 'All Branches' ? '' : Number(val))}>
                  <SelectTrigger className="w-full h-9 pl-9 text-left justify-between items-center text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500/15">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                    <SelectItem value="All Branches" className="rounded-lg cursor-pointer text-xs">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.branch_id} value={String(b.branch_id)} className="rounded-lg cursor-pointer text-xs">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search text input */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search by code, name, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/30 border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <BaseTable
            columns={columns}
            data={filteredFranchises}
            loading={loading}
            emptyTitle="No Franchises Found"
            emptyDescription="Try modifying your filters/search or add a franchise."
            keyExtractor={(franchise) => franchise.franchise_id}
          />
        </CardContent>
      </Card>

      {/* Add Franchise Modal */}
      <BaseDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add New Franchise"
        description="Establish a dealer franchise assigned to a branch office."
        className="sm:max-w-lg"
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
              form="add-franchise-form"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer h-10 px-4 text-xs font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Franchise'}
            </Button>
          </>
        }
      >
        <form id="add-franchise-form" onSubmit={handleAddFranchise} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="branch" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Linked Branch *</label>
              <Select value={branchId === '' ? '' : String(branchId)} onValueChange={(val) => setBranchId(val === '' ? '' : Number(val))} disabled={isSubmitting || branches.length === 0}>
                <SelectTrigger id="branch" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  <SelectItem value="Select Branch" disabled className="rounded-lg text-xs text-zinc-400">Select Branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={String(b.branch_id)} className="rounded-lg cursor-pointer text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="code" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Franchise Code *</label>
              <Input
                id="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. FR-APEX-01"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Franchise Name *</label>
            <Input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Distribution Agency"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="contact_person" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Contact Person</label>
              <Input
                id="contact_person"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contact_email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Contact Email</label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. rajesh@apex.com"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="address" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Store / Outlet Address</label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter complete showroom/outlet address..."
              className="text-xs rounded-xl min-h-[60px]"
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
              Mark as Active
            </label>
          </div>
        </form>
      </BaseDialog>

      {/* Edit Franchise Modal */}
      <BaseDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Franchise"
        description="Modify franchise business details."
        className="sm:max-w-lg"
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
              form="edit-franchise-form"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer h-10 px-4 text-xs font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form id="edit-franchise-form" onSubmit={handleUpdateFranchise} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="branch-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Linked Branch *</label>
              <Select value={branchId === '' ? '' : String(branchId)} onValueChange={(val) => setBranchId(val === '' ? '' : Number(val))} disabled={isSubmitting || branches.length === 0}>
                <SelectTrigger id="branch-edit" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                  <SelectItem value="Select Branch" disabled className="rounded-lg text-xs text-zinc-400">Select Branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={String(b.branch_id)} className="rounded-lg cursor-pointer text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label htmlFor="code-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Franchise Code *</label>
              <Input
                id="code-edit"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. FR-APEX-01"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Franchise Name *</label>
            <Input
              id="name-edit"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Distribution Agency"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="contact_person_edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Contact Person</label>
              <Input
                id="contact_person_edit"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contact_email_edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Contact Email</label>
              <Input
                id="contact_email_edit"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. rajesh@apex.com"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="address-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Store / Outlet Address</label>
            <Textarea
              id="address-edit"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter complete showroom/outlet address..."
              className="text-xs rounded-xl min-h-[60px]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="is_active_edit"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="is_active_edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none">
              Mark as Active
            </label>
          </div>
        </form>
      </BaseDialog>

      {/* Delete Confirmation Modal */}
      <BaseConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Franchise?"
        description={`This will soft delete the franchise "${selectedFranchise?.name || ''}" (${selectedFranchise?.code || ''}). It will no longer show in active listings, but database history is preserved. Are you sure you want to soft delete this franchise?`}
        onConfirm={handleDeleteFranchise}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isSubmitting}
      />
    </div>
  );
}
