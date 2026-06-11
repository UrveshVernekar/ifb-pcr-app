'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Map, Plus, Search, Edit, Trash2, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Region {
  region_id: number;
  nation_id: number;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  nation_name?: string;
}

export default function RegionsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  // Fetch user profile and verify if Admin
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

  const fetchRegions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/regions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch regions');
      }

      const json = await res.json();
      if (json.success) {
        setRegions(json.data || []);
      } else {
        toast.error(json.message || 'Failed to load regions');
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
      toast.error('Unable to fetch regions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, [apiBase]);

  const filteredRegions = useMemo(() => {
    return regions.filter((r) => {
      const nameMatch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const codeMatch = r.code?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return nameMatch || codeMatch;
    });
  }, [regions, searchQuery]);

  const openAddModal = () => {
    setName('');
    setCode('');
    setDescription('');
    setIsActive(true);
    setIsAddOpen(true);
  };

  const openEditModal = (region: Region) => {
    setSelectedRegion(region);
    setName(region.name);
    setCode(region.code || '');
    setDescription(region.description || '');
    setIsActive(region.is_active);
    setIsEditOpen(true);
  };

  const openDeleteModal = (region: Region) => {
    setSelectedRegion(region);
    setIsDeleteOpen(true);
  };

  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Region name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/regions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          is_active: isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to create region';
        throw new Error(detailMsg);
      }

      toast.success('Region created successfully!');
      setIsAddOpen(false);
      fetchRegions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create region');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegion) return;
    if (!name.trim()) {
      toast.error('Region name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/regions/${selectedRegion.region_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          is_active: isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to update region';
        throw new Error(detailMsg);
      }

      toast.success('Region updated successfully!');
      setIsEditOpen(false);
      fetchRegions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update region');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRegion = async () => {
    if (!selectedRegion) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/regions/${selectedRegion.region_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detailMsg = json.errors && Array.isArray(json.errors)
          ? `${json.message}: ${json.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
          : json.message || 'Failed to delete region';
        throw new Error(detailMsg);
      }

      toast.success('Region deleted successfully!');
      setIsDeleteOpen(false);
      fetchRegions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete region');
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
            <Map className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Regions Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure regions and distribution zones under nations.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={openAddModal}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer h-10 px-4 text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Region
          </Button>
        )}
      </div>

      {/* Main card view */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-bold">Regions List</CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by name or code..."
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
              <span className="text-xs">Loading regions...</span>
            </div>
          ) : filteredRegions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-1">
              <AlertCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-650" />
              <span className="text-sm font-semibold">No Regions Found</span>
              <span className="text-xs text-zinc-400">Try modifying your search or add a new region.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
                  <TableRow>
                    <TableHead className="w-1/4 pl-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</TableHead>
                    <TableHead className="w-1/6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Code</TableHead>
                    <TableHead className="w-1/3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</TableHead>
                    <TableHead className="w-1/6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</TableHead>
                    {isAdmin && <TableHead className="w-1/6 text-right pr-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegions.map((region) => (
                    <TableRow key={region.region_id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10 border-b border-zinc-100 dark:border-zinc-800/80">
                      <TableCell className="pl-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                        {region.name}
                      </TableCell>
                      <TableCell className="py-4 text-xs font-mono text-zinc-600 dark:text-zinc-450">
                        {region.code || <span className="text-zinc-400 italic">None</span>}
                      </TableCell>
                      <TableCell className="py-4 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                        {region.description || <span className="text-zinc-400 italic">No description</span>}
                      </TableCell>
                      <TableCell className="py-4 text-xs">
                        <Badge variant={region.is_active ? 'default' : 'destructive'} className="text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          {region.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => openEditModal(region)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-zinc-600 hover:text-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => openDeleteModal(region)}
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

      {/* Add Region Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 rounded-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <CardTitle className="text-md font-bold">Add New Region</CardTitle>
                <CardDescription className="text-xs">Define a geographical region under India.</CardDescription>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleAddRegion}>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Region Name *</label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. West Region"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="code" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Region Code</label>
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. WR-01"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Western states of India"
                    className="h-10 text-xs rounded-xl"
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Region'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Region Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 rounded-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <CardTitle className="text-md font-bold">Edit Region</CardTitle>
                <CardDescription className="text-xs">Modify geographical region details.</CardDescription>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleUpdateRegion}>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <label htmlFor="name-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Region Name *</label>
                  <Input
                    id="name-edit"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. West Region"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="code-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Region Code</label>
                  <Input
                    id="code-edit"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. WR-01"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="description-edit" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
                  <Input
                    id="description-edit"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Western states of India"
                    className="h-10 text-xs rounded-xl"
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
      {isDeleteOpen && selectedRegion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 rounded-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-red-500">
                <AlertCircle className="w-4 h-4" /> Delete Region?
              </CardTitle>
              <CardDescription className="text-xs">
                This action is a soft delete. The region will be marked as inactive and soft-deleted, but remains in DB history.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-xs text-zinc-600 dark:text-zinc-350">
                Are you sure you want to soft delete the region <strong>{selectedRegion.name}</strong>?
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
                onClick={handleDeleteRegion}
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
