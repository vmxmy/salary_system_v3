import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { usePayrollPeriods, useCurrentPayrollPeriod, type PayrollPeriod } from '@/hooks/payroll/usePayrollPeriod';
import { motion, AnimatePresence } from 'framer-motion';

interface PayrollPeriodSelectorProps {
  value?: string; // period_id
  onChange: (periodId: string, period?: PayrollPeriod) => void;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** 只显示有薪资数据的周期 */
  onlyWithData?: boolean;
  /** 只显示特定状态的周期 */
  status?: string | string[];
  /** 显示周期的薪资记录数量 */
  showCountBadge?: boolean;
}

export function PayrollPeriodSelector({
  value,
  onChange,
  className,
  placeholder = '选择薪资周期',
  size = 'md',
  disabled = false,
  onlyWithData = false,
  status,
  showCountBadge = true
}: PayrollPeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 获取薪资周期列表
  const { data: periodsData, isLoading } = usePayrollPeriods({
    pageSize: 100 // 获取所有周期
  });
  
  // 获取当前活跃周期
  const { data: currentPeriod } = useCurrentPayrollPeriod();
  
  const periods = periodsData?.data || [];
  
  // 过滤周期
  const filteredPeriods = periods.filter(period => {
    // 按状态过滤
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      if (!statusArray.includes(period.status)) return false;
    }
    
    // 只显示有数据的周期
    if (onlyWithData && (!period.employee_count || period.employee_count === 0)) {
      return false;
    }
    
    return true;
  });
  
  // 按年份分组
  const groupedPeriods = filteredPeriods.reduce((groups, period) => {
    const year = period.period_year;
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(period);
    return groups;
  }, {} as Record<number, PayrollPeriod[]>);
  
  // 获取大小样式
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
  
  // 更新选中的周期
  useEffect(() => {
    if (value && periods.length > 0) {
      const period = periods.find(p => p.id === value);
      setSelectedPeriod(period || null);
    }
  }, [value, periods]);
  
  // 选择周期
  const handleSelectPeriod = (period: PayrollPeriod) => {
    setSelectedPeriod(period);
    onChange(period.id, period);
    setIsOpen(false);
  };
  
  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'badge-warning';
      case 'open': return 'badge-success';
      case 'closed': return 'badge-info';
      case 'archived': return 'badge-neutral';
      default: return 'badge-ghost';
    }
  };
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '草稿';
      case 'open': return '进行中';
      case 'closed': return '已关闭';
      case 'archived': return '已归档';
      default: return status;
    }
  };
  
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* 选择器输入框 */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'input input-bordered',
          getSizeClass(),
          'cursor-pointer flex items-center justify-between',
          disabled && 'input-disabled',
          isOpen && 'input-focus'
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
          
          {isLoading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <span className={cn(
              'font-medium transition-colors',
              selectedPeriod ? 'text-base-content' : 'text-base-content/60'
            )}>
              {selectedPeriod ? selectedPeriod.period_name : placeholder}
            </span>
          )}
          
          {selectedPeriod && showCountBadge && selectedPeriod.employee_count > 0 && (
            <span className="badge badge-sm badge-primary">
              {selectedPeriod.employee_count}人
            </span>
          )}
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
              'absolute top-full mt-2 w-full max-h-96 overflow-auto z-50'
            )}
          >
            <div className="p-4">
              {/* 快捷选择 */}
              {currentPeriod && (
                <div className="mb-4">
                  <div className="text-xs text-base-content/60 mb-2">快捷选择</div>
                  <button
                    type="button"
                    onClick={() => handleSelectPeriod(currentPeriod)}
                    className={cn(
                      'btn btn-sm btn-block',
                      value === currentPeriod.id ? 'btn-primary' : 'btn-ghost'
                    )}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    当前周期: {currentPeriod.period_name}
                  </button>
                </div>
              )}
              
              {/* 周期列表 */}
              {Object.keys(groupedPeriods).length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  {isLoading ? (
                    <span className="loading loading-spinner loading-md"></span>
                  ) : (
                    <div>
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>暂无可选的薪资周期</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(groupedPeriods)
                    .sort((a, b) => Number(b) - Number(a))
                    .map(year => (
                      <div key={year}>
                        <div className="text-sm font-semibold text-base-content/70 mb-2">
                          {year}年
                        </div>
                        <div className="space-y-1">
                          {groupedPeriods[Number(year)]
                            .sort((a, b) => b.period_month - a.period_month)
                            .map(period => (
                              <motion.button
                                key={period.id}
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSelectPeriod(period)}
                                className={cn(
                                  'btn btn-sm btn-block justify-between',
                                  value === period.id ? 'btn-primary' : 'btn-ghost'
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  {period.period_month}月
                                  {period.id === currentPeriod?.id && (
                                    <span className="badge badge-xs badge-accent">当前</span>
                                  )}
                                </span>
                                
                                <span className="flex items-center gap-2">
                                  <span className={cn('badge badge-xs', getStatusColor(period.status))}>
                                    {getStatusText(period.status)}
                                  </span>
                                  {showCountBadge && period.employee_count > 0 && (
                                    <span className="badge badge-xs badge-neutral">
                                      {period.employee_count}人
                                    </span>
                                  )}
                                </span>
                              </motion.button>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}