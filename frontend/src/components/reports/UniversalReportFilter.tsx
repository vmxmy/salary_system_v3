/**
 * 通用报表筛选组件
 * 
 * 基于报表模板的字段配置，动态生成筛选界面：
 * - 支持各种字段类型的筛选器（文本、数字、日期、选择等）
 * - 支持多条件组合（AND/OR逻辑）
 * - 支持筛选条件的保存和加载
 * - 完全基于配置驱动，无硬编码业务逻辑
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { FieldMapping } from '@/types/report-config';

// 筛选操作符定义
export type FilterOperator = 
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'in' | 'not_in'
  | 'is_null' | 'is_not_null'
  | 'between' | 'not_between';

// 单个筛选条件
export interface FilterCondition {
  id: string;
  fieldKey: string;
  fieldName: string;
  fieldType: string;
  operator: FilterOperator;
  value: any;
  values?: any[]; // 用于 in, not_in, between 等操作符
  enabled: boolean;
}

// 筛选条件组
export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
  enabled: boolean;
}

// 完整的筛选配置
export interface UniversalFilterConfig {
  groups: FilterGroup[];
  globalLogic: 'AND' | 'OR';
}

interface UniversalReportFilterProps {
  /** 可筛选的字段配置 */
  availableFields: FieldMapping[];
  /** 当前筛选配置 */
  filterConfig: UniversalFilterConfig;
  /** 筛选配置更新回调 */
  onFilterConfigChange: (config: UniversalFilterConfig) => void;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 是否显示预览 */
  showPreview?: boolean;
  /** 最大筛选条件数量 */
  maxConditions?: number;
}

export function UniversalReportFilter({
  availableFields,
  filterConfig,
  onFilterConfigChange,
  readonly = false,
  showPreview = true,
  maxConditions = 10
}: UniversalReportFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 获取字段类型对应的操作符
  const getOperatorsForFieldType = useCallback((fieldType: string): FilterOperator[] => {
    switch (fieldType) {
      case 'string':
        return ['eq', 'ne', 'like', 'ilike', 'in', 'not_in', 'is_null', 'is_not_null'];
      case 'number':
      case 'currency':
        return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'not_between', 'in', 'not_in', 'is_null', 'is_not_null'];
      case 'date':
      case 'datetime':
        return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'not_between', 'is_null', 'is_not_null'];
      case 'boolean':
        return ['eq', 'ne', 'is_null', 'is_not_null'];
      default:
        return ['eq', 'ne', 'is_null', 'is_not_null'];
    }
  }, []);

  // 操作符显示名称
  const getOperatorLabel = (operator: FilterOperator): string => {
    const labels: Record<FilterOperator, string> = {
      eq: '等于',
      ne: '不等于',
      gt: '大于',
      gte: '大于等于',
      lt: '小于',
      lte: '小于等于',
      like: '包含',
      ilike: '包含(忽略大小写)',
      in: '属于',
      not_in: '不属于',
      is_null: '为空',
      is_not_null: '不为空',
      between: '介于之间',
      not_between: '不在范围内'
    };
    return labels[operator];
  };

  // 添加筛选条件
  const addFilterCondition = useCallback((groupId: string) => {
    if (!availableFields.length) return;
    
    const firstField = availableFields[0];
    const newCondition: FilterCondition = {
      id: `condition_${Date.now()}`,
      fieldKey: firstField.field_key,
      fieldName: firstField.display_name,
      fieldType: firstField.field_type,
      operator: 'eq',
      value: '',
      enabled: true
    };

    const updatedGroups = filterConfig.groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, newCondition]
        };
      }
      return group;
    });

    onFilterConfigChange({
      ...filterConfig,
      groups: updatedGroups
    });
  }, [availableFields, filterConfig, onFilterConfigChange]);

  // 添加筛选组
  const addFilterGroup = useCallback(() => {
    const newGroup: FilterGroup = {
      id: `group_${Date.now()}`,
      conditions: [],
      logic: 'AND',
      enabled: true
    };

    onFilterConfigChange({
      ...filterConfig,
      groups: [...filterConfig.groups, newGroup]
    });
  }, [filterConfig, onFilterConfigChange]);

  // 删除筛选条件
  const removeFilterCondition = useCallback((groupId: string, conditionId: string) => {
    const updatedGroups = filterConfig.groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.filter(c => c.id !== conditionId)
        };
      }
      return group;
    });

    onFilterConfigChange({
      ...filterConfig,
      groups: updatedGroups
    });
  }, [filterConfig, onFilterConfigChange]);

  // 删除筛选组
  const removeFilterGroup = useCallback((groupId: string) => {
    const updatedGroups = filterConfig.groups.filter(group => group.id !== groupId);
    onFilterConfigChange({
      ...filterConfig,
      groups: updatedGroups
    });
  }, [filterConfig, onFilterConfigChange]);

  // 清空所有筛选条件
  const clearAllFilters = useCallback(() => {
    onFilterConfigChange(createEmptyFilterConfig());
  }, [onFilterConfigChange]);

  // 快速添加常用筛选条件
  const addQuickFilter = useCallback((fieldKey: string, operator: FilterOperator) => {
    const field = availableFields.find(f => f.field_key === fieldKey);
    if (!field) return;

    // 如果没有筛选组，先创建一个
    let targetGroupId = filterConfig.groups.length > 0 ? filterConfig.groups[0].id : null;
    if (!targetGroupId) {
      const newGroup: FilterGroup = {
        id: `group_${Date.now()}`,
        conditions: [],
        logic: 'AND',
        enabled: true
      };
      targetGroupId = newGroup.id;
      
      onFilterConfigChange({
        ...filterConfig,
        groups: [newGroup]
      });
      
      // 延迟添加条件，确保组已创建
      setTimeout(() => {
        addFilterCondition(targetGroupId!);
      }, 0);
    } else {
      addFilterCondition(targetGroupId);
    }
  }, [availableFields, filterConfig, onFilterConfigChange, addFilterCondition]);

  // 更新筛选条件
  const updateFilterCondition = useCallback((groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    const updatedGroups = filterConfig.groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.map(condition => {
            if (condition.id === conditionId) {
              const updatedCondition = { ...condition, ...updates };
              
              // 如果字段改变了，重置操作符和值
              if (updates.fieldKey && updates.fieldKey !== condition.fieldKey) {
                const field = availableFields.find(f => f.field_key === updates.fieldKey);
                if (field) {
                  updatedCondition.fieldName = field.display_name;
                  updatedCondition.fieldType = field.field_type;
                  updatedCondition.operator = 'eq';
                  updatedCondition.value = '';
                  updatedCondition.values = undefined;
                }
              }
              
              return updatedCondition;
            }
            return condition;
          })
        };
      }
      return group;
    });

    onFilterConfigChange({
      ...filterConfig,
      groups: updatedGroups
    });
  }, [availableFields, filterConfig, onFilterConfigChange]);

  // 渲染筛选条件值输入框
  const renderValueInput = useCallback((condition: FilterCondition, groupId: string) => {
    const { operator, fieldType, value, values } = condition;

    // 不需要值的操作符
    if (operator === 'is_null' || operator === 'is_not_null') {
      return null;
    }

    // 范围操作符
    if (operator === 'between' || operator === 'not_between') {
      return (
        <div className="flex gap-2 items-center">
          <input
            type={fieldType === 'number' || fieldType === 'currency' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
            className="input input-bordered input-sm flex-1"
            placeholder="最小值"
            value={values?.[0] || ''}
            onChange={(e) => updateFilterCondition(groupId, condition.id, {
              values: [e.target.value, values?.[1] || '']
            })}
            disabled={readonly}
          />
          <span>到</span>
          <input
            type={fieldType === 'number' || fieldType === 'currency' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
            className="input input-bordered input-sm flex-1"
            placeholder="最大值"
            value={values?.[1] || ''}
            onChange={(e) => updateFilterCondition(groupId, condition.id, {
              values: [values?.[0] || '', e.target.value]
            })}
            disabled={readonly}
          />
        </div>
      );
    }

    // 多值操作符
    if (operator === 'in' || operator === 'not_in') {
      return (
        <input
          type="text"
          className="input input-bordered input-sm"
          placeholder="多个值用逗号分隔"
          value={Array.isArray(values) ? values.join(',') : value}
          onChange={(e) => updateFilterCondition(groupId, condition.id, {
            values: e.target.value.split(',').map(v => v.trim()).filter(v => v)
          })}
          disabled={readonly}
        />
      );
    }

    // 单值操作符
    return (
      <input
        type={
          fieldType === 'number' || fieldType === 'currency' ? 'number' :
          fieldType === 'date' ? 'date' :
          fieldType === 'datetime' ? 'datetime-local' :
          fieldType === 'boolean' ? 'checkbox' :
          'text'
        }
        className="input input-bordered input-sm"
        placeholder="筛选值"
        value={value || ''}
        onChange={(e) => updateFilterCondition(groupId, condition.id, {
          value: fieldType === 'boolean' ? e.target.checked : e.target.value
        })}
        disabled={readonly}
      />
    );
  }, [readonly, updateFilterCondition]);

  // 统计信息
  const statistics = useMemo(() => {
    const totalConditions = filterConfig.groups.reduce((sum, group) => sum + group.conditions.length, 0);
    const activeConditions = filterConfig.groups.reduce((sum, group) => 
      sum + group.conditions.filter(c => c.enabled).length, 0
    );
    const activeGroups = filterConfig.groups.filter(g => g.enabled && g.conditions.length > 0).length;
    
    return { totalConditions, activeConditions, activeGroups };
  }, [filterConfig]);

  // 如果没有可筛选字段，显示提示
  if (availableFields.length === 0) {
    return (
      <div className="alert alert-info">
        <div>
          <h3 className="font-bold">暂无可筛选字段</h3>
          <div className="text-sm">当前报表模板没有配置可筛选的字段</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-200">
      <div className="card-header p-4 border-b border-base-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">筛选条件</h3>
            {showPreview && (
              <div className="text-sm text-base-content/70">
                {statistics.activeConditions > 0 ? (
                  `${statistics.activeGroups}个筛选组，${statistics.activeConditions}个条件`
                ) : (
                  '暂无筛选条件'
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {statistics.activeConditions > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm text-error"
                onClick={clearAllFilters}
                disabled={readonly}
                title="清空所有筛选条件"
              >
                清空
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '收起' : '展开'}
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="card-body p-4">
          {filterConfig.groups.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              <div className="text-lg mb-2">🔍</div>
              <div>尚未设置筛选条件</div>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-3"
                onClick={addFilterGroup}
                disabled={readonly}
              >
                添加筛选组
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filterConfig.groups.map((group, groupIndex) => (
                <div key={group.id} className="border border-base-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">筛选组 {groupIndex + 1}</span>
                      <select
                        className="select select-bordered select-sm"
                        value={group.logic}
                        onChange={(e) => {
                          const updatedGroups = filterConfig.groups.map(g =>
                            g.id === group.id ? { ...g, logic: e.target.value as 'AND' | 'OR' } : g
                          );
                          onFilterConfigChange({ ...filterConfig, groups: updatedGroups });
                        }}
                        disabled={readonly}
                      >
                        <option value="AND">且 (AND)</option>
                        <option value="OR">或 (OR)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => addFilterCondition(group.id)}
                        disabled={readonly || statistics.totalConditions >= maxConditions}
                      >
                        添加条件
                      </button>
                      {filterConfig.groups.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => removeFilterGroup(group.id)}
                          disabled={readonly}
                          title="删除此筛选组"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.conditions.map((condition, conditionIndex) => (
                      <div key={condition.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1">
                          {conditionIndex > 0 && (
                            <span className="text-xs text-base-content/50">
                              {group.logic === 'AND' ? '且' : '或'}
                            </span>
                          )}
                        </div>
                        
                        <div className="col-span-3">
                          <select
                            className="select select-bordered select-sm w-full"
                            value={condition.fieldKey}
                            onChange={(e) => updateFilterCondition(group.id, condition.id, {
                              fieldKey: e.target.value
                            })}
                            disabled={readonly}
                          >
                            {availableFields.map(field => (
                              <option key={field.field_key} value={field.field_key}>
                                {field.display_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <select
                            className="select select-bordered select-sm w-full"
                            value={condition.operator}
                            onChange={(e) => updateFilterCondition(group.id, condition.id, {
                              operator: e.target.value as FilterOperator,
                              value: '', // 重置值
                              values: undefined
                            })}
                            disabled={readonly}
                          >
                            {getOperatorsForFieldType(condition.fieldType).map(op => (
                              <option key={op} value={op}>
                                {getOperatorLabel(op)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4">
                          {renderValueInput(condition, group.id)}
                        </div>

                        <div className="col-span-1">
                          <div className="form-control">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={condition.enabled}
                              onChange={(e) => updateFilterCondition(group.id, condition.id, {
                                enabled: e.target.checked
                              })}
                              disabled={readonly}
                            />
                          </div>
                        </div>

                        <div className="col-span-1">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-circle text-error"
                            onClick={() => removeFilterCondition(group.id, condition.id)}
                            disabled={readonly}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-4 border-t border-base-200">
                <div className="text-sm text-base-content/70">
                  筛选组之间的逻辑关系：
                  <select
                    className="select select-bordered select-sm ml-2"
                    value={filterConfig.globalLogic}
                    onChange={(e) => onFilterConfigChange({
                      ...filterConfig,
                      globalLogic: e.target.value as 'AND' | 'OR'
                    })}
                    disabled={readonly}
                  >
                    <option value="AND">且 (AND)</option>
                    <option value="OR">或 (OR)</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addFilterGroup}
                  disabled={readonly}
                >
                  添加筛选组
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 默认的空筛选配置
export const createEmptyFilterConfig = (): UniversalFilterConfig => ({
  groups: [],
  globalLogic: 'AND'
});

// 将筛选配置转换为 Supabase 查询参数的工具函数
export const convertFilterConfigToQuery = (config: UniversalFilterConfig) => {
  // 这里需要根据实际的查询库实现转换逻辑
  // 暂时返回一个简化的格式
  return {
    filters: config.groups.map(group => ({
      logic: group.logic,
      conditions: group.conditions
        .filter(c => c.enabled)
        .map(c => ({
          field: c.fieldKey,
          operator: c.operator,
          value: c.value,
          values: c.values
        }))
    })),
    globalLogic: config.globalLogic
  };
};