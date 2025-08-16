import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { payrollQueryKeys } from './usePayroll';

export interface PayrollStatistics {
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalTax: number;
  totalInsurance: number;
  averageGrossPay: number;
  averageNetPay: number;
  employeeCount: number;
  statusCount: {
    draft: number;
    calculating: number;
    calculated: number;
    approved: number;
    paid: number;
    cancelled: number;
    total: number;
  };
}

export function usePayrollStatistics(yearMonth: string) {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: [...payrollQueryKeys.statistics(), yearMonth],
    queryFn: async () => {
      if (!yearMonth) {
        return null;
      }

      // 解析年月
      const [year, month] = yearMonth.split('-');
      const periodCode = `${year}-${month}`;
      
      // 直接从 view_payroll_summary 获取该月的薪资数据
      const { data: payrollData, error } = await supabase
        .from('view_payroll_summary')
        .select('*')
        .eq('period_code', periodCode);
      
      if (error) {
        handleError(error, { customMessage: '获取薪资统计失败' });
        throw error;
      }
      
      const data = payrollData || [];
      
      // 计算统计数据
      const statistics: PayrollStatistics = {
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalTax: 0,
        totalInsurance: 0,
        averageGrossPay: 0,
        averageNetPay: 0,
        employeeCount: data.length,
        statusCount: {
          draft: 0,
          calculating: 0,
          calculated: 0,
          approved: 0,
          paid: 0,
          cancelled: 0,
          total: data.length
        }
      };

      // 累计计算
      data.forEach((payroll: any) => {
        statistics.totalGrossPay += payroll.gross_pay || 0;
        statistics.totalDeductions += payroll.total_deductions || 0;
        statistics.totalNetPay += payroll.net_pay || 0;
        
        // 统计状态数量 - 使用 payroll_status 字段
        const status = payroll.payroll_status || payroll.status;
        if (status in statistics.statusCount) {
          statistics.statusCount[status as keyof typeof statistics.statusCount]++;
        }
      });

      // 计算平均值
      if (statistics.employeeCount > 0) {
        statistics.averageGrossPay = statistics.totalGrossPay / statistics.employeeCount;
        statistics.averageNetPay = statistics.totalNetPay / statistics.employeeCount;
      }

      // TODO: 从明细中获取税和保险的具体金额
      // 暂时使用估算值
      statistics.totalTax = statistics.totalDeductions * 0.3; // 假设30%是个税
      statistics.totalInsurance = statistics.totalDeductions * 0.7; // 假设70%是保险

      return statistics;
    },
    enabled: !!yearMonth,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}