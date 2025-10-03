import { ReactNode, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Settings2 } from "lucide-react";
import { persistGet, persistSet } from "@/lib/persist";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type Column<T> = {
  id: string;
  header: string | ReactNode;
  accessor: (row: T) => ReactNode;
  sort?: (a: T, b: T) => number;
  width?: string;
  align?: "left" | "right" | "center";
  sticky?: boolean; // for first N columns
  clickable?: boolean;
};

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

interface DataTableProps<T> {
  id: string; // persistence key
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  renderBulkBar?: (selectedRows: T[]) => ReactNode;
  defaultSort?: { column: string; direction: "asc" | "desc" };
  pagination?: PaginationConfig;
}

export function DataTable<T>({ id, rows, columns, loading, empty, onRowClick, rowActions, renderBulkBar, defaultSort, pagination }: DataTableProps<T>) {
  // Initialize hooks first - always call hooks in the same order
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    if (!columns || columns.length === 0) return {};
    const saved = persistGet(`dt:${id}:cols`) as Record<string, boolean> | null;
    return saved || Object.fromEntries(columns.map(c => [c.id, true]));
  });
  const [sortBy, setSortBy] = useState<string | null>(() => {
    const saved = persistGet(`dt:${id}:sortBy`) as string | null;
    return saved || defaultSort?.column || null;
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
    const saved = persistGet(`dt:${id}:sortDir`) as "asc" | "desc" | null;
    return saved || defaultSort?.direction || "asc";
  });
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { persistSet(`dt:${id}:cols`, visible); }, [id, visible]);
  useEffect(() => { persistSet(`dt:${id}:sortBy`, sortBy); }, [id, sortBy]);
  useEffect(() => { persistSet(`dt:${id}:sortDir`, sortDir); }, [id, sortDir]);
  useEffect(() => { setSelected(new Set()); }, [rows]);

  const ordered = useMemo(() => {
    if (!sortBy || !columns) return rows;
    const col = columns.find(c => c.id === sortBy);
    if (!col || !col.sort) return rows;
    const copied = [...rows];
    copied.sort((a, b) => col.sort(a, b));
    return sortDir === "asc" ? copied : copied.reverse();
  }, [rows, columns, sortBy, sortDir]);

  // Safety check for columns - after hooks are initialized
  if (!columns || columns.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No columns defined for table
      </div>
    );
  }

  const header = (
    <TableHeader className="sticky top-0 bg-background z-10">
      <TableRow>
        {columns.map((c) => visible[c.id] !== false && (
          <TableHead
            key={c.id}
            className={cn(c.sticky && "sticky left-0 bg-background", c.align === "right" && "text-right")}
            style={{ width: c.width }}
            onClick={() => {
              if (!c.sort) return;
              if (sortBy === c.id) setSortDir(d => d === "asc" ? "desc" : "asc"); else setSortBy(c.id);
            }}
          >
            <div className="flex items-center gap-2">
              <span className={cn(c.sort && "cursor-pointer select-none")}>
                {c.id === 'select' ? (
                  <input
                    aria-label="Select all rows"
                    type="checkbox"
                    className="rounded"
                    checked={selected.size > 0 && selected.size === rows.length}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelected(new Set(e.currentTarget.checked ? rows.map((_, i) => i) : []));
                    }}
                  />
                ) : c.header}
              </span>
              {c.sort && sortBy === c.id && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
            </div>
          </TableHead>
        ))}
  <TableHead className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><Settings2 className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.map(c => (
                <DropdownMenuCheckboxItem key={c.id} checked={visible[c.id] !== false} onCheckedChange={(v) => setVisible(s => ({ ...s, [c.id]: !!v }))}>
                  {typeof c.header === 'string' ? c.header : c.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  const renderPagination = () => {
    if (!pagination) return null;

    const { page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions } = pagination;
    const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(start + ordered.length - 1, total);

    return (
      <div className="flex flex-col gap-3 mt-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          {total === 0 ? "No results to display" : `Showing ${start}–${end} of ${total}`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onPageSizeChange && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Rows per page</span>
              <select
                className="border rounded px-2 py-1 text-sm bg-background"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {(pageSizeOptions || [10, 25, 50, 100]).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {!!renderBulkBar && selected.size > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between p-2 mb-2 bg-muted border rounded">
          <div className="text-sm">{selected.size} selected</div>
          <div>{renderBulkBar(Array.from(selected).map(i => ordered[i]))}</div>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          {header}
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, rIdx) => (
                <TableRow key={`sk-${rIdx}`}>
                  {columns.map((c) => visible[c.id] !== false && (
                    <TableCell key={`skc-${c.id}-${rIdx}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : (ordered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-10">
                  {empty}
                </TableCell>
              </TableRow>
            ) : ordered.map((row, rIdx) => (
              <TableRow key={rIdx} className={cn(onRowClick && "cursor-pointer")} onClick={() => onRowClick?.(row)}>
                {columns.map((c) => visible[c.id] !== false && (
                  <TableCell key={c.id} className={cn(c.sticky && "sticky left-0 bg-background", c.align === "right" && "text-right")}
                    style={{ width: c.width }}>
                    <div className={cn(c.clickable && "underline")}>
                      {c.id === 'select' ? (
                        <input
                          aria-label={`Select row ${rIdx+1}`}
                          type="checkbox"
                          className="rounded"
                          checked={selected.has(rIdx)}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelected(prev => {
                              const next = new Set(prev);
                              if (e.currentTarget.checked) next.add(rIdx); else next.delete(rIdx);
                              return next;
                            });
                          }}
                        />
                      ) : c.accessor(row)}
                    </div>
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {rowActions ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-label="Row actions" variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rowActions(row)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>
      {renderPagination()}
    </div>
  );
}
