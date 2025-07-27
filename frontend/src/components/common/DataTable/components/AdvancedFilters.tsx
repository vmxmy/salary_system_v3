import { useState } from 'react';
import type { Table } from '@tanstack/react-table';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface AdvancedFiltersProps<TData> {
  table: Table<TData>;
  onFiltersChange?: (filters: any[]) => void;
  className?: string;
}

interface FilterCondition {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: string | number | string[];
  secondValue?: string | number; // for 'between' operator
}

export function AdvancedFilters<TData>({
  table,
  onFiltersChange,
  className,
}: AdvancedFiltersProps<TData>) {
  const { t } = useTranslation('common');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const operators = [
    { value: 'equals', label: t('filter.equals') },
    { value: 'contains', label: t('filter.contains') },
    { value: 'startsWith', label: t('filter.startsWith') },
    { value: 'endsWith', label: t('filter.endsWith') },
    { value: 'greaterThan', label: t('filter.greaterThan') },
    { value: 'lessThan', label: t('filter.lessThan') },
    { value: 'between', label: t('filter.between') },
    { value: 'in', label: t('filter.in') },
  ];

  const getFilterableColumns = () => {
    return table.getAllColumns().filter(column => 
      column.getCanFilter() && column.id !== 'select' && column.id !== 'actions'
    );
  };

  const addFilter = () => {
    const filterableColumns = getFilterableColumns();
    if (filterableColumns.length === 0) return;

    const newFilter: FilterCondition = {
      column: filterableColumns[0].id,
      operator: 'contains',
      value: '',
    };

    const updatedFilters = [...filters, newFilter];
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const updatedFilters = filters.map((filter, i) =>
      i === index ? { ...filter, ...updates } : filter
    );
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
    
    // Apply filter to table
    applyFiltersToTable(updatedFilters);
  };

  const removeFilter = (index: number) => {
    const updatedFilters = filters.filter((_, i) => i !== index);
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
    applyFiltersToTable(updatedFilters);
  };

  const clearAllFilters = () => {
    setFilters([]);
    table.resetColumnFilters();
    onFiltersChange?.([]);
  };

  const applyFiltersToTable = (currentFilters: FilterCondition[]) => {
    // Convert our custom filters to TanStack Table format
    const tableFilters = currentFilters.map(filter => ({
      id: filter.column,
      value: filter.operator === 'between' 
        ? [filter.value, filter.secondValue]
        : filter.operator === 'in'
        ? filter.value.toString().split(',').map(v => v.trim())
        : filter.value,
    }));

    table.setColumnFilters(tableFilters);
  };

  const filterableColumns = getFilterableColumns();

  return (
    <div className={cn('advanced-filters', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline btn-sm gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
        </svg>
        {t('filter.advanced')}
        {filters.length > 0 && (
          <span className="badge badge-primary badge-sm">{filters.length}</span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="card bg-base-100 shadow-xl mt-2 w-full max-w-4xl">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title text-base">{t('filter.advancedFilters')}</h3>
              <div className="flex gap-2">
                <button
                  onClick={addFilter}
                  className="btn btn-primary btn-sm"
                  disabled={filterableColumns.length === 0}
                >
                  {t('filter.addFilter')}
                </button>
                {filters.length > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="btn btn-ghost btn-sm"
                  >
                    {t('filter.clearAll')}
                  </button>
                )}
              </div>
            </div>

            {/* Filter Conditions */}
            <div className="space-y-3">
              {filters.map((filter, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                  {/* Column Selection */}
                  <select
                    value={filter.column}
                    onChange={(e) => updateFilter(index, { column: e.target.value })}
                    className="select select-bordered select-sm min-w-32"
                  >
                    {filterableColumns.map(column => (
                      <option key={column.id} value={column.id}>
                        {typeof column.columnDef.header === 'string' 
                          ? column.columnDef.header 
                          : column.id}
                      </option>
                    ))}
                  </select>

                  {/* Operator Selection */}
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { 
                      operator: e.target.value as FilterCondition['operator']
                    })}
                    className="select select-bordered select-sm min-w-32"
                  >
                    {operators.map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value Input */}
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder={t('filter.enterValue')}
                    className="input input-bordered input-sm flex-1"
                  />

                  {/* Second Value for Between */}
                  {filter.operator === 'between' && (
                    <>
                      <span className="text-sm opacity-70">{t('filter.and')}</span>
                      <input
                        type="text"
                        value={filter.secondValue || ''}
                        onChange={(e) => updateFilter(index, { secondValue: e.target.value })}
                        placeholder={t('filter.enterSecondValue')}
                        className="input input-bordered input-sm flex-1"
                      />
                    </>
                  )}

                  {/* Remove Filter */}
                  <button
                    onClick={() => removeFilter(index)}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {filters.length === 0 && (
                <div className="text-center py-8 text-base-content/60">
                  <p>{t('filter.noFiltersAdded')}</p>
                  <p className="text-sm mt-1">{t('filter.clickAddFilterToStart')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}