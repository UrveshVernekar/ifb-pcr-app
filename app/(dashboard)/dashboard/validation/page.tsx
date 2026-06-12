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
    Clock
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
    const handleCopy = async () => {
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
            className="h-6 w-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer rounded"
            onClick={handleCopy}
        >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </Button>
    );
};

export default function ValidationPage() {
    const [searchQuery, setSearchQuery] = useState('');
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
            // Format as 31 Dec 2024, 08:39 AM
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
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" /> Component Validation
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Scan a component QR / barcode or enter a machine serial number to check stage validation logs.
                    </p>
                </div>
            </div>

            {/* Scanner Card */}
            <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                        <div className="relative flex-1">
                            <QrCode className="absolute left-3 top-3 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                            <Input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Scan component barcode, serial, or QR code here..."
                                disabled={loading}
                                className="pl-11 h-11 text-sm rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/30 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-blue-500 transition-all font-mono"
                            />
                        </div>
                        <div className="flex gap-2.5">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer h-11 px-5 text-xs font-semibold flex items-center gap-1.5 min-w-[100px]"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                Validate
                            </Button>
                            {hasSearched && (
                                <Button
                                    type="button"
                                    onClick={handleClear}
                                    variant="outline"
                                    className="rounded-xl h-11 px-4 text-xs font-semibold cursor-pointer border-zinc-200 dark:border-zinc-800"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </form>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 font-medium">
                        💡 Scanner Mode active. Keep this input field active/focused to scan directly from hardware barcode guns.
                    </p>
                </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
                <div className="space-y-4">
                    <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 rounded-2xl animate-pulse">
                        <CardContent className="h-40 p-6 flex flex-col justify-center space-y-4">
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3"></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded"></div>
                                <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded"></div>
                                <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded"></div>
                                <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded"></div>
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
                <Card className="border border-red-100 dark:border-red-950/30 bg-red-50/20 dark:bg-red-950/5 rounded-2xl shadow-sm">
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Validation Unsuccessful</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">{error}</p>
                        <Button
                            onClick={handleClear}
                            variant="outline"
                            className="mt-2 rounded-xl text-xs font-semibold h-9 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                        >
                            Reset Scanner
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Results Screen */}
            {!loading && historyData.length > 0 && metadata && (
                <div className="space-y-6">

                    {/* Metadata Overview Card */}
                    <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800/80 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <PackageCheck className="w-3.5 h-3.5" /> Product Details
                                    </span>
                                    <CardTitle className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                                        {metadata.modelName || <span className="text-zinc-400 italic">Unknown Model</span>}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground font-mono">
                                        Model ID: {metadata.modelId || 'N/A'} • Model No: {metadata.modelNo || 'N/A'}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {metadata.assline && (
                                        <Badge variant="secondary" className="px-2.5 py-1 text-xs rounded-full font-semibold border bg-zinc-100/50 dark:bg-zinc-900 dark:border-zinc-800">
                                            Line: {metadata.assline}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="px-2.5 py-1 text-xs rounded-full font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                                        Status: OK ({historyData.length} Stages Verified)
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                                <div className="space-y-1">
                                    <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                        <Hash className="w-3.5 h-3.5 text-zinc-400" />
                                        Machine Serial No
                                    </div>
                                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                        {metadata.serialNo || 'N/A'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                        <QrCode className="w-3.5 h-3.5 text-zinc-400" />
                                        Product Barcode
                                    </div>
                                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
                                        <span className="truncate max-w-[180px]" title={metadata.productBarcode}>
                                            {metadata.productBarcode}
                                        </span>
                                        <CopyButton text={metadata.productBarcode} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-zinc-400" />
                                        Plan Order
                                    </div>
                                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
                                        {metadata.planOrder}
                                        <CopyButton text={metadata.planOrder} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5 text-zinc-400" />
                                        MBOM Version / Qty
                                    </div>
                                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        {metadata.mbomVersionId ? `v${metadata.mbomVersionId}` : 'N/A'} • {metadata.qty || 1} {metadata.uom || 'Pc'}
                                    </div>
                                </div>

                                {metadata.productBarcodeCust && (
                                    <div className="space-y-1 sm:col-span-2">
                                        <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5 text-zinc-400" />
                                            Customer Product Barcode
                                        </div>
                                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
                                            <span className="truncate max-w-[360px]" title={metadata.productBarcodeCust}>
                                                {metadata.productBarcodeCust}
                                            </span>
                                            <CopyButton text={metadata.productBarcodeCust} />
                                        </div>
                                    </div>
                                )}

                            </div>
                        </CardContent>
                    </Card>

                    {/* Validation Stage Timeline */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 pl-2">Validation Stage History</h2>

                        <div className="relative pl-6 sm:pl-8 border-l border-zinc-200 dark:border-zinc-800 space-y-6 py-2 ml-4">
                            {historyData.map((stage, idx) => {
                                const isOk = stage.Barcode_Status === 'OK' && stage.IsMatched === 1;
                                const hasComponents = !!(stage.Part1_Barcode || stage.Part2_Barcode || stage.Part3_Barcode);
                                const hasRework = !!(stage.Part1_Barcode_Rework || stage.Part2_Barcode_Rework || stage.Part3_Barcode_Rework);

                                return (
                                    <div key={stage.Id || idx} className="relative group">
                                        {/* Timeline Node Icon */}
                                        <div className={`absolute -left-[35px] sm:-left-[43px] top-1.5 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border bg-white dark:bg-zinc-900 shadow-sm transition-all z-10 ${isOk ? 'border-emerald-500 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400' : 'border-amber-500 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                                            }`}>
                                            {isOk ? (
                                                <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                            )}
                                        </div>

                                        {/* Stage Card */}
                                        <Card className="border border-zinc-200/70 dark:border-zinc-800/80 shadow-sm bg-white dark:bg-zinc-900/60 transition-all group-hover:border-zinc-300 dark:group-hover:border-zinc-700 group-hover:shadow-md rounded-xl">
                                            <CardHeader className="p-4 sm:p-5 pb-2 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="space-y-0.5">
                                                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                                                            Stage ID: {stage.StageID}
                                                        </span>
                                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                            {stage.StageName.replace(/_/g, ' ')}
                                                        </h3>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {formatDate(stage.CreatedDate)}
                                                        </span>

                                                        <Badge
                                                            className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${isOk
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

                                                {/* Supplier and Lot Information */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                                                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                                        <Building2 className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                                        <div>
                                                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Supplier: </span>
                                                            {stage.SupplierName ? `${stage.SupplierName} (ID: ${stage.SupplierId})` : 'IFB Industries'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                                        <Layers className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                                        <div>
                                                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Lot Number: </span>
                                                            <span className="font-mono">{stage.Lot_No || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Component Barcodes Section */}
                                                <div className="space-y-2.5">
                                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                                        Scanned Components
                                                    </h4>

                                                    {hasComponents ? (
                                                        <div className="space-y-2.5">
                                                            {stage.Part1_Barcode && (
                                                                <div className="p-2.5 rounded-lg border bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-150 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Part 1 Barcode</div>
                                                                        <div className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 break-all select-all">
                                                                            {stage.Part1_Barcode}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <CopyButton text={stage.Part1_Barcode} />
                                                                        {stage.Part1_Barcode_Rework && (
                                                                            <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-600 font-semibold px-2 py-0.5 rounded">Reworked</Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {stage.Part1_Barcode_Rework && (
                                                                <div className="p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Part 1 Rework Barcode</div>
                                                                        <div className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 break-all select-all">
                                                                            {stage.Part1_Barcode_Rework}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <CopyButton text={stage.Part1_Barcode_Rework} />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {stage.Part2_Barcode && (
                                                                <div className="p-2.5 rounded-lg border bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-150 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Part 2 Barcode</div>
                                                                        <div className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 break-all select-all">
                                                                            {stage.Part2_Barcode}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <CopyButton text={stage.Part2_Barcode} />
                                                                        {stage.Part2_Barcode_Rework && (
                                                                            <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-600 font-semibold px-2 py-0.5 rounded">Reworked</Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {stage.Part2_Barcode_Rework && (
                                                                <div className="p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Part 2 Rework Barcode</div>
                                                                        <div className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 break-all select-all">
                                                                            {stage.Part2_Barcode_Rework}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <CopyButton text={stage.Part2_Barcode_Rework} />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {stage.Part3_Barcode && (
                                                                <div className="p-2.5 rounded-lg border bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-150 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Part 3 Barcode</div>
                                                                        <div className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 break-all select-all">
                                                                            {stage.Part3_Barcode}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <CopyButton text={stage.Part3_Barcode} />
                                                                        {stage.Part3_Barcode_Rework && (
                                                                            <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-600 font-semibold px-2 py-0.5 rounded">Reworked</Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {stage.Part3_Barcode_Rework && (
                                                                <div className="p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Part 3 Rework Barcode</div>
                                                                        <div className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 break-all select-all">
                                                                            {stage.Part3_Barcode_Rework}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <CopyButton text={stage.Part3_Barcode_Rework} />
                                                                    </div>
                                                                </div>
                                                            )}

                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-zinc-400 dark:text-zinc-500 italic p-3 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/10 flex items-center justify-between">
                                                            <span>No sub-components scanned (Control/Print Event)</span>
                                                            <Badge variant="secondary" className="text-[9px] font-normal px-2 rounded border bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">Print Step</Badge>
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

            {/* Init State (Empty search query) */}
            {!hasSearched && !loading && (
                <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/40 rounded-2xl border-dashed">
                    <CardContent className="p-16 flex flex-col items-center text-center space-y-4">
                        <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse">
                            <QrCode className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Ready to Validate</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Focus the scanning input above and trigger your barcode scanner or manually key in a machine serial number.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

