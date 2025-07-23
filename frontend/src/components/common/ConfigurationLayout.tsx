import React from 'react';

interface ConfigurationLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  searchAndFilters?: React.ReactNode;
  bulkActions?: React.ReactNode;
  stats?: React.ReactNode;
  className?: string;
}

export function ConfigurationLayout({
  title,
  description,
  children,
  actions,
  searchAndFilters,
  bulkActions,
  stats,
  className = ''
}: ConfigurationLayoutProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-base-content/70">{description}</p>
        </div>
        
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* 搜索和过滤 */}
      {searchAndFilters && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            {searchAndFilters}
          </div>
        </div>
      )}

      {/* 批量操作栏 */}
      {bulkActions}

      {/* 主要内容区域 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          {children}
        </div>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats}
        </div>
      )}
    </div>
  );
}

// 预定义的操作按钮组件
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
}

export function ActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  className = ''
}: ActionButtonProps) {
  const variantClasses = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost'
  };

  return (
    <button 
      className={`btn ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  variant?: 'primary' | 'success' | 'info' | 'warning' | 'error';
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  variant = 'primary',
  className = ''
}: StatCardProps) {
  const variantClasses = {
    primary: 'text-primary',
    success: 'text-success',
    info: 'text-info',
    warning: 'text-warning',
    error: 'text-error'
  };

  return (
    <div className={`stat bg-base-100 shadow rounded-lg ${className}`}>
      <div className="stat-title">{title}</div>
      <div className={`stat-value ${variantClasses[variant]}`}>{value}</div>
      <div className="stat-desc">{description}</div>
    </div>
  );
}

// 搜索和过滤器容器组件
interface SearchAndFiltersProps {
  searchInput: React.ReactNode;
  filters?: React.ReactNode[];
  className?: string;
}

export function SearchAndFilters({
  searchInput,
  filters,
  className = ''
}: SearchAndFiltersProps) {
  return (
    <div className={`flex flex-col lg:flex-row gap-4 ${className}`}>
      <div className="flex-1">
        {searchInput}
      </div>
      
      {filters && filters.length > 0 && (
        <div className="flex gap-2">
          {filters.map((filter, index) => (
            <div key={index}>{filter}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// 批量操作栏组件
interface BulkActionsBarProps {
  selectedCount: number;
  onCancel: () => void;
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'outline' | 'error';
    disabled?: boolean;
  }>;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onCancel,
  actions,
  className = ''
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={`alert alert-info ${className}`}>
      <div className="flex-1">
        <span>已选择 {selectedCount} 个项目</span>
      </div>
      <div className="flex gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`btn btn-sm ${
              action.variant === 'error' 
                ? 'btn-outline text-error border-error hover:bg-error hover:text-error-content'
                : action.variant === 'outline'
                ? 'btn-outline'
                : 'btn-primary'
            }`}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        <button
          className="btn btn-sm btn-ghost"
          onClick={onCancel}
        >
          取消选择
        </button>
      </div>
    </div>
  );
}

// 筛选器选择组件
interface FilterSelectProps {
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterSelect({
  placeholder,
  options,
  value,
  onChange,
  className = ''
}: FilterSelectProps) {
  return (
    <select 
      className={`select select-bordered ${className}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}