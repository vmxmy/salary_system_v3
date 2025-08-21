import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AvailablePayrollMonth {
  month: string; // Format: YYYY-MM
  payrollCount: number;
  hasData: boolean;
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
      // 首先获取所有薪资周期的状态信息
      const { data: periodsData, error: periodsError } = await supabase
        .from('payroll_periods')
        .select('id, period_code, status, locked_at');
      
      if (periodsError) throw periodsError;
      
      // 创建周期状态映射
      const periodStatusMap = new Map<string, { status: string; isLocked: boolean }>();
      (periodsData || []).forEach(period => {
        if (period.period_code) {
          periodStatusMap.set(period.id, {
            status: period.status || 'draft',
            isLocked: !!period.locked_at
          });
        }
      });
      
      // 使用视图获取薪资数据，按月份分组统计
      const { data, error } = await supabase
        .from('view_payroll_period_completeness')
        .select('period_name, period_id, total_employees');

      if (error) throw error;

      // 直接使用视图中的数据，无需复杂的分组统计
      const monthDataList: AvailablePayrollMonth[] = [];
      
      (data || []).forEach(row => {
        // 从 period_name 提取月份格式 (如：2025年1月 -> 2025-01)
        if (row.period_name && row.period_id) {
          const match = row.period_name.match(/(\d{4})年(\d{1,2})月/);
          if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const monthString = `${year}-${month}`;
            
            const periodInfo = periodStatusMap.get(row.period_id);
            
            monthDataList.push({
              month: monthString,
              payrollCount: row.total_employees || 0, // 使用视图中的动态员工数量
              hasData: (row.total_employees || 0) > 0,
              periodId: row.period_id,
              periodStatus: periodInfo?.status as any || 'draft',
              isLocked: periodInfo?.isLocked || false
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
 * Check if a specific month has payroll data
 * @param availableMonths - Array of available months from the hook
 * @param yearMonth - Month to check in YYYY-MM format
 * @returns Object with hasData flag, count, and status information
 */
export function checkMonthAvailability(
  availableMonths: AvailablePayrollMonth[] | undefined,
  yearMonth: string
): { 
  hasData: boolean; 
  count: number;
  periodStatus?: 'draft' | 'processing' | 'completed';
  isLocked?: boolean;
} {
  if (!availableMonths) {
    return { hasData: false, count: 0 };
  }

  const monthData = availableMonths.find(m => m.month === yearMonth);
  return {
    hasData: !!monthData?.hasData,
    count: monthData?.payrollCount || 0,  // 使用 payrollCount 字段
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