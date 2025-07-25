import { useState, useRef, useEffect } from 'react';
import { type Column } from '@tanstack/react-table';
import { FilterIcon, XIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface DataTableColumnFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
  className?: string;
}

export function DataTableColumnFilter<TData, TValue>({
  column,
  className
}: DataTableColumnFilterProps<TData, TValue>) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [filterValue, setFilterValue] = useState<string>((column.getFilterValue() as string) ?? '');
  const filterRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close filter
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    column.setFilterValue(value || undefined);
  };

  const handleClearFilter = () => {
    setFilterValue('');
    column.setFilterValue(undefined);
    setIsOpen(false);
  };

  const isFiltered = column.getIsFiltered();

  return (
    <div className={cn('relative', className)} ref={filterRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'btn btn-ghost btn-xs p-1 h-6 w-6',
          isFiltered && 'text-primary'
        )}
        title={t('common.filter')}
      >
        <FilterIcon className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute top-8 left-0 z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg p-3 min-w-48">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('common.filter')}
              </span>
              {isFiltered && (
                <button
                  onClick={handleClearFilter}
                  className="btn btn-ghost btn-xs p-1"
                  title={t('common.clear')}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              )}
            </div>
            
            <input
              type="text"
              value={filterValue}
              onChange={(e) => handleFilterChange(e.target.value)}
              placeholder={t('placeholder.filterColumn')}
              className="input input-sm w-full"
              autoFocus
            />

            {/* For future enhancement: Add dropdown for specific filter types */}
            <div className="text-xs text-base-content/60">
              {t('common.filterHelp')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}