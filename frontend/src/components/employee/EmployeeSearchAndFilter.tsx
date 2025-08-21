import React, { useState, useCallback, type ReactNode } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import type { BaseEmployeeData } from './EmployeeTableContainer';

// 搜索字段配置
export interface EmployeeSearchFieldConfig {
  key: string;
  getter: (item: any) => string | undefined;
  searchable?: boolean;
}

// 状态筛选选项
export interface EmployeeStatusOption {
  value: string;
  label: string;
  color?: string;
}

// 部门筛选选项
export interface DepartmentOption {
  value: string;
  label: string;
  description?: string;
}

// 搜索和筛选Props
export interface EmployeeSearchAndFilterProps<T extends BaseEmployeeData = BaseEmployeeData> {
  // 搜索相关
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  searchPlaceholder?: string;
  loading?: boolean;
  
  // 状态筛选
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  statusOptions?: EmployeeStatusOption[];
  
  // 部门筛选
  departmentFilter?: string;
  onDepartmentFilterChange?: (department: string) => void;
  departmentOptions?: DepartmentOption[];
  
  // 职位筛选
  positionFilter?: string;
  onPositionFilterChange?: (position: string) => void;
  positionOptions?: DepartmentOption[];
  
  // 其他筛选器
  customFilters?: ReactNode;
  
  // 显示控制
  showStatusFilter?: boolean;
  showDepartmentFilter?: boolean;
  showPositionFilter?: boolean;
  showResetButton?: boolean;
  
  // 样式
  className?: string;
  compact?: boolean;
}

/**
 * 员工搜索和筛选组件
 * 提供搜索、状态筛选、部门筛选等功能
 */
export function EmployeeSearchAndFilter<T extends BaseEmployeeData = BaseEmployeeData>({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onReset,
  searchPlaceholder = "搜索员工姓名、部门、职位等...",
  loading = false,
  
  statusFilter,
  onStatusFilterChange,
  statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '在职', color: 'success' },
    { value: 'inactive', label: '离职', color: 'error' },
    { value: 'suspended', label: '停职', color: 'warning' },
  ],
  
  departmentFilter,
  onDepartmentFilterChange,
  departmentOptions,
  
  positionFilter,
  onPositionFilterChange,
  positionOptions,
  
  customFilters,
  
  showStatusFilter = true,
  showDepartmentFilter = true,
  showPositionFilter = true,
  showResetButton = true,
  
  className = '',
  compact = false,
}: EmployeeSearchAndFilterProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 处理搜索
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  }, [onSearch]);

  // 处理重置
  const handleReset = useCallback(() => {
    onReset();
    setIsExpanded(false);
  }, [onReset]);

  // 处理搜索输入变化
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchQueryChange(e.target.value);
  }, [onSearchQueryChange]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  }, [onSearch]);

  // 检查是否有任何筛选器激活
  const hasActiveFilters = statusFilter !== 'all' || 
                          (departmentFilter && departmentFilter !== 'all') ||
                          (positionFilter && positionFilter !== 'all');

  return (
    <div className={`employee-search-filter ${compact ? 'compact' : ''} ${className}`.trim()}>
      {/* 搜索行 */}
      <div className="flex items-center gap-2 mb-4">
        {/* 搜索框 */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              className="input input-bordered w-full pl-10 pr-4"
              disabled={loading}
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* 筛选器切换按钮 */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`btn btn-outline ${hasActiveFilters ? 'btn-primary' : ''}`}
          title="筛选器"
        >
          <FunnelIcon className="w-4 h-4" />
          {hasActiveFilters && <div className="badge badge-primary badge-xs">●</div>}
        </button>

        {/* 重置按钮 */}
        {showResetButton && (hasActiveFilters || searchQuery) && (
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-ghost"
            disabled={loading}
          >
            重置
          </button>
        )}
      </div>

      {/* 筛选器面板 */}
      {isExpanded && (
        <div className="bg-base-100 border border-base-300 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 状态筛选 */}
            {showStatusFilter && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">员工状态</span>
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value)}
                  className="select select-bordered w-full"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 部门筛选 */}
            {showDepartmentFilter && departmentOptions && onDepartmentFilterChange && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">部门</span>
                </label>
                <select
                  value={departmentFilter || 'all'}
                  onChange={(e) => onDepartmentFilterChange(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="all">全部部门</option>
                  {departmentOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 职位筛选 */}
            {showPositionFilter && positionOptions && onPositionFilterChange && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">职位</span>
                </label>
                <select
                  value={positionFilter || 'all'}
                  onChange={(e) => onPositionFilterChange(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="all">全部职位</option>
                  {positionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 自定义筛选器 */}
            {customFilters}
            
          </div>

          {/* 筛选器操作 */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="btn btn-ghost btn-sm"
            >
              收起
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-outline btn-sm"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner loading-sm"></span>
        </div>
      )}
    </div>
  );
}

export default EmployeeSearchAndFilter;