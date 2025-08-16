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
        .from('view_payroll_summary')
        .select('period_code, period_id, employee_id');

      if (error) throw error;

      // 按月份分组统计（每个月份统计不重复的员工数）
      const monthDataMap = new Map<string, { 
        employeeSet: Set<string>; 
        periodId?: string;
        periodStatus?: 'draft' | 'processing' | 'completed';
        isLocked?: boolean;
      }>();
      
      (data || []).forEach(row => {
        // 使用 period_code 字段（格式：YYYY-MM）
        if (row.period_code && row.employee_id) {
          const monthString = row.period_code;
          
          // 验证月份格式
          if (monthString && /^\d{4}-\d{2}$/.test(monthString)) {
            if (!monthDataMap.has(monthString)) {
              const periodInfo = row.period_id ? periodStatusMap.get(row.period_id) : undefined;
              monthDataMap.set(monthString, { 
                employeeSet: new Set<string>(),
                periodId: row.period_id || undefined,
                periodStatus: periodInfo?.status as any || 'draft',
                isLocked: periodInfo?.isLocked || false
              });
            }
            const monthData = monthDataMap.get(monthString)!;
            monthData.employeeSet.add(row.employee_id);
            // 保留最新的 period_id 和状态
            if (row.period_id) {
              monthData.periodId = row.period_id;
              const periodInfo = periodStatusMap.get(row.period_id);
              if (periodInfo) {
                monthData.periodStatus = periodInfo.status as any;
                monthData.isLocked = periodInfo.isLocked;
              }
            }
          }
        }
      });

      // 转换为数组并排序（使用Set的size来获取不重复的员工数）
      return Array.from(monthDataMap.entries())
        .map(([month, data]) => ({
          month,
          payrollCount: data.employeeSet.size, // 使用Set的size获取不重复的员工数
          hasData: true,
          periodId: data.periodId,
          periodStatus: data.periodStatus,
          isLocked: data.isLocked
        }))
        .sort((a, b) => b.month.localeCompare(a.month));
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