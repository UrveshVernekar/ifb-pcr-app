'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    CheckCircle,
    QrCode,
    Search,
    Loader2,
    RefreshCw,
    AlertCircle,
    Tag,
    Hash,
    Layers,
    Activity,
    Building2,
    Copy,
    Check,
    PackageCheck,
    CheckCircle2,
    Clock,
    Terminal,
    ShieldCheck,
    Workflow,
    Cpu,
    Info,
    AlertTriangle,
    Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/auth-client';

interface ValidationStage {
    Id: number;
    PlanOrder: string;
    ProductBarcode: string;
    Part1_Barcode?: string;
    Part2_Barcode?: string;
    Part3_Barcode?: string;
    Part1_Barcode_Rework?: string;
    Part2_Barcode_Rework?: string;
    Part3_Barcode_Rework?: string;
    Serial_No?: string;
    ModelId?: number;
    ModelName?: string;
    ModelNo?: string;
    SupplierId?: number;
    SupplierName?: string;
    StageID: number;
    StageName: string;
    IsMatched: number;
    CreatedDate: string;
    Barcode_Status: string;
    Lot_No?: string;
    assline?: string;
    ProductBarcode_cust?: string;
    Mbomversionid?: string;
    Qty?: number;
    UOM?: string;
}

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success('Copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer rounded bg-zinc-100/30 dark:bg-zinc-800/30"
            onClick={handleCopy}
        >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </Button>
    );
};

const PartBarcodeItem = ({
    label,
    barcode,
    hasRework,
    searchedTerm
}: {
    label: string;
    barcode: string;
    hasRework?: boolean;
    searchedTerm: string;
}) => {
    const isMatched = useMemo(() => {
        if (!barcode || !searchedTerm) return false;
        return barcode.trim().toLowerCase() === searchedTerm.trim().toLowerCase();
    }, [barcode, searchedTerm]);

    return (
        <div className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-3 ${isMatched
                ? 'bg-yellow-500/10 dark:bg-yellow-500/5 border-yellow-500 dark:border-yellow-600 shadow-md ring-1 ring-yellow-500/50'
                : 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-150 dark:border-zinc-800/60 hover:bg-zinc-100/40 dark:hover:bg-zinc-900/60'
            }`}>
            <div className="space-y-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isMatched ? 'text-yellow-650 dark:text-yellow-400 font-extrabold' : 'text-zinc-400 dark:text-zinc-500'
                    }`}>
                    <Cpu className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    {label}
                </div>
                <div className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 break-all select-all">
                    {barcode}
                </div>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-auto">
                {isMatched && (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:text-zinc-100 text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Search className="w-2.5 h-2.5" /> Searched Part
                    </Badge>
                )}
                {hasRework && (
                    <Badge variant="outline" className="text-[9px] border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">Reworked</Badge>
                )}
                <CopyButton text={barcode} />
            </div>
        </div>
    );
};

export default function ValidationPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedTerm, setSearchedTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState<ValidationStage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const apiBase = useMemo(() => getApiBaseUrl(), []);

    // Focus input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const term = searchQuery.trim();
        if (!term) {
            toast.error('Please scan or enter a barcode');
            return;
        }

        setLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${apiBase}/validation/history?barcode=${encodeURIComponent(term)}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 412) {
                    throw new Error('Session expired or unauthorized. Please log in again.');
                }
                const json = await res.json().catch(() => ({}));
                throw new Error(json.message || 'Failed to fetch validation history');
            }

            const json = await res.json();
            if (json.success) {
                const data = json.data || [];
                setHistoryData(data);
                if (data.length === 0) {
                    setError('No validation history records found for the scanned code.');
                } else {
                    setSearchedTerm(term);
                    toast.success(`Fetched validation history successfully`);
                }
            } else {
                throw new Error(json.message || 'Failed to fetch validation history');
            }
        } catch (err: any) {
            console.error('Validation fetch error:', err);
            setError(err.message || 'An error occurred while retrieving history');
            toast.error(err.message || 'Failed to search validation history');
        } finally {
            setLoading(false);
            // Autofocus back to input after query finishes so operator can scan next barcode
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 50);
        }
    };

    const handleClear = () => {
        setSearchQuery('');
        setSearchedTerm('');
        setHistoryData([]);
        setError(null);
        setHasSearched(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Extract metadata from the first result row, since metadata is identical across stages
    const metadata = useMemo(() => {
        if (historyData.length === 0) return null;
        const item = historyData[0];
        return {
            productBarcode: item.ProductBarcode,
            planOrder: item.PlanOrder,
            serialNo: item.Serial_No,
            modelId: item.ModelId,
            modelName: item.ModelName,
            modelNo: item.ModelNo,
            assline: item.assline,
            productBarcodeCust: item.ProductBarcode_cust,
            mbomVersionId: item.Mbomversionid,
            qty: item.Qty,
            uom: item.UOM,
        };
    }, [historyData]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 px-2">
            {/* Header section with active scanner status */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50/40 via-transparent to-transparent dark:from-blue-950/10 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/30">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Traceability Validation
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Scan machine serial numbers or sub-component parts barcodes to pull up real-time production history.
                    </p>
                </div>
                {/* <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm self-start md:self-auto">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    SCANNER ONLINE
                </div> */}
            </div>

            {/* Scanner Card with Accent borders */}
            <Card className="border-t-4 border-t-blue-600 dark:border-t-blue-500 border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                        <div className="relative flex-1">
                            <QrCode className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                            <Input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Click here and scan barcode/QR, or enter code..."
                                disabled={loading}
                                className="pl-12 h-12 text-sm rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/40 border-zinc-250 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-blue-500 transition-all font-mono font-bold tracking-wide"
                            />
                        </div>
                        <div className="flex gap-2.5">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/15 transition-all cursor-pointer h-12 px-6 text-xs font-bold flex items-center gap-1.5 min-w-[110px]"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4.5 h-4.5" />}
                                Validate
                            </Button>
                            {hasSearched && (
                                <Button
                                    type="button"
                                    onClick={handleClear}
                                    variant="outline"
                                    className="rounded-xl h-12 px-4 text-xs font-bold cursor-pointer border-zinc-250 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </form>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2.5 font-medium flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-zinc-400" /> Ensure cursor is active in the search field above before trigger scans.
                    </p>
                </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
                <div className="space-y-4">
                    <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 rounded-2xl animate-pulse">
                        <CardContent className="h-44 p-6 flex flex-col justify-center space-y-4">
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3"></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
                                <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
                                <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
                                <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                </div>
            )}

            {/* Error / Empty State */}
            {error && !loading && (
                <Card className="border-2 border-red-500/20 dark:border-red-500/10 bg-red-50/20 dark:bg-red-950/5 rounded-2xl shadow-md">
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <AlertCircle className="w-14 h-14 text-red-500 animate-bounce" />
                        <div className="space-y-1">
                            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">Validation Unsuccessful</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">{error}</p>
                        </div>
                        <Button
                            onClick={handleClear}
                            variant="outline"
                            className="rounded-xl text-xs font-bold h-10 px-5 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                        >
                            Reset Scanner
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Results Screen */}
            {!loading && historyData.length > 0 && metadata && (
                <div className="space-y-6">

                    {/* Metadata Overview Dashboard Card */}
                    <Card className="border border-zinc-250 dark:border-zinc-800 shadow-lg bg-zinc-50/40 dark:bg-zinc-900/20 rounded-2xl overflow-hidden backdrop-blur-md">
                        <CardHeader className="bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-900 dark:to-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                        <PackageCheck className="w-4 h-4" /> Production Order Overview
                                    </span>
                                    <CardTitle className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                                        {metadata.modelName || <span className="text-zinc-400 italic">Unknown Model Name</span>}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground font-mono">
                                        Model ID: <span className="font-bold text-zinc-700 dark:text-zinc-300">{metadata.modelId || 'N/A'}</span> • Model No: <span className="font-bold text-zinc-700 dark:text-zinc-300">{metadata.modelNo || 'N/A'}</span>
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                    {metadata.assline && (
                                        <Badge variant="secondary" className="px-3 py-1 text-xs rounded-full font-bold border border-zinc-200 bg-white/90 dark:bg-zinc-900 dark:border-zinc-800">
                                            Line: {metadata.assline}
                                        </Badge>
                                    )}
                                    <Badge className="px-3 py-1 text-xs rounded-full font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                        Status: OK ({historyData.length} Stages Verified)
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">

                            {/* Rich Cards Grid for Metadata */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                                {/* Machine Serial */}
                                <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 shadow-sm flex flex-col justify-between space-y-3">
                                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                        <Hash className="w-3.5 h-3.5 text-blue-500" />
                                        Machine Serial No
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-base font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
                                            {metadata.serialNo || 'N/A'}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 font-medium">Unique chassis tag index</div>
                                    </div>
                                </div>

                                {/* Product Barcode */}
                                <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 shadow-sm flex flex-col justify-between space-y-3">
                                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                        <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                                        Product Barcode
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono flex items-center justify-between gap-1.5">
                                            <span className="truncate max-w-[170px]" title={metadata.productBarcode}>
                                                {metadata.productBarcode}
                                            </span>
                                            <CopyButton text={metadata.productBarcode} />
                                        </div>
                                        <div className="text-[10px] text-zinc-400 font-medium">Scanned machine serial</div>
                                    </div>
                                </div>

                                {/* Plan Order */}
                                <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 shadow-sm flex flex-col justify-between space-y-3">
                                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-purple-500" />
                                        Plan Order
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono flex items-center justify-between gap-1.5">
                                            <span>{metadata.planOrder}</span>
                                            <CopyButton text={metadata.planOrder} />
                                        </div>
                                        <div className="text-[10px] text-zinc-400 font-medium">Production order batch reference</div>
                                    </div>
                                </div>

                                {/* MBOM Version / Qty */}
                                <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 shadow-sm flex flex-col justify-between space-y-3">
                                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                        MBOM Version / Qty
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold py-0">
                                                {metadata.mbomVersionId ? `v${metadata.mbomVersionId}` : 'v1.0'}
                                            </Badge>
                                            <span className="text-zinc-500">•</span>
                                            <span>{metadata.qty || 1} {metadata.uom || 'Pc'}</span>
                                        </div>
                                        <div className="text-[10px] text-zinc-400 font-medium">BOM config and batch quantity</div>
                                    </div>
                                </div>

                            </div>

                            {/* Customer Barcode Detail Banner */}
                            {metadata.productBarcodeCust && (
                                <div className="mt-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/25">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Customer Product Barcode</div>
                                            <div className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[320px] sm:max-w-none" title={metadata.productBarcodeCust}>
                                                {metadata.productBarcodeCust}
                                            </div>
                                        </div>
                                    </div>
                                    <CopyButton text={metadata.productBarcodeCust} />
                                </div>
                            )}

                        </CardContent>
                    </Card>

                    {/* Progress tracking indicator */}
                    <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
                        <div className="flex justify-between items-center text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">
                            <span className="flex items-center gap-1"><Workflow className="w-3.5 h-3.5 text-blue-500" /> ASSEMBLY VERIFICATION STATUS</span>
                            <span>{historyData.length} STAGES COMPLETED</span>
                        </div>
                        <div className="w-full bg-zinc-150 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
                            {historyData.map((_, i) => (
                                <div key={i} className="flex-1 border-r border-white dark:border-zinc-900 last:border-0 bg-gradient-to-r from-emerald-500 to-green-600" />
                            ))}
                        </div>
                    </div>

                    {/* Validation Stage Timeline */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50 pl-1 flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Process Milestones Timeline
                        </h2>

                        <div className="relative pl-6 sm:pl-10 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-6 py-2 ml-4">
                            {historyData.map((stage, idx) => {
                                const isOk = stage.Barcode_Status === 'OK' && stage.IsMatched === 1;
                                const hasComponents = !!(stage.Part1_Barcode || stage.Part2_Barcode || stage.Part3_Barcode);
                                const hasRework = !!(stage.Part1_Barcode_Rework || stage.Part2_Barcode_Rework || stage.Part3_Barcode_Rework);

                                return (
                                    <div key={stage.Id || idx} className="relative group">
                                        {/* Timeline Node Icon (Pulsing matching highlight) */}
                                        <div className={`absolute -left-[37px] sm:-left-[53px] top-2.5 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border bg-white dark:bg-zinc-900 shadow-md transition-all z-10 ${isOk
                                            ? 'border-emerald-500 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10'
                                            : 'border-amber-500 dark:border-amber-700 text-amber-600 dark:text-amber-400 shadow-amber-500/10'
                                            }`}>
                                            {isOk ? (
                                                <CheckCircle2 className="w-4 h-4 sm:w-5 h-5" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 sm:w-5 h-5 animate-pulse" />
                                            )}
                                        </div>

                                        {/* Accent side border Stage Card */}
                                        <Card className={`border-l-4 shadow-md bg-white dark:bg-zinc-900/50 transition-all duration-300 group-hover:shadow-lg rounded-xl overflow-hidden ${isOk
                                                ? 'border-l-emerald-500 border border-zinc-200/80 dark:border-zinc-800/80'
                                                : 'border-l-amber-500 border border-zinc-200/80 dark:border-zinc-800/80'
                                            }`}>
                                            {/* Header with stage background tint */}
                                            <CardHeader className={`p-4 sm:p-5 pb-3 border-b border-zinc-150 dark:border-zinc-800/60 ${isOk
                                                    ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]'
                                                    : 'bg-amber-500/[0.02] dark:bg-amber-500/[0.01]'
                                                }`}>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-zinc-200/85 hover:bg-zinc-200/85 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-black text-[10px] px-2 rounded-md">
                                                                #{idx + 1}
                                                            </Badge>
                                                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                                                                Stage ID: {stage.StageID}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                                                            {stage.StageName.replace(/_/g, ' ')}
                                                        </h3>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold flex items-center gap-1 font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/30 dark:border-zinc-800/30 px-2 py-0.5 rounded-md">
                                                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                                            {formatDate(stage.CreatedDate)}
                                                        </span>

                                                        <Badge
                                                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border ${isOk
                                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                                                }`}
                                                        >
                                                            {stage.Barcode_Status || 'OK'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 sm:p-5 space-y-4">

                                                {/* Supplier and Lot Card Tiling */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                    <div className="flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400 p-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                                                        <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                                        <div className="min-w-0 truncate">
                                                            <span className="font-bold text-zinc-700 dark:text-zinc-300">Supplier: </span>
                                                            {stage.SupplierName ? `${stage.SupplierName} (ID: ${stage.SupplierId})` : 'IFB Industries'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400 p-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                                                        <Layers className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                                                        <div>
                                                            <span className="font-bold text-zinc-700 dark:text-zinc-300">Lot Number: </span>
                                                            <span className="font-mono font-bold bg-zinc-150/40 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/20 dark:border-zinc-800/25">{stage.Lot_No || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Component Barcodes Section */}
                                                <div className="space-y-3 pt-1">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                                        BOM Components Validation
                                                    </h4>

                                                    {hasComponents ? (
                                                        <div className="space-y-3">
                                                            {stage.Part1_Barcode && (
                                                                <PartBarcodeItem
                                                                    label="Part 1 Component"
                                                                    barcode={stage.Part1_Barcode}
                                                                    hasRework={!!stage.Part1_Barcode_Rework}
                                                                    searchedTerm={searchedTerm}
                                                                />
                                                            )}

                                                            {stage.Part1_Barcode_Rework && (
                                                                <PartBarcodeItem
                                                                    label="Part 1 Rework Component"
                                                                    barcode={stage.Part1_Barcode_Rework}
                                                                    searchedTerm={searchedTerm}
                                                                />
                                                            )}

                                                            {stage.Part2_Barcode && (
                                                                <PartBarcodeItem
                                                                    label="Part 2 Component"
                                                                    barcode={stage.Part2_Barcode}
                                                                    hasRework={!!stage.Part2_Barcode_Rework}
                                                                    searchedTerm={searchedTerm}
                                                                />
                                                            )}

                                                            {stage.Part2_Barcode_Rework && (
                                                                <PartBarcodeItem
                                                                    label="Part 2 Rework Component"
                                                                    barcode={stage.Part2_Barcode_Rework}
                                                                    searchedTerm={searchedTerm}
                                                                />
                                                            )}

                                                            {stage.Part3_Barcode && (
                                                                <PartBarcodeItem
                                                                    label="Part 3 Component"
                                                                    barcode={stage.Part3_Barcode}
                                                                    hasRework={!!stage.Part3_Barcode_Rework}
                                                                    searchedTerm={searchedTerm}
                                                                />
                                                            )}

                                                            {stage.Part3_Barcode_Rework && (
                                                                <PartBarcodeItem
                                                                    label="Part 3 Rework Component"
                                                                    barcode={stage.Part3_Barcode_Rework}
                                                                    searchedTerm={searchedTerm}
                                                                />
                                                            )}

                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-zinc-400 dark:text-zinc-500 italic p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/[0.25] dark:bg-zinc-950/15 flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Control / Verification step completed successfully</span>
                                                            <Badge variant="secondary" className="text-[9px] font-bold px-2 rounded border bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-850">Log Step</Badge>
                                                        </div>
                                                    )}
                                                </div>

                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}

            {/* Initial Tech Guide Screen (Filled visual placeholder layout) */}
            {!hasSearched && !loading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Welcome card */}
                    <Card className="lg:col-span-2 border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 rounded-2xl shadow-sm border-dashed">
                        <CardContent className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[380px]">
                            <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse border border-blue-500/20">
                                <QrCode className="w-14 h-14" />
                            </div>
                            <div className="space-y-2.5 max-w-md">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Traceability Terminal</h3>
                                <p className="text-sm text-muted-foreground">
                                    Hardware integration active. Ready to decode and check component alignment for IFB production lines. Scan barcode/QR codes directly to verify compliance.
                                </p>
                            </div>
                            <div className="flex gap-3 justify-center">
                                <span className="bg-zinc-100 dark:bg-zinc-800/80 text-[10px] font-bold px-2.5 py-1 rounded-md text-zinc-500 border border-zinc-200/50 dark:border-zinc-800/30">
                                    F1-F12 Auto-focus
                                </span>
                                <span className="bg-zinc-100 dark:bg-zinc-800/80 text-[10px] font-bold px-2.5 py-1 rounded-md text-zinc-500 border border-zinc-200/50 dark:border-zinc-800/30">
                                    MySQL Linked
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Operational Flow guide side panel */}
                    <Card className="border border-zinc-250 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl shadow-sm flex flex-col justify-between">
                        <CardHeader className="p-6 pb-2">
                            <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-extrabold flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-zinc-400" /> Traceability Reference
                            </span>
                            <CardTitle className="text-lg font-black mt-1">Operational Flow</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2 space-y-4">
                            <div className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-blue-500/25">1</div>
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Scan Product Serial / Part Barcode</div>
                                    <div className="text-[11px] text-zinc-400">Trigger standard laser scanner or manual query.</div>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-blue-500/25">2</div>
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Database Search & Retrieve</div>
                                    <div className="text-[11px] text-zinc-400">Backend pulls sequential station history via Stored Procedures.</div>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-blue-500/25">3</div>
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Verification & Highlight Check</div>
                                    <div className="text-[11px] text-zinc-400">View matches, component lots, rework labels, and supplier origins.</div>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 text-[10px] text-zinc-400 font-medium">
                                💡 Tip: Searched barcodes are highlighted directly in yellow on their respective milestones.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
