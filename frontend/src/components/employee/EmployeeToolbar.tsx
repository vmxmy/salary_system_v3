import React, { type ReactNode } from 'react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { ModernButton } from '@/components/common/ModernButton';
import { ColumnVisibility } from '@/components/common/DataTable/components/ColumnVisibility';
import { EmployeeExport } from '@/components/employee/EmployeeExport';
import type { Table } from '@tanstack/react-table';
import type { BaseEmployeeData } from './EmployeeTableContainer';

// 搜索配置接口
export interface EmployeeSearchConfig {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  loading?: boolean;
}

// 工具栏操作配置接口
export interface EmployeeToolbarActionConfig {
  key: string;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  title?: string;
}

// 员工工具栏Props - 简化版，参考薪资管理
export interface EmployeeToolbarProps<T extends BaseEmployeeData = BaseEmployeeData> {
  // 搜索相关
  searchConfig?: EmployeeSearchConfig;
  
  // 筛选器
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  departmentFilter?: string;
  onDepartmentFilterChange?: (department: string) => void;
  
  // 表格实例（用于导出）
  tableInstance?: Table<T> | null;
  
  // 主要操作
  primaryActions?: EmployeeToolbarActionConfig[];
  
  // 样式配置
  className?: string;
}

/**
 * 统一的员工工具栏组件 - 参考薪资管理页面设计
 */
export function EmployeeToolbar<T extends BaseEmployeeData = BaseEmployeeData>({
  searchConfig,
  statusFilter = 'all',
  onStatusFilterChange,
  departmentFilter = 'all', 
  onDepartmentFilterChange,
  tableInstance,
  primaryActions = [],
  className = '',
}: EmployeeToolbarProps<T>) {

  // 默认主要操作（添加员工）
  const defaultPrimaryActions: EmployeeToolbarActionConfig[] = [
    {
      key: 'add-employee',
      label: '添加员工',
      onClick: () => console.log('添加员工'),
      icon: <UserPlusIcon className="w-4 h-4" />,
      variant: 'primary',
      title: '创建新员工记录'
    }
  ];

  const finalPrimaryActions = primaryActions.length > 0 ? primaryActions : defaultPrimaryActions;

  return (
    <div className={`employee-toolbar ${className}`.trim()}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        
        {/* 左侧：筛选器组 */}
        <div className="flex items-center gap-3">
          {/* 状态选择器 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-base-content/70 whitespace-nowrap">状态：</span>
            <select 
              className="select select-bordered select-sm bg-base-100 w-24"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange?.(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="active">在职</option>
              <option value="inactive">离职</option>
              <option value="suspended">停职</option>
            </select>
          </div>
          
          {/* 部门选择器 */}
          {onDepartmentFilterChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-base-content/70 whitespace-nowrap">部门：</span>
              <select 
                className="select select-bordered select-sm bg-base-100 w-32"
                value={departmentFilter}
                onChange={(e) => onDepartmentFilterChange(e.target.value)}
              >
                <option value="all">全部部门</option>
                <option value="1">管理部门</option>
                <option value="2">技术部门</option>
                <option value="3">销售部门</option>
              </select>
            </div>
          )}
        </div>

        {/* 中间：搜索框 - 与薪资管理样式一致 */}
        {searchConfig && (
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder={searchConfig.placeholder || "搜索员工姓名、部门、职位..."}
                className="input input-bordered input-sm w-full pr-20"
                value={searchConfig.searchQuery}
                onChange={(e) => searchConfig.onSearchQueryChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchConfig.onSearch();
                  }
                }}
                disabled={searchConfig.loading}
              />
              <div className="absolute right-1 top-1 flex gap-1">
                {searchConfig.searchQuery && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => searchConfig.onSearchQueryChange('')}
                    title="清除搜索"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className={`btn btn-primary btn-xs ${searchConfig.loading ? 'loading' : ''}`}
                  onClick={searchConfig.onSearch}
                  disabled={searchConfig.loading}
                  title="搜索"
                >
                  {!searchConfig.loading && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 右侧：操作按钮组 */}
        <div className="flex items-center gap-2">
          {/* 导出按钮 */}
          {tableInstance && (
            <EmployeeExport 
              table={tableInstance}
              fileName="employees"
            />
          )}

          {/* 主要操作按钮 */}
          {finalPrimaryActions.map(action => (
            <ModernButton
              key={action.key}
              variant={action.variant || 'primary'}
              size="sm"
              onClick={action.onClick}
              icon={action.icon}
              disabled={action.disabled}
              title={action.title}
            >
              {action.label}
            </ModernButton>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmployeeToolbar;