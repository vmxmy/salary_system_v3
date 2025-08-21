import React, { useMemo, useCallback, useRef, type ReactNode } from 'react';
import { DataTable } from '@/components/common/DataTable';
import type { Table, PaginationState } from '@tanstack/react-table';
import type { EmployeeListItem } from '@/types/employee';

// 通用的员工数据接口
export interface BaseEmployeeData {
  employee_id?: string;
  employee_name?: string;
  department_name?: string;
  position_name?: string;
  status?: string;
  [key: string]: any;
}

// 操作配置接口
export interface EmployeeActionConfig<T = BaseEmployeeData> {
  key: string;
  label: string;
  onClick: (record: T) => void;
  icon?: ReactNode;
  title?: string;
  disabled?: (record: T) => boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

// 员工表格容器Props
export interface EmployeeTableContainerProps<T extends BaseEmployeeData = BaseEmployeeData> {
  // 数据相关
  data: T[];
  columns: any[];
  loading?: boolean;
  error?: string;
  
  // 选择相关
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  enableRowSelection?: boolean;
  
  // 操作相关
  actions?: EmployeeActionConfig<T>[];
  onViewDetail?: (record: T) => void;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  
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
  striped?: boolean;
  compact?: boolean;
  
  // 样式相关
  className?: string;
  tableClassName?: string;
}

/**
 * 员工表格容器组件
 * 基于通用DataTable，为员工管理提供专门的配置和功能
 */
export function EmployeeTableContainer<T extends BaseEmployeeData = BaseEmployeeData>({
  data,
  columns,
  loading = false,
  error,
  selectedIds = [],
  onSelectedIdsChange,
  enableRowSelection = false,
  actions,
  onViewDetail,
  onEdit,
  onDelete,
  onTableReady,
  initialSorting = [{ id: 'employee_name', desc: false }],
  initialPagination = { pageSize: 20, pageIndex: 0 },
  initialColumnVisibility = {},
  onColumnVisibilityChange,
  showGlobalFilter = true,
  showColumnToggle = true,
  enableExport = true,
  striped = true,
  compact = false,
  className = '',
  tableClassName = '',
}: EmployeeTableContainerProps<T>) {
  const tableRef = useRef<Table<T>>(null);

  // 处理行选择变化
  const handleRowSelectionChange = useCallback((selectedRowIds: string[]) => {
    onSelectedIdsChange?.(selectedRowIds);
  }, [onSelectedIdsChange]);

  // 处理表格实例准备就绪
  const handleTableReady = useCallback((table: Table<T>) => {
    tableRef.current = table;
    onTableReady?.(table);
  }, [onTableReady]);

  // 行选择配置
  const rowSelection = useMemo(() => {
    if (!enableRowSelection) return undefined;
    
    const selectionMap: Record<string, boolean> = {};
    selectedIds.forEach(id => {
      selectionMap[id] = true;
    });
    return selectionMap;
  }, [selectedIds, enableRowSelection]);

  // 表格配置
  const tableProps = useMemo(() => ({
    data,
    columns,
    loading,
    error,
    // 分页配置
    initialPagination,
    // 排序配置
    initialSorting,
    // 列可见性配置
    initialColumnVisibility,
    onColumnVisibilityChange,
    // 行选择配置
    enableRowSelection,
    rowSelection,
    onRowSelectionChange: handleRowSelectionChange,
    // 表格实例回调
    onTableReady: handleTableReady,
    // 样式配置
    striped,
    compact,
    className: `employee-table ${tableClassName}`.trim(),
    // 功能开关
    showGlobalFilter,
    showColumnToggle,
    enableExport,
  }), [
    data,
    columns,
    loading,
    error,
    initialPagination,
    initialSorting,
    initialColumnVisibility,
    onColumnVisibilityChange,
    enableRowSelection,
    rowSelection,
    handleRowSelectionChange,
    handleTableReady,
    striped,
    compact,
    tableClassName,
    showGlobalFilter,
    showColumnToggle,
    enableExport
  ]);

  return (
    <div className={`employee-table-container ${className}`.trim()}>
      <DataTable {...tableProps as any} />
    </div>
  );
}

// 导出类型
export type { EmployeeListItem };