import React from 'react';
import { SearchInput } from './SearchInput';

/**
 * 通用配置搜索和过滤组件
 * 提供统一的搜索、过滤功能，支持多种过滤条件
 */

export interface FilterOption {
  /** 选项值 */
  value: string;
  /** 选项显示文本 */
  label: string;
  /** 选项是否禁用 */
  disabled?: boolean;
}

export interface FilterConfig {
  /** 过滤器唯一标识 */
  key: string;
  /** 过滤器显示标签 */
  label: string;
  /** 过滤器类型 */
  type: 'select' | 'multiSelect' | 'dateRange' | 'toggle';
  /** 选项列表（适用于select类型） */
  options?: FilterOption[];
  /** 占位符文本 */
  placeholder?: string;
  /** 默认值 */
  defaultValue?: any;
  /** 是否显示清除按钮 */
  clearable?: boolean;
}

export interface ConfigSearchFilterProps {
  /** 搜索占位符文本 */
  searchPlaceholder?: string;
  /** 搜索值 */
  searchValue?: string;
  /** 搜索值变化回调 */
  onSearchChange?: (value: string) => void;
  /** 是否正在搜索 */
  searching?: boolean;
  /** 过滤器配置列表 */
  filters?: FilterConfig[];
  /** 当前过滤器值 */
  filterValues?: Record<string, any>;
  /** 过滤器值变化回调 */
  onFilterChange?: (key: string, value: any) => void;
  /** 清除所有过滤器回调 */
  onClearFilters?: () => void;
  /** 是否显示清除所有按钮 */
  showClearAll?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 额外的CSS类名 */
  className?: string;
}

export function ConfigSearchFilter({
  searchPlaceholder = '搜索...',
  searchValue = '',
  onSearchChange,
  searching = false,
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  showClearAll = true,
  compact = false,
  className = ''
}: ConfigSearchFilterProps) {
  
  // 检查是否有活动的过滤器
  const hasActiveFilters = Object.values(filterValues).some(value => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && value !== '';
  });
  
  // 处理过滤器值变化
  const handleFilterChange = (key: string, value: any) => {
    onFilterChange?.(key, value);
  };
  
  // 渲染过滤器控件
  const renderFilter = (filter: FilterConfig) => {
    const value = filterValues[filter.key] ?? filter.defaultValue;
    
    switch (filter.type) {
      case 'select':
        return (
          <select
            className="select select-bordered select-sm w-full max-w-xs"
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value || undefined)}
          >
            <option value="">{filter.placeholder || `选择${filter.label}`}</option>
            {filter.options?.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        );
        
      case 'multiSelect':
        // 简化的多选实现，实际项目中可能需要更复杂的多选组件
        return (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-outline btn-sm">
              {filter.label}
              {Array.isArray(value) && value.length > 0 && (
                <span className="badge badge-primary badge-sm ml-2">
                  {value.length}
                </span>
              )}
            </label>
            <div tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 max-h-60 overflow-y-auto">
              {filter.options?.map((option) => (
                <label key={option.value} className="label cursor-pointer">
                  <span className="label-text">{option.label}</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={Array.isArray(value) && value.includes(option.value)}
                    onChange={(e) => {
                      const currentValue = Array.isArray(value) ? value : [];
                      const newValue = e.target.checked
                        ? [...currentValue, option.value]
                        : currentValue.filter(v => v !== option.value);
                      handleFilterChange(filter.key, newValue);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        );
        
      case 'toggle':
        return (
          <label className="label cursor-pointer">
            <span className="label-text">{filter.label}</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={!!value}
              onChange={(e) => handleFilterChange(filter.key, e.target.checked)}
            />
          </label>
        );
        
      case 'dateRange':
        return (
          <div className="flex gap-2">
            <input
              type="date"
              className="input input-bordered input-sm"
              placeholder="开始日期"
              value={value?.from || ''}
              onChange={(e) => handleFilterChange(filter.key, {
                ...value,
                from: e.target.value
              })}
            />
            <input
              type="date"
              className="input input-bordered input-sm"
              placeholder="结束日期"
              value={value?.to || ''}
              onChange={(e) => handleFilterChange(filter.key, {
                ...value,
                to: e.target.value
              })}
            />
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={`card bg-base-100 shadow ${className}`}>
      <div className={`card-body ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索输入框 */}
          <div className="flex-1 max-w-md">
            <SearchInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
              loading={searching}
            />
          </div>
          
          {/* 过滤器控件 */}
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center">
              {filters.map((filter) => (
                <div key={filter.key} className="form-control">
                  {filter.type !== 'toggle' && (
                    <label className="label py-1">
                      <span className="label-text text-sm">{filter.label}</span>
                    </label>
                  )}
                  {renderFilter(filter)}
                </div>
              ))}
              
              {/* 清除所有过滤器按钮 */}
              {showClearAll && hasActiveFilters && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={onClearFilters}
                  title="清除所有过滤条件"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  清除
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* 活动过滤器标签显示 */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-base-300">
            <span className="text-sm font-medium text-base-content/70">活动过滤器:</span>
            {Object.entries(filterValues).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              
              const filter = filters.find(f => f.key === key);
              if (!filter) return null;
              
              const displayValue = Array.isArray(value) 
                ? `${value.length}项`
                : filter.options?.find(opt => opt.value === value)?.label || value;
              
              return (
                <div key={key} className="badge badge-outline gap-2">
                  <span>{filter.label}: {displayValue}</span>
                  <button
                    className="btn btn-circle btn-ghost btn-xs"
                    onClick={() => handleFilterChange(key, undefined)}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigSearchFilter;