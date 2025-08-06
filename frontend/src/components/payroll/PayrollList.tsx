import { useState, useMemo } from 'react';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { PayrollStatusBadge } from './PayrollStatusBadge';
import { formatCurrency, formatDate, formatMonth } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import type { ColumnDef } from '@tanstack/react-table';
import type { PayrollStatusType } from '@/services/payroll.service';

interface PayrollData {
  id: string;
  employee?: {
    id: string;
    full_name: string;
    id_number: string;
  };
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: PayrollStatusType;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  created_at: string;
  updated_at: string;
}

interface PayrollListProps {
  data: PayrollData[];
  loading?: boolean;
  totalRows?: number;
  pageCount?: number;
  currentPage?: number;
  onPaginationChange?: (state: { pageIndex: number; pageSize: number }) => void;
  onRowClick?: (payroll: PayrollData) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  enableSelection?: boolean;
  actions?: {
    onView?: (payroll: PayrollData) => void;
    onEdit?: (payroll: PayrollData) => void;
    onDelete?: (payroll: PayrollData) => void;
    onStatusChange?: (payroll: PayrollData) => void;
  };
}

export function PayrollList({
  data,
  loading = false,
  totalRows,
  pageCount,
  currentPage,
  onPaginationChange,
  onRowClick,
  onSelectionChange,
  enableSelection = false,
  actions
}: PayrollListProps) {
  const { t } = useTranslation(['payroll', 'common']);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<PayrollData>[]>(() => {
    const cols: ColumnDef<PayrollData>[] = [
      {
        accessorKey: 'employee.full_name',
        header: t('payroll:employee'),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-base-content">
              {row.original.employee?.full_name || '-'}
            </p>
            <p className="text-xs text-base-content/60">
              {row.original.employee?.id_number || '-'}
            </p>
          </div>
        ),
      },
      {
        id: 'payPeriod',
        header: t('payroll:payPeriod'),
        cell: ({ row }) => {
          // 从开始日期提取年月
          const yearMonth = row.original.pay_period_start.substring(0, 7);
          return (
            <div className="text-sm">
              <p className="text-base-content font-medium">
                {formatMonth(yearMonth)}
              </p>
              <p className="text-xs text-base-content/60">
                {t('payroll:payDate')}: {formatDate(row.original.pay_date)}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t('common:common.status'),
        cell: ({ row }) => (
          <PayrollStatusBadge status={row.original.status} size="sm" showIcon={false} />
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: 'gross_pay',
        header: t('payroll:grossPay'),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-success tabular-nums">
            {formatCurrency(row.original.gross_pay)}
          </span>
        ),
      },
      {
        accessorKey: 'total_deductions',
        header: t('payroll:deductions'),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-error tabular-nums">
            -{formatCurrency(row.original.total_deductions)}
          </span>
        ),
      },
      {
        accessorKey: 'net_pay',
        header: t('payroll:netPay'),
        cell: ({ row }) => (
          <span className="text-sm font-bold text-primary tabular-nums">
            {formatCurrency(row.original.net_pay)}
          </span>
        ),
      },
    ];

    return cols;
  }, [t]);

  const rowClickHandler = onRowClick ? {
    onRowClick: (row: PayrollData) => onRowClick(row),
  } : {};

  const actionsColumn = actions ? (row: PayrollData) => (
    <>
      {actions.onView && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.onView!(row);
          }}
          className="btn btn-ghost btn-xs"
          title={t('common:common.view')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      )}
      {actions.onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.onEdit!(row);
          }}
          className="btn btn-ghost btn-xs"
          title={t('common:common.edit')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {actions.onStatusChange && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.onStatusChange!(row);
          }}
          className="btn btn-ghost btn-xs"
          title={t('payroll:changeStatus')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      )}
      {actions.onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.onDelete!(row);
          }}
          className="btn btn-ghost btn-xs text-error"
          title={t('common:common.delete')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </>
  ) : undefined;

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      pageCount={pageCount}
      totalRows={totalRows}
      currentPage={currentPage}
      onPaginationChange={onPaginationChange}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      enableRowSelection={enableSelection}
      onRowSelectionChange={(rowSelection) => {
        if (onSelectionChange) {
          const selectedRows = Object.keys(rowSelection)
            .filter(key => rowSelection[key])
            .map(index => data[parseInt(index)]?.id)
            .filter(Boolean);
          onSelectionChange(selectedRows);
        }
      }}
      actions={actionsColumn}
      emptyMessage={t('payroll:noPayrollRecords')}
      {...rowClickHandler}
    />
  );
}