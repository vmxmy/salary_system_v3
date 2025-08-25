/**
 * 薪资导入数据组选择器
 * 专门为薪资导入场景设计的数据组选择组件
 */

import React from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { DATA_GROUP_CONSTANTS, UI_CONSTANTS, ERROR_MESSAGES } from '../../constants';
import { getDataGroupLabel } from '../../utils/import-helpers';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';

export interface DataGroupSelectorProps {
  /** 当前选中的数据组 */
  selectedDataGroups: ImportDataGroup[];
  
  /** 数据组选择变更回调 */
  onGroupToggle: (group: ImportDataGroup) => void;
  
  /** 全选/取消全选回调 */
  onSelectAllGroups: () => void;
  
  /** 是否禁用组件 */
  disabled?: boolean;
  
  /** 是否显示加载状态 */
  loading?: boolean;
  
  /** 自定义样式类名 */
  className?: string;
  
  /** 错误状态 */
  error?: string | null;
  
  /** 是否显示详细描述 */
  showDescriptions?: boolean;
  
  /** 是否显示图标 */
  showIcons?: boolean;
}

/**
 * 数据组选择项组件
 */
interface DataGroupItemProps {
  group: ImportDataGroup;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
  showDescription: boolean;
  showIcon: boolean;
}

const DataGroupItem: React.FC<DataGroupItemProps> = ({
  group,
  isSelected,
  onToggle,
  disabled,
  showDescription,
  showIcon
}) => {
  const config = {
    label: DATA_GROUP_CONSTANTS.LABELS[group],
    sheetName: DATA_GROUP_CONSTANTS.SHEET_NAMES[group],
    color: DATA_GROUP_CONSTANTS.COLORS[group],
    icon: DATA_GROUP_CONSTANTS.ICONS[group]
  };

  return (
    <div 
      className={cn(
        'relative cursor-pointer transition-all duration-200',
        cardEffects.hover,
        'p-4 rounded-lg',
        isSelected && 'ring-2 ring-primary/40 bg-primary/5',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={!disabled ? onToggle : undefined}
    >
      {/* 选择指示器 */}
      <div className="absolute top-2 right-2">
        <div className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
          isSelected 
            ? 'bg-primary border-primary text-primary-content'
            : 'border-base-300 bg-base-100'
        )}>
          {isSelected && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      <div className="pr-8 space-y-2">
        {/* 标题行 */}
        <div className="flex items-center gap-3">
          {showIcon && (
            <div className="text-2xl">
              {config.icon}
            </div>
          )}
          <div>
            <h4 className="font-medium text-base-content">
              {config.label}
            </h4>
            <p className="text-sm text-base-content/60">
              工作表: {config.sheetName}
            </p>
          </div>
        </div>

        {/* 描述信息 */}
        {showDescription && (
          <div className="text-sm text-base-content/70">
            {getDataGroupDescription(group)}
          </div>
        )}

        {/* 标签 */}
        <div className="flex items-center gap-2">
          <span className={cn('badge', config.color)}>
            {config.label}
          </span>
          {isSelected && (
            <span className="badge badge-success badge-sm">
              已选择
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 获取数据组详细描述
 */
const getDataGroupDescription = (group: ImportDataGroup): string => {
  switch(group) {
    case ImportDataGroup.EARNINGS:
      return '包含基本工资、绩效奖金、津贴补贴等各项薪资组成明细';
    case ImportDataGroup.CONTRIBUTION_BASES:
      return '包含养老、医疗、失业、生育、工伤保险及住房公积金缴费基数';
    case ImportDataGroup.CATEGORY_ASSIGNMENT:
      return '员工的人员类别分配信息，如正式员工、合同工、临时工等';
    case ImportDataGroup.JOB_ASSIGNMENT:
      return '员工的部门分配和职位信息，包含组织架构相关数据';
    default:
      return '数据组描述';
  }
};

/**
 * 薪资导入数据组选择器组件
 */
export const DataGroupSelector: React.FC<DataGroupSelectorProps> = ({
  selectedDataGroups,
  onGroupToggle,
  onSelectAllGroups,
  disabled = false,
  loading = false,
  className,
  error = null,
  showDescriptions = true,
  showIcons = true
}) => {

  // 可选择的数据组
  const availableGroups = [
    ImportDataGroup.EARNINGS,
    ImportDataGroup.CONTRIBUTION_BASES,
    ImportDataGroup.CATEGORY_ASSIGNMENT,
    ImportDataGroup.JOB_ASSIGNMENT
  ];

  // 计算选择状态
  const selectedCount = selectedDataGroups.length;
  const totalCount = availableGroups.length;
  const isAllSelected = selectedCount === totalCount;
  const hasSelection = selectedCount > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标题和控制区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-base-content">
            📂 数据类型选择
          </h3>
          <p className="text-sm text-base-content/70 mt-1">
            选择要导入的数据类型，确保Excel文件包含对应的工作表
          </p>
        </div>
        {loading && (
          <div className="loading loading-spinner loading-sm"></div>
        )}
      </div>

      {/* 全选控制 */}
      <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg border border-base-300">
        <span className="text-sm font-medium">
          {hasSelection 
            ? `已选择 ${selectedCount} / ${totalCount} 种数据类型`
            : '未选择任何数据类型'
          }
        </span>
        <button
          className="btn btn-sm btn-outline"
          onClick={onSelectAllGroups}
          disabled={disabled || loading}
        >
          {isAllSelected ? '取消全选' : '全部选择'}
        </button>
      </div>

      {/* 数据组选择区域 */}
      <div 
        className={cn(
          'space-y-3',
          (disabled || loading) && 'pointer-events-none opacity-70'
        )}
      >
        {availableGroups.map(group => (
          <DataGroupItem
            key={group}
            group={group}
            isSelected={selectedDataGroups.includes(group)}
            onToggle={() => onGroupToggle(group)}
            disabled={disabled || loading}
            showDescription={showDescriptions}
            showIcon={showIcons}
          />
        ))}
      </div>

      {/* 选择状态提示 */}
      {hasSelection && !error && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-primary">
                已选择 {selectedCount} 种数据类型
              </p>
              <p className="text-xs text-base-content/60 mt-1">
                确保您的Excel文件包含对应的工作表，系统将自动验证文件结构
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 错误状态显示 */}
      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 无选择提示 */}
      {!hasSelection && !error && (
        <div className="text-center p-6 bg-base-200/30 rounded-lg border-2 border-dashed border-base-300">
          <div className="text-4xl mb-2">📋</div>
          <h4 className="font-medium text-base-content mb-1">
            请选择数据类型
          </h4>
          <p className="text-sm text-base-content/60">
            至少选择一种数据类型才能继续导入操作
          </p>
        </div>
      )}

      {/* 操作提示 */}
      <div className="text-xs text-base-content/60 space-y-1">
        <p>💡 导入提示：</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>可以同时选择多种数据类型进行批量导入</li>
          <li>每种数据类型对应Excel文件中的一个工作表</li>
          <li>导入时会验证工作表名称和数据格式</li>
          <li>建议按照模板格式准备Excel文件</li>
        </ul>
      </div>
    </div>
  );
};

// 默认导出
export default DataGroupSelector;