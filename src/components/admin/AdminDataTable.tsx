import { ReactNode, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type AdminTableColumn<T> = {
  key: string;
  header: string;
  widthClassName?: string;
  cell: (row: T) => ReactNode;
};

type AdminDataTableProps<T> = {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  className?: string;
  onRowClick?: (row: T) => void;
};

export default function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = "No data available",
  emptyDescription = "Try adjusting your filters or creating new data.",
  loading = false,
  className,
  onRowClick,
}: AdminDataTableProps<T>) {
  const skeletonRows = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);

  return (
    <Card className={cn("rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm", className)}>
      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={cn(c.widthClassName)}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              skeletonRows.map((i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(c.widthClassName)}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10">
                  <div className="text-center">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{emptyTitle}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{emptyDescription}</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(onRowClick ? "cursor-pointer" : "")}
                  data-state={undefined}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(c.widthClassName)}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

