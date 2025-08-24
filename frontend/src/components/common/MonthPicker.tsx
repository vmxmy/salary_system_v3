import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { cardEffects } from '@/styles/design-effects';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvailablePayrollMonths, checkMonthAvailability, type AvailablePayrollMonth } from '@/hooks/payroll';
import { usePayrollPeriodsCompleteness } from '@/hooks/payroll/usePayrollPeriodCompleteness';
import type { PayrollPeriodCompleteness } from '@/types/payroll-completeness';

interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Show visual indicators for months with payroll data */
  showDataIndicators?: boolean;
  /** Predefined available months (optional, will use hook if not provided) */
  availableMonths?: AvailablePayrollMonth[];
  /** Disable months that already have payroll data */
  disableMonthsWithData?: boolean;
  /** Only allow selection of months that have payroll data (opposite of disableMonthsWithData) */
  onlyShowMonthsWithData?: boolean;
  /** Custom function to determine if a month should be disabled */
  isMonthDisabledCustom?: (yearMonth: string, monthData?: AvailablePayrollMonth) => boolean;
  /** Show completeness indicators for periods */
  showCompletenessIndicators?: boolean;
}

export function MonthPicker({
  value,
  onChange,
  className,
  placeholder,
  minDate,
  maxDate,
  size = 'md',
  disabled = false,
  showDataIndicators = false,
  availableMonths: providedAvailableMonths,
  disableMonthsWithData = false,
  onlyShowMonthsWithData = false,
  isMonthDisabledCustom,
  showCompletenessIndicators = false
}: MonthPickerProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState<number>(() => {
    if (value) {
      return parseInt(value.split('-')[0]);
    }
    return new Date().getFullYear();
  });
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch available payroll months data when indicators are enabled and no predefined data
  const shouldFetchData = showDataIndicators && !providedAvailableMonths;
  const { data: fetchedAvailableMonths, isLoading: isLoadingMonths } = useAvailablePayrollMonths(shouldFetchData);
  
  // Fetch completeness data when enabled
  const { data: completenessData, isLoading: isLoadingCompleteness } = usePayrollPeriodsCompleteness();
  
  // Use provided months or fetched months
  const availableMonths = providedAvailableMonths || (showDataIndicators ? fetchedAvailableMonths : undefined);
  
  // Helper function to get completeness for a specific month
  const getMonthCompleteness = (yearMonth: string): PayrollPeriodCompleteness | undefined => {
    if (!showCompletenessIndicators || !completenessData) return undefined;
    const [year, month] = yearMonth.split('-').map(Number);
    return completenessData.find(c => c.period_year === year && c.period_month === month);
  };
  
  // 计算最佳弹出位置
  const calculateDropdownPosition = () => {
    if (!containerRef.current) return 'bottom';
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // 根据是否显示指示器动态估算下拉面板高度
    let dropdownHeight = 320; // 基础高度
    if (showDataIndicators || showCompletenessIndicators) {
      dropdownHeight += 80; // 为状态图例增加高度
    }
    
    const spaceBelow = window.innerHeight - rect.bottom - 20; // 保留20px边距
    const spaceAbove = rect.top - 20; // 保留20px边距
    const padding = 8; // mt-2 和 mb-2 的间距
    
    // 优先选择下方，除非空间严重不足
    if (spaceBelow >= dropdownHeight + padding) {
      return 'bottom';
    } else if (spaceAbove >= dropdownHeight + padding) {
      return 'top';
    } else {
      // 都不够的情况下选择空间更大的一方
      return spaceAbove > spaceBelow ? 'top' : 'bottom';
    }
  };
  
  // 使用 DaisyUI 5 标准样式
  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'input-sm';
      case 'lg': return 'input-lg';
      default: return '';
    }
  };

  // 处理外部点击关闭和窗口大小变化
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      if (isOpen) {
        // 窗口大小变化时重新计算位置
        const newPosition = calculateDropdownPosition();
        setDropdownPosition(newPosition);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        // 滚动时重新计算位置
        const newPosition = calculateDropdownPosition();
        setDropdownPosition(newPosition);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true); // 捕获所有滚动事件
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  // 格式化显示值
  const formatDisplayValue = (yearMonth: string) => {
    if (!yearMonth) return '';
    const [year, month] = yearMonth.split('-');
    return `${year}年${parseInt(month)}月`;
  };


  // 获取月份缩写
  const getMonthShort = (month: number) => {
    const monthsShort = ['1月', '2月', '3月', '4月', '5月', '6月', 
                        '7月', '8月', '9月', '10月', '11月', '12月'];
    return monthsShort[month - 1];
  };

  // 获取当前月份信息
  const getCurrentMonthInfo = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  };

  const currentMonthInfo = getCurrentMonthInfo();

  // 检查月份是否在允许范围内
  const isMonthDisabled = (year: number, month: number) => {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    
    if (minDate && yearMonth < minDate) return true;
    if (maxDate && yearMonth > maxDate) return true;
    
    // 如果提供了自定义禁用函数，使用它
    if (isMonthDisabledCustom) {
      const monthData = availableMonths?.find(m => m.month === yearMonth);
      if (isMonthDisabledCustom(yearMonth, monthData)) return true;
    }
    
    // 如果启用了禁用有数据月份功能，检查该月份是否有数据
    if (disableMonthsWithData && showDataIndicators) {
      const monthAvailability = checkMonthAvailability(availableMonths, yearMonth);
      if (monthAvailability.hasData) return true;
    }
    
    // 如果启用了只显示有数据月份功能，检查该月份是否没有数据或周期
    if (onlyShowMonthsWithData && showDataIndicators) {
      const monthAvailability = checkMonthAvailability(availableMonths, yearMonth);
      // 优化逻辑：有薪资周期就可以选择，即使还没有薪资记录
      if (!monthAvailability.hasData && !monthAvailability.hasPeriod) return true;
    }
    
    return false;
  };

  // 处理打开/关闭下拉框
  const handleToggleDropdown = () => {
    if (disabled) return;
    
    if (!isOpen) {
      // 打开时计算位置
      const position = calculateDropdownPosition();
      setDropdownPosition(position);
    }
    
    setIsOpen(!isOpen);
  };

  // 选择月份
  const handleSelectMonth = (month: number) => {
    const yearMonth = `${displayYear}-${String(month).padStart(2, '0')}`;
    onChange(yearMonth);
    setIsOpen(false);
  };

  // 快捷选择
  const handleQuickSelect = (type: 'currentMonth' | 'lastMonth' | 'currentYear') => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    switch (type) {
      case 'lastMonth':
        month = month - 1;
        if (month === 0) {
          month = 12;
          year = year - 1;
        }
        break;
      case 'currentYear':
        // 选择当年1月
        month = 1;
        break;
    }

    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    onChange(yearMonth);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", isOpen && "z-[10000]")}>
      {/* 输入框 */}
      <div
        onClick={handleToggleDropdown}
        className={cn(
          'input input-bordered',
          getSizeClass(),
          'cursor-pointer flex items-center justify-between',
          disabled && 'input-disabled',
          isOpen && 'input-focus',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <svg 
            className={cn(
              'w-4 h-4 transition-colors',
              isOpen ? 'text-primary' : 'text-base-content/60'
            )} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={cn(
            'font-medium transition-colors',
            value ? 'text-base-content' : 'text-base-content/60'
          )}>
{value ? formatDisplayValue(value) : (placeholder || String(t('selectMonth')))}
          </span>
        </div>
        <svg 
          className={cn(
            'w-4 h-4 transition-all duration-300',
            isOpen 
              ? dropdownPosition === 'top' 
                ? '-rotate-0 text-primary' // 向上弹出时箭头不旋转（向上）
                : 'rotate-180 text-primary' // 向下弹出时箭头旋转180度（向上）
              : 'text-base-content/60' // 关闭时向下
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* 下拉面板 - 自适应方向 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ 
              opacity: 0, 
              y: dropdownPosition === 'bottom' ? -10 : 10, 
              scale: 0.95 
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ 
              opacity: 0, 
              y: dropdownPosition === 'bottom' ? -10 : 10, 
              scale: 0.95 
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              cardEffects.elevated,
              'absolute p-6 min-w-[320px] z-[10001]',
              // 根据位置调整方向
              dropdownPosition === 'bottom' 
                ? 'top-full mt-2' 
                : 'bottom-full mb-2'
            )}
          >
            {/* 年份选择 */}
            <div className="flex items-center justify-between mb-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDisplayYear(displayYear - 1)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  {displayYear}
                </span>
                <span className="text-lg text-base-content/70">年</span>
              </div>
              
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDisplayYear(displayYear + 1)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>

            {/* 快捷选择 */}
            <div className="flex gap-2 mb-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickSelect('currentMonth')}
                className="btn btn-ghost btn-sm flex-1 border border-base-300"
              >
                本月
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickSelect('lastMonth')}
                className="btn btn-ghost btn-sm flex-1 border border-base-300"
              >
                上月
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickSelect('currentYear')}
                className="btn btn-ghost btn-sm flex-1 border border-base-300"
              >
                今年
              </motion.button>
            </div>


            {/* 月份网格 */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const isSelected = value === `${displayYear}-${String(month).padStart(2, '0')}`;
                const isDisabled = isMonthDisabled(displayYear, month);
                const isCurrent = displayYear === currentMonthInfo.year && month === currentMonthInfo.month;
                const isHovered = hoveredMonth === month;
                
                // Check if this month has payroll data
                const monthString = `${displayYear}-${String(month).padStart(2, '0')}`;
                const monthAvailability = showDataIndicators 
                  ? checkMonthAvailability(availableMonths, monthString)
                  : { hasData: false, hasPeriod: false, count: 0, expectedCount: 0, periodStatus: undefined, isLocked: undefined };
                
                // Get completeness data for this month
                const monthCompleteness = getMonthCompleteness(monthString);
                
                return (
                  <motion.button
                    type="button"
                    key={month}
                    whileHover={{ scale: isDisabled ? 1 : 1.05 }}
                    whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                    onClick={() => !isDisabled && handleSelectMonth(month)}
                    onMouseEnter={() => setHoveredMonth(month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    disabled={isDisabled}
                    className={cn(
                      'relative h-12 px-3 transition-all duration-200 border rounded-md',
                      isSelected ? 'btn btn-primary' : 'btn btn-ghost',
                      isDisabled && 'opacity-50 cursor-not-allowed',
                      isCurrent && !isSelected && 'ring-2 ring-primary/20 bg-primary/5',
                      // Enhanced styling for months with data
                      monthAvailability.hasData && !isSelected && !isDisabled && 'ring-1 ring-success/30 bg-success/5 hover:bg-success/10',
                      // Special styling for months with period but no data (draft state)
                      !monthAvailability.hasData && monthAvailability.hasPeriod && !isSelected && !isDisabled && 'ring-1 ring-warning/30 bg-warning/5 hover:bg-warning/10',
                      // Special styling for disabled months with data (showing they're unavailable)
                      monthAvailability.hasData && isDisabled && disableMonthsWithData && 'ring-1 ring-error/30 bg-error/5'
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn(
                        'text-sm font-medium',
                        isSelected && 'text-primary-content',
                        !isSelected && isHovered && !isDisabled && 'text-primary',
                        isCurrent && !isSelected && 'text-primary',
                        monthAvailability.hasData && !isSelected && !isCurrent && !isDisabled && 'text-success',
                        !monthAvailability.hasData && monthAvailability.hasPeriod && !isSelected && !isCurrent && !isDisabled && 'text-warning',
                        monthAvailability.hasData && isDisabled && disableMonthsWithData && 'text-error'
                      )}>
                        {getMonthShort(month)}
                      </span>
                      
                      {/* Data availability indicator - 右上角 */}
                      {showDataIndicators && (monthAvailability.hasData || monthAvailability.hasPeriod) && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className={cn(
                            'absolute -top-1 -right-1',
                            'flex items-center justify-center',
                            'min-w-[1rem] h-4 px-1 text-xs font-bold rounded-full',
                            'border border-base-100',
                            isSelected 
                              ? 'bg-accent text-accent-content' 
                              : isDisabled && disableMonthsWithData
                              ? 'bg-error text-error-content'
                              : monthAvailability.hasData
                              ? 'bg-success text-success-content'
                              : 'bg-warning text-warning-content' // 有周期但没有薪资记录
                          )}
                          title={
                            isDisabled && disableMonthsWithData 
                              ? `已有${monthAvailability.count}条薪资记录，无法重复创建` 
                              : monthAvailability.hasData
                              ? `${monthAvailability.count}条薪资记录 - 状态: ${
                                  monthAvailability.periodStatus === 'completed' ? '已完成' :
                                  monthAvailability.periodStatus === 'processing' ? '处理中' : '草稿'
                                }${monthAvailability.isLocked ? ' (已锁定)' : ''}`
                              : `薪资周期已创建，期望${monthAvailability.expectedCount}人 - 状态: ${
                                  monthAvailability.periodStatus === 'completed' ? '已完成' :
                                  monthAvailability.periodStatus === 'processing' ? '处理中' : '草稿'
                                }${monthAvailability.isLocked ? ' (已锁定)' : ''}`
                          }
                        >
                          {monthAvailability.count > 99 ? '99+' : monthAvailability.count}
                        </motion.div>
                      )}
                      
                      {/* Period status indicator - 左上角 */}
                      {showDataIndicators && monthAvailability.hasData && monthAvailability.periodStatus && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.15 }}
                          className={cn(
                            'absolute -top-1 -left-1',
                            'w-3 h-3 rounded-full',
                            'border border-base-100',
                            // 根据状态设置颜色
                            monthAvailability.periodStatus === 'completed' 
                              ? 'bg-success' 
                              : monthAvailability.periodStatus === 'processing' 
                              ? 'bg-info' 
                              : 'bg-warning',
                            // 如果被锁定，添加锁定样式
                            monthAvailability.isLocked && 'ring-2 ring-error ring-offset-1 ring-offset-base-100'
                          )}
                          title={`状态: ${
                            monthAvailability.periodStatus === 'completed' ? '已完成' :
                            monthAvailability.periodStatus === 'processing' ? '处理中' : '草稿'
                          }${monthAvailability.isLocked ? ' (已锁定)' : ''}`}
                        >
                          {/* 如果已锁定，显示锁图标 */}
                          {monthAvailability.isLocked && (
                            <svg 
                              className="w-2 h-2 absolute inset-0 m-auto text-white" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </motion.div>
                      )}
                      
                      {/* Current month indicator - 如果没有数据但是当前月份，显示小圆点 */}
                      {isCurrent && !(showDataIndicators && monthAvailability.hasData) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border border-base-100"
                        />
                      )}
                      
                      {/* Completeness indicator - 底部 */}
                      {showCompletenessIndicators && monthCompleteness && monthAvailability.hasData && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"
                        >
                          <div className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            "border border-base-100",
                            monthCompleteness.metadata_status === 'complete'
                              ? "bg-success text-success-content"
                              : monthCompleteness.metadata_status === 'incomplete'
                              ? "bg-warning text-warning-content"
                              : "bg-base-300 text-base-content/60"
                          )}
                          title={`四要素完整度: ${monthCompleteness.overall_completeness_percentage}%`}
                          >
                            {monthCompleteness.overall_completeness_percentage}%
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Loading state for data indicators */}
                      {showDataIndicators && isLoadingMonths && !monthAvailability.hasData && !isCurrent && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-2 h-2 bg-base-300 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            
            {/* 状态图例 - 仅在显示数据指示器时显示 */}
            {(showDataIndicators || showCompletenessIndicators) && (
              <div className="mt-3 pt-3 border-t border-base-content/10">
                <div className="text-xs text-base-content/60 mb-2">状态说明：</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {showDataIndicators && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-success border border-base-300"></div>
                        <span className="text-base-content/70">有薪资数据</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-warning border border-base-300"></div>
                        <span className="text-base-content/70">仅有周期</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-info border border-base-300"></div>
                        <span className="text-base-content/70">处理中</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-error border border-base-300 ring-2 ring-error ring-offset-1 ring-offset-base-100"></div>
                        <span className="text-base-content/70">已锁定</span>
                      </div>
                    </>
                  )}
                  {showCompletenessIndicators && (
                    <>
                      <div className="flex items-center gap-2 col-span-2 mt-1">
                        <span className="text-base-content/60">完整度：</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-success rounded-full text-success-content">100%</span>
                        <span className="text-base-content/50">完整</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-warning rounded-full text-warning-content">50%</span>
                        <span className="text-base-content/50">部分</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}