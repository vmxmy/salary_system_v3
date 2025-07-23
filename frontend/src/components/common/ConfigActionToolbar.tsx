import React from 'react';

/**
 * 页面操作工具栏组件
 * 提供统一的页面头部操作按钮和标题布局
 */

export interface ActionButton {
  /** 按钮唯一标识 */
  key: string;
  /** 按钮文本 */
  label: string;
  /** 按钮图标（SVG path） */
  icon?: string;
  /** 点击事件处理函数 */
  onClick: () => void;
  /** 按钮类型样式 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'error';
  /** 按钮大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否显示下拉菜单 */
  dropdown?: DropdownOption[];
  /** 权限检查函数 */
  permission?: () => boolean;
  /** 工具提示文本 */
  tooltip?: string;
}

export interface DropdownOption {
  /** 选项唯一标识 */
  key: string;
  /** 选项文本 */
  label: string;
  /** 选项图标 */
  icon?: string;
  /** 点击事件处理函数 */
  onClick: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示分隔线 */
  divider?: boolean;
  /** 危险操作样式 */
  danger?: boolean;
}

export interface ConfigActionToolbarProps {
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 操作按钮列表 */
  actions?: ActionButton[];
  /** 额外的子元素（如统计信息） */
  children?: React.ReactNode;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 是否显示分隔线 */
  showDivider?: boolean;
  /** 额外的CSS类名 */
  className?: string;
}

export function ConfigActionToolbar({
  title,
  description,
  actions = [],
  children,
  compact = false,
  showDivider = true,
  className = ''
}: ConfigActionToolbarProps) {
  
  // 过滤有权限的操作按钮
  const visibleActions = actions.filter(action => 
    !action.permission || action.permission()
  );
  
  // 获取按钮样式类名
  const getButtonClass = (variant: string = 'primary', size: string = 'md') => {
    const baseClass = 'btn';
    const variantClass = {
      'primary': 'btn-primary',
      'secondary': 'btn-secondary', 
      'outline': 'btn-outline',
      'ghost': 'btn-ghost',
      'success': 'btn-success',
      'warning': 'btn-warning',
      'error': 'btn-error'
    }[variant] || 'btn-primary';
    
    const sizeClass = {
      'xs': 'btn-xs',
      'sm': 'btn-sm',
      'md': '',
      'lg': 'btn-lg'
    }[size] || '';
    
    return `${baseClass} ${variantClass} ${sizeClass}`.trim();
  };
  
  // 渲染图标
  const renderIcon = (iconPath: string) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
  );
  
  // 渲染下拉按钮
  const renderDropdownButton = (action: ActionButton) => (
    <div className="dropdown dropdown-end" key={action.key}>
      <label 
        tabIndex={0} 
        className={`${getButtonClass(action.variant, action.size)} ${action.loading ? 'loading' : ''}`}
        title={action.tooltip}
      >
        {action.loading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : action.icon ? (
          renderIcon(action.icon)
        ) : null}
        {action.label}
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </label>
      
      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
        {action.dropdown?.map((option, index) => (
          <React.Fragment key={option.key}>
            {option.divider && index > 0 && <div className="divider my-1" />}
            <li>
              <button
                className={`${option.danger ? 'text-error hover:bg-error hover:text-error-content' : ''}`}
                onClick={option.onClick}
                disabled={option.disabled}
              >
                {option.icon && renderIcon(option.icon)}
                {option.label}
              </button>
            </li>
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
  
  // 渲染普通按钮
  const renderButton = (action: ActionButton) => (
    <button
      key={action.key}
      className={`${getButtonClass(action.variant, action.size)} ${action.loading ? 'loading' : ''}`}
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      title={action.tooltip}
    >
      {action.loading ? (
        <span className="loading loading-spinner loading-sm"></span>
      ) : action.icon ? (
        renderIcon(action.icon)
      ) : null}
      {action.label}
    </button>
  );
  
  return (
    <div className={className}>
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${compact ? 'py-4' : 'py-6'}`}>
        {/* 左侧标题区域 */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-base-content truncate">
            {title}
          </h1>
          {description && (
            <p className="text-base-content/70 mt-1">
              {description}
            </p>
          )}
          {children && (
            <div className="mt-3">
              {children}
            </div>
          )}
        </div>
        
        {/* 右侧操作按钮区域 */}
        {visibleActions.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            {visibleActions.map(action => 
              action.dropdown ? renderDropdownButton(action) : renderButton(action)
            )}
          </div>
        )}
      </div>
      
      {/* 分隔线 */}
      {showDivider && (
        <div className="divider mt-0 mb-6" />
      )}
    </div>
  );
}

/**
 * 常用操作按钮配置
 */
export const CommonActions = {
  create: (onClick: () => void, disabled = false): ActionButton => ({
    key: 'create',
    label: '新建',
    icon: 'M12 4v16m8-8H4',
    onClick,
    variant: 'primary',
    disabled
  }),
  
  export: (onClick: () => void, disabled = false): ActionButton => ({
    key: 'export',
    label: '导出',
    icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    onClick,
    variant: 'outline',
    disabled
  }),
  
  import: (onClick: () => void, disabled = false): ActionButton => ({
    key: 'import',
    label: '导入',
    icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
    onClick,
    variant: 'outline',
    disabled
  }),
  
  refresh: (onClick: () => void, loading = false): ActionButton => ({
    key: 'refresh',
    label: '刷新',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    onClick,
    variant: 'ghost',
    loading
  }),
  
  settings: (onClick: () => void): ActionButton => ({
    key: 'settings',
    label: '设置',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    onClick,
    variant: 'ghost'
  })
};

export default ConfigActionToolbar;