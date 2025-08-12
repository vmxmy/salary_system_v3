import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AvailablePayrollMonth {
  month: string; // Format: YYYY-MM
  payrollCount: number;
  hasData: boolean;
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
      // 使用视图获取薪资数据，按月份分组统计
      const { data, error } = await supabase
        .from('view_payroll_summary')
        .select('pay_period_start, employee_id');

      if (error) throw error;

      // 按月份分组统计（每个月份统计不重复的员工数）
      const monthDataMap = new Map<string, Set<string>>();
      
      (data || []).forEach(row => {
        // 从 pay_period_start 提取月份信息
        if (row.pay_period_start && row.employee_id) {
          let monthString = '';
          
          if (typeof row.pay_period_start === 'string') {
            // 如果是字符串格式（YYYY-MM-DD），提取前7个字符
            monthString = row.pay_period_start.substring(0, 7);
          } else if (row.pay_period_start instanceof Date) {
            // 如果是Date对象，格式化为YYYY-MM
            const year = row.pay_period_start.getFullYear();
            const month = String(row.pay_period_start.getMonth() + 1).padStart(2, '0');
            monthString = `${year}-${month}`;
          } else if (typeof row.pay_period_start === 'object' && row.pay_period_start !== null) {
            // 如果是其他对象格式，尝试转换为Date
            try {
              const date = new Date(row.pay_period_start);
              if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                monthString = `${year}-${month}`;
              }
            } catch (e) {
              // 忽略转换失败的情况
            }
          }
          
          // 验证月份格式并添加员工ID到对应月份的Set中
          if (monthString && /^\d{4}-\d{2}$/.test(monthString)) {
            if (!monthDataMap.has(monthString)) {
              monthDataMap.set(monthString, new Set<string>());
            }
            monthDataMap.get(monthString)!.add(row.employee_id);
          }
        }
      });

      // 转换为数组并排序（使用Set的size来获取不重复的员工数）
      return Array.from(monthDataMap.entries())
        .map(([month, employeeSet]) => ({
          month,
          payrollCount: employeeSet.size, // 使用Set的size获取不重复的员工数
          hasData: true
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
 * @returns Object with hasData flag and count
 */
export function checkMonthAvailability(
  availableMonths: AvailablePayrollMonth[] | undefined,
  yearMonth: string
): { hasData: boolean; count: number } {
  if (!availableMonths) {
    return { hasData: false, count: 0 };
  }

  const monthData = availableMonths.find(m => m.month === yearMonth);
  return {
    hasData: !!monthData?.hasData,
    count: monthData?.payrollCount || 0  // 使用 payrollCount 字段
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