import React, { type ReactNode } from 'react';
import { MonthPicker } from '@/components/common/MonthPicker';
import { cardEffects } from '@/lib/utils';

// 可用月份数据接口
export interface AvailableMonth {
  month: string;
  periodId: string;
  hasData?: boolean;
  payrollCount?: number;  // 添加记录数量字段
  completeness?: number;
  [key: string]: any;
}

// 薪资周期选择器Props
export interface PayrollPeriodSelectorProps {
  // 选择的月份和周期
  selectedMonth: string;
  selectedPeriodId?: string;
  onMonthChange: (month: string) => void;
  onPeriodIdChange?: (periodId: string) => void;
  
  // 可用数据
  availableMonths?: AvailableMonth[];
  isLoading?: boolean;
  
  // MonthPicker配置
  showDataIndicators?: boolean;
  showCompletenessIndicators?: boolean;
  onlyShowMonthsWithData?: boolean;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  
  // 额外的筛选控件
  extraControls?: ReactNode;
  
  // 显示配置
  showIcon?: boolean;
  showLabel?: boolean;
  label?: string;
  
  // 结果统计
  resultCount?: number;
  showResultCount?: boolean;
  
  // 样式
  className?: string;
  cardClassName?: string;
  
  // 布局模式
  layout?: 'horizontal' | 'vertical';
  
  // 自定义处理逻辑
  onMonthSelect?: (month: string, monthData?: AvailableMonth) => void;
}

/**
 * 薪资周期选择器组件
 * 统一处理周期选择和相关状态管理
 */
export function PayrollPeriodSelector({
  selectedMonth,
  selectedPeriodId,
  onMonthChange,
  onPeriodIdChange,
  availableMonths = [],
  isLoading = false,
  showDataIndicators = true,
  showCompletenessIndicators = false,
  onlyShowMonthsWithData = true,
  placeholder = "选择薪资周期",
  size = "sm",
  extraControls,
  showIcon = true,
  showLabel = true,
  label = "薪资周期：",
  resultCount,
  showResultCount = true,
  className = "",
  cardClassName = "",
  layout = "horizontal",
  onMonthSelect,
}: PayrollPeriodSelectorProps) {
  
  // 处理月份选择
  const handleMonthChange = (month: string) => {
    // 查找对应的周期数据
    const monthData = availableMonths.find(m => m.month === month);
    
    // 更新月份
    onMonthChange(month);
    
    // 更新周期ID
    if (monthData?.periodId && onPeriodIdChange) {
      onPeriodIdChange(monthData.periodId);
    }
    
    // 调用自定义处理函数
    if (onMonthSelect) {
      onMonthSelect(month, monthData);
    }
  };

  const content = (
    <div className={`flex items-center gap-3 ${layout === 'vertical' ? 'flex-col items-start' : 'flex-wrap'}`}>
      {/* 薪资周期筛选 */}
      <div className="flex items-center gap-2">
        {showIcon && (
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        {showLabel && (
          <span className="text-xs font-medium text-base-content">{label}</span>
        )}
      </div>
      
      <MonthPicker
        value={selectedMonth}
        onChange={handleMonthChange}
        showDataIndicators={showDataIndicators}
        availableMonths={availableMonths?.map(m => ({
          month: m.month,
          payrollCount: m.payrollCount || 0,  // 使用实际的记录数量
          hasData: !!m.hasData,
          periodId: m.periodId,
          periodStatus: 'completed' as const,
          isLocked: false
        }))}
        onlyShowMonthsWithData={onlyShowMonthsWithData}
        placeholder={placeholder}
        className={`flex-shrink-0 ${size === 'sm' ? 'w-36' : size === 'lg' ? 'w-44' : 'w-40'}`}
        size={size}
        showCompletenessIndicators={showCompletenessIndicators}
        disabled={isLoading}
      />

      {/* 额外的控制组件 */}
      {extraControls}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center gap-1 text-xs text-base-content/60">
          <div className="loading loading-spinner loading-xs"></div>
          <span>加载中...</span>
        </div>
      )}
      
      {/* 结果统计 */}
      {showResultCount && resultCount !== undefined && !isLoading && (
        <div className="flex items-center gap-1 text-xs text-base-content/70 ml-auto">
          <span>共</span>
          <span className="font-medium text-primary">{resultCount}</span>
          <span>条记录</span>
        </div>
      )}
    </div>
  );

  // 如果有卡片类名，使用卡片包装
  if (cardClassName || className.includes('card')) {
    return (
      <div className={`${cardEffects.modern} p-4 ${cardClassName} ${className}`} data-tour="payroll-period-selector">
        {content}
      </div>
    );
  }

  // 否则直接返回内容
  return (
    <div className={`payroll-period-selector ${className}`} data-tour="payroll-period-selector">
      {content}
    </div>
  );
}

/**
 * 薪资周期选择Hook
 * 提供周期选择的状态管理和逻辑
 */
export function usePayrollPeriodSelector(
  availableMonths: AvailableMonth[] = [],
  defaultMonth?: string
) {
  const [selectedMonth, setSelectedMonth] = React.useState(defaultMonth || '');
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>('');

  // 处理月份变化
  const handleMonthChange = React.useCallback((month: string) => {
    setSelectedMonth(month);
    
    // 查找对应的周期ID
    const monthData = availableMonths.find(m => m.month === month);
    if (monthData?.periodId) {
      setSelectedPeriodId(monthData.periodId);
    } else {
      setSelectedPeriodId('');
    }
  }, [availableMonths]);

  // 初始化：如果没有选中月份但有可用数据，选择最新的
  React.useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      // 按月份排序，选择最新的
      const sortedMonths = [...availableMonths].sort((a, b) => b.month.localeCompare(a.month));
      const latestMonth = sortedMonths[0];
      if (latestMonth) {
        handleMonthChange(latestMonth.month);
      }
    }
  }, [availableMonths, selectedMonth, handleMonthChange]);

  // 获取当前选中月份的数据
  const selectedMonthData = React.useMemo(() => {
    return availableMonths.find(m => m.month === selectedMonth);
  }, [availableMonths, selectedMonth]);

  return {
    // 状态
    selectedMonth,
    selectedPeriodId,
    selectedMonthData,
    
    // 处理函数
    setSelectedMonth,
    setSelectedPeriodId,
    handleMonthChange,
    
    // 便捷方法
    hasValidSelection: !!selectedPeriodId,
    isInitialized: !!selectedMonth,
  };
}

export default PayrollPeriodSelector;