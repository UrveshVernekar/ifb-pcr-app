'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  Database,
  FileSpreadsheet,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/auth-client';

interface BranchUpload {
  branchId: number;
  branchName: string;
  uploaded: boolean;
  recordCount: number;
  uploadedAt: string | null;
}

interface MonthlyUploadStatus {
  month: number;
  year: number;
  crm: {
    uploaded: boolean;
    recordCount: number;
    uploadedAt: string | null;
  };
  pcr: {
    uploaded: boolean;
    uploadedBranchesCount: number;
    totalBranches: number;
    recordCount: number;
    uploadedAt: string | null;
    branchesDetail: BranchUpload[];
  };
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DashboardPage() {
  const [data, setData] = useState<MonthlyUploadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const fetchUploadStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/pcr-data/upload-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
      } else {
        toast.error(json.message || 'Failed to fetch upload status log');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUploadStatus();
  }, [apiBase]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Group data by year
  const groupedData = useMemo(() => {
    const groups: { [key: number]: MonthlyUploadStatus[] } = {};
    data.forEach((item) => {
      if (!groups[item.year]) {
        groups[item.year] = [];
      }
      groups[item.year].push(item);
    });
    // Sort years descending
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a)
      .map((year) => ({
        year,
        months: groups[year].sort((a, b) => b.month - a.month) // newest month first
      }));
  }, [data]);

  // Overall counts for stat cards
  const statsSummary = useMemo(() => {
    if (data.length === 0) return { totalMonths: 0, crmCompletionRate: 0, pcrCompletionRate: 0 };
    
    let crmUploaded = 0;
    let totalPcrBranches = 0;
    let uploadedPcrBranches = 0;

    data.forEach((m) => {
      if (m.crm.uploaded) crmUploaded++;
      totalPcrBranches += m.pcr.totalBranches;
      uploadedPcrBranches += m.pcr.uploadedBranchesCount;
    });

    const crmRate = Math.round((crmUploaded / data.length) * 100);
    const pcrRate = totalPcrBranches > 0 ? Math.round((uploadedPcrBranches / totalPcrBranches) * 100) : 0;

    return {
      totalMonths: data.length,
      crmCompletionRate: crmRate,
      pcrCompletionRate: pcrRate
    };
  }, [data]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50/40 via-transparent to-transparent dark:from-blue-950/10 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/30">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Database Upload Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of monthly CRM (store closure) logs and branch PCR claims file upload completion status.
          </p>
        </div>
        <Button
          onClick={fetchUploadStatus}
          variant="outline"
          size="sm"
          className="h-10 px-4 rounded-xl font-semibold cursor-pointer border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </Button>
      </div>

      {/* Summary Cards */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm bg-white dark:bg-zinc-900/50 rounded-2xl">
            <CardContent className="p-5 flex flex-col justify-between h-24">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Months Tracked</div>
              <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 flex items-baseline gap-1">
                {statsSummary.totalMonths} <span className="text-xs text-muted-foreground font-medium">periods with active data</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm bg-white dark:bg-zinc-900/50 rounded-2xl">
            <CardContent className="p-5 flex flex-col justify-between h-24">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">CRM Upload Status</div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{statsSummary.crmCompletionRate}%</div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${statsSummary.crmCompletionRate}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm bg-white dark:bg-zinc-900/50 rounded-2xl">
            <CardContent className="p-5 flex flex-col justify-between h-24">
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">PCR Branch Completion</div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{statsSummary.pcrCompletionRate}%</div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${statsSummary.pcrCompletionRate}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading view */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-xs text-muted-foreground font-semibold">Retrieving database logs...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && data.length === 0 && (
        <Card className="border border-dashed border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 rounded-full inline-block">
            <Calendar className="w-12 h-12" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">No database upload logs found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              It seems there are no CRM data entries or branch PCR sheets uploaded to the database yet. Please go to the upload page to submit your spreadsheets.
            </p>
          </div>
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-xs font-bold shadow-md cursor-pointer"
          >
            <a href="/dashboard/crm-upload">Go to Upload Module</a>
          </Button>
        </Card>
      )}

      {/* Year-by-Year Structured View */}
      {!loading && data.length > 0 && (
        <div className="space-y-8">
          {groupedData.map((yearGroup) => (
            <div key={yearGroup.year} className="space-y-4">
              {/* Year Banner */}
              <div className="flex items-center gap-3">
                <span className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">{yearGroup.year} Uploads Log</span>
                <div className="flex-1 h-px bg-zinc-200/60 dark:bg-zinc-800/40" />
              </div>

              {/* Monthly logs Accordion grid */}
              <div className="space-y-3">
                {yearGroup.months.map((item) => {
                  const key = `${item.year}-${item.month}`;
                  const isExpanded = expandedMonths.includes(key);
                  
                  const pcrPercent = item.pcr.totalBranches > 0 
                    ? Math.round((item.pcr.uploadedBranchesCount / item.pcr.totalBranches) * 100) 
                    : 0;

                  return (
                    <div
                      key={key}
                      className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 rounded-2xl overflow-hidden shadow-sm transition-all"
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleMonth(key)}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/35 transition-all select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-zinc-900 dark:text-zinc-50 text-sm">
                              {MONTH_NAMES[item.month]} {item.year}
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold">Upload status block</p>
                          </div>
                        </div>

                        {/* CRM Summary status */}
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-6">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CRM Uploaded</div>
                            <div className="flex items-center gap-1.5">
                              {item.crm.uploaded ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-450 font-bold text-xs">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item.crm.recordCount.toLocaleString()} rows
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-450 font-bold text-xs">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Missing
                                </span>
                              )}
                            </div>
                          </div>

                          {/* PCR Summary progress */}
                          <div className="space-y-1 min-w-[120px] md:min-w-[150px]">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">
                              <span>PCR Branches</span>
                              <span>{item.pcr.uploadedBranchesCount} / {item.pcr.totalBranches}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex shadow-inner">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    pcrPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${pcrPercent}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-zinc-500 shrink-0">{pcrPercent}%</span>
                            </div>
                          </div>

                          {/* Expand details button */}
                          <div className="text-zinc-400 dark:text-zinc-500 md:ml-2">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Content Details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/20 dark:bg-zinc-950/15 animate-in fade-in duration-300">
                          <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* CRM summary details */}
                            <div className="space-y-3 lg:col-span-1 border-r border-zinc-200/50 dark:border-zinc-800/40 pr-6 last:border-r-0">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">CRM Excel Metadata</h4>
                              <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 space-y-2">
                                <div className="flex justify-between text-xs font-semibold text-zinc-500">
                                  <span>Status:</span>
                                  <Badge className={item.crm.uploaded ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'}>
                                    {item.crm.uploaded ? 'Active' : 'Missing'}
                                  </Badge>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-zinc-500">
                                  <span>Total Records:</span>
                                  <span className="text-zinc-900 dark:text-zinc-100 font-bold">{item.crm.recordCount.toLocaleString()} rows</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-zinc-500">
                                  <span>Last Uploaded:</span>
                                  <span className="text-zinc-900 dark:text-zinc-100 font-mono font-bold text-[10px]">{formatDate(item.crm.uploadedAt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* PCR Branches detailed log list */}
                            <div className="space-y-3 lg:col-span-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" /> Branch-wise PCR claims logs
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                                {item.pcr.branchesDetail.map((b) => (
                                  <div
                                    key={b.branchId}
                                    className="p-3.5 rounded-xl border bg-white dark:bg-zinc-900/60 border-zinc-200/50 dark:border-zinc-800/40 shadow-sm flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="font-extrabold text-zinc-900 dark:text-zinc-50">{b.branchName}</div>
                                      {b.uploaded && (
                                        <div className="text-[9px] text-muted-foreground flex items-center gap-1 font-mono">
                                          <Clock className="w-3 h-3 text-zinc-400" /> {formatDate(b.uploadedAt)}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {b.uploaded ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                          {b.recordCount.toLocaleString()} claims
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] border-zinc-200 text-zinc-400 font-bold dark:border-zinc-800">
                                          Pending
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}