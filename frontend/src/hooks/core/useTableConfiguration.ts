import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { TABLE_CONFIGS, type TableConfigKey, type TableConfig } from '@/constants/tableConfigs';

// 字段元数据接口
export interface FieldMetadata {
  name: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'email' | 'phone' | 'currency';
  label: string;
  description?: string;
  required?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  format?: string;
  options?: { value: string; label: string }[];
  width?: number;
  alignment?: 'left' | 'center' | 'right';
  visible?: boolean;
  order?: number;
}

// 用户表格配置接口
export interface UserTableConfig {
  visibleColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  sorting?: { field: string; direction: 'asc' | 'desc' }[];
  filters?: Record<string, any>;
}

// 操作列配置
export interface ActionColumn {
  key: string;
  title: string;
  width?: number;
  render: (record: any) => React.ReactNode;
}

export interface UseTableConfigurationReturn {
  // 元数据状态
  metadata: TableConfig | null;
  metadataLoading: boolean;
  metadataError: string | null;
  
  // 用户配置状态
  userConfig: UserTableConfig | null;
  
  // 动态列定义
  columns: ColumnDef<any>[];
  
  // 操作方法
  updateUserConfig: (config: UserTableConfig) => void;
  resetToDefault: () => void;
  
  // 刷新方法
  refreshMetadata: () => Promise<void>;
}

/**
 * 纯 Hook 表格配置管理
 * 无服务层依赖，直接使用常量配置
 */
export function useTableConfiguration(
  tableName: string, 
  actions?: ActionColumn,
  enableRowSelection?: boolean
): UseTableConfigurationReturn {
  // 状态管理
  const [metadata, setMetadata] = useState<TableConfig | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [userConfig, setUserConfig] = useState<UserTableConfig | null>(null);

  // 从常量中获取表格配置
  const loadMetadata = useCallback(async () => {
    try {
      setMetadataLoading(true);
      setMetadataError(null);
      
      // 直接从常量配置中获取
      const config = TABLE_CONFIGS[tableName as TableConfigKey];
      
      if (!config) {
        throw new Error(`Table configuration not found for: ${tableName}`);
      }
      
      setMetadata(config);
      
      // 设置默认用户配置
      if (!userConfig) {
        const defaultConfig: UserTableConfig = {
          visibleColumns: config.defaultFields,
          columnOrder: config.defaultFields,
          columnWidths: {},
          sorting: config.defaultSort ? [config.defaultSort] : undefined
        };
        setUserConfig(defaultConfig);
      }
      
    } catch (error) {
      console.error('Failed to load table metadata:', error);
      setMetadataError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setMetadataLoading(false);
    }
  }, [tableName, userConfig]);

  // 刷新元数据
  const refreshMetadata = useCallback(async () => {
    await loadMetadata();
  }, [loadMetadata]);

  // 更新用户配置
  const updateUserConfig = useCallback((config: UserTableConfig) => {
    setUserConfig(config);
    
    // 可以在这里保存到 localStorage 或 Supabase user_preferences 表
    try {
      localStorage.setItem(`table-config-${tableName}`, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save user config to localStorage:', error);
    }
  }, [tableName]);

  // 重置为默认配置
  const resetToDefault = useCallback(() => {
    if (metadata) {
      const defaultConfig: UserTableConfig = {
        visibleColumns: metadata.defaultFields,
        columnOrder: metadata.defaultFields,
        columnWidths: {},
        sorting: metadata.defaultSort ? [metadata.defaultSort] : undefined
      };
      updateUserConfig(defaultConfig);
    }
  }, [metadata, updateUserConfig]);

  // 生成动态列定义
  const columns = useMemo(() => {
    if (!metadata || !userConfig) return [];

    const cols: ColumnDef<any>[] = [];

    // 添加行选择列
    if (enableRowSelection) {
      cols.push({
        id: 'select',
        header: 'Select',
        cell: 'select',
        size: 40,
        enableSorting: false,
        enableColumnFilter: false,
      });
    }

    // 根据用户配置的列顺序生成数据列
    userConfig.visibleColumns.forEach(fieldName => {
      if (!(metadata.fieldLabels as any)[fieldName]) return;

      const fieldType = (metadata.fieldTypes as any)?.[fieldName] || 'text';
      const label = (metadata.fieldLabels as any)[fieldName];

      const column: ColumnDef<any> = {
        id: fieldName,
        accessorKey: fieldName,
        header: label,
        size: userConfig.columnWidths[fieldName] || undefined,
        cell: ({ getValue }) => {
          const value = getValue();
          return formatCellValue(value, fieldType);
        }
      };

      cols.push(column);
    });

    // 添加操作列
    if (actions) {
      cols.push({
        id: actions.key,
        header: actions.title,
        size: actions.width || 120,
        cell: ({ row }) => actions.render(row.original),
      });
    }

    return cols;
  }, [metadata, userConfig, enableRowSelection, actions]);

  // 初始化加载
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // 尝试从 localStorage 恢复用户配置
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(`table-config-${tableName}`);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setUserConfig(config);
      }
    } catch (error) {
      console.warn('Failed to load user config from localStorage:', error);
    }
  }, [tableName]);

  return {
    metadata,
    metadataLoading,
    metadataError,
    userConfig,
    columns,
    updateUserConfig,
    resetToDefault,
    refreshMetadata,
  };
}

// 格式化单元格值的辅助函数
function formatCellValue(value: any, type: string): string {
  if (value == null) return '-';

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
      }).format(Number(value) || 0);
      
    case 'date':
      return new Date(value).toLocaleDateString('zh-CN');
      
    case 'datetime':
      return new Date(value).toLocaleString('zh-CN');
      
    case 'number':
      return new Intl.NumberFormat('zh-CN').format(Number(value) || 0);
      
    case 'phone':
      // 格式化手机号：138****1234
      const phone = String(value);
      if (phone.length === 11) {
        return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
      return phone;
      
    default:
      return String(value);
  }
}