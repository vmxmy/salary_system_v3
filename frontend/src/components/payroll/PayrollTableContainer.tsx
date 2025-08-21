import React, { useMemo, useCallback, useRef, type ReactNode } from 'react';
import { DataTable } from '@/components/common/DataTable';
import type { Table, PaginationState } from '@tanstack/react-table';

// 通用的薪资数据接口
export interface BasePayrollData {
  id?: string;
  payroll_id?: string;
  employee_id?: string;
  employee_name?: string;
  [key: string]: any;
}

// 操作配置接口
export interface ActionConfig<T = BasePayrollData> {
  key: string;
  label: string;
  onClick: (record: T) => void;
  icon?: ReactNode;
  title?: string;
  disabled?: (record: T) => boolean;
}

// 表格容器Props
export interface PayrollTableContainerProps<T extends BasePayrollData = BasePayrollData> {
  // 数据相关
  data: T[];
  columns: any[];
  loading?: boolean;
  
  // 选择相关
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  enableRowSelection?: boolean;
  
  // 操作相关
  actions?: ActionConfig<T>[];
  onViewDetail?: (record: T) => void;
  
  // 表格配置
  onTableReady?: (table: Table<T>) => void;
  initialSorting?: any[];
  initialPagination?: PaginationState;
  initialColumnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (updater: any) => void;
  
  // 显示控制
  showGlobalFilter?: boolean;
  showColumnToggle?: boolean;
  enableExport?: boolean;
  
  // 其他配置
  className?: string;
}

/**
 * 薪资表格容器组件
 * 统一处理选择列、操作列和行选择逻辑
 */
export function PayrollTableContainer<T extends BasePayrollData = BasePayrollData>({
  data,
  columns: baseColumns,
  loading = false,
  selectedIds,
  onSelectedIdsChange,
  enableRowSelection = true,
  actions = [],
  onViewDetail,
  onTableReady,
  initialSorting = [],
  initialPagination = { pageIndex: 0, pageSize: 20 },
  initialColumnVisibility = {},
  onColumnVisibilityChange,
  showGlobalFilter = false,
  showColumnToggle = false,
  enableExport = false,
  className = '',
}: PayrollTableContainerProps<T>) {
  
  // 使用ref存储最新数据，避免闭包问题
  const processedDataRef = useRef<T[]>([]);
  processedDataRef.current = data;

  // 默认查看详情操作
  const defaultViewDetailAction: ActionConfig<T> = useMemo(() => ({
    key: 'view-detail',
    label: '查看详情',
    title: '查看详情',
    onClick: onViewDetail || (() => {}),
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  }), [onViewDetail]);

  // 合并操作配置
  const allActions = useMemo(() => {
    const actionList = [...actions];
    if (onViewDetail && !actions.find(a => a.key === 'view-detail')) {
      actionList.unshift(defaultViewDetailAction);
    }
    return actionList;
  }, [actions, onViewDetail, defaultViewDetailAction]);

  // 生成操作列配置
  const actionsColumn = useMemo(() => {
    if (allActions.length === 0) return null;

    return {
      id: 'actions',
      accessorKey: 'actions',
      header: '操作',
      size: Math.max(80, allActions.length * 40),
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-1">
          {allActions.map((action) => {
            const record = row.original as T;
            const isDisabled = action.disabled?.(record) || false;
            
            return (
              <button
                key={action.key}
                className={`btn btn-ghost btn-xs ${isDisabled ? 'btn-disabled' : 'text-primary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDisabled) {
                    action.onClick(record);
                  }
                }}
                title={action.title || action.label}
                disabled={isDisabled}
              >
                {action.icon}
              </button>
            );
          })}
        </div>
      )
    };
  }, [allActions]);

  // 生成选择列配置
  const selectColumn = useMemo(() => {
    if (!enableRowSelection) return null;

    return {
      id: 'select',
      header: ({ table }: any) => {
        const isAllSelected = data.length > 0 && selectedIds.length === data.length;
        const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;
        
        return (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate;
            }}
            onChange={(e) => {
              if (e.target.checked) {
                // 全选：选择所有数据
                const allIds = data.map(item => item.id || item.payroll_id).filter(Boolean) as string[];
                onSelectedIdsChange(allIds);
              } else {
                // 取消全选
                onSelectedIdsChange([]);
              }
            }}
            title={isAllSelected ? "取消全选" : "全选所有数据"}
          />
        );
      },
      cell: ({ row }: any) => {
        const rowId = row.original.id || row.original.payroll_id;
        return (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={selectedIds.includes(rowId)}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectedIdsChange([...selectedIds, rowId]);
              } else {
                onSelectedIdsChange(selectedIds.filter(id => id !== rowId));
              }
            }}
            title="选择此行"
          />
        );
      },
      size: 50,
      enableSorting: false,
      enableColumnFilter: false,
    };
  }, [enableRowSelection, data, selectedIds, onSelectedIdsChange]);

  // 组装完整的列配置
  const columns = useMemo(() => {
    const cols = [];
    
    // 添加选择列
    if (selectColumn) {
      cols.push(selectColumn);
    }
    
    // 添加基础列
    cols.push(...baseColumns);
    
    // 添加操作列
    if (actionsColumn) {
      cols.push(actionsColumn);
    }
    
    return cols;
  }, [selectColumn, baseColumns, actionsColumn]);

  // 处理行选择变化
  const handleRowSelectionChange = useCallback((rowSelection: any) => {
    // 使用 setTimeout 延迟状态更新，避免在渲染过程中更新状态
    setTimeout(() => {
      const selectedRows = Object.keys(rowSelection)
        .filter(key => rowSelection[key])
        .map(index => {
          const rowIndex = parseInt(index);
          const row = processedDataRef.current[rowIndex];
          return row?.id || row?.payroll_id;
        })
        .filter(Boolean) as string[];
      onSelectedIdsChange(selectedRows);
    }, 0);
  }, [onSelectedIdsChange]);

  return (
    <div className={`payroll-table-container ${className}`}>
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        onTableReady={onTableReady}
        initialSorting={initialSorting}
        initialPagination={initialPagination}
        initialColumnVisibility={initialColumnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
        enableRowSelection={enableRowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        showGlobalFilter={showGlobalFilter}
        showColumnToggle={showColumnToggle}
        enableExport={enableExport}
      />
    </div>
  );
}

export default PayrollTableContainer;