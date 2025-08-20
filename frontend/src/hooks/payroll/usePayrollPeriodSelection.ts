import { useState, useEffect } from 'react';
import { useCurrentPayrollPeriod } from './usePayrollPeriod';
import { useAvailablePayrollMonths } from './useAvailablePayrollMonths';

/**
 * 薪资周期选择管理Hook
 * 提供智能的默认周期选择、持久化存储和状态管理
 */
export function usePayrollPeriodSelection(storageKey: string = 'payroll-period') {
  // 从localStorage获取上次选择的周期
  const getStoredPeriod = () => {
    try {
      return localStorage.getItem(`${storageKey}-period`) || '';
    } catch {
      return '';
    }
  };
  
  const getStoredMonth = () => {
    try {
      return localStorage.getItem(`${storageKey}-month`) || '';
    } catch {
      return '';
    }
  };

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 获取数据
  const { data: currentPeriod } = useCurrentPayrollPeriod();
  const { data: availableMonths, isLoading: isLoadingMonths } = useAvailablePayrollMonths(true);
  
  // 使用useEffect进行一次性初始化
  useEffect(() => {
    // 只在完全未初始化时执行
    if (isInitialized || isLoadingMonths || !availableMonths) return;
    
    let targetPeriodId = '';
    let targetMonth = '';
    
    // 获取localStorage中存储的值
    const storedPeriodId = getStoredPeriod();
    const storedMonth = getStoredMonth();
    
    // 优先级1: 使用存储的周期（如果仍然有效）
    if (storedPeriodId && storedMonth) {
      const isStillValid = availableMonths.some(m => 
        m.periodId === storedPeriodId && m.month === storedMonth
      );
      if (isStillValid) {
        targetPeriodId = storedPeriodId;
        targetMonth = storedMonth;
      }
    }
    
    // 优先级2: 使用当前活跃周期
    if (!targetPeriodId && currentPeriod && currentPeriod.period_year && currentPeriod.period_month) {
      const currentMonth = `${currentPeriod.period_year}-${currentPeriod.period_month.toString().padStart(2, '0')}`;
      const currentMonthData = availableMonths.find(m => m.month === currentMonth);
      if (currentMonthData) {
        targetPeriodId = currentPeriod.id;
        targetMonth = currentMonth;
      }
    }
    
    // 优先级3: 选择最新的可用月份
    if (!targetPeriodId && availableMonths.length > 0) {
      // 按月份降序排序，选择最新的
      const sortedMonths = [...availableMonths].sort((a, b) => b.month.localeCompare(a.month));
      const latestMonth = sortedMonths[0];
      targetPeriodId = latestMonth.periodId || '';
      targetMonth = latestMonth.month;
    }
    
    // 设置选中的周期和月份（一次性设置）
    if (targetPeriodId && targetMonth) {
      setSelectedPeriodId(targetPeriodId);
      setSelectedMonth(targetMonth);
      savePeriodSelection(targetPeriodId, targetMonth);
    }
    
    // 标记为已初始化，防止重复执行
    setIsInitialized(true);
  }, [availableMonths, currentPeriod, isLoadingMonths, isInitialized]);
  
  // 保存选择到localStorage
  const savePeriodSelection = (periodId: string, month: string) => {
    try {
      if (periodId && month) {
        localStorage.setItem(`${storageKey}-period`, periodId);
        localStorage.setItem(`${storageKey}-month`, month);
      } else {
        localStorage.removeItem(`${storageKey}-period`);
        localStorage.removeItem(`${storageKey}-month`);
      }
    } catch (error) {
      console.warn('无法保存周期选择到localStorage:', error);
    }
  };
  
  // 更新选择的月份
  const updateSelectedMonth = (month: string) => {
    setSelectedMonth(month);
    // 查找对应的周期ID
    const monthData = availableMonths?.find(m => m.month === month);
    const newPeriodId = monthData?.periodId || '';
    setSelectedPeriodId(newPeriodId);
    
    // 保存到localStorage
    savePeriodSelection(newPeriodId, month);
  };
  
  // 清除选择
  const clearSelection = () => {
    setSelectedPeriodId('');
    setSelectedMonth('');
    savePeriodSelection('', '');
  };
  
  return {
    // 状态
    selectedPeriodId,
    selectedMonth,
    isInitialized,
    isLoadingMonths,
    
    // 数据
    availableMonths,
    currentPeriod,
    
    // 操作
    updateSelectedMonth,
    clearSelection,
    setSelectedPeriodId,
    setSelectedMonth,
    
    // 计算属性
    isLoading: isLoadingMonths || !isInitialized,
    hasValidSelection: !!(selectedPeriodId && selectedMonth),
  };
}