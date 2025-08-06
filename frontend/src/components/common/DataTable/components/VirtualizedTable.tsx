import { useMemo, useRef, useCallback } from 'react';
import { flexRender, type Table } from '@tanstack/react-table';
import { FixedSizeList as List } from 'react-window';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface VirtualizedTableProps<TData> {
  table: Table<TData>;
  height?: number;
  rowHeight?: number;
  overscan?: number;
  className?: string;
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  onRowDoubleClick?: (row: TData) => void;
  striped?: boolean;
  hover?: boolean;
}

export function VirtualizedTable<TData>({
  table,
  height = 400,
  rowHeight = 48,
  overscan = 5,
  className,
  loading = false,
  onRowClick,
  onRowDoubleClick,
  striped = false,
  hover = true,
}: VirtualizedTableProps<TData>) {
  const { t } = useTranslation('common');
  const listRef = useRef<List>(null);
  
  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();

  // Calculate column widths for sticky positioning
  const columnWidths = useMemo(() => {
    const widths: number[] = [];
    let totalWidth = 0;
    
    headerGroups[0]?.headers.forEach((header, index) => {
      const columnSize = header.getSize();
      widths[index] = columnSize;
      totalWidth += columnSize;
    });
    
    return { widths, totalWidth };
  }, [headerGroups]);

  // Row renderer for react-window
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = rows[index];
    
    if (!row) return null;

    return (
      <div
        style={style}
        className={cn(
          'flex items-center border-b border-base-300 transition-colors duration-150',
          hover && 'hover:bg-base-200',
          striped && index % 2 === 1 && 'bg-base-100',
          'cursor-pointer'
        )}
        onClick={() => onRowClick?.(row.original)}
        onDoubleClick={() => onRowDoubleClick?.(row.original)}
      >
        {row.getVisibleCells().map((cell, cellIndex) => (
          <div
            key={cell.id}
            className={cn(
              'flex items-center px-4 py-2 text-sm truncate',
              cell.column.id === 'select' && 'justify-center',
              cell.column.id === 'actions' && 'justify-end'
            )}
            style={{
              width: columnWidths.widths[cellIndex] || 150,
              minWidth: columnWidths.widths[cellIndex] || 150,
              maxWidth: columnWidths.widths[cellIndex] || 150,
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        ))}
      </div>
    );
  }, [rows, columnWidths, hover, striped, onRowClick, onRowDoubleClick]);

  // Loading state
  if (loading) {
    return (
      <div className={cn('border border-base-300 rounded-lg', className)}>
        {/* Header */}
        <div className="bg-base-200">
          {headerGroups.map(headerGroup => (
            <div key={headerGroup.id} className="flex">
              {headerGroup.headers.map((header, index) => (
                <div
                  key={header.id}
                  className="flex items-center px-4 py-3 text-sm font-medium text-base-content/80 border-r border-base-300 last:border-r-0"
                  style={{
                    width: columnWidths.widths[index] || 150,
                    minWidth: columnWidths.widths[index] || 150,
                    maxWidth: columnWidths.widths[index] || 150,
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Loading Content */}
        <div style={{ height }} className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="loading loading-spinner loading-md"></span>
            <span className="text-base-content/60">{String(t('table.loading'))}</span>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (rows.length === 0) {
    return (
      <div className={cn('border border-base-300 rounded-lg', className)}>
        {/* Header */}
        <div className="bg-base-200">
          {headerGroups.map(headerGroup => (
            <div key={headerGroup.id} className="flex">
              {headerGroup.headers.map((header, index) => (
                <div
                  key={header.id}
                  className="flex items-center px-4 py-3 text-sm font-medium text-base-content/80 border-r border-base-300 last:border-r-0"
                  style={{
                    width: columnWidths.widths[index] || 150,
                    minWidth: columnWidths.widths[index] || 150,
                    maxWidth: columnWidths.widths[index] || 150,
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Empty Content */}
        <div style={{ height }} className="flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-base-content/60 mb-2">{String(t('table.noData'))}</p>
            <p className="text-sm text-base-content/40">{String(t('table.noDataDescription'))}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border border-base-300 rounded-lg overflow-hidden', className)}>
      {/* Sticky Header */}
      <div className="bg-base-200 sticky top-0 z-10 border-b border-base-300">
        {headerGroups.map(headerGroup => (
          <div key={headerGroup.id} className="flex">
            {headerGroup.headers.map((header, index) => (
              <div
                key={header.id}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium text-base-content/80 border-r border-base-300 last:border-r-0',
                  header.column.getCanSort() && 'cursor-pointer select-none hover:bg-base-300',
                  header.column.getIsSorted() && 'bg-primary/10'
                )}
                style={{
                  width: columnWidths.widths[index] || 150,
                  minWidth: columnWidths.widths[index] || 150,
                  maxWidth: columnWidths.widths[index] || 150,
                }}
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="flex items-center gap-2 w-full">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                  
                  {/* Sort Indicator */}
                  {header.column.getCanSort() && (
                    <div className="flex flex-col ml-auto">
                      {header.column.getIsSorted() === 'asc' ? (
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Virtualized Body */}
      <List
        ref={listRef}
        height={height}
        itemCount={rows.length}
        itemSize={rowHeight}
        overscanCount={overscan}
        width="100%"
      >
        {Row}
      </List>

      {/* Table Footer with Row Count */}
      <div className="bg-base-200 px-4 py-2 text-xs text-base-content/60 border-t border-base-300">
        {String(t('table.showingRows', { 
          from: 1, 
          to: rows.length, 
          total: rows.length 
        }))}
      </div>
    </div>
  );
}