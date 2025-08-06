import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvailablePayrollMonths, checkMonthAvailability, type AvailablePayrollMonth } from '@/hooks/useAvailablePayrollMonths';

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
  disableMonthsWithData = false
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch available payroll months data when indicators are enabled and no predefined data
  const shouldFetchData = showDataIndicators && !providedAvailableMonths;
  const { data: fetchedAvailableMonths, isLoading: isLoadingMonths } = useAvailablePayrollMonths(shouldFetchData);
  
  // Use provided months or fetched months
  const availableMonths = providedAvailableMonths || (showDataIndicators ? fetchedAvailableMonths : undefined);
  
  // 使用 DaisyUI 5 标准样式
  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'input-sm';
      case 'lg': return 'input-lg';
      default: return '';
    }
  };

  // 处理外部点击关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    
    // 如果启用了禁用有数据月份功能，检查该月份是否有数据
    if (disableMonthsWithData && showDataIndicators) {
      const monthAvailability = checkMonthAvailability(availableMonths, yearMonth);
      if (monthAvailability.hasData) return true;
    }
    
    return false;
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
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
            isOpen ? 'rotate-180 text-primary' : 'text-base-content/60'
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* 下拉面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'card bg-base-100 shadow-lg border border-base-200',
              'absolute top-full mt-2 p-6 min-w-[320px] z-[10001]'
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
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const isSelected = value === `${displayYear}-${String(month).padStart(2, '0')}`;
                const isDisabled = isMonthDisabled(displayYear, month);
                const isCurrent = displayYear === currentMonthInfo.year && month === currentMonthInfo.month;
                const isHovered = hoveredMonth === month;
                
                // Check if this month has payroll data
                const monthString = `${displayYear}-${String(month).padStart(2, '0')}`;
                const monthAvailability = showDataIndicators 
                  ? checkMonthAvailability(availableMonths, monthString)
                  : { hasData: false, count: 0 };
                
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
                        monthAvailability.hasData && isDisabled && disableMonthsWithData && 'text-error'
                      )}>
                        {getMonthShort(month)}
                      </span>
                      
                      {/* Data availability indicator - 右上角 */}
                      {showDataIndicators && monthAvailability.hasData && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className={cn(
                            'absolute -top-1 -right-1',
                            'flex items-center justify-center',
                            'w-4 h-4 text-xs font-bold rounded-full',
                            'border border-base-100',
                            isSelected 
                              ? 'bg-accent text-accent-content' 
                              : isDisabled && disableMonthsWithData
                              ? 'bg-error text-error-content'
                              : 'bg-success text-success-content'
                          )}
                          title={
                            isDisabled && disableMonthsWithData 
                              ? `已有${monthAvailability.count}条薪资记录，无法重复创建` 
                              : `${monthAvailability.count}条薪资记录`
                          }
                        >
                          {monthAvailability.count > 99 ? '99' : monthAvailability.count}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}