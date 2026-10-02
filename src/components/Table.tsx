import React, { useState, useMemo } from 'react';
import { clsx } from './ui';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectRow?: (id: string, checked: boolean) => void;
  emptyMessage?: string;
  loading?: boolean;
  stickyHeader?: boolean;
}

// ─── Table ─────────────────────────────────────────────────────────────────────

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  rowClassName,
  selectable,
  selectedIds,
  onSelectAll,
  onSelectRow,
  emptyMessage = 'No records found',
  loading,
  stickyHeader,
}: TableProps<T>) {
  const allSelected = data.length > 0 && selectedIds && data.every((r) => selectedIds.has(keyExtractor(r)));
  const someSelected = selectedIds && data.some((r) => selectedIds.has(keyExtractor(r))) && !allSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className={clsx(
          'bg-slate-50 dark:bg-slate-800/50',
          stickyHeader && 'sticky top-0 z-10'
        )}>
          <tr>
            {selectable && (
              <th className="w-10 px-3 py-1.5 text-left">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  ref={(el) => { if (el) el.indeterminate = !!someSelected; }}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-3 py-1.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap border-b border-slate-200 dark:border-slate-700',
                  col.sortable && 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none',
                  col.headerClassName
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="flex flex-col">
                      <ChevronUp
                        size={10}
                        className={sortKey === col.key && sortDir === 'asc' ? 'text-blue-600' : 'text-slate-300 dark:text-slate-600'}
                      />
                      <ChevronDown
                        size={10}
                        className={sortKey === col.key && sortDir === 'desc' ? 'text-blue-600' : 'text-slate-300 dark:text-slate-600'}
                      />
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {selectable && <td className="px-3 py-2"><div className="skeleton h-4 w-4 rounded" /></td>}
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2">
                    <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const id = keyExtractor(row);
              const isSelected = selectedIds?.has(id);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'table-row-hover',
                    onRowClick && 'cursor-pointer',
                    isSelected && 'table-row-selected',
                    rowClassName?.(row)
                  )}
                >
                  {selectable && (
                    <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={(e) => onSelectRow?.(id, e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx('px-3 py-1.5 text-slate-700 dark:text-slate-300 tabular-nums border-b border-slate-100 dark:border-slate-800/50', col.className)}
                    >
                      {col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages = useMemo(() => {
    const arr: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push('...');
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-slate-400 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={clsx(
                'w-7 h-7 text-[13px] rounded transition-colors',
                page === p
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
