/**
 * Payroll Service 兼容层
 * 这是一个过渡性的兼容层，用于支持旧代码向新的 hooks 架构迁移
 * 最终目标是完全移除这个服务层，使用 hooks 替代
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// 类型定义
type PayrollInsert = Database['public']['Tables']['payrolls']['Insert'];
type PayrollUpdate = Database['public']['Tables']['payrolls']['Update'];

// 薪资状态枚举 - 导出供兼容使用
export const PayrollStatus = {
  DRAFT: 'draft',
  CALCULATING: 'calculating',
  CALCULATED: 'calculated',
  APPROVED: 'approved', 
  PAID: 'paid',
  CANCELLED: 'cancelled'
} as const;

export type PayrollStatusType = typeof PayrollStatus[keyof typeof PayrollStatus];

// 数值格式化工具函数
const formatNumber = (value: any, decimals: number = 2): number => {
  if (value == null || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : parseFloat(num.toFixed(decimals));
};

/**
 * PayrollService 兼容类
 * @deprecated 请使用 @/hooks/payroll 中的 hooks
 */
export class PayrollService {
  static async getLatestPayrollMonth(): Promise<string | null> {
    const { data, error } = await supabase
      .from('view_payroll_summary')
      .select('pay_period_start')
      .order('pay_period_start', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      return data[0].pay_period_start.substring(0, 7);
    }
    
    return null;
  }

  static async getPayrolls(filters?: {
    status?: PayrollStatusType;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const searchTerm = filters?.search?.trim();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('view_payroll_summary')
      .select(`
        payroll_id,
        pay_date,
        pay_period_start,
        pay_period_end,
        employee_id,
        employee_name,
        department_name,
        gross_pay,
        total_deductions,
        net_pay,
        status,
        id_number
      `, { count: 'exact' });

    // 搜索条件 - 注意：status是enum类型，不能使用ilike
    if (searchTerm) {
      query = query.or(
        `employee_name.ilike.%${searchTerm}%,department_name.ilike.%${searchTerm}%`
      );
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.startDate) {
      query = query.gte('pay_period_start', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('pay_period_start', filters.endDate);
    }

    query = query
      .order('pay_period_start', { ascending: false })
      .order('payroll_id', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const transformedData = (data || []).map(item => ({
      id: item.payroll_id,
      payroll_id: item.payroll_id,
      pay_date: item.pay_date,
      pay_period_start: item.pay_period_start,
      pay_period_end: item.pay_period_end,
      employee_id: item.employee_id,
      employee_name: item.employee_name,
      gross_pay: item.gross_pay,
      total_deductions: item.total_deductions,
      net_pay: item.net_pay,
      status: item.status,
      employee: {
        id: item.employee_id,
        employee_name: item.employee_name,
        id_number: item.id_number || null
      },
      department_name: item.department_name
    }));

    return {
      data: transformedData,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  }

  static async getPayrollDetails(payrollId: string) {
    const { data, error } = await supabase
      .from('view_payroll_unified')
      .select('*')
      .eq('payroll_id', payrollId)
      .not('payroll_item_id', 'is', null)
      .order('category_sort_order', { ascending: true })
      .order('component_name', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      amount: item.item_amount,
      item_notes: item.item_notes
    }));
  }

  static async deletePayroll(payrollId: string) {
    const { data: payroll, error: checkError } = await supabase
      .from('payrolls')
      .select('status')
      .eq('id', payrollId)
      .single();

    if (checkError) throw checkError;
    
    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new Error('只能删除草稿状态的薪资记录');
    }

    const { error } = await supabase
      .from('payrolls')
      .delete()
      .eq('id', payrollId);

    if (error) throw error;
  }

  static async updateBatchPayrollStatus(
    payrollIds: string[], 
    status: PayrollStatusType
  ) {
    const { data, error } = await supabase
      .from('payrolls')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', payrollIds)
      .select();

    if (error) throw error;
    return data || [];
  }

  static async getEmployeeInsuranceDetails(payrollId: string) {
    const { data, error } = await supabase
      .from('insurance_calculation_logs')
      .select(`
        id,
        payroll_id,
        employee_id,
        insurance_type_id,
        calculation_date,
        is_applicable,
        contribution_base,
        adjusted_base,
        employee_rate,
        employer_rate,
        employee_amount,
        employer_amount,
        skip_reason,
        insurance_type:insurance_types(
          id,
          system_key,
          name,
          description
        )
      `)
      .eq('payroll_id', payrollId)
      .order('insurance_type_id');

    if (error) throw error;
    
    const processedData = (data || []).map(item => ({
      ...item,
      contribution_base: formatNumber(item.contribution_base, 2),
      adjusted_base: formatNumber(item.adjusted_base, 2),
      employee_rate: formatNumber(item.employee_rate, 4),
      employer_rate: formatNumber(item.employer_rate, 4),
      employee_amount: formatNumber(item.employee_amount, 2),
      employer_amount: formatNumber(item.employer_amount, 2)
    }));
    
    return processedData;
  }

  static async getEmployeeContributionBases(employeeId: string, yearMonth: string) {
    const { data, error } = await supabase
      .from('view_employee_insurance_base_monthly_latest')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('month_string', yearMonth)
      .order('insurance_type_key');

    if (error) throw error;
    
    const processedData = (data || []).map(item => ({
      ...item,
      contribution_base: formatNumber(item.contribution_base, 2)
    }));
    
    return processedData;
  }
}

// 导出兼容的实例
export const payrollService = PayrollService;

// 从新的 hooks 导出状态类型，保持兼容性
export { PayrollStatus as PAYROLL_STATUS } from '@/hooks/payroll';