import { useMemo } from 'react';
import { usePayrollDetails } from './usePayroll';

// 个税项目数据类型
export interface TaxItem {
  item_id: string;
  component_name: string;
  amount: number;
  item_notes?: string;
}

/**
 * 获取薪资记录的个税项目
 * 从薪资明细中筛选出个税相关项目
 */
export const usePayrollTaxItems = (payrollId: string | null) => {
  // 使用现有的 usePayrollDetails hook 获取所有明细
  const payrollDetailsQuery = usePayrollDetails(payrollId || '');
  const { data: payrollItemsData, isLoading, error } = payrollDetailsQuery;
  
  // 确保数据是数组格式
  const safePayrollItemsData = Array.isArray(payrollItemsData) ? payrollItemsData : [];
  
  // 使用 useMemo 来筛选个税项目，避免无限循环
  const taxItems = useMemo((): TaxItem[] => {
    // 使用安全的数组数据
    if (!safePayrollItemsData || safePayrollItemsData.length === 0) {
      return [];
    }

    // 筛选个税相关项目
    const taxRelatedItems = safePayrollItemsData.filter(item =>
      item && (
        item.category === 'personal_tax' ||
        item.component_name?.includes('个人所得税') ||
        item.component_name?.includes('个税')
      )
    );

    // 转换为 TaxItem 格式
    return taxRelatedItems.map(item => ({
      item_id: item.item_id,
      component_name: item.component_name,
      amount: item.amount,
      item_notes: item.item_notes
    }));
  }, [payrollItemsData]);

  return {
    data: taxItems,
    isLoading,
    error
  };
};