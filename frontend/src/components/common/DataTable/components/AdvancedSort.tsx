import { useState } from 'react';
import type { Table, SortingState } from '@tanstack/react-table';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface AdvancedSortProps<TData> {
  table: Table<TData>;
  onSortingChange?: (sorting: SortingState) => void;
  className?: string;
}


export function AdvancedSort<TData>({
  table,
  onSortingChange,
  className,
}: AdvancedSortProps<TData>) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const currentSorting = table.getState().sorting;

  const getSortableColumns = () => {
    return table.getAllColumns().filter(column => 
      column.getCanSort() && column.id !== 'select' && column.id !== 'actions'
    );
  };

  const addSort = () => {
    const sortableColumns = getSortableColumns();
    if (sortableColumns.length === 0) return;

    // Find first column not already being sorted
    const availableColumn = sortableColumns.find(col => 
      !currentSorting.find(sort => sort.id === col.id)
    );

    if (!availableColumn) return;

    const newSort = { id: availableColumn.id, desc: false };
    const updatedSorting = [...currentSorting, newSort];
    
    table.setSorting(updatedSorting);
    onSortingChange?.(updatedSorting);
  };

  const updateSort = (index: number, updates: { column?: string; direction?: 'asc' | 'desc' }) => {
    const updatedSorting = currentSorting.map((sort, i) => {
      if (i === index) {
        return {
          id: updates.column || sort.id,
          desc: updates.direction === 'desc',
        };
      }
      return sort;
    });

    table.setSorting(updatedSorting);
    onSortingChange?.(updatedSorting);
  };

  const removeSort = (index: number) => {
    const updatedSorting = currentSorting.filter((_, i) => i !== index);
    table.setSorting(updatedSorting);
    onSortingChange?.(updatedSorting);
  };

  const clearAllSorting = () => {
    table.resetSorting();
    onSortingChange?.([]);
  };

  const moveSort = (index: number, direction: 'up' | 'down') => {
    const newSorting = [...currentSorting];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSorting.length) return;

    [newSorting[index], newSorting[targetIndex]] = [newSorting[targetIndex], newSorting[index]];
    
    table.setSorting(newSorting);
    onSortingChange?.(newSorting);
  };

  const sortableColumns = getSortableColumns();
  const availableColumns = sortableColumns.filter(col => 
    !currentSorting.find(sort => sort.id === col.id)
  );

  return (
    <div className={cn('advanced-sort', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline btn-sm gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
{String(t('sort.advanced'))}
        {currentSorting.length > 0 && (
          <span className="badge badge-primary badge-sm">{currentSorting.length}</span>
        )}
      </button>

      {/* Sort Panel */}
      {isOpen && (
        <div className="card bg-base-100 shadow-xl mt-2 w-full max-w-3xl">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title text-base">{String(t('sort.advancedSorting'))}</h3>
              <div className="flex gap-2">
                <button
                  onClick={addSort}
                  className="btn btn-primary btn-sm"
                  disabled={availableColumns.length === 0}
                >
{String(t('sort.addSort'))}
                </button>
                {currentSorting.length > 0 && (
                  <button
                    onClick={clearAllSorting}
                    className="btn btn-ghost btn-sm"
                  >
{String(t('sort.clearAll'))}
                  </button>
                )}
              </div>
            </div>

            {/* Sort Conditions */}
            <div className="space-y-3">
              {currentSorting.map((sort, index) => {
                const column = table.getColumn(sort.id);
                return (
                  <div key={sort.id} className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                    {/* Sort Priority */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs opacity-70">{String(t('sort.priority'))}</span>
                      <span className="badge badge-neutral badge-sm">{index + 1}</span>
                    </div>

                    {/* Column Selection */}
                    <div className="flex-1">
                      <label className="text-xs opacity-70">{String(t('sort.column'))}</label>
                      <select
                        value={sort.id}
                        onChange={(e) => updateSort(index, { column: e.target.value })}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value={sort.id}>
                          {typeof column?.columnDef.header === 'string' 
                            ? column.columnDef.header 
                            : sort.id}
                        </option>
                        {availableColumns.map(col => (
                          <option key={col.id} value={col.id}>
                            {typeof col.columnDef.header === 'string' 
                              ? col.columnDef.header 
                              : col.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Direction Selection */}
                    <div className="flex-1">
                      <label className="text-xs opacity-70">{String(t('sort.direction'))}</label>
                      <select
                        value={sort.desc ? 'desc' : 'asc'}
                        onChange={(e) => updateSort(index, { 
                          direction: e.target.value as 'asc' | 'desc'
                        })}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value="asc">{String(t('sort.ascending'))}</option>
                        <option value="desc">{String(t('sort.descending'))}</option>
                      </select>
                    </div>

                    {/* Move Controls */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveSort(index, 'up')}
                        disabled={index === 0}
                        className="btn btn-xs btn-ghost"
title={String(t('sort.moveUp'))}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveSort(index, 'down')}
                        disabled={index === currentSorting.length - 1}
                        className="btn btn-xs btn-ghost"
title={String(t('sort.moveDown'))}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Remove Sort */}
                    <button
                      onClick={() => removeSort(index)}
                      className="btn btn-ghost btn-sm btn-circle"
title={String(t('sort.remove'))}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}

              {currentSorting.length === 0 && (
                <div className="text-center py-8 text-base-content/60">
                  <p>{String(t('sort.noSortingApplied'))}</p>
                  <p className="text-sm mt-1">{String(t('sort.clickAddSortToStart'))}</p>
                </div>
              )}
            </div>

            {/* Sort Info */}
            {currentSorting.length > 1 && (
              <div className="mt-4 p-3 bg-info/10 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-info mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-info">{String(t('sort.multiSortInfo'))}</p>
                    <p className="text-base-content/70 mt-1">{String(t('sort.multiSortDescription'))}</p>
                  </div>
                </div>
              </div>
            )}

            {availableColumns.length === 0 && currentSorting.length > 0 && (
              <div className="mt-4 p-3 bg-warning/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-warning">{String(t('sort.allColumnsSorted'))}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}