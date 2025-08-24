import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AvailablePayrollMonth {
  month: string; // Format: YYYY-MM
  payrollCount: number; // 实际薪资记录数量
  hasData: boolean; // 是否有薪资记录数据
  hasPeriod?: boolean; // 是否有薪资周期（新增）
  expectedEmployeeCount?: number; // 期望员工数量（新增）
  periodId?: string; // 关联的周期ID
  periodStatus?: 'draft' | 'processing' | 'completed'; // 周期状态
  isLocked?: boolean; // 是否已锁定
}

/**
 * Hook to fetch available payroll months with data indicators
 * Returns a list of months that have payroll data available
 * @param enabled - Whether to enable the query (default: true)
 */
export function useAvailablePayrollMonths(enabled: boolean = true) {
  return useQuery({
    queryKey: ['available-payroll-months'],
    queryFn: async (): Promise<AvailablePayrollMonth[]> => {
      // 方案：优先基于薪资周期存在性，而不是薪资记录存在性
      // 这样可以在只有基础数据（员工信息、缴费基数）时也能选择月份
      
      // 获取所有薪资周期的基础信息
      const { data: periodsData, error: periodsError } = await supabase
        .from('payroll_periods')
        .select(`
          id, 
          period_name, 
          period_code, 
          period_year,
          period_month,
          employee_count,
          status, 
          locked_at
        `);
      
      if (periodsError) throw periodsError;
      
      // 获取视图中的实际薪资记录统计（用于显示指示器）
      const { data: viewData, error: viewError } = await supabase
        .from('view_payroll_period_completeness')
        .select('period_id, total_employees');

      if (viewError) throw viewError;
      
      // 创建薪资记录数量映射
      const payrollCountMap = new Map<string, number>();
      (viewData || []).forEach(row => {
        if (row.period_id) {
          payrollCountMap.set(row.period_id, row.total_employees || 0);
        }
      });

      // 构建可用月份列表 - 基于薪资周期存在，而不是薪资记录存在
      const monthDataList: AvailablePayrollMonth[] = [];
      
      (periodsData || []).forEach(period => {
        if (period.period_name && period.id) {
          // 从 period_name 提取月份格式 (如：2025年1月 -> 2025-01)
          const match = period.period_name.match(/(\d{4})年(\d{1,2})月/);
          if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const monthString = `${year}-${month}`;
            
            // 获取实际的薪资记录数量
            const actualPayrollCount = payrollCountMap.get(period.id) || 0;
            
            monthDataList.push({
              month: monthString,
              payrollCount: actualPayrollCount, // 实际薪资记录数量
              hasData: actualPayrollCount > 0, // 基于实际薪资记录
              hasPeriod: true, // 新增：标识薪资周期存在
              expectedEmployeeCount: period.employee_count || 0, // 新增：期望员工数量
              periodId: period.id,
              periodStatus: period.status as any || 'draft',
              isLocked: !!period.locked_at
            });
          }
        }
      });

      // 按月份排序
      return monthDataList.sort((a, b) => b.month.localeCompare(a.month));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    enabled,
  });
}

/**
 * Check if a specific month has payroll data or period
 * @param availableMonths - Array of available months from the hook
 * @param yearMonth - Month to check in YYYY-MM format
 * @returns Object with availability information
 */
export function checkMonthAvailability(
  availableMonths: AvailablePayrollMonth[] | undefined,
  yearMonth: string
): { 
  hasData: boolean; // 是否有薪资记录数据
  hasPeriod: boolean; // 是否有薪资周期
  count: number; // 实际薪资记录数量
  expectedCount: number; // 期望员工数量
  periodStatus?: 'draft' | 'processing' | 'completed';
  isLocked?: boolean;
} {
  if (!availableMonths) {
    return { hasData: false, hasPeriod: false, count: 0, expectedCount: 0 };
  }

  const monthData = availableMonths.find(m => m.month === yearMonth);
  return {
    hasData: !!monthData?.hasData, // 基于实际薪资记录
    hasPeriod: !!monthData?.hasPeriod, // 基于薪资周期存在
    count: monthData?.payrollCount || 0, // 实际薪资记录数量
    expectedCount: monthData?.expectedEmployeeCount || 0, // 期望员工数量
    periodStatus: monthData?.periodStatus,
    isLocked: monthData?.isLocked
  };
}

/**
 * Get available months in a specific year
 * @param availableMonths - Array of available months from the hook
 * @param year - Year to filter by
 * @returns Array of month numbers (1-12) that have data in the given year
 */
export function getAvailableMonthsInYear(
  availableMonths: AvailablePayrollMonth[] | undefined,
  year: number
): number[] {
  if (!availableMonths) return [];

  return availableMonths
    .filter(m => m.month.startsWith(year.toString()))
    .map(m => parseInt(m.month.split('-')[1], 10))
    .sort((a, b) => a - b);
}