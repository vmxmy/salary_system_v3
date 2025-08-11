import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { FieldMetadata, TableMetadata } from './metadata.service';
import { DataTableColumnHeader } from '@/components/common/DataTable/DataTableColumnHeader';
import { GenderBadge } from '@/components/common/GenderBadge';
import { formatDate, formatDateTime, cn } from '@/lib/utils';

export interface ColumnConfig {
  field: string;
  visible: boolean;
  width?: number;
  order: number;
  label?: string;
}

export interface UserTableConfig {
  tableName: string;
  columns: ColumnConfig[];
  pageSize: number;
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  updatedAt: string;
}

export interface DynamicCellProps<T = any> {
  value: any;
  row: T;
  field: FieldMetadata;
}

export interface ActionColumn {
  onViewDetail?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
}

class ColumnConfigService {
  private readonly STORAGE_KEY_PREFIX = 'table_config_';

  /**
   * 根据元数据和用户配置生成动态表格列
   */
  generateColumns<T extends Record<string, any>>(
    metadata: TableMetadata,
    userConfig?: UserTableConfig,
    actions?: ActionColumn
  ): ColumnDef<T>[] {
    const visibleFields = this.getVisibleFields(metadata, userConfig);
    const sortedFields = this.sortFields(visibleFields, userConfig);

    const columns = sortedFields.map(field => this.createColumn<T>(field, metadata));
    
    // 如果提供了操作列配置，添加操作列
    if (actions) {
      columns.push(this.createActionsColumn<T>(actions));
    }

    return columns;
  }

  /**
   * 创建单个列定义
   */
  private createColumn<T extends Record<string, any>>(
    field: FieldMetadata,
    metadata: TableMetadata
  ): ColumnDef<T> {
    return {
      id: field.name,
      accessorKey: field.name as keyof T,
      header: ({ column }) => (
        <DataTableColumnHeader 
          column={column} 
          title={field.label}
          enableFilter={field.filterable}
        />
      ),
      cell: ({ getValue, row }) => (
        <DynamicCell 
          value={getValue()}
          row={row.original}
          field={field}
        />
      ),
      size: field.width,
      enableSorting: field.sortable,
      enableHiding: true,
      meta: {
        field: field,
        alignment: field.alignment,
        type: field.type,
      },
    };
  }

  /**
   * 获取可见字段
   */
  private getVisibleFields(
    metadata: TableMetadata, 
    userConfig?: UserTableConfig
  ): FieldMetadata[] {
    if (!userConfig) {
      return metadata.fields.filter(field => field.visible);
    }

    const visibleColumnNames = userConfig.columns
      .filter(col => col.visible)
      .map(col => col.field);

    return metadata.fields.filter(field => 
      visibleColumnNames.includes(field.name)
    );
  }

  /**
   * 排序字段
   */
  private sortFields(
    fields: FieldMetadata[], 
    userConfig?: UserTableConfig
  ): FieldMetadata[] {
    if (!userConfig) {
      return fields.sort((a, b) => (a.order || 999) - (b.order || 999));
    }

    const orderMap = new Map(
      userConfig.columns.map(col => [col.field, col.order])
    );

    return fields.sort((a, b) => {
      const orderA = orderMap.get(a.name) ?? a.order ?? 999;
      const orderB = orderMap.get(b.name) ?? b.order ?? 999;
      return orderA - orderB;
    });
  }

  /**
   * 保存用户表格配置到本地存储
   */
  saveUserConfig(tableName: string, config: UserTableConfig): void {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${tableName}`;
      config.updatedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save table config:', error);
    }
  }

  /**
   * 从本地存储加载用户表格配置
   */
  loadUserConfig(tableName: string): UserTableConfig | null {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${tableName}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const config = JSON.parse(stored) as UserTableConfig;
      
      // 检查配置是否过期（7天）
      const updatedAt = new Date(config.updatedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) {
        this.removeUserConfig(tableName);
        return null;
      }

      return config;
    } catch (error) {
      console.error('Failed to load table config:', error);
      return null;
    }
  }

  /**
   * 删除用户表格配置
   */
  removeUserConfig(tableName: string): void {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${tableName}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove table config:', error);
    }
  }

  /**
   * 创建默认用户配置
   */
  createDefaultUserConfig(metadata: TableMetadata): UserTableConfig {
    return {
      tableName: metadata.tableName,
      columns: metadata.fields.map((field, index) => ({
        field: field.name,
        visible: field.visible ?? (metadata.defaultFields?.includes(field.name) ?? false),
        width: field.width,
        order: field.order ?? index,
        label: field.label,
      })),
      pageSize: 50,
      defaultSort: metadata.defaultSort,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 更新列可见性
   */
  updateColumnVisibility(
    tableName: string,
    fieldName: string,
    visible: boolean
  ): void {
    const config = this.loadUserConfig(tableName);
    if (!config) return;

    const columnIndex = config.columns.findIndex(col => col.field === fieldName);
    if (columnIndex >= 0) {
      config.columns[columnIndex].visible = visible;
      this.saveUserConfig(tableName, config);
    }
  }

  /**
   * 更新列顺序
   */
  updateColumnOrder(
    tableName: string,
    newOrder: { field: string; order: number }[]
  ): void {
    const config = this.loadUserConfig(tableName);
    if (!config) return;

    newOrder.forEach(({ field, order }) => {
      const columnIndex = config.columns.findIndex(col => col.field === field);
      if (columnIndex >= 0) {
        config.columns[columnIndex].order = order;
      }
    });

    this.saveUserConfig(tableName, config);
  }

  /**
   * 更新列宽度
   */
  updateColumnWidth(
    tableName: string,
    fieldName: string,
    width: number
  ): void {
    const config = this.loadUserConfig(tableName);
    if (!config) return;

    const columnIndex = config.columns.findIndex(col => col.field === fieldName);
    if (columnIndex >= 0) {
      config.columns[columnIndex].width = width;
      this.saveUserConfig(tableName, config);
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(metadata: TableMetadata): UserTableConfig {
    const defaultConfig = this.createDefaultUserConfig(metadata);
    this.saveUserConfig(metadata.tableName, defaultConfig);
    return defaultConfig;
  }

  /**
   * 创建操作列
   */
  private createActionsColumn<T extends Record<string, any>>(
    actions: ActionColumn
  ): ColumnDef<T> {
    return {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {actions.onViewDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onViewDetail!(row.original);
              }}
              className="btn btn-ghost btn-xs"
              title="查看详情"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          {actions.onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onEdit!(row.original);
              }}
              className="btn btn-ghost btn-xs"
              title="编辑"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {actions.onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onDelete!(row.original);
              }}
              className="btn btn-ghost btn-xs text-error"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 100,
    };
  }

  /**
   * 获取可用字段列表（用于字段选择器）
   */
  getAvailableFields(metadata: TableMetadata): FieldMetadata[] {
    return metadata.fields.sort((a, b) => (a.order || 999) - (b.order || 999));
  }
}

/**
 * 动态单元格组件
 */
function DynamicCell<T = any>({ value, row, field }: DynamicCellProps<T>) {
  
  if (value === null || value === undefined) {
    return <span className="text-base-content/50">-</span>;
  }

  const cellClass = cn(
    'text-sm',
    field.alignment === 'center' && 'text-center',
    field.alignment === 'right' && 'text-right'
  );

  switch (field.type) {
    case 'date':
      return (
        <span className={cellClass}>
          {formatDate(new Date(value), 'zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          })}
        </span>
      );

    case 'datetime':
      return (
        <span className={cellClass}>
          {formatDateTime(new Date(value))}
        </span>
      );

    case 'boolean':
      // 处理职业年金字段的特殊显示
      if (field.name === 'has_occupational_pension') {
        const hasOccupationalPension = value === 'true' || value === true || value === '是';
        return (
          <span className={cn(cellClass, 'badge badge-sm', hasOccupationalPension ? 'badge-success' : 'badge-ghost')}>
            {hasOccupationalPension ? '是' : '否'}
          </span>
        );
      }
      
      // 普通boolean值处理
      const boolValue = value === 'true' || value === true;
      return (
        <span className={cn(cellClass, 'badge badge-sm', boolValue ? 'badge-success' : 'badge-error')}>
          {boolValue ? '是' : '否'}
        </span>
      );

    case 'select':
      // 在职状态字段的特殊样式处理
      if (field.name === 'employment_status') {
        const statusMap: Record<string, { label: string; class: string }> = {
          'active': { label: '在职', class: 'badge-success' },
          'inactive': { label: '停职', class: 'badge-warning' },
          'terminated': { label: '离职', class: 'badge-error' },
        };
        const status = statusMap[value] || { label: value, class: 'badge-ghost' };
        return (
          <span className={cn(cellClass, 'badge badge-sm', status.class)}>
            {status.label}
          </span>
        );
      }
      
      // 性别字段的特殊样式处理 - 使用GenderBadge组件
      if (field.name === 'gender') {
        return <GenderBadge gender={value} size="sm" />;
      }
      
      // 其他select类型字段
      const option = field.options?.find(opt => opt.value === value);
      return (
        <span className={cellClass}>
          {option?.label || value}
        </span>
      );

    case 'email':
      return (
        <a 
          href={`mailto:${value}`} 
          className={cn(cellClass, 'link link-primary')}
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );

    case 'phone':
      return (
        <a 
          href={`tel:${value}`} 
          className={cn(cellClass, 'link link-primary')}
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );

    case 'number':
      return (
        <span className={cn(cellClass, 'font-mono')}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      );

    case 'text':
    default:
      // 特殊处理员工ID
      if (field.name === 'employee_id') {
        return (
          <span className={cn(cellClass, 'font-mono font-medium')}>
            {value}
          </span>
        );
      }
      // 特殊处理姓名
      if (field.name === 'employee_name') {
        return (
          <div className={cn(cellClass, 'font-medium text-base-content')}>
            {value}
          </div>
        );
      }
      
      return (
        <span className={cellClass}>
          {value}
        </span>
      );
  }
}

export const columnConfigService = new ColumnConfigService();