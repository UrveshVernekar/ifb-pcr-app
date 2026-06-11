import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface BaseTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  keyExtractor: (item: T) => string | number;
}

export function BaseTable<T>({
  columns,
  data,
  loading,
  emptyTitle = "No Records Found",
  emptyDescription = "There is no data to display in this list.",
  keyExtractor,
}: BaseTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs">Loading data...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-1">
        <AlertCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-650" />
        <span className="text-sm font-semibold">{emptyTitle}</span>
        <span className="text-xs text-zinc-400">{emptyDescription}</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead
                key={idx}
                className={cn("text-xs font-semibold uppercase tracking-wider text-zinc-500 py-3", col.className)}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10 border-b border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-200"
            >
              {columns.map((col, colIdx) => (
                <TableCell
                  key={colIdx}
                  className={cn("py-4 text-xs text-zinc-600 dark:text-zinc-400", col.className)}
                >
                  {col.render(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
