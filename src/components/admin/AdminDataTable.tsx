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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type AdminTableColumn<T> = {
  key: string;
  header: string;
  widthClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
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
  minWidthClassName?: string;
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
  minWidthClassName = "min-w-[1120px]",
  onRowClick,
}: AdminDataTableProps<T>) {
  const skeletonRows = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);

  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
      <CardContent className="p-0">
        <Table className={cn("table-fixed", minWidthClassName)}>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(
                    "h-11 whitespace-nowrap px-4 text-xs font-semibold uppercase tracking-normal text-muted-foreground",
                    c.widthClassName,
                    c.headerClassName,
                  )}
                >
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
                    <TableCell
                      key={c.key}
                      className={cn("h-[76px] whitespace-nowrap px-4", c.widthClassName, c.cellClassName)}
                    >
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="text-sm font-semibold text-foreground">{emptyTitle}</div>
                    <div className="max-w-md text-xs text-muted-foreground">{emptyDescription}</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn("group", onRowClick ? "cursor-pointer" : "")}
                  data-state={undefined}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        "h-[86px] whitespace-nowrap px-4 text-sm align-middle",
                        c.widthClassName,
                        c.cellClassName,
                      )}
                    >
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

