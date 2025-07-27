import { type Column } from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTableColumnFilter } from './DataTableColumnFilter';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
  enableFilter?: boolean;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  enableFilter = true,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const canSort = column.getCanSort();
  const canFilter = column.getCanFilter();

  if (!canSort && !canFilter) {
    return <div className={cn("text-base", className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* Sort button */}
      <div className="flex items-center space-x-1">
        {canSort ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              column.toggleSorting();
            }}
            className="flex items-center gap-1 hover:text-base-content/80 transition-colors"
          >
            <span className={"text-base"}>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : column.getIsSorted() === 'asc' ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
            )}
          </button>
        ) : (
          <span className={"text-base"}>{title}</span>
        )}
      </div>

      {/* Filter button */}
      {canFilter && enableFilter && (
        <DataTableColumnFilter column={column} />
      )}
    </div>
  );
}