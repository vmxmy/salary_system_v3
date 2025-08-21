import React, { useState, useCallback, useMemo } from 'react';
import { EyeIcon, EyeOffIcon, ArrowUpIcon, ArrowDownIcon, SettingsIcon, RefreshCcwIcon, CheckSquareIcon } from 'lucide-react';
// 定义类型接口
export interface FieldMetadata {
  name: string;
  label: string;
  description?: string;
  visible?: boolean;
  order?: number;
  type?: string;
  required?: boolean;
  width?: number;
}

export interface ColumnConfig {
  field: string;
  visible: boolean;
  order: number;
  label?: string;
  width?: number;
}

export interface UserTableConfig {
  columns: ColumnConfig[];
}
import { cn } from '@/lib/utils';

export interface FieldSelectorProps {
  fields: FieldMetadata[];
  userConfig: UserTableConfig;
  onChange: (config: UserTableConfig) => void;
  onReset: () => void;
  className?: string;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  fields,
  userConfig,
  onChange,
  onReset,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 过滤字段
  const filteredFields = useMemo(() => {
    if (!searchTerm.trim()) return fields;
    const term = searchTerm.toLowerCase();
    return fields.filter(field => 
      field.label.toLowerCase().includes(term) ||
      field.name.toLowerCase().includes(term) ||
      field.description?.toLowerCase().includes(term)
    );
  }, [fields, searchTerm]);

  // 按可见性和顺序排序的字段配置
  const sortedColumns = useMemo(() => {
    const configMap = new Map((userConfig.columns || []).map((col: ColumnConfig) => [col.field, col]));
    
    // 为所有字段创建配置，包括动态获取的字段
    const allColumns = fields.map(field => {
      const existingConfig = configMap.get(field.name);
      if (existingConfig) {
        return existingConfig;
      } else {
        // 为动态字段创建默认配置
        return {
          field: field.name,
          visible: field.visible ?? false, // 使用字段的默认可见性
          order: field.order ?? 999,
          label: field.label,
          width: field.width,
        };
      }
    });
    
    return allColumns.sort((a, b) => {
      // 先按可见性排序，再按顺序排序
      if (a.visible !== b.visible) {
        return a.visible ? -1 : 1;
      }
      return a.order - b.order;
    });
  }, [fields, (userConfig.columns || [])]);

  // 切换字段可见性
  const toggleFieldVisibility = useCallback((fieldName: string) => {
    const existingColumnIndex = (userConfig.columns || []).findIndex(col => col.field === fieldName);
    const newColumns = [...(userConfig.columns || [])];

    if (existingColumnIndex >= 0) {
      // 更新现有字段
      newColumns[existingColumnIndex] = {
        ...newColumns[existingColumnIndex],
        visible: !newColumns[existingColumnIndex].visible
      };
    } else {
      // 添加新字段（对于动态获取的字段）
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        newColumns.push({
          field: fieldName,
          visible: true, // 新添加的字段默认可见
          width: field.width,
          order: field.order ?? newColumns.length,
          label: field.label,
        });
      }
    }

    onChange({
      ...userConfig,
      columns: newColumns,
    });
  }, [userConfig, onChange, fields]);

  // 移动字段位置
  const moveField = useCallback((fieldName: string, direction: 'up' | 'down') => {
    const currentIndex = sortedColumns.findIndex(col => col.field === fieldName);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedColumns.length) return;

    const newColumns = [...(userConfig.columns || [])];
    let currentCol = newColumns.find(col => col.field === fieldName);
    let targetCol = newColumns.find(col => col.field === sortedColumns[newIndex].field);

    // 如果当前字段不在用户配置中，添加它
    if (!currentCol) {
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        currentCol = {
          field: fieldName,
          visible: true,
          width: field.width,
          order: field.order ?? newColumns.length,
          label: field.label,
        };
        newColumns.push(currentCol);
      }
    }

    // 如果目标字段不在用户配置中，添加它
    if (!targetCol) {
      const targetField = fields.find(f => f.name === sortedColumns[newIndex].field);
      if (targetField) {
        targetCol = {
          field: sortedColumns[newIndex].field,
          visible: sortedColumns[newIndex].visible,
          width: targetField.width,
          order: targetField.order ?? newColumns.length,
          label: targetField.label,
        };
        newColumns.push(targetCol);
      }
    }

    if (currentCol && targetCol) {
      const tempOrder = currentCol.order;
      currentCol.order = targetCol.order;
      targetCol.order = tempOrder;

      onChange({
        ...userConfig,
        columns: newColumns,
      });
    }
  }, [sortedColumns, userConfig, onChange, fields]);

  // 全选/全不选功能
  const toggleSelectAll = useCallback(() => {
    const allVisible = sortedColumns.every(col => col.visible);
    const newColumns = [...(userConfig.columns || [])];
    
    // 遍历所有字段，确保每个字段都有配置项
    fields.forEach(field => {
      const existingIndex = newColumns.findIndex(col => col.field === field.name);
      const shouldBeVisible = !allVisible; // 如果当前全选中，则全不选；否则全选
      
      if (existingIndex >= 0) {
        // 更新现有配置
        newColumns[existingIndex] = {
          ...newColumns[existingIndex],
          visible: shouldBeVisible
        };
      } else {
        // 添加新配置
        newColumns.push({
          field: field.name,
          visible: shouldBeVisible,
          width: field.width,
          order: field.order ?? newColumns.length,
          label: field.label,
        });
      }
    });

    onChange({
      ...userConfig,
      columns: newColumns,
    });
  }, [fields, userConfig, onChange, sortedColumns]);

  // 统计信息
  const visibleCount = sortedColumns.filter(col => col.visible).length;
  const totalCount = sortedColumns.length;
  const allSelected = visibleCount === totalCount;

  return (
    <div className={cn('relative', className)}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm"
        title="字段设置"
      >
        <SettingsIcon className="w-4 h-4" />
        <span className="ml-1 hidden sm:inline">
          字段 ({visibleCount}/{totalCount})
        </span>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 面板内容 */}
          <div className="absolute right-0 mt-2 w-80 bg-base-100 shadow-lg rounded-lg border border-base-300 z-50">
            <div className="p-4">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-base-content">字段设置</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="btn btn-ghost btn-xs"
                    title={allSelected ? "全不选" : "全选"}
                  >
                    <CheckSquareIcon className={cn("w-3 h-3", allSelected && "text-primary")} />
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className="btn btn-ghost btn-xs"
                    title="重置为默认"
                  >
                    <RefreshCcwIcon className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn btn-ghost btn-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 搜索框 */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="搜索字段..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input input-bordered input-sm w-full"
                />
              </div>

              {/* 统计信息 */}
              <div className="mb-4 text-sm text-base-content/70">
                已显示 {visibleCount} 个字段，共 {totalCount} 个字段
              </div>

              {/* 字段列表 */}
              <div className="max-h-80 overflow-y-auto space-y-1">
                {filteredFields.map((field) => {
                  const config = sortedColumns.find(col => col.field === field.name);
                  if (!config) return null;

                  const currentIndex = sortedColumns.findIndex(col => col.field === field.name);
                  const canMoveUp = currentIndex > 0 && config.visible;
                  const canMoveDown = currentIndex < sortedColumns.length - 1 && config.visible;

                  return (
                    <div
                      key={field.name}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded hover:bg-base-200',
                        config.visible && 'bg-base-100 border border-primary/20'
                      )}
                    >
                      {/* 可见性切换 */}
                      <button
                        type="button"
                        onClick={() => toggleFieldVisibility(field.name)}
                        className={cn(
                          'btn btn-ghost btn-xs p-1 min-h-0 h-6 w-6',
                          config.visible ? 'text-primary' : 'text-base-content/50'
                        )}
                        title={config.visible ? '隐藏字段' : '显示字段'}
                      >
                        {config.visible ? 
                          <EyeIcon className="w-3 h-3" /> : 
                          <EyeOffIcon className="w-3 h-3" />
                        }
                      </button>

                      {/* 字段信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-sm font-medium truncate',
                            config.visible ? 'text-base-content' : 'text-base-content/60'
                          )}>
                            {field.label}
                          </span>
                          <span className="text-xs text-base-content/50 font-mono">
                            {field.name}
                          </span>
                        </div>
                        {field.description && (
                          <div className="text-xs text-base-content/60 truncate">
                            {field.description}
                          </div>
                        )}
                      </div>

                      {/* 排序按钮 */}
                      {config.visible && (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveField(field.name, 'up')}
                            disabled={!canMoveUp}
                            className={cn(
                              'btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4',
                              !canMoveUp && 'opacity-30'
                            )}
                            title="上移"
                          >
                            <ArrowUpIcon className="w-2 h-2" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(field.name, 'down')}
                            disabled={!canMoveDown}
                            className={cn(
                              'btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4',
                              !canMoveDown && 'opacity-30'
                            )}
                            title="下移"
                          >
                            <ArrowDownIcon className="w-2 h-2" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 底部信息 */}
              {filteredFields.length === 0 && searchTerm && (
                <div className="text-center text-sm text-base-content/60 py-4">
                  未找到匹配的字段
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FieldSelector;