/**
 * 薪资导入月份选择器
 * 专门为薪资导入场景设计的月份选择组件
 */

import React from 'react';
import { MonthPicker } from '@/components/common/MonthPicker';
import { type AvailablePayrollMonth } from '@/hooks/payroll';
import { PHASE_CONSTANTS, UI_CONSTANTS, ERROR_MESSAGES } from '../../constants';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';

export interface MonthSelectorProps {
  /** 当前选中的月份 (格式: YYYY-MM) */
  selectedMonth: string;
  
  /** 月份变更回调 */
  onMonthChange: (month: string) => void;
  
  /** 可用的薪资月份数据 */
  availableMonths?: AvailablePayrollMonth[];
  
  /** 是否禁用组件 */
  disabled?: boolean;
  
  /** 是否显示加载状态 */
  loading?: boolean;
  
  /** 自定义样式类名 */
  className?: string;
  
  /** 是否显示数据指示器 */
  showDataIndicators?: boolean;
  
  /** 是否显示完整性指示器 */
  showCompletenessIndicators?: boolean;
  
  /** 错误状态 */
  error?: string | null;
}

/**
 * 薪资导入月份选择器组件
 * 提供月份选择功能，集成数据指示器和状态反馈
 */
export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  onMonthChange,
  availableMonths,
  disabled = false,
  loading = false,
  className,
  showDataIndicators = true,
  showCompletenessIndicators = true,
  error = null
}) => {
  
  // 处理月份变更
  const handleMonthChange = (month: string) => {
    if (disabled || loading) return;
    onMonthChange(month);
  };

  // 检查月份是否可用
  const isMonthAvailable = (month: string): boolean => {
    if (!availableMonths) return true;
    return availableMonths.some(m => m.month === month);
  };

  // 获取月份状态描述
  const getMonthStatusText = (month: string): string => {
    if (!availableMonths) return '';
    
    const monthData = availableMonths.find(m => m.month === month);
    if (!monthData) return '无薪资数据';
    
    return `${monthData.payrollCount || 0} 名员工`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        {loading && (
          <div className="loading loading-spinner loading-sm"></div>
        )}
      </div>

      {/* 月份选择器区域 */}
      <div 
        className={cn(
          'relative',
          cardEffects.standard,
          'p-6 bg-base-200/50',
          error && 'border-error bg-error/5'
        )}
      >
        <div className="space-y-4">
          {/* 说明文本 */}
          <p className="text-sm text-base-content/70">
            选择要导入薪资数据的月份周期
          </p>

          {/* MonthPicker 组件 */}
          <div className="relative">
            <MonthPicker
              value={selectedMonth}
              onChange={handleMonthChange}
              placeholder="请选择薪资周期"
              availableMonths={availableMonths}
              showDataIndicators={showDataIndicators}
              showCompletenessIndicators={showCompletenessIndicators}
              disabled={disabled || loading}
              size="lg"
              className="w-full"
            />
            
            {/* 禁用遮罩 */}
            {(disabled || loading) && (
              <div className="absolute inset-0 bg-base-content/5 rounded-lg flex items-center justify-center">
                {loading && (
                  <span className="loading loading-spinner loading-md"></span>
                )}
              </div>
            )}
          </div>

          {/* 月份状态信息 */}
          {selectedMonth && !error && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/70">
                选中月份状态：
              </span>
              <span className={cn(
                'font-medium',
                isMonthAvailable(selectedMonth) 
                  ? 'text-success' 
                  : 'text-warning'
              )}>
                {getMonthStatusText(selectedMonth)}
              </span>
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
        </div>
      </div>

      {/* 提示信息 */}
      <div className="text-xs text-base-content/60 space-y-1">
        <p>💡 提示：</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>绿色标记表示该月份已有薪资数据</li>
          <li>可以选择任何月份进行导入操作</li>
          <li>导入会覆盖现有的薪资数据</li>
        </ul>
      </div>
    </div>
  );
};

// 默认导出
export default MonthSelector;