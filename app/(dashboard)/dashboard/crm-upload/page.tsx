'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, UploadCloud, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, ShieldAlert, Building2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface Branch {
  branch_id: number;
  region_id: number;
  name: string;
  code: string | null;
  is_active: boolean;
}

interface FilePreview {
  fileName: string;
  fileSize: number;
  fileType: string;
  lastModified: string;
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rows: any[];
  totalRows: number;
}

export default function CRMUploadPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'crm' | 'pcr'>('crm');

  // Branch list for PCR Upload
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Common selectors
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // File states
  const [crmFile, setCrmFile] = useState<File | null>(null);
  const [pcrFile, setPcrFile] = useState<File | null>(null);

  // Preview states
  const [crmPreview, setCrmPreview] = useState<FilePreview | null>(null);
  const [pcrPreview, setPcrPreview] = useState<FilePreview | null>(null);
  const [parsingFile, setParsingFile] = useState(false);

  // Upload/Progress states
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Results states
  const [crmResult, setCrmResult] = useState<{ count: number; month: number; year: number } | null>(null);
  const [pcrResult, setPcrResult] = useState<{ count: number; branchName: string; month: number; year: number } | null>(null);

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  // Fetch and verify role & load branches on mount
  useEffect(() => {
    const dataStr = sessionStorage.getItem('logindata');
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        setIsAdmin(data.role === 'ADMIN');
      } catch (e) {
        console.error('Failed to parse user logindata:', e);
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, []);

  // Fetch branches when PCR tab is selected
  useEffect(() => {
    if (activeTab === 'pcr' && branches.length === 0) {
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
            // Sort branches alphabetically
            const activeBranches = (json.data || []).filter((b: Branch) => b.is_active);
            activeBranches.sort((a: Branch, b: Branch) => a.name.localeCompare(b.name));
            setBranches(activeBranches);
            if (activeBranches.length > 0) {
              setSelectedBranchId(String(activeBranches[0].branch_id));
            }
          }
        } catch (error) {
          console.error('Failed to fetch branches:', error);
          toast.error('Could not load branch dropdown list');
        } finally {
          setLoadingBranches(false);
        }
      };
      void fetchBranches();
    }
  }, [activeTab, apiBase, branches.length]);

  // Year list generators
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = currentYear - 5; y <= currentYear + 2; y++) {
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

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const parseExcelPreview = (file: File, callback: (preview: FilePreview) => void) => {
    setParsingFile(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('File data is empty');
        
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });
        
        if (rawRows.length === 0) {
          toast.error('Excel file sheet seems empty');
          setParsingFile(false);
          return;
        }

        const headers = (rawRows[0] || []).map((h: any) => String(h).trim());
        const dataRows = rawRows.slice(1).filter((r: any[]) => r.some((cell) => cell !== ''));
        
        // Format preview rows as key-value objects
        const previewRows = dataRows.slice(0, 5).map((row: any[]) => {
          const obj: { [key: string]: any } = {};
          headers.forEach((h: string, idx: number) => {
            obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });
          return obj;
        });

        callback({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/vnd.ms-excel',
          lastModified: new Date(file.lastModified).toLocaleString('en-IN'),
          sheetNames: workbook.SheetNames,
          selectedSheet: sheetName,
          headers,
          rows: previewRows,
          totalRows: dataRows.length
        });
      } catch (err: any) {
        console.error(err);
        toast.error(`Failed to parse spreadsheet preview: ${err.message}`);
      } finally {
        setParsingFile(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateAndSetFile = (selectedFile: File) => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      toast.error('Only Excel files (.xlsx, .xls) are supported.');
      return;
    }
    if (activeTab === 'crm') {
      setCrmFile(selectedFile);
      setCrmResult(null);
      parseExcelPreview(selectedFile, setCrmPreview);
    } else {
      setPcrFile(selectedFile);
      setPcrResult(null);
      parseExcelPreview(selectedFile, setPcrPreview);
    }
  };

  // Submit handlers
  const handleCrmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmFile) {
      toast.error('Please select a CRM Excel file to upload.');
      return;
    }

    setIsUploading(true);
    setCrmResult(null);

    const formData = new FormData();
    formData.append('file', crmFile);
    formData.append('month', String(month));
    formData.append('year', String(year));

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/crm-data/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to upload CRM file.');
      }

      toast.success('CRM File uploaded and processed successfully.');
      setCrmResult({
        count: json.data.count,
        month: json.data.month,
        year: json.data.year,
      });
      setCrmFile(null);
    } catch (error: any) {
      console.error('CRM Upload error:', error);
      toast.error(error.message || 'Error occurred while uploading CRM file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePcrUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pcrFile) {
      toast.error('Please select a PCR Excel file to upload.');
      return;
    }
    if (!selectedBranchId) {
      toast.error('Please select a branch.');
      return;
    }

    setIsUploading(true);
    setPcrResult(null);

    const formData = new FormData();
    formData.append('file', pcrFile);
    formData.append('branchId', selectedBranchId);
    formData.append('month', String(month));
    formData.append('year', String(year));

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/pcr-data/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to upload PCR file.');
      }

      const branchName = branches.find(b => String(b.branch_id) === selectedBranchId)?.name || 'Selected Branch';

      toast.success(`PCR File uploaded successfully for ${branchName}.`);
      setPcrResult({
        count: json.data.count,
        branchName,
        month: json.data.month,
        year: json.data.year,
      });
      setPcrFile(null);
    } catch (error: any) {
      console.error('PCR Upload error:', error);
      toast.error(error.message || 'Error occurred while uploading PCR file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Render access check loaders
  if (isAdmin === null) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center max-w-lg mx-auto text-center space-y-4 px-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full">
          <ShieldAlert className="w-16 h-16" />
        </div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">Access Denied</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Only System Administrators are authorized to access the CRM & PCR upload modules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <UploadCloud className="w-8 h-8 text-blue-600 dark:text-blue-400" /> CRM / PCR Data Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import monthly store closure logs (CRM) or branch pcr claim records (PCR) to database.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-inner">
          <button
            onClick={() => {
              setActiveTab('crm');
              setDragActive(false);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'crm'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-md'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            CRM Data Upload
          </button>
          <button
            onClick={() => {
              setActiveTab('pcr');
              setDragActive(false);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'pcr'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-md'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            PCR Data Upload
          </button>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Dropdowns panel */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Upload Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Branch Selector (Visible only in PCR Tab) */}
              {activeTab === 'pcr' && (
                <div className="space-y-1.5">
                  <label htmlFor="branch" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Target Branch *
                  </label>
                  {loadingBranches ? (
                    <div className="h-10 flex items-center gap-2 px-3 border rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading branch list...
                    </div>
                  ) : (
                    <select
                      id="branch"
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      disabled={isUploading}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    >
                      {branches.length === 0 ? (
                        <option value="">No active branches found</option>
                      ) : (
                        branches.map((b) => (
                          <option key={b.branch_id} value={b.branch_id}>
                            {b.name}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="month" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Select Month *
                </label>
                <select
                  id="month"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  disabled={isUploading}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="year" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Select Year *
                </label>
                <select
                  id="year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  disabled={isUploading}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Guidelines Box */}
          <Card className="border-0 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-2xl">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Important Guidelines
              </div>
              <ul className="text-[11px] leading-relaxed space-y-1.5 list-disc pl-4">
                {activeTab === 'crm' ? (
                  <>
                    <li>Make sure the sheet contains columns for <strong>DOP</strong>, <strong>DOI</strong>, <strong>DOE</strong> and <strong>Ticket</strong>.</li>
                    <li>Dates can use hyphens (<code>-</code>) or slashes (<code>/</code>). The smart format detector resolves them column-wide.</li>
                    <li>Uploading CRM data deletes and overwrites previous logs for that month/year.</li>
                  </>
                ) : (
                  <>
                    <li>Ensure the uploaded sheet contains columns for <strong>DOI(mm/dd/yyyy)</strong>, <strong>DOC(mm/dd/yyyy)</strong>, and <strong>Ticket No.</strong>.</li>
                    <li>Ensure the columns match in the exact order generated by branch templates.</li>
                    <li>Uploading PCR data deletes and overwrites previous records for the selected branch/month/year combination.</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Upload form container */}
        <div className="md:col-span-2">
          <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-base font-bold">
                {activeTab === 'crm' ? 'CRM Excel Document Upload' : 'PCR Excel Document Upload'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center space-y-6">
              
              <form
                onSubmit={activeTab === 'crm' ? handleCrmUpload : handlePcrUpload}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className="flex-1 flex flex-col justify-center"
              >
                <input
                  type="file"
                  id="file-upload-input"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />

                <label
                  htmlFor="file-upload-input"
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
                      : (activeTab === 'crm' ? crmFile : pcrFile)
                      ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/5 dark:bg-zinc-900/5'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-400 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20'
                  }`}
                >
                  {(activeTab === 'crm' ? crmFile : pcrFile) ? (
                    <div className="w-full space-y-4 text-left animate-in fade-in duration-300">
                      {/* Meta Card */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-extrabold text-zinc-950 dark:text-zinc-50 truncate max-w-xs md:max-w-md">
                              {activeTab === 'crm' ? crmFile?.name : pcrFile?.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                              {(((activeTab === 'crm' ? crmFile?.size : pcrFile?.size) || 0) / (1024 * 1024)).toFixed(2)} MB • Excel Spreadsheet
                            </p>
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-850 px-2.5 py-1 rounded-full shrink-0">
                          Ready to Upload
                        </div>
                      </div>

                      {/* Spreadsheet Preview Detail Block */}
                      {parsingFile ? (
                        <div className="p-8 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl border-dashed bg-zinc-50/20 dark:bg-zinc-950/20 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                          <p className="text-[10px] text-muted-foreground font-semibold">Reading spreadsheet structures...</p>
                        </div>
                      ) : (activeTab === 'crm' ? crmPreview : pcrPreview) ? (
                        <div className="space-y-3">
                          {/* Brief stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/30 p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                            <div className="space-y-0.5">
                              <div>Record Count</div>
                              <div className="text-xs text-zinc-800 dark:text-zinc-200 font-extrabold">{(activeTab === 'crm' ? crmPreview : pcrPreview)?.totalRows.toLocaleString()} rows</div>
                            </div>
                            <div className="space-y-0.5">
                              <div>Sheet Count</div>
                              <div className="text-xs text-zinc-800 dark:text-zinc-200 font-extrabold">{(activeTab === 'crm' ? crmPreview : pcrPreview)?.sheetNames.length} sheets</div>
                            </div>
                            <div className="space-y-0.5">
                              <div>Active Sheet</div>
                              <div className="text-xs text-zinc-800 dark:text-zinc-200 font-extrabold truncate" title={(activeTab === 'crm' ? crmPreview : pcrPreview)?.selectedSheet}>
                                {(activeTab === 'crm' ? crmPreview : pcrPreview)?.selectedSheet}
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <div>Last Modified</div>
                              <div className="text-[9px] text-zinc-800 dark:text-zinc-200 font-mono tracking-tight font-extrabold truncate">
                                {(activeTab === 'crm' ? crmPreview : pcrPreview)?.lastModified}
                              </div>
                            </div>
                          </div>

                          {/* Data Preview Table */}
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Spreadsheet Headers & Rows Preview (First 5 Rows)</div>
                            <div className="border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-white dark:bg-zinc-950 overflow-hidden shadow-inner">
                              <div className="overflow-x-auto max-h-[160px]">
                                <table className="w-full text-left border-collapse text-[10px]">
                                  <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200/50 dark:border-zinc-800/50 font-bold">
                                      <th className="p-2 border-r border-zinc-200/20 shrink-0 text-center font-bold">#</th>
                                      {(activeTab === 'crm' ? crmPreview : pcrPreview)?.headers.map((h, i) => (
                                        <th key={i} className="p-2 font-bold whitespace-nowrap border-r border-zinc-200/20 last:border-r-0 uppercase tracking-wide">
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(activeTab === 'crm' ? crmPreview : pcrPreview)?.rows.map((row, idx) => (
                                      <tr key={idx} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-900/50 last:border-b-0">
                                        <td className="p-2 border-r border-zinc-200/20 text-center font-semibold text-zinc-400">{idx + 1}</td>
                                        {(activeTab === 'crm' ? crmPreview : pcrPreview)?.headers.map((h, i) => (
                                          <td key={i} className="p-2 border-r border-zinc-200/20 last:border-r-0 truncate max-w-[120px] font-medium" title={row[h]}>
                                            {row[h]}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full inline-block animate-pulse">
                        <UploadCloud className="w-10 h-10" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          Drag and drop your Excel file here
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          or click to browse from files (.xlsx, .xls)
                        </p>
                      </div>
                    </div>
                  )}
                </label>

                {isUploading && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    Uploading and parsing spreadsheet records, please wait...
                  </div>
                )}

                {/* CRM Upload success message */}
                {activeTab === 'crm' && crmResult && (
                  <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/55 text-emerald-800 dark:text-emerald-300 rounded-xl flex gap-3 items-start animate-in fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">Successfully Stored CRM Records</p>
                      <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/80 mt-1 leading-normal">
                        Imported <strong>{crmResult.count}</strong> CRM line items for the period <strong>{months.find(m => m.value === crmResult.month)?.label} {crmResult.year}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* PCR Upload success message */}
                {activeTab === 'pcr' && pcrResult && (
                  <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/55 text-emerald-800 dark:text-emerald-300 rounded-xl flex gap-3 items-start animate-in fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">Successfully Stored PCR Records</p>
                      <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/80 mt-1 leading-normal">
                        Imported <strong>{pcrResult.count}</strong> claims for branch <strong>{pcrResult.branchName}</strong>, period <strong>{months.find(m => m.value === pcrResult.month)?.label} {pcrResult.year}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-6 flex items-center justify-end gap-3">
                  {(activeTab === 'crm' ? crmFile : pcrFile) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (activeTab === 'crm') {
                          setCrmFile(null);
                          setCrmPreview(null);
                        } else {
                          setPcrFile(null);
                          setPcrPreview(null);
                        }
                      }}
                      disabled={isUploading}
                      className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
                    >
                      Clear File
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={!(activeTab === 'crm' ? crmFile : pcrFile) || isUploading}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer h-10 px-6 text-xs font-semibold disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    Submit Excel File
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
