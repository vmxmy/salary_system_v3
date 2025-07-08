import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';

/**
 * Column Definition Interface
 */
export interface ColumnDef<T> {
  /**
   * Unique identifier for the column
   */
  id: string;
  /**
   * Column header text
   */
  header: string;
  /**
   * Accessor function or key to get cell data
   */
  accessor: keyof T | ((row: T) => any);
  /**
   * Custom cell renderer
   */
  cell?: (value: any, row: T, index: number) => React.ReactNode;
  /**
   * Whether the column is sortable
   */
  sortable?: boolean;
  /**
   * Whether the column is hidden on mobile
   */
  hiddenOnMobile?: boolean;
  /**
   * Column width behavior
   */
  width?: 'auto' | 'fixed' | number;
  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right';
  /**
   * CSS class for the column
   */
  className?: string;
  /**
   * CSS class for the header
   */
  headerClassName?: string;
  /**
   * Sticky column (left or right)
   */
  sticky?: 'left' | 'right';
}

/**
 * Sort Configuration
 */
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * DataTable Props
 */
export interface DataTableProps<T> {
  /**
   * Table data
   */
  data: T[];
  /**
   * Column definitions
   */
  columns: ColumnDef<T>[];
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Empty state message
   */
  emptyMessage?: string;
  /**
   * Enable row selection
   */
  selectable?: boolean;
  /**
   * Selected row IDs
   */
  selectedRows?: Set<string | number>;
  /**
   * Row selection change handler
   */
  onSelectionChange?: (selectedRows: Set<string | number>) => void;
  /**
   * Row ID accessor
   */
  getRowId?: (row: T, index: number) => string | number;
  /**
   * Sort configuration
   */
  sortConfig?: SortConfig;
  /**
   * Sort change handler
   */
  onSortChange?: (sortConfig: SortConfig | null) => void;
  /**
   * Row click handler
   */
  onRowClick?: (row: T, index: number) => void;
  /**
   * Enable hover effects
   */
  hover?: boolean;
  /**
   * Table size variant
   */
  size?: 'sm' | 'default' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Enable responsive behavior
   */
  responsive?: boolean;
  /**
   * Pagination component
   */
  pagination?: React.ReactNode;
}

/**
 * Loading Skeleton Row
 */
const SkeletonRow: React.FC<{ columnCount: number }> = ({ columnCount }) => (
  <tr>
    {Array.from({ length: columnCount }).map((_, index) => (
      <td key={index} className="px-4 py-3">
        <div className="skeleton-text w-3/4"></div>
      </td>
    ))}
  </tr>
);

/**
 * Sort Icon Component
 */
const SortIcon: React.FC<{ direction?: 'asc' | 'desc' }> = ({ direction }) => (
  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {direction === 'asc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    ) : direction === 'desc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    )}
  </svg>
);

/**
 * Professional DataTable Component
 * 
 * Features:
 * - Responsive design with mobile card layout fallback
 * - Column sorting with visual indicators
 * - Row selection with bulk actions
 * - Sticky headers and columns
 * - Loading states and empty states
 * - Customizable cell rendering
 * - Accessibility optimized
 * - Optimized for dense data display
 * 
 * @example
 * ```tsx
 * const columns: ColumnDef<Employee>[] = [
 *   {
 *     id: 'name',
 *     header: 'Name',
 *     accessor: 'name',
 *     sortable: true,
 *     sticky: 'left'
 *   },
 *   {
 *     id: 'salary',
 *     header: 'Salary',
 *     accessor: 'salary',
 *     cell: (value) => formatCurrency(value),
 *     align: 'right'
 *   }
 * ];
 * 
 * <DataTable 
 *   data={employees} 
 *   columns={columns}
 *   selectable
 *   responsive
 * />
 * ```
 */
export function DataTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  getRowId = (row, index) => index,
  sortConfig,
  onSortChange,
  onRowClick,
  hover = true,
  size = 'default',
  className,
  responsive = true,
  pagination,
}: DataTableProps<T>) {
  // Local sort state if not controlled
  const [localSortConfig, setLocalSortConfig] = useState<SortConfig | null>(null);
  
  const currentSortConfig = sortConfig || localSortConfig;

  // Handle sort changes
  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    let newSortConfig: SortConfig | null = null;

    if (!currentSortConfig || currentSortConfig.column !== columnId) {
      newSortConfig = { column: columnId, direction: 'asc' };
    } else if (currentSortConfig.direction === 'asc') {
      newSortConfig = { column: columnId, direction: 'desc' };
    } else {
      newSortConfig = null; // Clear sort
    }

    if (onSortChange) {
      onSortChange(newSortConfig);
    } else {
      setLocalSortConfig(newSortConfig);
    }
  };

  // Handle row selection
  const handleRowSelection = (rowId: string | number, checked: boolean) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    onSelectionChange(newSelection);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allIds = data.map((row, index) => getRowId(row, index));
      onSelectionChange(new Set(allIds));
    } else {
      onSelectionChange(new Set());
    }
  };

  // Check if all rows are selected
  const isAllSelected = data.length > 0 && selectedRows.size === data.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length;

  // Get cell value
  const getCellValue = (row: T, column: ColumnDef<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  // Size variants
  const sizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base',
  };

  const cellPadding = {
    sm: 'px-3 py-2',
    default: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  return (
    <div className={cn('bg-bg-surface border border-border-subtle rounded-lg overflow-hidden', className)}>
      {/* Desktop Table */}
      <div className={cn('overflow-x-auto', responsive && 'hidden md:block')}>
        <table className="w-full border-collapse">
          <thead className="bg-bg-surface border-b border-border-default">
            <tr>
              {/* Selection Header */}
              {selectable && (
                <th className={cn('sticky top-0 bg-bg-surface z-10', cellPadding[size])}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border-default focus:ring-primary"
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {/* Column Headers */}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    'sticky top-0 bg-bg-surface z-10 text-left font-medium text-text-primary border-b border-border-default',
                    cellPadding[size],
                    sizeClasses[size],
                    column.headerClassName,
                    column.sortable && 'cursor-pointer hover:bg-bg-interactive-hover',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sticky === 'left' && 'sticky left-0',
                    column.sticky === 'right' && 'sticky right-0'
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                  style={typeof column.width === 'number' ? { width: column.width } : undefined}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && (
                      <SortIcon 
                        direction={
                          currentSortConfig?.column === column.id 
                            ? currentSortConfig.direction 
                            : undefined
                        } 
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Loading Skeleton */}
            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonRow 
                    key={index} 
                    columnCount={columns.length + (selectable ? 1 : 0)} 
                  />
                ))}
              </>
            )}

            {/* Data Rows */}
            {!loading && data.map((row, index) => {
              const rowId = getRowId(row, index);
              const isSelected = selectedRows.has(rowId);

              return (
                <tr
                  key={rowId}
                  className={cn(
                    'border-b border-border-subtle',
                    hover && 'hover:bg-bg-interactive-hover',
                    onRowClick && 'cursor-pointer',
                    isSelected && 'bg-primary/5'
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {/* Selection Cell */}
                  {selectable && (
                    <td className={cellPadding[size]}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelection(rowId, e.target.checked);
                        }}
                        className="rounded border-border-default focus:ring-primary"
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}

                  {/* Data Cells */}
                  {columns.map((column) => {
                    const cellValue = getCellValue(row, column);
                    
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          cellPadding[size],
                          sizeClasses[size],
                          'text-text-secondary',
                          column.className,
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.sticky === 'left' && 'sticky left-0 bg-bg-surface',
                          column.sticky === 'right' && 'sticky right-0 bg-bg-surface'
                        )}
                        style={typeof column.width === 'number' ? { width: column.width } : undefined}
                      >
                        {column.cell ? column.cell(cellValue, row, index) : cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Empty State */}
            {!loading && data.length === 0 && (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  className={cn('text-center text-text-tertiary py-12', sizeClasses[size])}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <svg className="w-12 h-12 text-text-placeholder" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      {responsive && (
        <div className="md:hidden divide-y divide-border-subtle">
          {loading && (
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="skeleton-text w-3/4"></div>
                  <div className="skeleton-text w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && data.map((row, index) => {
            const rowId = getRowId(row, index);
            const isSelected = selectedRows.has(rowId);

            return (
              <div
                key={rowId}
                className={cn(
                  'p-4 space-y-3',
                  onRowClick && 'cursor-pointer hover:bg-bg-interactive-hover',
                  isSelected && 'bg-primary/5'
                )}
                onClick={() => onRowClick?.(row, index)}
              >
                {selectable && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRowSelection(rowId, e.target.checked);
                      }}
                      className="rounded border-border-default focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-text-tertiary">Select</span>
                  </div>
                )}

                {columns
                  .filter(column => !column.hiddenOnMobile)
                  .map((column) => {
                    const cellValue = getCellValue(row, column);
                    
                    return (
                      <div key={column.id} className="flex justify-between">
                        <span className="text-sm font-medium text-text-primary">
                          {column.header}:
                        </span>
                        <span className="text-sm text-text-secondary text-right">
                          {column.cell ? column.cell(cellValue, row, index) : cellValue}
                        </span>
                      </div>
                    );
                  })}
              </div>
            );
          })}

          {!loading && data.length === 0 && (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center space-y-2">
                <svg className="w-12 h-12 text-text-placeholder" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-text-tertiary">{emptyMessage}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="border-t border-border-subtle bg-bg-surface px-4 py-3">
          {pagination}
        </div>
      )}
    </div>
  );
}