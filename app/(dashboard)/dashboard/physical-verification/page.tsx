'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Search,
  QrCode,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit3,
  TrendingUp,
  Inbox,
  AlertTriangle,
  Info,
  Check,
  X,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Branch {
  branch_id: number;
  region_id: number;
  name: string;
  code: string | null;
  is_active: boolean;
}

interface Region {
  region_id: number;
  name: string;
  code: string | null;
  is_active: boolean;
}

interface Franchise {
  franchise_id: number;
  branch_id: number;
  name: string;
  code: string | null;
  is_active: boolean;
}

interface PartClaim {
  pcr_data_id: number;
  ticket_id: string;
  part_code: string;
  part_description: string;
  selected_month: number;
  selected_year: number;
  selected_branch_id: number;
  branch_name: string;
  customer_name: string | null;
  warranty_status: string | null;
  expected_qty: number;
  verification_status: 'Pending' | 'Received' | 'Not Received';
  remarks: string | null;
  part_condition: string;
  verified_at: string | null;
  verified_by_name: string | null;
}

interface Summary {
  total: number;
  received: number;
  notReceived: number;
  pending: number;
  damaged: number;
}

interface BranchDamage {
  branchId: number;
  branchName: string;
  totalCount: number;
  damagedCount: number;
  damagePercentage: number;
}

export default function PhysicalVerificationPage() {
  // Authentication & authorization states
  const [role, setRole] = useState<string | null>(null);

  // Lists & data states
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [parts, setParts] = useState<PartClaim[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, received: 0, notReceived: 0, pending: 0, damaged: 0 });
  const [branchOverview, setBranchOverview] = useState<BranchDamage[]>([]);

  // Loaders
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingFranchises, setLoadingFranchises] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null); // tracks inline verification action submission

  // Filters state
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('all');
  const [ticketQuery, setTicketQuery] = useState<string>('');
  const [activeTicketQuery, setActiveTicketQuery] = useState<string>('');
  const [partQuery, setPartQuery] = useState<string>('');
  const [activePartQuery, setActivePartQuery] = useState<string>('');
  const [activeCardFilter, setActiveCardFilter] = useState<'all' | 'Received' | 'Pending' | 'Not Received' | 'Damaged'>('all');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  }>({ page: 1, limit: 10, totalCount: 0, totalPages: 0 });

  // Edit Modal state
  const [editingPart, setEditingPart] = useState<PartClaim | null>(null);
  const [editStatus, setEditStatus] = useState<'Pending' | 'Received' | 'Not Received'>('Pending');
  const [editCondition, setEditCondition] = useState<string>('OK');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'month' | 'year' | 'day' | 'range'>('month');
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
  const [exportDate, setExportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exportStartDate, setExportStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);

  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const branchParam = selectedBranchId === 'all' ? '' : selectedBranchId;
      const regionParam = selectedRegionId === 'all' ? '' : selectedRegionId;

      let queryParams = `type=${exportType}&branchId=${branchParam}&regionId=${regionParam}`;

      if (exportType === 'month') {
        queryParams += `&month=${exportMonth}&year=${exportYear}`;
      } else if (exportType === 'year') {
        queryParams += `&year=${exportYear}`;
      } else if (exportType === 'day') {
        queryParams += `&date=${exportDate}`;
      } else if (exportType === 'range') {
        queryParams += `&startDate=${exportStartDate}&endDate=${exportEndDate}`;
      }

      const res = await fetch(`${apiBase}/pcr-data/export?${queryParams}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Export query returned error status code');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `claims_verification_export_${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Excel spreadsheet downloaded successfully');
      setShowExportModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export data spreadsheet: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Years helper
  const years = useMemo(() => {
    const curYear = new Date().getFullYear();
    const list = [];
    for (let y = curYear - 5; y <= curYear + 2; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // 1. Fetch user role
  useEffect(() => {
    const dataStr = sessionStorage.getItem('logindata');
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        setRole(data.role || null);
      } catch (e) {
        console.error('Failed to parse user logindata:', e);
      }
    }
  }, []);

  // 2. Fetch Regions
  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true);
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${apiBase}/regions`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (json.success) {
          const activeRegions = (json.data || []).filter((r: Region) => r.is_active);
          activeRegions.sort((a: Region, b: Region) => a.name.localeCompare(b.name));
          setRegions(activeRegions);
        }
      } catch (error) {
        console.error('Failed to load regions:', error);
        toast.error('Could not load region options');
      } finally {
        setLoadingRegions(false);
      }
    };
    void fetchRegions();
  }, [apiBase]);

  // 3. Fetch Branches
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${apiBase}/branches`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (json.success) {
          const activeBranches = (json.data || []).filter((b: Branch) => b.is_active);
          activeBranches.sort((a: Branch, b: Branch) => a.name.localeCompare(b.name));
          setBranches(activeBranches);
        }
      } catch (error) {
        console.error('Failed to load branches:', error);
        toast.error('Could not load branch options');
      } finally {
        setLoadingBranches(false);
      }
    };
    void fetchBranches();
  }, [apiBase]);

  // 4. Fetch Franchises based on selected branch
  useEffect(() => {
    const fetchFranchises = async () => {
      if (selectedBranchId === 'all') {
        setFranchises([]);
        setSelectedFranchiseId('all');
        return;
      }
      setLoadingFranchises(true);
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${apiBase}/franchises?branch_id=${selectedBranchId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (json.success) {
          const activeFranchises = (json.data || []).filter((f: Franchise) => f.is_active);
          activeFranchises.sort((a: Franchise, b: Franchise) => a.name.localeCompare(b.name));
          setFranchises(activeFranchises);
          setSelectedFranchiseId('all');
        }
      } catch (error) {
        console.error('Failed to load franchises:', error);
        toast.error('Could not load franchise options');
      } finally {
        setLoadingFranchises(false);
      }
    };
    void fetchFranchises();
  }, [apiBase, selectedBranchId]);

  // Filter branches locally based on selected region
  const filteredBranches = useMemo(() => {
    if (selectedRegionId === 'all') return branches;
    return branches.filter((b) => b.region_id === Number(selectedRegionId));
  }, [branches, selectedRegionId]);

  // 5. Fetch Verification List
  const fetchVerificationList = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('accessToken');
      const branchParam = selectedBranchId === 'all' ? '' : selectedBranchId;
      const regionParam = selectedRegionId === 'all' ? '' : selectedRegionId;
      const franchiseParam = selectedFranchiseId === 'all' ? '' : selectedFranchiseId;

      let statusParam = '';
      let conditionParam = '';
      if (activeCardFilter !== 'all') {
        if (activeCardFilter === 'Damaged') {
          conditionParam = 'Damaged';
        } else {
          statusParam = activeCardFilter;
        }
      }

      const res = await fetch(
        `${apiBase}/pcr-data/physical-verification?month=${month}&year=${year}&branchId=${branchParam}&regionId=${regionParam}&franchiseId=${franchiseParam}&ticketNumber=${encodeURIComponent(
          activeTicketQuery
        )}&partCode=${encodeURIComponent(activePartQuery)}&page=${page}&limit=${limit}&verificationStatus=${statusParam}&partCondition=${conditionParam}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const json = await res.json();
      if (json.success) {
        setParts(json.data.parts || []);
        setSummary(
          json.data.summary || { total: 0, received: 0, notReceived: 0, pending: 0, damaged: 0 }
        );
        setBranchOverview(json.data.branchOverview || []);
        setPagination(
          json.data.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 0 }
        );
      } else {
        toast.error(json.message || 'Failed to fetch verification claims');
      }
    } catch (error) {
      console.error('Failed to fetch verification list:', error);
      toast.error('Could not connect to verification service');
    } finally {
      setLoadingData(false);
    }
  };

  // Reset page to 1 when search, dropdown filters, or card status filters change
  useEffect(() => {
    setPage(1);
  }, [month, year, selectedRegionId, selectedBranchId, selectedFranchiseId, activeTicketQuery, activePartQuery, activeCardFilter]);

  useEffect(() => {
    void fetchVerificationList();
  }, [apiBase, page, limit, month, year, selectedRegionId, selectedBranchId, selectedFranchiseId, activeTicketQuery, activePartQuery, activeCardFilter]);

  // 6. Focus scanner input on load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // 5. Submit search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTicketQuery(ticketQuery);
    setActivePartQuery(partQuery);
  };

  const handleClearSearch = () => {
    setTicketQuery('');
    setPartQuery('');
    setActiveTicketQuery('');
    setActivePartQuery('');
    setActiveCardFilter('all');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // 6. Fast inline verification update
  const handleFastVerify = async (part: PartClaim, status: 'Received' | 'Not Received') => {
    const actionId = `${part.ticket_id}-${part.part_code}`;
    setSubmittingId(actionId);
    try {
      const token = localStorage.getItem('accessToken');
      const condition = status === 'Received' ? 'OK' : '-';
      const res = await fetch(`${apiBase}/pcr-data/physical-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId: part.ticket_id,
          partCode: part.part_code,
          status,
          condition,
          remarks: '',
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Part marked as ${status} successfully.`);
        // Reload page data
        void fetchVerificationList();
      } else {
        toast.error(json.message || 'Failed to submit verification status');
      }
    } catch (error) {
      console.error('Fast verify error:', error);
      toast.error('Could not save verification status');
    } finally {
      setSubmittingId(null);
    }
  };

  // 7. Edit click handler
  const handleEditClick = (part: PartClaim) => {
    setEditingPart(part);
    setEditStatus(part.verification_status);
    setEditCondition(part.part_condition === '-' ? 'OK' : part.part_condition);
    setEditRemarks(part.remarks || '');
  };

  const handleSaveEdit = async () => {
    if (!editingPart) return;
    setSavingEdit(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/pcr-data/physical-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId: editingPart.ticket_id,
          partCode: editingPart.part_code,
          status: editStatus,
          condition: editStatus === 'Received' ? editCondition : '-',
          remarks: editRemarks,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Physical verification claims details updated.');
        setEditingPart(null);
        void fetchVerificationList();
      } else {
        toast.error(json.message || 'Failed to update details');
      }
    } catch (error) {
      console.error('Save edit error:', error);
      toast.error('Failed to submit claims changes');
    } finally {
      setSavingEdit(false);
    }
  };

  // Progress calculations
  const progressPercentage = useMemo(() => {
    if (summary.total === 0) return 0;
    return Math.round((summary.received / summary.total) * 100);
  }, [summary]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50/40 via-transparent to-transparent dark:from-blue-950/10 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/30">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Physical Material Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manually verify physically received claimed parts against expected Claims PCR claim records.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => {
              setExportMonth(month);
              setExportYear(year);
              setShowExportModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer shadow-md flex items-center gap-1.5 border-0"
          >
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <form onSubmit={handleSearchSubmit} className="bg-card p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-md space-y-4">
        {/* Row 1: Target Hierarchy & Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Target Year */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Target Year *
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full h-11 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Target Month */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Target Month *
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full h-11 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Region */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Target Region
            </label>
            {loadingRegions ? (
              <div className="h-11 flex items-center gap-2 px-3 border rounded-xl bg-zinc-50/50 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
              </div>
            ) : (
              <select
                value={selectedRegionId}
                onChange={(e) => {
                  setSelectedRegionId(e.target.value);
                  setSelectedBranchId('all');
                  setSelectedFranchiseId('all');
                  setFranchises([]);
                }}
                className="w-full h-11 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
              >
                <option value="all">All Regions (Total System)</option>
                {regions.map((r) => (
                  <option key={r.region_id} value={r.region_id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Target Branch */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Target Branch
            </label>
            {loadingBranches ? (
              <div className="h-11 flex items-center gap-2 px-3 border rounded-xl bg-zinc-50/50 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
              </div>
            ) : (
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setSelectedFranchiseId('all');
                }}
                className="w-full h-11 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
              >
                <option value="all">
                  {selectedRegionId === 'all' ? 'All Branches (Total System)' : 'All Branches in Region'}
                </option>
                {filteredBranches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Target Franchise */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Target Franchise
            </label>
            {loadingFranchises ? (
              <div className="h-11 flex items-center gap-2 px-3 border rounded-xl bg-zinc-50/50 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
              </div>
            ) : (
              <select
                value={selectedFranchiseId}
                onChange={(e) => setSelectedFranchiseId(e.target.value)}
                disabled={selectedBranchId === 'all'}
                className="w-full h-11 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedBranchId === 'all' ? (
                  <option value="all">Select a branch first</option>
                ) : (
                  <>
                    <option value="all">All Franchises in Branch</option>
                    {franchises.map((f) => (
                      <option key={f.franchise_id} value={f.franchise_id}>
                        {f.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
          </div>
        </div>

        {/* Row 2: Search Query Inputs & Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
          {/* Ticket ID search field */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-zinc-400" /> Ticket ID
            </label>
            <div className="relative">
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Enter Ticket ID..."
                value={ticketQuery}
                onChange={(e) => setTicketQuery(e.target.value)}
                className="h-11 text-xs rounded-xl border bg-zinc-50/50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-blue-500 font-mono tracking-wide"
              />
            </div>
          </div>

          {/* Part Code search field */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-zinc-400" /> Part Code
            </label>
            <Input
              type="text"
              placeholder="Enter Part Code..."
              value={partQuery}
              onChange={(e) => setPartQuery(e.target.value)}
              className="h-11 text-xs rounded-xl border bg-zinc-50/50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-blue-500 font-mono tracking-wide"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end sm:col-span-1 h-11 items-end">
            <Button
              type="submit"
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1.5 font-bold shadow-md shadow-blue-500/10 transition-all flex-1 sm:flex-initial"
            >
              <Search className="w-4 h-4" /> Filter & Search
            </Button>
            {(activeTicketQuery || activePartQuery || ticketQuery || partQuery) && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearSearch}
                className="h-11 px-4 rounded-xl cursor-pointer flex items-center gap-1 font-bold border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Reset
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Claims */}
        <Card
          onClick={() => setActiveCardFilter('all')}
          className={`border cursor-pointer hover:shadow-md transition-all rounded-2xl select-none ${activeCardFilter === 'all'
              ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/5 dark:bg-blue-950/10'
              : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50'
            }`}
        >
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 flex justify-between items-center">
              <span>Total claimed items</span>
              {activeCardFilter === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.total}
            </div>
          </CardContent>
        </Card>

        {/* Received */}
        <Card
          onClick={() => setActiveCardFilter(activeCardFilter === 'Received' ? 'all' : 'Received')}
          className={`border cursor-pointer hover:shadow-md transition-all rounded-2xl select-none ${activeCardFilter === 'Received'
              ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10'
              : 'border-emerald-200/50 dark:border-emerald-950/30 bg-emerald-50/[0.15] dark:bg-emerald-950/[0.05]'
            }`}
        >
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-455 flex justify-between items-center">
              <span>Received physically</span>
              {activeCardFilter === 'Received' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-450">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.received}
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card
          onClick={() => setActiveCardFilter(activeCardFilter === 'Pending' ? 'all' : 'Pending')}
          className={`border cursor-pointer hover:shadow-md transition-all rounded-2xl select-none ${activeCardFilter === 'Pending'
              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/10 dark:bg-amber-955/10'
              : 'border-amber-200/50 dark:border-amber-950/30 bg-amber-50/[0.15] dark:bg-amber-950/[0.05]'
            }`}
        >
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-455 flex justify-between items-center">
              <span>Pending verification</span>
              {activeCardFilter === 'Pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-450">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.pending}
            </div>
          </CardContent>
        </Card>

        {/* Not Received */}
        <Card
          onClick={() => setActiveCardFilter(activeCardFilter === 'Not Received' ? 'all' : 'Not Received')}
          className={`border cursor-pointer hover:shadow-md transition-all rounded-2xl select-none ${activeCardFilter === 'Not Received'
              ? 'ring-2 ring-red-500 border-red-500 bg-red-50/10 dark:bg-red-955/10'
              : 'border-red-200/50 dark:border-red-950/30 bg-red-50/[0.15] dark:bg-red-950/[0.05]'
            }`}
        >
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-red-650 dark:text-red-455 flex justify-between items-center">
              <span>Not received</span>
              {activeCardFilter === 'Not Received' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
            </div>
            <div className="text-2xl font-black text-red-600 dark:text-red-450">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.notReceived}
            </div>
          </CardContent>
        </Card>

        {/* Damaged */}
        <Card
          onClick={() => setActiveCardFilter(activeCardFilter === 'Damaged' ? 'all' : 'Damaged')}
          className={`border cursor-pointer hover:shadow-md transition-all rounded-2xl select-none col-span-2 md:col-span-1 ${activeCardFilter === 'Damaged'
              ? 'ring-2 ring-yellow-500 border-yellow-500 bg-yellow-50/10 dark:bg-yellow-955/10'
              : 'border-yellow-250/50 dark:border-yellow-900/30 bg-yellow-50/[0.15] dark:bg-yellow-950/[0.05]'
            }`}
        >
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-yellow-600 dark:text-yellow-450 flex justify-between items-center">
              <span>Damaged Claims</span>
              {activeCardFilter === 'Damaged' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
            </div>
            <div className="text-2xl font-black text-yellow-600 dark:text-yellow-455">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.damaged}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress tracker */}
      <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
        <div className="flex justify-between items-center text-xs font-bold text-zinc-500 mb-2">
          <span className="flex items-center gap-1">VERIFICATION PROGRESS</span>
          <span>{progressPercentage}% COMPLETED ({summary.received} / {summary.total} verified)</span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Grid: Main Table & Branch Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Verification list table */}
        <div className="lg:col-span-3">
          <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white dark:bg-zinc-900/80 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>PCR claimed claims pending verification</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Showing {parts.length} entries
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingData ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  <p className="text-xs text-muted-foreground font-semibold">Retrieving claim logs...</p>
                </div>
              ) : parts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4 space-y-4">
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 rounded-full">
                    <Inbox className="w-12 h-12" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No expected parts claimed</h3>
                    <p className="text-xs text-muted-foreground leading-normal">
                      No matching records found for the selected period/branch/search query. Ensure PCR Excel claim file has been uploaded for the target month.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-950 font-semibold border-b border-zinc-200 dark:border-zinc-850">
                      <TableRow>
                        <TableHead className="w-[50px] text-center font-bold">S.No</TableHead>
                        <TableHead className="font-bold">Ticket ID</TableHead>
                        <TableHead className="font-bold">Part Code</TableHead>
                        <TableHead className="font-bold">Part Description</TableHead>
                        <TableHead className="font-bold">Branch</TableHead>
                        <TableHead className="font-bold">Warranty Details</TableHead>
                        <TableHead className="text-center font-bold">Expected Qty</TableHead>
                        <TableHead className="text-center font-bold">Status</TableHead>
                        <TableHead className="text-center font-bold">Condition</TableHead>
                        <TableHead className="text-center font-bold">Action</TableHead>
                        <TableHead className="w-[60px] text-center font-bold">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parts.map((part, idx) => {
                        const actionId = `${part.ticket_id}-${part.part_code}`;
                        const isSubmitting = submittingId === actionId;

                        return (
                          <TableRow key={part.pcr_data_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 border-b border-zinc-150 dark:border-zinc-850">
                            <TableCell className="text-center font-medium text-zinc-400">
                              {(page - 1) * limit + idx + 1}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                              {part.ticket_id}
                            </TableCell>
                            <TableCell className="font-mono text-zinc-600 dark:text-zinc-450">{part.part_code}</TableCell>
                            <TableCell className="max-w-[150px] truncate" title={part.part_description}>
                              {part.part_description}
                            </TableCell>
                            <TableCell className="text-zinc-600 dark:text-zinc-400 font-semibold">{part.branch_name}</TableCell>
                            <TableCell>
                              {part.warranty_status === 'IN WARRANTY' ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                  In Warranty
                                </Badge>
                              ) : part.warranty_status === 'OG' ? (
                                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                  OG
                                </Badge>
                              ) : (
                                <span className="text-zinc-400 italic text-[10px]">Unknown</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold text-zinc-800 dark:text-zinc-200">
                              {part.expected_qty}
                            </TableCell>
                            <TableCell className="text-center">
                              {part.verification_status === 'Received' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-450 font-bold">
                                  <CheckCircle className="w-3.5 h-3.5" /> Received
                                </span>
                              ) : part.verification_status === 'Not Received' ? (
                                <span className="inline-flex items-center gap-1 text-red-650 dark:text-red-400 font-bold">
                                  <XCircle className="w-3.5 h-3.5" /> Not Received
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-zinc-400 font-bold">
                                  <AlertCircle className="w-3.5 h-3.5 text-zinc-300" /> Pending
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {part.part_condition === 'Damaged' ? (
                                <span className="text-yellow-600 dark:text-yellow-450 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded font-black text-[9px]">
                                  Damaged
                                </span>
                              ) : part.part_condition === 'OK' ? (
                                <span className="text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-black text-[9px]">
                                  OK
                                </span>
                              ) : (
                                <span className="text-zinc-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleFastVerify(part, 'Received')}
                                  disabled={isSubmitting || part.verification_status === 'Received'}
                                  className={`h-7 px-2.5 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-0.5 transition-all ${part.verification_status === 'Received'
                                    ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50'
                                    }`}
                                >
                                  {isSubmitting && part.verification_status !== 'Received' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  Received
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleFastVerify(part, 'Not Received')}
                                  disabled={isSubmitting || part.verification_status === 'Not Received'}
                                  className={`h-7 px-2.5 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-0.5 transition-all ${part.verification_status === 'Not Received'
                                    ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/50'
                                    }`}
                                >
                                  {isSubmitting && part.verification_status !== 'Not Received' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <X className="w-3.5 h-3.5" />
                                  )}
                                  Not Received
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditClick(part)}
                                className="h-7 w-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {parts.length > 0 && (
                <div className="p-4 border-t border-zinc-150 dark:border-zinc-850 flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-50/50 dark:bg-zinc-950/20 text-xs text-muted-foreground font-medium">
                  <div>
                    Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.totalCount)} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} entries
                  </div>

                  {/* Page controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page <= 1}
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      className="h-8 w-8 rounded-lg cursor-pointer text-zinc-650 dark:text-zinc-400 flex items-center justify-center border-zinc-200"
                    >
                      <span className="text-sm">‹</span>
                    </Button>

                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                      if (p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1) {
                        return (
                          <Button
                            key={p}
                            variant={page === p ? 'default' : 'outline'}
                            onClick={() => setPage(p)}
                            className={`h-8 w-8 rounded-lg text-xs cursor-pointer font-bold transition-all flex items-center justify-center ${page === p
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow'
                              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 border-zinc-200'
                              }`}
                          >
                            {p}
                          </Button>
                        );
                      }
                      if (p === 2 || p === pagination.totalPages - 1) {
                        return <span key={p} className="px-1 text-zinc-400">...</span>;
                      }
                      return null;
                    })}

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                      className="h-8 w-8 rounded-lg cursor-pointer text-zinc-650 dark:text-zinc-400 flex items-center justify-center border-zinc-200"
                    >
                      <span className="text-sm">›</span>
                    </Button>
                  </div>

                  {/* Limit dropdown */}
                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-8 px-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    >
                      {[5, 10, 20, 50, 100].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Branch overview sidebar card */}
        <div className="lg:col-span-1">
          <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white dark:bg-zinc-900/80 rounded-2xl overflow-hidden h-full flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Branch claims overview
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Damaged ratio summary across branches for the period.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingData ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                ) : branchOverview.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No branch claim records.
                  </div>
                ) : (
                  <Table className="text-[11px]">
                    <TableHeader className="bg-zinc-50/40 dark:bg-zinc-950/40 font-semibold border-b border-zinc-200 dark:border-zinc-850">
                      <TableRow>
                        <TableHead className="font-bold py-2">Branch</TableHead>
                        <TableHead className="text-center font-bold py-2">Damaged</TableHead>
                        <TableHead className="text-right font-bold py-2">Damage %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchOverview.map((item) => (
                        <TableRow key={item.branchId} className="hover:bg-zinc-50/30 border-b border-zinc-150 dark:border-zinc-850">
                          <TableCell className="font-bold py-2.5">{item.branchName}</TableCell>
                          <TableCell className="text-center font-mono py-2.5 text-yellow-600 dark:text-yellow-450 font-bold">
                            {item.damagedCount}
                          </TableCell>
                          <TableCell className="text-right font-mono py-2.5 text-zinc-600 dark:text-zinc-400 font-bold">
                            {item.damagePercentage}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </div>

            {/* Guidelines box */}
            <div className="p-4 m-4 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-xl space-y-2 border-0">
              <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wide">
                <Info className="w-3.5 h-3.5 text-blue-600" /> Operator Note
              </div>
              <p className="text-[10px] leading-relaxed text-blue-600/90 dark:text-blue-400/80">
                Ensure PCR Claim records match physical parts. Mark part condition as "Damaged" inside claims edit modal if any scratches, body breaks, or component damage is detected.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Claims / Condition Dialog */}
      {editingPart && (
        <Dialog open={!!editingPart} onOpenChange={(open) => !open && setEditingPart(null)}>
          <DialogContent className="max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl overflow-hidden p-0">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/25">
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" /> Capture Part Condition
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono mt-1">
                Ticket: {editingPart.ticket_id} • Part: {editingPart.part_code}
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Verification Status *</label>
                <div className="grid grid-cols-3 gap-2 bg-zinc-100/70 dark:bg-zinc-900 p-1 rounded-xl shadow-inner border border-zinc-200/30">
                  {(['Pending', 'Received', 'Not Received'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditStatus(s)}
                      className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${editStatus === s
                        ? 'bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 shadow-md border border-zinc-200/50 dark:border-zinc-800'
                        : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Selector (only if Received) */}
              {editStatus === 'Received' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Damage Type / Condition *</label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                  >
                    <option value="OK">OK (Good condition / functional)</option>
                    <option value="Damaged">Damaged (Broken body, defective, or scratched)</option>
                  </select>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Remarks / Condition Details</label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Enter remarks (e.g. broken casing, missing mounting kit, etc.)..."
                  rows={3}
                  className="w-full p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <DialogFooter className="p-6 pt-4 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/25 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setEditingPart(null)}
                disabled={savingEdit}
                className="h-10 px-5 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="h-10 px-6 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer shadow-md"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Save Photo & Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Export Options Dialog */}
      {showExportModal && (
        <Dialog open={showExportModal} onOpenChange={(open) => !open && setShowExportModal(false)}>
          <DialogContent className="max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl overflow-hidden p-0">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/25">
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Export Verification Data
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Configure your export criteria and download an Excel spreadsheet format.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Export Type Tabs */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-300">Export Scope / Filter Type</label>
                <div className="grid grid-cols-4 gap-1.5 bg-zinc-100/70 dark:bg-zinc-900 p-1 rounded-xl shadow-inner border border-zinc-200/20">
                  {([
                    { value: 'month', label: 'Month' },
                    { value: 'year', label: 'Year' },
                    { value: 'day', label: 'Day' },
                    { value: 'range', label: 'Range' }
                  ] as const).map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setExportType(t.value)}
                      className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        exportType === t.value
                          ? 'bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200/30 dark:border-zinc-855'
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month Selection option */}
              {exportType === 'month' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase">Month</label>
                    <select
                      value={exportMonth}
                      onChange={(e) => setExportMonth(Number(e.target.value))}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-semibold"
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase">Year</label>
                    <select
                      value={exportYear}
                      onChange={(e) => setExportYear(Number(e.target.value))}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-semibold"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Year Selection option */}
              {exportType === 'year' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase">Select Year</label>
                  <select
                    value={exportYear}
                    onChange={(e) => setExportYear(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-semibold"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Day Selection option */}
              {exportType === 'day' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase">Select Verification Date</label>
                  <input
                    type="date"
                    value={exportDate}
                    onChange={(e) => setExportDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-semibold"
                  />
                </div>
              )}

              {/* Date Range Selection option */}
              {exportType === 'range' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase">Start Date</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase">End Date</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Inherited scopes info note */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-xl border border-dashed border-zinc-200/60 dark:border-zinc-800 text-[10px] leading-normal flex items-start gap-2 select-none">
                <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-zinc-800 dark:text-zinc-200">Export Scope:</span> Applying geographic filters matching current page dropdown selectors (
                  {selectedBranchId !== 'all' ? (
                    <strong>Branch: {branches.find(b => String(b.branch_id) === selectedBranchId)?.name}</strong>
                  ) : selectedRegionId !== 'all' ? (
                    <strong>Region: {regions.find(r => String(r.region_id) === selectedRegionId)?.name}</strong>
                  ) : (
                    <strong>National System View</strong>
                  )}
                  ).
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/25 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                className="h-10 px-5 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="h-10 px-6 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white cursor-pointer shadow-md"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Download Spreadsheet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
