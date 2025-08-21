import React, { useMemo, useCallback, type ReactNode } from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  DocumentArrowDownIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { ModernButton } from '@/components/common/ModernButton';
import type { BaseEmployeeData } from './EmployeeTableContainer';

// 批量操作配置接口
export interface EmployeeBatchActionConfig<T = BaseEmployeeData> {
  key: string;
  label: string;
  onClick: (selectedRecords: T[]) => void | Promise<void>;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  title?: string;
  disabled?: (selectedRecords: T[]) => boolean;
  requiresConfirm?: boolean;
  confirmMessage?: (selectedRecords: T[]) => string;
  minSelection?: number;
  maxSelection?: number;
}

// 员工批量操作Props
export interface EmployeeBatchActionsProps<T extends BaseEmployeeData = BaseEmployeeData> {
  // 选中的记录
  selectedRecords: T[];
  selectedIds: string[];
  totalCount?: number;
  
  // 批量操作配置
  actions?: EmployeeBatchActionConfig<T>[];
  
  // 内置操作开关
  enableBatchEdit?: boolean;
  enableBatchDelete?: boolean;
  enableBatchExport?: boolean;
  enableBatchStatusChange?: boolean;
  
  // 操作回调
  onBatchEdit?: (records: T[]) => void;
  onBatchDelete?: (records: T[]) => void;
  onBatchExport?: (records: T[]) => void;
  onBatchStatusChange?: (records: T[], status: string) => void;
  
  // 状态选项
  statusOptions?: Array<{ value: string; label: string; color?: string }>;
  
  // 显示控制
  showSelectionInfo?: boolean;
  showActionButtons?: boolean;
  position?: 'top' | 'bottom' | 'both';
  
  // 样式
  className?: string;
  compact?: boolean;
  loading?: boolean;
}

/**
 * 员工批量操作组件
 * 提供批量编辑、删除、导出、状态变更等功能
 */
export function EmployeeBatchActions<T extends BaseEmployeeData = BaseEmployeeData>({
  selectedRecords,
  selectedIds,
  totalCount,
  
  actions = [],
  
  enableBatchEdit = true,
  enableBatchDelete = true,
  enableBatchExport = true,
  enableBatchStatusChange = true,
  
  onBatchEdit,
  onBatchDelete,
  onBatchExport,
  onBatchStatusChange,
  
  statusOptions = [
    { value: 'active', label: '设为在职', color: 'success' },
    { value: 'inactive', label: '设为离职', color: 'error' },
    { value: 'suspended', label: '设为停职', color: 'warning' },
  ],
  
  showSelectionInfo = true,
  showActionButtons = true,
  position = 'top',
  
  className = '',
  compact = false,
  loading = false,
}: EmployeeBatchActionsProps<T>) {
  
  const hasSelection = selectedIds.length > 0;
  const selectedCount = selectedIds.length;

  // 构建默认操作
  const defaultActions = useMemo((): EmployeeBatchActionConfig<T>[] => {
    const actions: EmployeeBatchActionConfig<T>[] = [];

    if (enableBatchEdit && onBatchEdit) {
      actions.push({
        key: 'edit',
        label: '批量编辑',
        onClick: onBatchEdit,
        icon: <PencilIcon className="w-4 h-4" />,
        variant: 'primary',
        title: '批量编辑选中员工信息',
        minSelection: 1,
      });
    }

    if (enableBatchDelete && onBatchDelete) {
      actions.push({
        key: 'delete',
        label: '批量删除',
        onClick: onBatchDelete,
        icon: <TrashIcon className="w-4 h-4" />,
        variant: 'danger',
        title: '批量删除选中员工',
        requiresConfirm: true,
        confirmMessage: (records) => `确定要删除选中的 ${records.length} 名员工吗？`,
        minSelection: 1,
      });
    }

    if (enableBatchExport && onBatchExport) {
      actions.push({
        key: 'export',
        label: '导出选中',
        onClick: onBatchExport,
        icon: <DocumentArrowDownIcon className="w-4 h-4" />,
        variant: 'primary',
        title: '导出选中员工数据',
        minSelection: 1,
      });
    }

    return actions;
  }, [enableBatchEdit, enableBatchDelete, enableBatchExport, onBatchEdit, onBatchDelete, onBatchExport]);

  // 合并操作
  const allActions = useMemo(() => {
    return [...defaultActions, ...actions];
  }, [defaultActions, actions]);

  // 过滤可用操作
  const availableActions = useMemo(() => {
    return allActions.filter(action => {
      // 检查最小/最大选择数量限制
      if (action.minSelection && selectedCount < action.minSelection) return false;
      if (action.maxSelection && selectedCount > action.maxSelection) return false;
      
      // 检查自定义禁用条件
      if (action.disabled && action.disabled(selectedRecords)) return false;
      
      return true;
    });
  }, [allActions, selectedCount, selectedRecords]);

  // 状态统计
  const statusStats = useMemo(() => {
    if (!selectedRecords.length) return null;
    
    const stats: Record<string, number> = {};
    selectedRecords.forEach(record => {
      const status = record.status || 'unknown';
      stats[status] = (stats[status] || 0) + 1;
    });
    
    return stats;
  }, [selectedRecords]);

  // 获取状态标签
  const getStatusLabel = useCallback((status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.label || status;
  }, [statusOptions]);

  // 获取状态徽章样式
  const getStatusBadgeClass = useCallback((status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    const color = option?.color || 'neutral';
    return `badge badge-${color} badge-sm`;
  }, [statusOptions]);

  if (!hasSelection) {
    return null;
  }

  return (
    <div className={`employee-batch-actions ${compact ? 'compact' : ''} ${className}`.trim()}>
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* 选择信息 */}
          {showSelectionInfo && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  已选择 <span className="text-primary font-bold">{selectedCount}</span> 名员工
                  {totalCount && <span className="text-base-content/60"> / {totalCount}</span>}
                </span>
              </div>

              {/* 状态构成显示 */}
              {statusStats && Object.keys(statusStats).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(statusStats)
                    .filter(([_, count]) => count > 0)
                    .map(([status, count]) => (
                      <span key={status} className={getStatusBadgeClass(status)}>
                        {getStatusLabel(status)} {count}人
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          {showActionButtons && (
            <div className="flex flex-wrap gap-2">
              
              {/* 状态变更下拉菜单 */}
              {enableBatchStatusChange && onBatchStatusChange && statusOptions.length > 0 && (
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-outline btn-sm">
                    <CheckCircleIcon className="w-4 h-4" />
                    状态变更
                  </div>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48">
                    {statusOptions.map(option => (
                      <li key={option.value}>
                        <button
                          onClick={() => onBatchStatusChange(selectedRecords, option.value)}
                          className="text-left"
                          disabled={loading}
                        >
                          <span className={`badge badge-${option.color || 'neutral'} badge-xs`}></span>
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 动态操作按钮 */}
              {availableActions.map(action => (
                <ModernButton
                  key={action.key}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  onClick={() => action.onClick(selectedRecords)}
                  icon={action.icon}
                  title={action.title}
                  disabled={loading}
                >
                  {action.label}
                </ModernButton>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeBatchActions;