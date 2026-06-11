'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Building2, Plus, Search, Edit, Trash2, Loader2, AlertCircle, X } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Branch {
  branch_id: number;
  region_id: number;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  contact_number: string | null;
  is_active: boolean;
  region_name?: string;
  nation_name?: string;
}

interface Region {
  region_id: number;
  name: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [regionId, setRegionId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  // Check user role
  useEffect(() => {
    const dataStr = sessionStorage.getItem('logindata');
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        setIsAdmin(data.role === 'ADMIN');
      } catch (e) {
        console.error('Failed to parse user logindata:', e);
      }
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Fetch branches
      const branchesRes = await fetch(`${apiBase}/branches`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const branchesJson = await branchesRes.json();

      // Fetch regions for dropdown selection
      const regionsRes = await fetch(`${apiBase}/regions`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const regionsJson = await regionsRes.json();

      if (branchesJson.success) {
        setBranches(branchesJson.data || []);
      }
      if (regionsJson.success) {
        setRegions(regionsJson.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Unable to fetch branches data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiBase]);

  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const nameMatch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
      const codeMatch = b.code?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const regionMatch = b.region_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const cityMatch = b.city?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return nameMatch || codeMatch || regionMatch || cityMatch;
    });
  }, [branches, searchQuery]);

  const openAddModal = () => {
    setRegionId(regions.length > 0 ? regions[0].region_id : '');
    setName('');
    setCode('');
    setAddress('');
    setCity('');
    setState('');
    setContactNumber('');
    setIsActive(true);
    setIsAddOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setRegionId(branch.region_id);
    setName(branch.name);
    setCode(branch.code || '');
    setAddress(branch.address || '');
    setCity(branch.city || '');
    setState(branch.state || '');
    setContactNumber(branch.contact_number || '');
    setIsActive(branch.is_active);
    setIsEditOpen(true);
  };

  const openDeleteModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDeleteOpen(true);
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionId) {
      toast.error('Please select a Region');
      return;
    }
    if (!name.trim()) {
      toast.error('Branch name is required');
      return;
    }
    if (!code.trim()) {
      toast.error('Branch code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          region_id: Number(regionId),
          name: name.trim(),
          code: code.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          contact_number: contactNumber.trim() || null,
          is_active: isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to create branch';
        throw new Error(detailMsg);
      }

      toast.success('Branch created successfully!');
      setIsAddOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    if (!regionId) {
      toast.error('Please select a Region');
      return;
    }
    if (!name.trim()) {
      toast.error('Branch name is required');
      return;
    }
    if (!code.trim()) {
      toast.error('Branch code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/branches/${selectedBranch.branch_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          region_id: Number(regionId),
          name: name.trim(),
          code: code.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          contact_number: contactNumber.trim() || null,
          is_active: isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to update branch';
        throw new Error(detailMsg);
      }

      toast.success('Branch updated successfully!');
      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!selectedBranch) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/branches/${selectedBranch.branch_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to delete branch';
        throw new Error(detailMsg);
      }

      toast.success('Branch deleted successfully!');
      setIsDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete branch');
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
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Branches Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure branches, offices, and distribution points.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={openAddModal}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer h-10 px-4 text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Branch
          </Button>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-bold">Branches List</CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by code, name, city..."
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
              <span className="text-xs">Loading branches...</span>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-1">
              <AlertCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-650" />
              <span className="text-sm font-semibold">No Branches Found</span>
              <span className="text-xs text-zinc-400">Try modifying your search or add a new branch.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
                  <TableRow>
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Code</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Region</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">City / State</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Contact</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</TableHead>
                    {isAdmin && <TableHead className="text-right pr-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => (
                    <TableRow key={branch.branch_id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10 border-b border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-200">
                      <TableCell className="pl-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        {branch.code}
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                        {branch.name}
                      </TableCell>
                      <TableCell className="py-4 text-xs text-zinc-600 dark:text-zinc-400">
                        {branch.region_name || <span className="text-zinc-400 italic">None</span>}
                      </TableCell>
                      <TableCell className="py-4 text-xs text-zinc-600 dark:text-zinc-400">
                        {branch.city || branch.state ? (
                          `${branch.city || ''}${branch.city && branch.state ? ', ' : ''}${branch.state || ''}`
                        ) : (
                          <span className="text-zinc-400 italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {branch.contact_number || <span className="text-zinc-400 italic">None</span>}
                      </TableCell>
                      <TableCell className="py-4 text-xs">
                        <Badge variant={branch.is_active ? 'default' : 'destructive'} className="text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          {branch.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => openEditModal(branch)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-zinc-600 hover:text-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => openDeleteModal(branch)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/10 border-zinc-200 dark:border-zinc-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Branch Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 rounded-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <CardTitle className="text-md font-bold">Add New Branch</CardTitle>
                <CardDescription className="text-xs">Create a branch linked to a geographical region.</CardDescription>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleAddBranch}>
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="region" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Region *</label>
                    <Select value={regionId === '' ? '' : String(regionId)} onValueChange={(val) => setRegionId(val === '' ? '' : Number(val))} disabled={isSubmitting}>
                      <SelectTrigger id="region" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                        <SelectValue placeholder="Select Region" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                        <SelectItem value="Select Region" disabled className="rounded-lg text-xs text-zinc-400">Select Region</SelectItem>
                        {regions.map((r) => (
                          <SelectItem key={r.region_id} value={String(r.region_id)} className="rounded-lg cursor-pointer text-xs">{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="code" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Branch Code *</label>
                    <Input
                      id="code"
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. BR-MUM"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Branch Name *</label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mumbai Main Branch"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="city" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">City</label>
                    <Input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="state" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">State</label>
                    <Input
                      id="state"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Contact Number</label>
                  <Input
                    id="contact"
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. +91 22 12345678"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="address" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Street Address</label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete office address..."
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
              </CardContent>
              <div className="flex justify-end items-center gap-2 p-5 border-t border-zinc-100 dark:border-zinc-800">
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
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer h-10 px-4 text-xs font-semibold"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Branch'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Branch Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 rounded-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <CardTitle className="text-md font-bold">Edit Branch</CardTitle>
                <CardDescription className="text-xs">Modify branch operational details.</CardDescription>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleUpdateBranch}>
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="region-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Region *</label>
                    {/* <select
                      id="region-edit"
                      value={regionId}
                      onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : '')}
                      required
                      className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/55 dark:bg-zinc-950/30 text-zinc-900 dark:text-zinc-50"
                    >
                      <option value="">Select Region</option>
                      {regions.map((r) => (
                        <option key={r.region_id} value={r.region_id}>{r.name}</option>
                      ))}
                    </select> */}

                    <Select value={regionId === '' ? '' : String(regionId)} onValueChange={(val) => setRegionId(val === '' ? '' : Number(val))} disabled={isSubmitting}>
                      <SelectTrigger id="region-edit" className="w-full !h-10 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/35 border-zinc-200 dark:border-zinc-800 text-left justify-between items-center text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500">
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[9999] text-xs">
                        <SelectItem value="none" disabled className="rounded-lg text-xs text-zinc-400">Select Region</SelectItem>
                        {regions.map((r) => (
                          <SelectItem key={r.region_id} value={String(r.region_id)} className="rounded-lg cursor-pointer text-xs">{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="code-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Branch Code *</label>
                    <Input
                      id="code-edit"
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. BR-MUM"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="name-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Branch Name *</label>
                  <Input
                    id="name-edit"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mumbai Main Branch"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="city-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">City</label>
                    <Input
                      id="city-edit"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="state-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">State</label>
                    <Input
                      id="state-edit"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Contact Number</label>
                  <Input
                    id="contact-edit"
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. +91 22 12345678"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="address-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Street Address</label>
                  <Textarea
                    id="address-edit"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete office address..."
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
              </CardContent>
              <div className="flex justify-end items-center gap-2 p-5 border-t border-zinc-100 dark:border-zinc-800">
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
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer h-10 px-4 text-xs font-semibold"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && selectedBranch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 rounded-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-red-500">
                <AlertCircle className="w-4 h-4" /> Delete Branch?
              </CardTitle>
              <CardDescription className="text-xs">
                This will soft delete the branch. It will no longer show in active listings, but database history is preserved.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-xs text-zinc-600 dark:text-zinc-355">
                Are you sure you want to soft delete the branch <strong>{selectedBranch.name}</strong> ({selectedBranch.code})?
              </p>
            </CardContent>
            <div className="flex justify-end items-center gap-2 p-5 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteBranch}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer h-10 px-4 text-xs font-semibold"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
