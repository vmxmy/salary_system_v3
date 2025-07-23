import React from 'react';

/**
 * 批量操作工具栏组件
 * 当用户选择多个项目时显示，提供批量操作功能
 */

export interface BulkAction {
  /** 操作唯一标识 */
  key: string;
  /** 操作标签 */
  label: string;
  /** 操作图标（SVG path） */
  icon?: string;
  /** 点击事件处理函数 */
  onClick: (selectedIds: string[]) => void;
  /** 操作类型 */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否需要确认 */
  needConfirm?: boolean;
  /** 确认提示文本 */
  confirmText?: string;
  /** 权限检查函数 */
  permission?: (selectedCount: number) => boolean;
  /** 最小选择数量 */
  minSelection?: number;
  /** 最大选择数量 */
  maxSelection?: number;
}

export interface BulkActionsBarProps {
  /** 选中的项目ID列表 */
  selectedIds: string[];
  /** 总项目数量 */
  totalCount: number;
  /** 可用的批量操作列表 */
  actions?: BulkAction[];
  /** 清除选择的回调函数 */
  onClearSelection?: () => void;
  /** 全选的回调函数 */
  onSelectAll?: () => void;
  /** 是否显示全选按钮 */
  showSelectAll?: boolean;
  /** 自定义选择信息渲染 */
  renderSelectionInfo?: (selectedCount: number, totalCount: number) => React.ReactNode;
  /** 是否正在执行批量操作 */
  loading?: boolean;
  /** 动画效果 */
  animated?: boolean;
  /** 额外的CSS类名 */
  className?: string;
}

export function BulkActionsBar({
  selectedIds,
  totalCount,
  actions = [],
  onClearSelection,
  onSelectAll,
  showSelectAll = true,
  renderSelectionInfo,
  loading = false,
  animated = true,
  className = ''
}: BulkActionsBarProps) {
  const selectedCount = selectedIds.length;
  
  // 如果没有选中任何项目，不显示工具栏
  if (selectedCount === 0) {
    return null;
  }
  
  // 过滤可用的操作
  const availableActions = actions.filter(action => {
    // 检查权限
    if (action.permission && !action.permission(selectedCount)) {
      return false;
    }
    
    // 检查最小选择数量
    if (action.minSelection && selectedCount < action.minSelection) {
      return false;
    }
    
    // 检查最大选择数量
    if (action.maxSelection && selectedCount > action.maxSelection) {
      return false;
    }
    
    return true;
  });
  
  // 获取按钮样式类名
  const getButtonClass = (variant: string = 'primary') => {
    const baseClass = 'btn btn-sm';
    const variantClass = {
      'primary': 'btn-primary',
      'secondary': 'btn-secondary',
      'success': 'btn-success',
      'warning': 'btn-warning',
      'error': 'btn-error',
      'ghost': 'btn-ghost'
    }[variant] || 'btn-primary';
    
    return `${baseClass} ${variantClass}`;
  };
  
  // 渲染图标
  const renderIcon = (iconPath: string) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
  );
  
  // 处理操作点击
  const handleActionClick = async (action: BulkAction) => {
    if (action.disabled || loading) return;
    
    // 如果需要确认
    if (action.needConfirm) {
      const confirmText = action.confirmText || `确定要对选中的 ${selectedCount} 个项目执行"${action.label}"操作吗？`;
      if (!window.confirm(confirmText)) {
        return;
      }
    }
    
    try {
      await action.onClick(selectedIds);
    } catch (error) {
      console.error('批量操作失败:', error);
    }
  };
  
  // 默认的选择信息渲染
  const defaultSelectionInfo = (
    <div className="flex items-center gap-2">
      <span className="font-medium">
        已选择 {selectedCount} 项
      </span>
      {totalCount > 0 && (
        <span className="text-base-content/60">
          / 共 {totalCount} 项
        </span>
      )}
    </div>
  );
  
  return (
    <div 
      className={`
        bg-primary text-primary-content shadow-lg rounded-lg p-4 mb-4
        ${animated ? 'animate-in slide-in-from-top duration-200' : ''}
        ${className}
      `}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* 左侧选择信息 */}
        <div className="flex items-center gap-4">
          {/* 选择信息 */}
          <div className="text-sm">
            {renderSelectionInfo ? renderSelectionInfo(selectedCount, totalCount) : defaultSelectionInfo}
          </div>
          
          {/* 全选按钮 */}
          {showSelectAll && onSelectAll && selectedCount < totalCount && (
            <button
              className="btn btn-xs btn-outline btn-primary-content"
              onClick={onSelectAll}
              disabled={loading}
            >
              全选
            </button>
          )}
        </div>
        
        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 批量操作按钮 */}
          {availableActions.map(action => (
            <button
              key={action.key}
              className={getButtonClass(action.variant)}
              onClick={() => handleActionClick(action)}
              disabled={action.disabled || loading}
              title={action.label}
            >
              {action.icon && renderIcon(action.icon)}
              {action.label}
            </button>
          ))}
          
          {/* 清除选择按钮 */}
          {onClearSelection && (
            <button
              className="btn btn-sm btn-outline btn-primary-content"
              onClick={onClearSelection}
              disabled={loading}
              title="清除选择"
            >
              {renderIcon('M6 18L18 6M6 6l12 12')}
              清除
            </button>
          )}
        </div>
      </div>
      
      {/* 加载指示器 */}
      {loading && (
        <div className="flex items-center justify-center mt-4 pt-4 border-t border-primary-content/20">
          <span className="loading loading-spinner loading-sm mr-2"></span>
          <span className="text-sm">正在执行批量操作...</span>
        </div>
      )}
    </div>
  );
}

/**
 * 常用批量操作配置
 */
export const CommonBulkActions = {
  delete: (onDelete: (ids: string[]) => void): BulkAction => ({
    key: 'delete',
    label: '批量删除',
    icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    onClick: onDelete,
    variant: 'error',
    needConfirm: true,
    confirmText: undefined, // 使用默认确认文本
    minSelection: 1
  }),
  
  enable: (onEnable: (ids: string[]) => void): BulkAction => ({
    key: 'enable',
    label: '批量启用',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    onClick: onEnable,
    variant: 'success',
    minSelection: 1
  }),
  
  disable: (onDisable: (ids: string[]) => void): BulkAction => ({
    key: 'disable',
    label: '批量停用',
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    onClick: onDisable,
    variant: 'warning',
    minSelection: 1
  }),
  
  export: (onExport: (ids: string[]) => void): BulkAction => ({
    key: 'export',
    label: '批量导出',
    icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    onClick: onExport,
    variant: 'secondary',
    minSelection: 1
  }),
  
  copy: (onCopy: (ids: string[]) => void): BulkAction => ({
    key: 'copy',
    label: '批量复制',
    icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
    onClick: onCopy,
    variant: 'secondary',
    minSelection: 1
  })
};

export default BulkActionsBar;