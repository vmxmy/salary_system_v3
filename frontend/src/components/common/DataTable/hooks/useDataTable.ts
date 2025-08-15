import { useState, useMemo } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnSizingState,
} from '@tanstack/react-table';
import type { UseDataTableOptions, UseDataTableReturn } from '../types';

export function useDataTable<TData>({
  data,
  columns,
  pageCount,
  enableRowSelection = false,
  enableColumnResizing = false,
  onPaginationChange,
  onRowSelectionChange,
  initialSorting = [],
  initialColumnFilters = [],
  initialColumnVisibility = {},
  initialPagination = { pageIndex: 0, pageSize: 10 },
  initialColumnSizing = {},
}: UseDataTableOptions<TData>): UseDataTableReturn<TData> {
  // Table states
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialColumnFilters);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>(initialPagination);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(initialColumnSizing);
  const [globalFilter, setGlobalFilter] = useState('');

  // 自定义的分页设置函数，处理外部回调
  const handlePaginationChange = useMemo(() => {
    return (updater: any) => {
      setPagination(prev => {
        const newPagination = typeof updater === 'function' ? updater(prev) : updater;
        // 调用外部回调
        onPaginationChange?.(newPagination);
        return newPagination;
      });
    };
  }, [onPaginationChange]);

  // 自定义的行选择设置函数，处理外部回调
  const handleRowSelectionChange = useMemo(() => {
    return (updater: any) => {
      setRowSelection(prev => {
        const newRowSelection = typeof updater === 'function' ? updater(prev) : updater;
        // 调用外部回调
        onRowSelectionChange?.(newRowSelection);
        return newRowSelection;
      });
    };
  }, [onRowSelectionChange]);

  // Stable references to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data, [data]);
  const memoizedColumns = useMemo(() => columns, [columns]);

  const table = useReactTable({
    data: memoizedData,
    columns: memoizedColumns,
    pageCount,
    // Core row models
    getCoreRowModel: getCoreRowModel(),
    // Feature row models
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // State
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      columnSizing,
      globalFilter,
    },
    // State setters
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: handlePaginationChange,
    onColumnSizingChange: setColumnSizing,
    onGlobalFilterChange: setGlobalFilter,
    // Options
    enableRowSelection,
    enableColumnResizing,
    columnResizeMode: 'onChange',
    manualPagination: pageCount !== undefined,
  });

  return {
    table,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
    pagination,
    setPagination,
    columnSizing,
    setColumnSizing,
    globalFilter,
    setGlobalFilter,
  };
}