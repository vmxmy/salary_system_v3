import React, { useState, useCallback, useEffect } from 'react';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
}

export function SearchInput({
  value = '',
  onChange,
  placeholder = '搜索...',
  debounceMs = 300,
  className = '',
  size = 'md',
  loading = false,
  onClear,
  autoFocus = false
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value);

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange, value]);

  // 同步外部值变化
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange('');
    onClear?.();
  }, [onChange, onClear]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {/* 搜索图标 */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <svg
              className="h-4 w-4 text-base-content/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        {/* 输入框 */}
        <input
          type="text"
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`
            input input-bordered w-full pl-10
            ${internalValue && !loading ? 'pr-10' : ''}
            ${size === 'sm' ? 'input-sm' : size === 'lg' ? 'input-lg' : ''}
          `}
        />

        {/* 清除按钮 */}
        {internalValue && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-base-content transition-colors"
            title="清除搜索"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索建议（可扩展） */}
      {/* 这里可以添加搜索建议的下拉菜单 */}
    </div>
  );
}

// 高级搜索输入框
interface AdvancedSearchInputProps extends SearchInputProps {
  filters?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date';
    options?: Array<{ value: string; label: string }>;
    value?: any;
  }>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export function AdvancedSearchInput({
  filters = [],
  onFiltersChange,
  showFilters = false,
  onToggleFilters,
  ...searchProps
}: AdvancedSearchInputProps) {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...filterValues, [key]: value };
    if (!value) {
      delete newFilters[key];
    }
    setFilterValues(newFilters);
    onFiltersChange?.(newFilters);
  }, [filterValues, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setFilterValues({});
    onFiltersChange?.({});
  }, [onFiltersChange]);

  const hasActiveFilters = Object.keys(filterValues).length > 0;

  return (
    <div className="space-y-4">
      {/* 搜索框和过滤器切换 */}
      <div className="flex gap-2">
        <SearchInput {...searchProps} className="flex-1" />
        
        {filters.length > 0 && (
          <button
            type="button"
            onClick={onToggleFilters}
            className={`
              btn btn-outline
              ${hasActiveFilters ? 'btn-primary' : ''}
              ${showFilters ? 'btn-active' : ''}
            `}
            title="高级搜索"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            {hasActiveFilters && (
              <span className="badge badge-sm badge-primary ml-1">
                {Object.keys(filterValues).length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* 高级过滤器 */}
      {showFilters && filters.length > 0 && (
        <div className="bg-base-100 p-4 rounded-lg border border-base-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">高级搜索</h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="btn btn-ghost btn-sm"
              >
                清除所有
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map(filter => (
              <div key={filter.key} className="form-control">
                <label className="label">
                  <span className="label-text">{filter.label}</span>
                </label>
                
                {filter.type === 'text' && (
                  <input
                    type="text"
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="input input-bordered input-sm"
                    placeholder={`请输入${filter.label}`}
                  />
                )}

                {filter.type === 'select' && filter.options && (
                  <select
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    <option value="">全部</option>
                    {filter.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="input input-bordered input-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}