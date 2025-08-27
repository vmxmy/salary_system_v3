import type { 
  ColumnDef, 
  ColumnFiltersState, 
  PaginationState, 
  SortingState,
  VisibilityState,
  RowSelectionState,
  ColumnSizingState,
  ColumnPinningState,
  Table
} from '@tanstack/react-table';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // Pagination
  pageCount?: number;
  totalRows?: number;
  currentPage?: number;
  onPaginationChange?: (pagination: PaginationState) => void;
  // Sorting
  onSortingChange?: (sorting: SortingState) => void;
  // Filtering
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (filter: string) => void;
  // Selection
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  // Column visibility
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  // Table instance callback
  onTableReady?: (table: Table<TData>) => void;
  // Initial states
  initialSorting?: SortingState;
  initialPagination?: PaginationState;
  initialColumnVisibility?: VisibilityState;
  initialRowSelection?: RowSelectionState;
  initialColumnPinning?: ColumnPinningState;
  // UI Options
  loading?: boolean;
  emptyMessage?: string;
  showToolbar?: boolean;
  showPagination?: boolean;
  showColumnToggle?: boolean;
  showGlobalFilter?: boolean;
  // Actions
  actions?: (row: TData) => React.ReactNode;
  // Export
  enableExport?: boolean;
  exportFileName?: string;
  // Styling
  className?: string;
  striped?: boolean;
  hover?: boolean;
  compact?: boolean;
}

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  globalFilter?: string;
  onGlobalFilterChange?: (filter: string) => void;
  showColumnToggle?: boolean;
  enableExport?: boolean;
  exportFileName?: string;
}

export interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  // Server-side pagination info (optional)
  totalRows?: number;
  currentPage?: number;
  totalPages?: number;
}

export interface DataTableColumnHeaderProps<TData, TValue> {
  column: ColumnDef<TData, TValue>;
  title: string;
}

export interface DataTableRowActionsProps<TData> {
  row: TData;
  actions?: (row: TData) => React.ReactNode;
}

export interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  pageCount?: number;
  enableRowSelection?: boolean;
  enableColumnResizing?: boolean;
  // Callbacks
  onPaginationChange?: (pagination: PaginationState) => void;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  // Initial states
  initialSorting?: SortingState;
  initialColumnFilters?: ColumnFiltersState;
  initialColumnVisibility?: VisibilityState;
  initialPagination?: PaginationState;
  initialColumnSizing?: ColumnSizingState;
  initialRowSelection?: RowSelectionState;
  initialColumnPinning?: ColumnPinningState;
}

export interface UseDataTableReturn<TData> {
  table: Table<TData>;
  // States
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  columnVisibility: VisibilityState;
  setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
  rowSelection: RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  columnSizing: ColumnSizingState;
  setColumnSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>>;
  globalFilter: string;
  setGlobalFilter: React.Dispatch<React.SetStateAction<string>>;
}