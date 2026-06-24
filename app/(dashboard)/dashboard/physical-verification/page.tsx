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
  X
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [parts, setParts] = useState<PartClaim[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, received: 0, notReceived: 0, pending: 0, damaged: 0 });
  const [branchOverview, setBranchOverview] = useState<BranchDamage[]>([]);

  // Loaders
  const [loadingData, setLoadingData] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null); // tracks inline verification action submission

  // Filters state
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

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

  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // 2. Fetch Branches
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

  // 3. Fetch Verification List
  const fetchVerificationList = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('accessToken');
      const branchParam = selectedBranchId === 'all' ? '' : selectedBranchId;
      const res = await fetch(
        `${apiBase}/pcr-data/physical-verification?month=${month}&year=${year}&branchId=${branchParam}&search=${encodeURIComponent(
          activeSearch
        )}&page=${page}&limit=${limit}`,
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

  // Reset page to 1 when search or dropdown filters change
  useEffect(() => {
    setPage(1);
  }, [month, year, selectedBranchId, activeSearch]);

  useEffect(() => {
    void fetchVerificationList();
  }, [month, year, selectedBranchId, activeSearch, page, limit]);

  // 4. Focus scanner input on load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // 5. Submit search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
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
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          SCANNER ACTIVE
        </div>
      </div>

      {/* Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-card p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-md">
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

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Target Branch *
          </label>
          {loadingBranches ? (
            <div className="h-11 flex items-center gap-2 px-3 border rounded-xl bg-zinc-50/50 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
            </div>
          ) : (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full h-11 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
            >
              <option value="all">All Branches (Total System)</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Scan Barcode / Search form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <QrCode className="absolute left-3.5 top-3 w-5 h-5 text-zinc-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Scan QR or Enter Ticket ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 text-xs rounded-xl border bg-zinc-50/50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-blue-500 font-mono tracking-wide"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </Button>
          {(activeSearch || searchQuery) && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleClearSearch}
              className="h-11 w-11 shrink-0 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </form>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Claims */}
        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm bg-white dark:bg-zinc-900/50 rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Total claimed claim items</div>
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.total}
            </div>
          </CardContent>
        </Card>

        {/* Received */}
        <Card className="border border-emerald-200/50 dark:border-emerald-950/30 shadow-sm bg-emerald-50/[0.15] dark:bg-emerald-950/[0.05] rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">Received physically</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.received}
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border border-amber-200/50 dark:border-amber-950/30 shadow-sm bg-amber-50/[0.15] dark:bg-amber-950/[0.05] rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">Pending verification</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.pending}
            </div>
          </CardContent>
        </Card>

        {/* Not Received */}
        <Card className="border border-red-200/50 dark:border-red-950/30 shadow-sm bg-red-50/[0.15] dark:bg-red-950/[0.05] rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-red-600 dark:text-red-400">Not received</div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : summary.notReceived}
            </div>
          </CardContent>
        </Card>

        {/* Damaged */}
        <Card className="border border-yellow-250/50 dark:border-yellow-900/30 shadow-sm bg-yellow-50/[0.15] dark:bg-yellow-950/[0.05] rounded-2xl col-span-2 md:col-span-1">
          <CardContent className="p-5 flex flex-col justify-between h-24">
            <div className="text-[10px] uppercase font-bold tracking-wider text-yellow-600 dark:text-yellow-450">Damaged Claims</div>
            <div className="text-2xl font-black text-yellow-600 dark:text-yellow-450">
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
                        <TableHead className="font-bold">Part Name</TableHead>
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
                            <TableCell className="text-center font-medium text-zinc-400">{idx + 1}</TableCell>
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
    </div>
  );
}
