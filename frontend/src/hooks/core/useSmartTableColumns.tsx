import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useTableMetadata, type TableColumn } from './useTableMetadata';
import { 
  useTablePreferences, 
  generateDefaultColumnPreferences,
  type ColumnPreference 
} from './useUserPreferences';
import { formatCurrency } from '@/lib/format';

// 表格选项接口
export interface TableOptions {
  // 默认隐藏的列
  defaultHiddenColumns?: string[];
  // 列类型覆盖
  columnTypeOverrides?: Record<string, TableColumn['type']>;
  // 自定义列渲染
  columnOverrides?: Record<string, Partial<ColumnDef<any>>>;
  // 是否启用行选择
  enableRowSelection?: boolean;
  // 是否启用操作列
  enableActions?: boolean;
  // 搜索字段
  searchFields?: string[];
}

// 根据数据类型格式化单元格值 - 返回简单值而非JSX
function formatCellValue(value: any, type: TableColumn['type']): string {
  if (value === null || value === undefined) {
    return '-';
  }

  switch (type) {
    case 'currency':
      return formatCurrency(Number(value));
    
    case 'date':
      if (value) {
        return new Date(value).toLocaleDateString('zh-CN');
      }
      return '-';
    
    case 'datetime':
      if (value) {
        return new Date(value).toLocaleString('zh-CN');
      }
      return '-';
    
    case 'boolean':
      return value ? '是' : '否';
    
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    
    case 'email':
    case 'phone':
      return value || '-';
    
    default:
      return String(value);
  }
}

// 根据数据类型获取默认列宽
function getDefaultColumnWidth(columnName: string, type: TableColumn['type']): number {
  // 特定字段的宽度
  const fieldWidthMap: Record<string, number> = {
    'id': 80,
    'employee_id': 100,
    'employee_name': 120,
    'department_name': 120,
    'position_name': 120,
    'phone': 130,
    'email': 160,
    'id_number': 160,
    'created_at': 160,
    'updated_at': 160,
  };

  if (fieldWidthMap[columnName]) {
    return fieldWidthMap[columnName];
  }

  // 根据类型设置默认宽度
  switch (type) {
    case 'boolean': return 80;
    case 'date': return 120;
    case 'datetime': return 160;
    case 'currency': return 120;
    case 'number': return 100;
    case 'email': return 160;
    case 'phone': return 130;
    default: return 120;
  }
}

// 判断字段是否应该默认可见
function shouldDefaultVisible(columnName: string): boolean {
  const hiddenByDefault = [
    'id', 'uuid', 'created_at', 'updated_at', 'created_by', 'updated_by',
    'deleted_at', 'deleted_by', 'version', 'row_version'
  ];
  return !hiddenByDefault.includes(columnName);
}

// 判断是否可排序
function isSortableType(type: TableColumn['type']): boolean {
  return ['text', 'number', 'date', 'datetime', 'currency', 'boolean'].includes(type);
}

// 判断是否可筛选
function isFilterableType(type: TableColumn['type']): boolean {
  return ['text', 'number', 'date', 'datetime', 'currency', 'boolean', 'email', 'phone'].includes(type);
}

// 获取排序顺序
function getColumnOrder(columnName: string, preferences?: Record<string, ColumnPreference>): number {
  return preferences?.[columnName]?.order ?? 999;
}

/**
 * 智能表格列生成 Hook
 * @param tableName 表名
 * @param options 表格选项
 * @returns 表格列配置和相关操作
 */
export function useSmartTableColumns(tableName: string, options?: TableOptions) {
  // 获取表元数据
  const { data: metadata, isLoading: metadataLoading, error: metadataError } = useTableMetadata(tableName);

  // 生成默认列偏好设置
  const defaultColumnPreferences = useMemo(() => {
    if (!metadata?.columns) return {};
    
    const columnNames = metadata.columns.map(col => col.name);
    const hiddenColumns = [
      ...(options?.defaultHiddenColumns || []),
      ...metadata.columns
        .filter(col => col.isSystemColumn || !shouldDefaultVisible(col.name))
        .map(col => col.name)
    ];
    
    return generateDefaultColumnPreferences(columnNames, hiddenColumns);
  }, [metadata?.columns, options?.defaultHiddenColumns]);

  // 用户偏好设置
  const {
    preferences,
    updateColumnPreference,
    updateColumnsPreferences,
    toggleColumnVisibility,
    setColumnWidth,
    resetPreferences,
  } = useTablePreferences(tableName, defaultColumnPreferences);

  // 生成列定义
  const columns = useMemo(() => {
    if (!metadata?.columns) return [];

    const baseColumns: ColumnDef<any>[] = metadata.columns
      // 不再过滤列，而是将所有列都包含进来
      // 排序
      .sort((a, b) => {
        const orderA = getColumnOrder(a.name, preferences?.columns);
        const orderB = getColumnOrder(b.name, preferences?.columns);
        return orderA - orderB;
      })
      // 生成列定义
      .map((col): ColumnDef<any> => {
        const columnPref = preferences?.columns?.[col.name];
        const finalType = options?.columnTypeOverrides?.[col.name] || col.type;
        
        // 基础列定义
        const baseColumnDef: ColumnDef<any> = {
          id: col.name,
          accessorKey: col.name,
          header: col.label,
          
          // 根据数据类型自动配置单元格渲染
          cell: ({ getValue }) => {
            const value = getValue();
            return formatCellValue(value, finalType);
          },
          
          // 列宽设置
          size: columnPref?.width ?? getDefaultColumnWidth(col.name, finalType),
          
          // 排序配置
          enableSorting: isSortableType(finalType),
          
          // 筛选配置
          enableColumnFilter: isFilterableType(finalType),
          
          // 根据类型设置筛选函数
          filterFn: finalType === 'text' ? 'includesString' : 'auto',
        };

        // 应用自定义列覆盖
        const customOverride = options?.columnOverrides?.[col.name];
        if (customOverride) {
          return { ...baseColumnDef, ...customOverride };
        }

        return baseColumnDef;
      });

    // 添加行选择列
    if (options?.enableRowSelection) {
      baseColumns.unshift({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={table.getIsAllRowsSelected()}
            onChange={(e) => table.toggleAllRowsSelected(e.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
          />
        ),
        size: 50,
        enableSorting: false,
        enableColumnFilter: false,
      });
    }

    return baseColumns;
  }, [metadata?.columns, preferences, options]);

  // 可见列的字段名
  const visibleColumns = useMemo(() => {
    return columns
      .filter(col => col.id !== 'select' && col.id !== 'actions')
      .map(col => col.id as string);
  }, [columns]);

  // 搜索字段
  const searchableFields = useMemo(() => {
    if (options?.searchFields) {
      return options.searchFields;
    }
    
    // 自动选择文本类型的字段作为搜索字段
    return metadata?.columns
      ?.filter(col => 
        ['text', 'email', 'phone'].includes(col.type) && 
        !col.isSystemColumn &&
        visibleColumns.includes(col.name)
      )
      .map(col => col.name) || [];
  }, [metadata?.columns, options?.searchFields, visibleColumns]);

  // 生成初始列可见性配置
  const initialColumnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    
    if (metadata?.columns) {
      metadata.columns.forEach(col => {
        const pref = preferences?.columns?.[col.name];
        // 如果有用户偏好，使用用户偏好；否则使用默认可见性规则
        visibility[col.name] = pref?.visible ?? shouldDefaultVisible(col.name);
      });
    }
    
    return visibility;
  }, [metadata?.columns, preferences?.columns]);

  return {
    // 核心数据
    columns,
    metadata,
    
    // 加载状态
    isLoading: metadataLoading,
    error: metadataError,
    
    // 用户偏好
    preferences: preferences?.columns || {},
    
    // 操作方法
    updateColumnPreference,
    updateColumnsPreferences,
    toggleColumnVisibility,
    setColumnWidth,
    resetPreferences,
    
    // 辅助信息
    visibleColumns,
    searchableFields,
    initialColumnVisibility,
  };
}

/**
 * 查询键工厂
 */
export const smartTableColumnsKeys = {
  all: ['smart-table-columns'] as const,
  table: (tableName: string) => [...smartTableColumnsKeys.all, tableName] as const,
};