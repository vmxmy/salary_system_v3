import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { payrollQueryKeys, type PayrollStatusType } from './usePayroll';

// 薪资详情数据类型
export interface PayrollDetailData {
  id: string;
  employee_id?: string;
  period_id?: string;
  employee?: {
    id: string;
    employee_name: string;
    id_number: string;
  };
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: PayrollStatusType;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 获取单个薪资记录的基本信息
 */
export const usePayrollDetail = (payrollId: string | null) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: payrollQueryKeys.detail(payrollId || ''),
    queryFn: async (): Promise<PayrollDetailData | null> => {
      if (!payrollId) return null;

      // 获取薪资基本信息
      const { data: payrollData, error: payrollError } = await supabase
        .from('view_payroll_summary')
        .select('*')
        .eq('payroll_id', payrollId)
        .single();

      if (payrollError) {
        handleError(payrollError, { customMessage: '获取薪资详情失败' });
        throw payrollError;
      }

      if (!payrollData) return null;

      // 转换数据格式
      const result: PayrollDetailData = {
        id: payrollData.payroll_id,
        employee_id: payrollData.employee_id,
        period_id: payrollData.period_id,
        pay_period_start: payrollData.period_start,
        pay_period_end: payrollData.period_end,
        pay_date: payrollData.actual_pay_date || payrollData.scheduled_pay_date,
        status: payrollData.payroll_status,
        gross_pay: payrollData.gross_pay || 0,
        total_deductions: payrollData.total_deductions || 0,
        net_pay: payrollData.net_pay || 0,
        notes: payrollData.notes,
        created_at: payrollData.created_at,
        updated_at: payrollData.updated_at,
        employee: {
          id: payrollData.employee_id,
          employee_name: payrollData.employee_name,
          id_number: payrollData.id_number
        }
      };

      return result;
    },
    enabled: !!payrollId,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};