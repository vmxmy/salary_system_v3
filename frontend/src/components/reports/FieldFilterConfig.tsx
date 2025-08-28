/**
 * 字段筛选条件配置组件
 * 
 * 用于配置报表模板中每个字段的筛选条件：
 * - 支持多种操作符 (等于、大于、包含等)
 * - 支持固定值、动态值、用户输入三种筛选类型
 * - 支持条件组合 (AND/OR 逻辑)
 * - 提供直观的可视化配置界面
 */

import React, { useState, useCallback } from 'react';
import type { FieldFilterConfig, FieldMapping } from '@/types/report-config';

interface FieldFilterConfigProps {
  /** 字段信息 */
  field: FieldMapping;
  /** 当前筛选条件列表 */
  filters: FieldFilterConfig[];
  /** 筛选条件变更回调 */
  onChange: (filters: FieldFilterConfig[]) => void;
  /** 是否只读模式 */
  readonly?: boolean;
}

/** 操作符选项配置 */
const OPERATOR_OPTIONS = [
  { value: 'eq', label: '等于', supportedTypes: ['string', 'number', 'date', 'boolean'] },
  { value: 'ne', label: '不等于', supportedTypes: ['string', 'number', 'date', 'boolean'] },
  { value: 'gt', label: '大于', supportedTypes: ['number', 'date', 'currency'] },
  { value: 'gte', label: '大于等于', supportedTypes: ['number', 'date', 'currency'] },
  { value: 'lt', label: '小于', supportedTypes: ['number', 'date', 'currency'] },
  { value: 'lte', label: '小于等于', supportedTypes: ['number', 'date', 'currency'] },
  { value: 'like', label: '包含', supportedTypes: ['string'] },
  { value: 'not_like', label: '不包含', supportedTypes: ['string'] },
  { value: 'in', label: '在列表中', supportedTypes: ['string', 'number'] },
  { value: 'not_in', label: '不在列表中', supportedTypes: ['string', 'number'] },
  { value: 'between', label: '在范围内', supportedTypes: ['number', 'date', 'currency'] },
  { value: 'not_between', label: '不在范围内', supportedTypes: ['number', 'date', 'currency'] },
  { value: 'is_null', label: '为空', supportedTypes: ['string', 'number', 'date', 'boolean'] },
  { value: 'is_not_null', label: '不为空', supportedTypes: ['string', 'number', 'date', 'boolean'] },
];

/** 条件类型选项 */
const CONDITION_TYPE_OPTIONS = [
  { value: 'fixed', label: '固定值', description: '使用固定的筛选值' },
  { value: 'dynamic', label: '动态值', description: '使用系统动态计算的值' },
  { value: 'user_input', label: '用户输入', description: '生成报表时由用户输入' },
];

/** 动态值类型选项 */
const DYNAMIC_TYPE_OPTIONS = [
  { value: 'current_date', label: '当前日期', supportedTypes: ['date'] },
  { value: 'current_month', label: '当前月份', supportedTypes: ['date', 'string'] },
  { value: 'current_year', label: '当前年份', supportedTypes: ['number', 'string'] },
  { value: 'last_n_days', label: '最近N天', supportedTypes: ['date'], needsOffset: true },
  { value: 'last_n_months', label: '最近N月', supportedTypes: ['date'], needsOffset: true },
];

export function FieldFilterConfig({
  field,
  filters,
  onChange,
  readonly = false
}: FieldFilterConfigProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  // 获取适用于当前字段类型的操作符
  const getAvailableOperators = useCallback(() => {
    return OPERATOR_OPTIONS.filter(op => 
      op.supportedTypes.includes(field.field_type)
    );
  }, [field.field_type]);

  // 生成新的筛选条件ID
  const generateFilterId = () => {
    return `filter_${field.field_key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 创建新筛选条件
  const createNewFilter = (): FieldFilterConfig => {
    const availableOperators = getAvailableOperators();
    return {
      id: generateFilterId(),
      name: `${field.display_name}筛选条件`,
      operator: availableOperators[0]?.value as any || 'eq',
      enabled: true,
      condition_type: 'fixed',
      logical: filters.length > 0 ? 'AND' : undefined,
    };
  };

  // 添加筛选条件
  const handleAddFilter = () => {
    const newFilter = createNewFilter();
    onChange([...filters, newFilter]);
    setShowAddForm(false);
  };

  // 更新筛选条件
  const handleUpdateFilter = (filterId: string, updates: Partial<FieldFilterConfig>) => {
    const updatedFilters = filters.map(filter =>
      filter.id === filterId ? { ...filter, ...updates } : filter
    );
    onChange(updatedFilters);
  };

  // 删除筛选条件
  const handleDeleteFilter = (filterId: string) => {
    onChange(filters.filter(filter => filter.id !== filterId));
  };

  // 渲染筛选条件项
  const renderFilterItem = (filter: FieldFilterConfig, index: number) => (
    <div key={filter.id} className="card bg-base-100 border border-base-300">
      <div className="card-body p-4 space-y-4">
        {/* 筛选条件基本信息 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={filter.enabled}
              onChange={(e) => handleUpdateFilter(filter.id, { enabled: e.target.checked })}
              disabled={readonly}
            />
            <input
              type="text"
              className="input input-sm input-bordered flex-1"
              value={filter.name}
              onChange={(e) => handleUpdateFilter(filter.id, { name: e.target.value })}
              placeholder="筛选条件名称"
              disabled={readonly}
            />
          </div>
          {!readonly && (
            <button
              className="btn btn-sm btn-ghost btn-circle"
              onClick={() => handleDeleteFilter(filter.id)}
              title="删除筛选条件"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* 操作符和条件类型选择 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control">
            <label className="label label-text text-xs">操作符</label>
            <select
              className="select select-sm select-bordered"
              value={filter.operator}
              onChange={(e) => handleUpdateFilter(filter.id, { operator: e.target.value as any })}
              disabled={readonly}
            >
              {getAvailableOperators().map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label label-text text-xs">条件类型</label>
            <select
              className="select select-sm select-bordered"
              value={filter.condition_type}
              onChange={(e) => handleUpdateFilter(filter.id, { condition_type: e.target.value as any })}
              disabled={readonly}
            >
              {CONDITION_TYPE_OPTIONS.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {index > 0 && (
            <div className="form-control">
              <label className="label label-text text-xs">逻辑关系</label>
              <select
                className="select select-sm select-bordered"
                value={filter.logical || 'AND'}
                onChange={(e) => handleUpdateFilter(filter.id, { logical: e.target.value as any })}
                disabled={readonly}
              >
                <option value="AND">并且 (AND)</option>
                <option value="OR">或者 (OR)</option>
              </select>
            </div>
          )}
        </div>

        {/* 筛选值配置区域 */}
        {filter.condition_type === 'fixed' && (
          <div className="space-y-2">
            <label className="label label-text text-xs">筛选值</label>
            {renderFixedValueInput(filter)}
          </div>
        )}

        {filter.condition_type === 'dynamic' && (
          <div className="space-y-2">
            <label className="label label-text text-xs">动态值配置</label>
            {renderDynamicValueConfig(filter)}
          </div>
        )}

        {filter.condition_type === 'user_input' && (
          <div className="space-y-2">
            <label className="label label-text text-xs">用户输入配置</label>
            {renderUserInputConfig(filter)}
          </div>
        )}
      </div>
    </div>
  );

  // 渲染固定值输入组件
  const renderFixedValueInput = (filter: FieldFilterConfig) => {
    if (['is_null', 'is_not_null'].includes(filter.operator)) {
      return <div className="text-sm text-base-content/60">此操作符不需要设置值</div>;
    }

    if (['in', 'not_in'].includes(filter.operator)) {
      return (
        <textarea
          className="textarea textarea-bordered textarea-sm"
          placeholder="多个值用逗号分隔，例如: 值1,值2,值3"
          value={filter.values?.join(',') || ''}
          onChange={(e) => {
            const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
            handleUpdateFilter(filter.id, { values });
          }}
          disabled={readonly}
        />
      );
    }

    if (['between', 'not_between'].includes(filter.operator)) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            type={field.field_type === 'number' || field.field_type === 'currency' ? 'number' : 
                  field.field_type === 'date' ? 'date' : 'text'}
            className="input input-sm input-bordered"
            placeholder="起始值"
            value={filter.value || ''}
            onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
            disabled={readonly}
          />
          <input
            type={field.field_type === 'number' || field.field_type === 'currency' ? 'number' : 
                  field.field_type === 'date' ? 'date' : 'text'}
            className="input input-sm input-bordered"
            placeholder="结束值"
            value={filter.value_end || ''}
            onChange={(e) => handleUpdateFilter(filter.id, { value_end: e.target.value })}
            disabled={readonly}
          />
        </div>
      );
    }

    // 单值输入
    return (
      <input
        type={field.field_type === 'number' || field.field_type === 'currency' ? 'number' : 
              field.field_type === 'date' ? 'date' : 
              field.field_type === 'boolean' ? 'checkbox' : 'text'}
        className={field.field_type === 'boolean' ? 'checkbox' : 'input input-sm input-bordered'}
        placeholder="请输入筛选值"
        value={field.field_type === 'boolean' ? undefined : (filter.value || '')}
        checked={field.field_type === 'boolean' ? filter.value : undefined}
        onChange={(e) => {
          const value = field.field_type === 'boolean' ? e.target.checked : e.target.value;
          handleUpdateFilter(filter.id, { value });
        }}
        disabled={readonly}
      />
    );
  };

  // 渲染动态值配置
  const renderDynamicValueConfig = (filter: FieldFilterConfig) => (
    <div className="space-y-3">
      <select
        className="select select-sm select-bordered w-full"
        value={filter.dynamic_config?.type || ''}
        onChange={(e) => handleUpdateFilter(filter.id, {
          dynamic_config: { ...filter.dynamic_config, type: e.target.value as any }
        })}
        disabled={readonly}
      >
        <option value="">请选择动态值类型</option>
        {DYNAMIC_TYPE_OPTIONS
          .filter(opt => opt.supportedTypes.includes(field.field_type))
          .map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
      </select>

      {filter.dynamic_config?.type && DYNAMIC_TYPE_OPTIONS
        .find(opt => opt.value === filter.dynamic_config?.type)?.needsOffset && (
        <input
          type="number"
          className="input input-sm input-bordered w-full"
          placeholder="请输入数值（如天数、月数）"
          value={filter.dynamic_config?.offset || ''}
          onChange={(e) => handleUpdateFilter(filter.id, {
            dynamic_config: { 
              type: filter.dynamic_config?.type || 'current_date',
              ...filter.dynamic_config, 
              offset: parseInt(e.target.value) || 0 
            }
          })}
          disabled={readonly}
        />
      )}
    </div>
  );

  // 渲染用户输入配置
  const renderUserInputConfig = (filter: FieldFilterConfig) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label label-text text-xs">输入类型</label>
          <select
            className="select select-sm select-bordered"
            value={filter.input_config?.input_type || 'text'}
            onChange={(e) => handleUpdateFilter(filter.id, {
              input_config: { 
                input_type: e.target.value as any,
                ...filter.input_config
              }
            })}
            disabled={readonly}
          >
            <option value="text">文本输入</option>
            <option value="number">数字输入</option>
            <option value="date">日期选择</option>
            <option value="select">单选下拉</option>
            <option value="multi_select">多选下拉</option>
            <option value="date_range">日期范围</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label label-text text-xs">是否必填</label>
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={filter.input_config?.required || false}
            onChange={(e) => handleUpdateFilter(filter.id, {
              input_config: { 
                input_type: filter.input_config?.input_type || 'text',
                ...filter.input_config, 
                required: e.target.checked 
              }
            })}
            disabled={readonly}
          />
        </div>
      </div>

      <input
        type="text"
        className="input input-sm input-bordered w-full"
        placeholder="输入提示文字"
        value={filter.input_config?.placeholder || ''}
        onChange={(e) => handleUpdateFilter(filter.id, {
          input_config: { 
            input_type: filter.input_config?.input_type || 'text',
            ...filter.input_config, 
            placeholder: e.target.value 
          }
        })}
        disabled={readonly}
      />

      {['select', 'multi_select'].includes(filter.input_config?.input_type || '') && (
        <textarea
          className="textarea textarea-bordered textarea-sm w-full"
          placeholder="选项配置，每行一个选项，格式：显示名称|值&#10;例如：&#10;全部员工|all&#10;在职员工|active&#10;离职员工|inactive"
          value={filter.input_config?.options?.map(opt => `${opt.label}|${opt.value}`).join('\n') || ''}
          onChange={(e) => {
            const options = e.target.value.split('\n')
              .map(line => line.trim())
              .filter(line => line && line.includes('|'))
              .map(line => {
                const [label, value] = line.split('|');
                return { label: label.trim(), value: value.trim() };
              });
            handleUpdateFilter(filter.id, {
              input_config: { 
                input_type: filter.input_config?.input_type || 'text',
                ...filter.input_config, 
                options 
              }
            });
          }}
          disabled={readonly}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          {field.display_name} 字段筛选条件 
          <span className="badge badge-ghost badge-sm ml-2">{filters.length}</span>
        </h4>
        {!readonly && (
          <button
            className="btn btn-sm btn-outline btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加筛选条件
          </button>
        )}
      </div>

      {/* 筛选条件列表 */}
      {filters.length > 0 ? (
        <div className="space-y-3">
          {filters.map((filter, index) => renderFilterItem(filter, index))}
        </div>
      ) : (
        <div className="text-center py-8 text-base-content/60 bg-base-100 rounded-lg border-2 border-dashed border-base-300">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
          </svg>
          <p>暂无筛选条件</p>
          <p className="text-sm mt-1">点击上方"添加筛选条件"按钮开始配置</p>
        </div>
      )}

      {/* 添加筛选条件确认对话框 */}
      {showAddForm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认添加筛选条件</h3>
            <p className="mb-4">
              将为字段 <span className="font-medium text-primary">"{field.display_name}"</span> 添加一个新的筛选条件。
            </p>
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={handleAddFilter}
              >
                确认添加
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowAddForm(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}