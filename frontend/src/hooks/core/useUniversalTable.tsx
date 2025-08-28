import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSmartTableColumns, type TableOptions } from './useSmartTableColumns';
import { getTableConfig, type TableConfiguration } from '@/lib/tableConfig';
import { getOptimizedConfig } from '@/lib/performanceConfig';

// 通用表格选项接口
export interface UniversalTableOptions extends TableOptions {
  // 数据筛选
  filters?: Record<string, any>;
  // 权限控制
  permissions?: string[];
  // 操作回调
  actionCallbacks?: {
    onEdit?: (data: any) => void;
    onDelete?: (data: any) => void;
    onView?: (data: any) => void;
  };
  // 分页配置
  pagination?: {
    pageSize?: number;
    pageIndex?: number;
  };
  // 排序配置
  sorting?: Array<{
    id: string;
    desc: boolean;
  }>;
  // 是否启用实时更新
  enableRealtime?: boolean;
}

// 表格操作按钮组件
export interface TableAction {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  onClick: (data: any) => void;
  disabled?: (data: any) => boolean;
  visible?: (data: any) => boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
}

// 生成表格操作按钮
function generateTableActions(
  tableName: string,
  permissions?: string[],
  actionCallbacks?: {
    onEdit?: (data: any) => void;
    onDelete?: (data: any) => void;
    onView?: (data: any) => void;
  }
): TableAction[] {
  const actions: TableAction[] = [];
  const perms = permissions || [];

  if (perms.includes('view') || perms.includes('detail')) {
    actions.push({
      key: 'view',
      label: '查看',
      onClick: actionCallbacks?.onView || ((data) => {
        console.log('View action:', data);
      }),
      variant: 'ghost',
    });
  }

  if (perms.includes('update') || perms.includes('edit')) {
    actions.push({
      key: 'edit',
      label: '编辑',
      onClick: actionCallbacks?.onEdit || ((data) => {
        console.log('Edit action:', data);
      }),
      variant: 'primary',
    });
  }

  if (perms.includes('delete')) {
    actions.push({
      key: 'delete',
      label: '删除',
      onClick: actionCallbacks?.onDelete || ((data) => {
        console.log('Delete action:', data);
      }),
      variant: 'error',
    });
  }

  return actions;
}

// 表格操作列渲染器 - 返回可点击的按钮组件
function createActionsRenderer(actions: TableAction[]) {
  return ({ row }: { row: any }) => {
    const data = row.original;
    const visibleActions = actions.filter(action => 
      !action.visible || action.visible(data)
    );

    if (visibleActions.length === 0) {
      return null;
    }

    // 返回可点击的按钮组合
    return (
      <div className="flex gap-1">
        {visibleActions.map((action, index) => (
          <button
            key={action.key}
            type="button"
            className={`btn btn-xs ${getButtonVariant(action.variant)}`}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick(data);
            }}
            disabled={action.disabled ? action.disabled(data) : false}
            title={action.label}
          >
            {action.icon && <action.icon className="w-3 h-3" />}
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>
    );
  };
}

// 获取按钮样式变体
function getButtonVariant(variant?: string): string {
  switch (variant) {
    case 'primary': return 'btn-primary';
    case 'secondary': return 'btn-secondary';
    case 'success': return 'btn-success';
    case 'warning': return 'btn-warning';
    case 'error': return 'btn-error';
    case 'ghost': return 'btn-ghost';
    default: return 'btn-ghost';
  }
}

/**
 * 通用表格数据获取 Hook
 * @param tableName 表名
 * @param options 查询选项
 * @returns 数据查询结果
 */
function useTableData(tableName: string, options?: UniversalTableOptions) {
  return useQuery({
    queryKey: ['table-data', tableName, options?.filters, options?.sorting, options?.pagination],
    queryFn: async () => {
      let query = supabase.from(tableName as any).select('*');

      // 应用筛选
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            query = query.eq(key, value);
          }
        });
      }

      // 应用排序
      if (options?.sorting && options.sorting.length > 0) {
        options.sorting.forEach(sort => {
          query = query.order(sort.id, { ascending: !sort.desc });
        });
      }

      // 应用分页 - 使用优化后的默认页面大小
      if (options?.pagination) {
        const config = getOptimizedConfig();
        const { pageSize = config.pagination.defaultPageSize, pageIndex = 0 } = options.pagination;
        const start = pageIndex * pageSize;
        const end = start + pageSize - 1;
        query = query.range(start, end);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error(`Failed to fetch data from ${tableName}:`, error);
        throw error;
      }

      return data || [];
    },
    // 使用优化后的缓存配置
    staleTime: getOptimizedConfig().cache.staleTime,
    gcTime: getOptimizedConfig().cache.cacheTime, // React Query v5 使用 gcTime 而不是 cacheTime
    
    // 优化后的重试配置
    retry: getOptimizedConfig().retry.maxRetries,
    retryDelay: (attemptIndex) => {
      const config = getOptimizedConfig().retry;
      return Math.min(
        config.retryDelay * Math.pow(config.backoffMultiplier, attemptIndex),
        config.maxRetryDelay
      );
    },
    
    // 网络错误快速重试
    retryOnMount: true,
    refetchOnWindowFocus: false, // 减少不必要的请求
  });
}

/**
 * 通用表格 Hook
 * 提供完整的表格功能，包括列配置、数据获取、操作按钮等
 * @param tableName 表名或视图名
 * @param options 表格选项
 * @returns 完整的表格配置和数据
 */
export function useUniversalTable(tableName: string, options?: UniversalTableOptions) {
  // 获取表格配置
  const tableConfig: TableConfiguration | null = useMemo(() => {
    const config = getTableConfig(tableName);
    return config;
  }, [tableName]);

  // 合并选项
  const mergedOptions: UniversalTableOptions = useMemo(() => {
    return {
      // 默认配置
      defaultHiddenColumns: ['id', 'created_at', 'updated_at'],
      enableRowSelection: false,
      enableActions: false,
      
      // 从表格配置中获取
      ...tableConfig && {
        defaultHiddenColumns: tableConfig.defaultHiddenColumns,
        searchFields: tableConfig.searchFields,
        columnTypeOverrides: tableConfig.columnTypes,
        columnOverrides: Object.fromEntries(
          Object.entries(tableConfig.columnOverrides || {}).map(([key, override]) => [
            key,
            {
              header: override.label,
              size: override.width,
              enableSorting: override.sortable,
              enableColumnFilter: override.filterable,
            }
          ])
        ),
      },
      
      // 用户传入的选项（优先级最高）
      ...options,
    };
  }, [tableConfig, options]);

  // 智能列配置
  const smartColumns = useSmartTableColumns(tableName, mergedOptions);

  // 表格数据
  const tableData = useTableData(tableName, mergedOptions);

  // 操作列
  const actionColumn = useMemo((): ColumnDef<any> | null => {
    if (!mergedOptions?.enableActions || !mergedOptions?.permissions) {
      return null;
    }
    
    const actions = generateTableActions(tableName, mergedOptions.permissions, mergedOptions.actionCallbacks);
    
    if (actions.length === 0) {
      return null;
    }

    return {
      id: 'actions',
      header: '操作',
      cell: createActionsRenderer(actions),
      size: actions.length * 80 + 20, // 根据操作数量调整宽度
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
    };
  }, [tableName, mergedOptions]);

  // 最终列配置
  const finalColumns = useMemo(() => {
    const cols = [...smartColumns.columns];
    if (actionColumn) {
      cols.push(actionColumn);
    }
    return cols;
  }, [smartColumns.columns, actionColumn]);

  // 默认排序
  const defaultSorting = useMemo(() => {
    if (mergedOptions?.sorting) {
      return mergedOptions.sorting;
    }
    
    if (tableConfig?.defaultSort) {
      return [{
        id: tableConfig.defaultSort.field,
        desc: tableConfig.defaultSort.direction === 'desc',
      }];
    }
    
    return [];
  }, [mergedOptions?.sorting, tableConfig?.defaultSort]);

  return {
    // 表格配置
    columns: finalColumns,
    
    // 数据
    data: tableData.data || [],
    loading: tableData.isLoading || smartColumns.isLoading,
    error: tableData.error || smartColumns.error,
    
    // 元数据
    metadata: smartColumns.metadata,
    tableConfig,
    
    // 用户偏好
    preferences: smartColumns.preferences,
    updateColumnPreference: smartColumns.updateColumnPreference,
    updateColumnsPreferences: smartColumns.updateColumnsPreferences,
    toggleColumnVisibility: smartColumns.toggleColumnVisibility,
    setColumnWidth: smartColumns.setColumnWidth,
    resetPreferences: smartColumns.resetPreferences,
    
    // 辅助信息
    visibleColumns: smartColumns.visibleColumns,
    searchableFields: smartColumns.searchableFields,
    initialColumnVisibility: smartColumns.initialColumnVisibility,
    
    // 默认配置
    defaultSorting,
    
    // 操作
    refetch: tableData.refetch,
    
    // 权限
    permissions: tableConfig?.permissions || {},
  };
}

/**
 * 查询键工厂
 */
export const universalTableKeys = {
  all: ['universal-table'] as const,
  table: (tableName: string) => [...universalTableKeys.all, tableName] as const,
  tableWithOptions: (tableName: string, options?: UniversalTableOptions) => 
    [...universalTableKeys.table(tableName), options] as const,
};