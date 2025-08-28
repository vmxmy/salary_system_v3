/**
 * 字段筛选管理组件
 * 
 * 在报表模板配置中管理所有字段的筛选条件：
 * - 显示所有可配置字段的筛选状态
 * - 提供快速配置和批量管理功能
 * - 集成到报表模板创建/编辑流程中
 * - 支持筛选条件的导入导出
 */

import React, { useState, useMemo } from 'react';
import type { FieldMapping, FieldFilterConfig } from '@/types/report-config';
import { FieldFilterConfig as FieldFilterConfigComponent } from './FieldFilterConfig';

interface FieldFilterManagerProps {
  /** 字段映射列表 */
  fieldMappings: FieldMapping[];
  /** 字段映射更新回调 */
  onFieldMappingsChange: (fieldMappings: FieldMapping[]) => void;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 是否显示统计信息 */
  showStatistics?: boolean;
}

export function FieldFilterManager({
  fieldMappings,
  onFieldMappingsChange,
  readonly = false,
  showStatistics = true,
}: FieldFilterManagerProps) {
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_filters' | 'without_filters'>('all');

  // 计算筛选统计信息
  const filterStatistics = useMemo(() => {
    const totalFields = fieldMappings.length;
    const fieldsWithFilters = fieldMappings.filter(field => 
      field.field_filters && field.field_filters.length > 0
    ).length;
    const totalFilters = fieldMappings.reduce((sum, field) => 
      sum + (field.field_filters?.length || 0), 0
    );
    const enabledFilters = fieldMappings.reduce((sum, field) => 
      sum + (field.field_filters?.filter(f => f.enabled).length || 0), 0
    );

    return {
      totalFields,
      fieldsWithFilters,
      totalFilters,
      enabledFilters,
      fieldsWithoutFilters: totalFields - fieldsWithFilters,
    };
  }, [fieldMappings]);

  // 过滤字段列表
  const filteredFields = useMemo(() => {
    let filtered = fieldMappings.filter(field => {
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          field.display_name.toLowerCase().includes(searchLower) ||
          field.field_key.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

    // 筛选条件类型过滤
    if (filterType === 'with_filters') {
      filtered = filtered.filter(field => 
        field.field_filters && field.field_filters.length > 0
      );
    } else if (filterType === 'without_filters') {
      filtered = filtered.filter(field => 
        !field.field_filters || field.field_filters.length === 0
      );
    }

    return filtered;
  }, [fieldMappings, searchTerm, filterType]);

  // 更新字段筛选条件
  const handleFieldFiltersChange = (fieldKey: string, filters: FieldFilterConfig[]) => {
    const updatedMappings = fieldMappings.map(field =>
      field.field_key === fieldKey
        ? { ...field, field_filters: filters }
        : field
    );
    onFieldMappingsChange(updatedMappings);
  };

  // 批量清除筛选条件
  const handleClearAllFilters = () => {
    const updatedMappings = fieldMappings.map(field => ({
      ...field,
      field_filters: [],
    }));
    onFieldMappingsChange(updatedMappings);
  };

  // 批量启用/禁用筛选条件
  const handleToggleAllFilters = (enabled: boolean) => {
    const updatedMappings = fieldMappings.map(field => ({
      ...field,
      field_filters: field.field_filters?.map(filter => ({
        ...filter,
        enabled,
      })) || [],
    }));
    onFieldMappingsChange(updatedMappings);
  };

  // 快速添加常用筛选条件
  const handleQuickAddFilter = (fieldKey: string, filterType: 'not_null' | 'date_range' | 'text_search') => {
    const field = fieldMappings.find(f => f.field_key === fieldKey);
    if (!field) return;

    let newFilter: FieldFilterConfig;
    const filterId = `filter_${fieldKey}_${Date.now()}`;

    switch (filterType) {
      case 'not_null':
        newFilter = {
          id: filterId,
          name: `${field.display_name}非空筛选`,
          operator: 'is_not_null',
          enabled: true,
          condition_type: 'fixed',
        };
        break;
      case 'date_range':
        newFilter = {
          id: filterId,
          name: `${field.display_name}时间范围`,
          operator: 'between',
          enabled: true,
          condition_type: 'user_input',
          input_config: {
            input_type: 'date_range',
            required: false,
            placeholder: '请选择时间范围',
          },
        };
        break;
      case 'text_search':
        newFilter = {
          id: filterId,
          name: `${field.display_name}文本搜索`,
          operator: 'like',
          enabled: true,
          condition_type: 'user_input',
          input_config: {
            input_type: 'text',
            required: false,
            placeholder: `请输入${field.display_name}关键词`,
          },
        };
        break;
    }

    const currentFilters = field.field_filters || [];
    handleFieldFiltersChange(fieldKey, [...currentFilters, newFilter]);
  };

  return (
    <div className="space-y-6">
      {/* 统计信息和操作栏 */}
      {showStatistics && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* 统计数据 */}
              <div className="flex flex-wrap gap-4">
                <div className="stat stat-compact">
                  <div className="stat-title text-xs">总字段数</div>
                  <div className="stat-value text-lg">{filterStatistics.totalFields}</div>
                </div>
                <div className="stat stat-compact">
                  <div className="stat-title text-xs">已配置筛选</div>
                  <div className="stat-value text-lg text-primary">{filterStatistics.fieldsWithFilters}</div>
                </div>
                <div className="stat stat-compact">
                  <div className="stat-title text-xs">筛选条件总数</div>
                  <div className="stat-value text-lg text-secondary">{filterStatistics.totalFilters}</div>
                </div>
                <div className="stat stat-compact">
                  <div className="stat-title text-xs">已启用条件</div>
                  <div className="stat-value text-lg text-accent">{filterStatistics.enabledFilters}</div>
                </div>
              </div>

              {/* 批量操作按钮 */}
              {!readonly && (
                <div className="flex gap-2">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleToggleAllFilters(false)}
                    title="禁用所有筛选条件"
                    disabled={filterStatistics.enabledFilters === 0}
                  >
                    全部禁用
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleToggleAllFilters(true)}
                    title="启用所有筛选条件"
                    disabled={filterStatistics.totalFilters === filterStatistics.enabledFilters}
                  >
                    全部启用
                  </button>
                  <button
                    className="btn btn-sm btn-outline btn-error"
                    onClick={handleClearAllFilters}
                    title="清除所有筛选条件"
                    disabled={filterStatistics.totalFilters === 0}
                  >
                    清除所有
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 搜索和筛选工具栏 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="form-control flex-1 min-w-64">
              <div className="input-group">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="搜索字段名称或key..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-square btn-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="form-control">
              <select
                className="select select-bordered select-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="all">所有字段</option>
                <option value="with_filters">有筛选条件</option>
                <option value="without_filters">无筛选条件</option>
              </select>
            </div>

            <div className="text-sm text-base-content/60">
              显示 {filteredFields.length} 个字段
            </div>
          </div>
        </div>
      </div>

      {/* 字段列表 */}
      <div className="space-y-4">
        {filteredFields.length > 0 ? (
          filteredFields.map((field) => (
            <div key={field.field_key} className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body p-4">
                {/* 字段信息头部 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-base">{field.display_name}</span>
                      <span className="badge badge-ghost badge-sm">{field.field_key}</span>
                      <span className="badge badge-outline badge-sm">{field.field_type}</span>
                    </div>
                    {field.field_filters && field.field_filters.length > 0 && (
                      <div className="flex gap-1">
                        <span className="badge badge-primary badge-sm">
                          {field.field_filters.length} 个筛选条件
                        </span>
                        <span className="badge badge-accent badge-sm">
                          {field.field_filters.filter(f => f.enabled).length} 已启用
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 快速添加常用筛选条件 */}
                    {!readonly && (
                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-sm btn-ghost">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          快速添加
                        </label>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48">
                          <li>
                            <a onClick={() => handleQuickAddFilter(field.field_key, 'not_null')}>
                              非空筛选
                            </a>
                          </li>
                          {['date', 'datetime'].includes(field.field_type) && (
                            <li>
                              <a onClick={() => handleQuickAddFilter(field.field_key, 'date_range')}>
                                时间范围筛选
                              </a>
                            </li>
                          )}
                          {field.field_type === 'string' && (
                            <li>
                              <a onClick={() => handleQuickAddFilter(field.field_key, 'text_search')}>
                                文本搜索筛选
                              </a>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* 展开/折叠按钮 */}
                    <button
                      className="btn btn-sm btn-ghost btn-circle"
                      onClick={() => setActiveFieldKey(
                        activeFieldKey === field.field_key ? null : field.field_key
                      )}
                    >
                      <svg 
                        className={`w-4 h-4 transition-transform ${
                          activeFieldKey === field.field_key ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 字段筛选配置区域 */}
                {activeFieldKey === field.field_key && (
                  <div className="mt-4 pt-4 border-t border-base-200">
                    <FieldFilterConfigComponent
                      field={field}
                      filters={field.field_filters || []}
                      onChange={(filters) => handleFieldFiltersChange(field.field_key, filters)}
                      readonly={readonly}
                    />
                  </div>
                )}

                {/* 筛选条件预览 */}
                {activeFieldKey !== field.field_key && field.field_filters && field.field_filters.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {field.field_filters.slice(0, 3).map((filter) => (
                      <div 
                        key={filter.id} 
                        className={`badge badge-sm ${filter.enabled ? 'badge-primary' : 'badge-ghost'}`}
                      >
                        {filter.name}
                      </div>
                    ))}
                    {field.field_filters.length > 3 && (
                      <div className="badge badge-sm badge-ghost">
                        +{field.field_filters.length - 3} 更多
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-base-100 rounded-lg">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-medium mb-2">未找到匹配的字段</h3>
            <p className="text-base-content/60">
              {searchTerm ? '尝试调整搜索关键词' : '没有符合筛选条件的字段'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}