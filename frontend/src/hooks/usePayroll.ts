import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type PayrollPeriod = Database['public']['Tables']['payroll_periods']['Row'];
type PayrollResult = Database['public']['Tables']['payroll_results']['Row'];

// 获取薪资期间列表
export function usePayrollPeriods() {
  return useQuery({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// 获取当前活跃的薪资期间
export function useActivePayrollPeriod() {
  return useQuery({
    queryKey: ['active-payroll-period'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
  });
}

// 获取薪资结果（包含员工信息）
export function usePayrollResults(periodId?: string) {
  return useQuery({
    queryKey: ['payroll-results', periodId],
    queryFn: async () => {
      let query = supabase
        .from('payroll_results')
        .select(`
          *,
          employee:employees(
            id,
            full_name,
            employee_no,
            id_number,
            department:departments(name),
            position:positions(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (periodId) {
        query = query.eq('period_id', periodId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!periodId,
  });
}

// 获取薪资统计
export function usePayrollStatistics(periodId?: string) {
  return useQuery({
    queryKey: ['payroll-statistics', periodId],
    queryFn: async () => {
      if (!periodId) return null;

      const { data, error } = await supabase
        .from('payroll_results')
        .select('gross_salary, net_salary, total_deductions')
        .eq('period_id', periodId);

      if (error) throw error;

      // 计算统计数据
      const stats = data.reduce((acc, curr) => ({
        totalGross: acc.totalGross + (curr.gross_salary || 0),
        totalNet: acc.totalNet + (curr.net_salary || 0),
        totalDeductions: acc.totalDeductions + (curr.total_deductions || 0),
        count: acc.count + 1,
      }), {
        totalGross: 0,
        totalNet: 0,
        totalDeductions: 0,
        count: 0,
      });

      return {
        ...stats,
        averageGross: stats.count > 0 ? stats.totalGross / stats.count : 0,
        averageNet: stats.count > 0 ? stats.totalNet / stats.count : 0,
      };
    },
    enabled: !!periodId,
  });
}

// 创建新的薪资期间
export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      year: number;
      month: number;
      name: string;
      start_date: string;
      end_date: string;
    }) => {
      const { data: result, error } = await supabase
        .from('payroll_periods')
        .insert([{
          ...data,
          status: 'active',
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['active-payroll-period'] });
    },
  });
}

// 运行薪资计算（触发数据库触发器）
export function useRunPayrollCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string) => {
      // 调用数据库函数来触发薪资计算
      const { data, error } = await supabase
        .rpc('calculate_payroll_for_period', { period_id: periodId });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, periodId) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-results', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-statistics', periodId] });
    },
  });
}

// 完成薪资期间
export function useFinalizePayrollPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .update({ 
          status: 'finalized',
          finalized_at: new Date().toISOString()
        })
        .eq('id', periodId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['active-payroll-period'] });
    },
  });
}

// 导出薪资数据
export function useExportPayroll(periodId: string) {
  return useQuery({
    queryKey: ['export-payroll', periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_results')
        .select(`
          *,
          employee:employees(
            full_name,
            employee_no,
            id_number,
            bank_account,
            department:departments(name),
            position:positions(name)
          )
        `)
        .eq('period_id', periodId)
        .order('employee_id');

      if (error) throw error;
      return data || [];
    },
    enabled: false, // 手动触发
  });
}