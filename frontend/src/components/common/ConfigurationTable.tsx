import React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';

interface ConfigurationTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  loading?: boolean;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  selection?: {
    enableRowSelection: boolean;
    onRowSelectionChange?: (selectedRows: T[]) => void;
  };
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
}

export function ConfigurationTable<T>({
  data,
  columns,
  loading = false,
  pagination,
  selection,
  emptyMessage = '暂无配置数据',
  className = '',
  onRowClick,
  onRowDoubleClick
}: ConfigurationTableProps<T>) {
  
  // 为配置表格添加通用的行为增强
  const enhancedColumns = React.useMemo(() => {
    return columns.map(column => {
      // 为每一列添加通用的样式和行为
      if (column.id === 'select') {
        return column; // 选择列保持不变
      }
      
      return {
        ...column,
        cell: (info: any) => {
          const originalCell = typeof column.cell === 'function' ? column.cell(info) : info.getValue();
          
          return (
            <div
              className={`
                ${onRowClick ? 'cursor-pointer' : ''}
                ${onRowDoubleClick ? 'select-none' : ''}
              `}
              onClick={onRowClick ? () => onRowClick(info.row.original) : undefined}
              onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(info.row.original) : undefined}
            >
              {originalCell}
            </div>
          );
        }
      };
    });
  }, [columns, onRowClick, onRowDoubleClick]);

  return (
    <DataTable
      data={data}
      columns={enhancedColumns}
      loading={loading}
      pagination={pagination}
      selection={selection}
      sorting={{
        enableSorting: true,
      }}
      emptyMessage={emptyMessage}
      className={className}
    />
  );
}

// 预定义的列创建助手函数
export const ConfigurationColumns = {
  // 选择列
  selection: <T,>(): ColumnDef<T, any> => ({
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        className="checkbox checkbox-sm"
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="checkbox checkbox-sm"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    enableSorting: false,
    enableGlobalFilter: false,
  }),

  // 状态列
  status: <T,>(
    accessor: keyof T,
    activeText: string = '启用',
    inactiveText: string = '停用'
  ): ColumnDef<T, any> => ({
    accessorKey: accessor as string,
    header: '状态',
    size: 80,
    cell: ({ getValue }) => {
      const isActive = getValue<boolean>();
      return (
        <span className={`badge badge-sm whitespace-nowrap ${isActive ? 'badge-success' : 'badge-error'}`}>
          {isActive ? activeText : inactiveText}
        </span>
      );
    },
  }),

  // 日期列
  date: <T,>(
    accessor: keyof T,
    header: string,
    format: 'date' | 'datetime' = 'date'
  ): ColumnDef<T, any> => ({
    accessorKey: accessor as string,
    header,
    size: format === 'datetime' ? 150 : 100,
    cell: ({ getValue }) => {
      const date = getValue<string>();
      if (!date) return <span className="text-base-content/50">-</span>;
      
      const dateObj = new Date(date);
      const formattedDate = format === 'datetime' 
        ? dateObj.toLocaleString('zh-CN')
        : dateObj.toLocaleDateString('zh-CN');
      
      return <span className="text-sm">{formattedDate}</span>;
    },
  }),

  // 操作列
  actions: <T,>(
    actions: Array<{
      label: string;
      icon?: React.ReactNode;
      onClick: (row: T) => void;
      variant?: 'primary' | 'secondary' | 'error' | 'ghost';
      show?: (row: T) => boolean;
    }>
  ): ColumnDef<T, any> => ({
    id: 'actions',
    header: '操作',
    size: actions.length * 60,
    cell: ({ row }) => (
      <div className="flex gap-1">
        {actions
          .filter(action => !action.show || action.show(row.original))
          .map((action, index) => {
            const variantClasses = {
              primary: 'btn-primary',
              secondary: 'btn-secondary',
              error: 'btn-error',
              ghost: 'btn-ghost'
            };
            
            return (
              <button
                key={index}
                className={`btn btn-xs ${variantClasses[action.variant || 'ghost']}`}
                onClick={(e) => {
                  e.stopPropagation(); // 防止触发行点击事件
                  action.onClick(row.original);
                }}
                title={action.label}
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            );
          })}
      </div>
    ),
    enableSorting: false,
    enableGlobalFilter: false,
  }),

  // 百分比列
  percentage: <T,>(
    accessor: keyof T,
    header: string,
    decimals: number = 2
  ): ColumnDef<T, any> => ({
    accessorKey: accessor as string,
    header,
    cell: ({ getValue }) => {
      const value = getValue<number>() || 0;
      return (
        <span className="text-sm">
          {(value * 100).toFixed(decimals)}%
        </span>
      );
    },
  }),

  // 货币列
  currency: <T,>(
    accessor: keyof T,
    header: string,
    symbol: string = '¥'
  ): ColumnDef<T, any> => ({
    accessorKey: accessor as string,
    header,
    cell: ({ getValue }) => {
      const value = getValue<number>() || 0;
      return (
        <span className="text-sm">
          {symbol}{value.toLocaleString()}
        </span>
      );
    },
  }),

  // 标签列
  badge: <T,>(
    accessor: keyof T,
    header: string,
    badgeMap?: Record<string, { label: string; variant: string }>
  ): ColumnDef<T, any> => ({
    accessorKey: accessor as string,
    header,
    cell: ({ getValue }) => {
      const value = getValue<string>();
      const badge = badgeMap?.[value];
      
      return (
        <span className={`badge badge-sm ${badge?.variant || 'badge-outline'}`}>
          {badge?.label || value}
        </span>
      );
    },
  }),

  // 范围列（如基数范围）
  range: <T,>(
    minAccessor: keyof T,
    maxAccessor: keyof T,
    header: string,
    separator: string = ' - '
  ): ColumnDef<T, any> => ({
    id: `${String(minAccessor)}_${String(maxAccessor)}_range`,
    header,
    cell: ({ row }) => {
      const min = row.original[minAccessor] as number || 0;
      const max = row.original[maxAccessor] as number || 0;
      return (
        <span className="text-sm">
          {min.toLocaleString()}{separator}{max.toLocaleString()}
        </span>
      );
    },
  }),

  // 多标签列（如适用人员类别）
  multiTags: <T,>(
    accessor: keyof T,
    header: string,
    options: Array<{ value: string; label: string }>,
    maxVisible: number = 2,
    emptyText: string = '全部适用'
  ): ColumnDef<T, any> => ({
    accessorKey: accessor as string,
    header,
    size: 180,
    cell: ({ getValue }) => {
      const tags = getValue<string[] | null>();
      if (!tags || tags.length === 0) {
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm text-base-content/60">{emptyText}</span>
            <div className="tooltip" data-tip="未指定具体类别，适用于所有选项">
              <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col gap-1 min-w-0 max-w-[180px]">
          {tags.slice(0, maxVisible).map((tagId, index) => {
            const option = options.find(opt => opt.value === tagId);
            return (
              <span key={index} className="badge badge-outline badge-xs whitespace-nowrap w-fit">
                {option?.label || tagId}
              </span>
            );
          })}
          {tags.length > maxVisible && (
            <div className="tooltip" data-tip={`共${tags.length}个选项：${tags.map(tagId => {
              const option = options.find(opt => opt.value === tagId);
              return option?.label || tagId;
            }).join('、')}`}>
              <span className="badge badge-outline badge-xs w-fit">
                +{tags.length - maxVisible}
              </span>
            </div>
          )}
        </div>
      );
    },
  })
};

// 配置表格的快捷方式组件
interface QuickConfigurationTableProps<T> {
  data: T[];
  title: string;
  loading?: boolean;
  pagination: any;
  selection: any;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onToggleStatus?: (item: T) => void;
  customColumns?: ColumnDef<T, any>[];
  emptyMessage?: string;
}

export function QuickConfigurationTable<T extends { id: string; is_active?: boolean }>({
  data,
  title,
  loading,
  pagination,
  selection,
  onEdit,
  onDelete,
  onToggleStatus,
  customColumns = [],
  emptyMessage
}: QuickConfigurationTableProps<T>) {
  
  const columns = React.useMemo<ColumnDef<T, any>[]>(() => [
    ConfigurationColumns.selection<T>(),
    ...customColumns,
    ConfigurationColumns.status<T>('is_active' as keyof T),
    ConfigurationColumns.actions<T>([
      ...(onEdit ? [{
        label: '编辑',
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>,
        onClick: onEdit,
        variant: 'ghost' as const
      }] : []),
      ...(onToggleStatus ? [{
        label: '切换状态',
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>,
        onClick: onToggleStatus,
        variant: 'secondary' as const
      }] : []),
      ...(onDelete ? [{
        label: '删除',
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>,
        onClick: onDelete,
        variant: 'error' as const
      }] : [])
    ])
  ], [customColumns, onEdit, onDelete, onToggleStatus]);

  return (
    <ConfigurationTable
      data={data}
      columns={columns}
      loading={loading}
      pagination={pagination}
      selection={selection}
      emptyMessage={emptyMessage || `暂无${title}数据`}
    />
  );
}