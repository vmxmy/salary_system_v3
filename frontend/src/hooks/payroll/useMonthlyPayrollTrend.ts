import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

/**
 * 月度薪资趋势数据结构
 */
export interface MonthlyPayrollTrendData {
  month: string;           // YYYY-MM 格式
  monthDisplay: string;    // YYYY年MM月 格式
  employeeCount: number;   // 发放人数
  totalGrossPay: number;   // 应发总额
  totalDeductions: number; // 扣除总额
  totalNetPay: number;     // 实发总额
  avgGrossPay: number;     // 平均应发
  avgNetPay: number;       // 平均实发
}

/**
 * 月度薪资趋势查询键管理
 */
export const monthlyPayrollTrendQueryKeys = {
  all: ['monthlyPayrollTrend'] as const,
  currentYear: () => [...monthlyPayrollTrendQueryKeys.all, 'currentYear'] as const,
  year: (year: number) => [...monthlyPayrollTrendQueryKeys.all, 'year', year] as const,
};

/**
 * 获取月度薪资趋势数据的Hook
 * 专门用于仪表板折线图显示今年以来每个月的薪资统计
 */
export function useMonthlyPayrollTrend(year?: number) {
  const { handleError } = useErrorHandler();
  const targetYear = year ?? new Date().getFullYear();
  
  return useQuery({
    queryKey: monthlyPayrollTrendQueryKeys.year(targetYear),
    queryFn: async (): Promise<MonthlyPayrollTrendData[]> => {
      // 查询指定年度的所有薪资数据，按月聚合
      const { data: payrollData, error } = await supabase
        .from('view_payroll_summary')
        .select(`
          period_code,
          gross_pay,
          total_deductions,
          net_pay
        `)
        .gte('period_code', `${targetYear}-01`)
        .lte('period_code', `${targetYear}-12`)
        .order('period_code');
      
      if (error) {
        handleError(error, { customMessage: '获取月度薪资趋势失败' });
        throw error;
      }
      
      // 按月聚合数据
      const monthlyData = new Map<string, {
        employeeCount: number;
        totalGrossPay: number;
        totalDeductions: number;
        totalNetPay: number;
      }>();
      
      // 初始化今年所有月份（从1月到当前月份）
      const currentDate = new Date();
      const currentMonth = currentDate.getFullYear() === targetYear ? currentDate.getMonth() + 1 : 12;
      
      for (let month = 1; month <= currentMonth; month++) {
        const monthKey = `${targetYear}-${month.toString().padStart(2, '0')}`;
        monthlyData.set(monthKey, {
          employeeCount: 0,
          totalGrossPay: 0,
          totalDeductions: 0,
          totalNetPay: 0,
        });
      }
      
      // 聚合实际数据
      (payrollData || []).forEach((record: any) => {
        const monthKey = record.period_code;
        const existing = monthlyData.get(monthKey);
        
        if (existing) {
          existing.employeeCount += 1;
          existing.totalGrossPay += record.gross_pay || 0;
          existing.totalDeductions += record.total_deductions || 0;
          existing.totalNetPay += record.net_pay || 0;
        }
      });
      
      // 转换为最终数据格式
      const trendData: MonthlyPayrollTrendData[] = [];
      
      monthlyData.forEach((data, monthKey) => {
        const [year, month] = monthKey.split('-');
        const monthNumber = parseInt(month, 10);
        
        trendData.push({
          month: monthKey,
          monthDisplay: `${year}年${monthNumber}月`,
          employeeCount: data.employeeCount,
          totalGrossPay: data.totalGrossPay,
          totalDeductions: data.totalDeductions,
          totalNetPay: data.totalNetPay,
          avgGrossPay: data.employeeCount > 0 ? data.totalGrossPay / data.employeeCount : 0,
          avgNetPay: data.employeeCount > 0 ? data.totalNetPay / data.employeeCount : 0,
        });
      });
      
      // 按月份排序
      return trendData.sort((a, b) => a.month.localeCompare(b.month));
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 10 * 60 * 1000,   // 10分钟垃圾回收
  });
}

/**
 * 获取当前年度月度薪资趋势的便捷Hook
 */
export function useCurrentYearPayrollTrend() {
  return useMonthlyPayrollTrend();
}