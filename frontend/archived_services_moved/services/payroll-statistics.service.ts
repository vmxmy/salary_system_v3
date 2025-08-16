import { supabase } from '@/lib/supabase';

export interface PayrollEstimation {
  totalEmployees: number;
  totalEstimatedAmount: number;
  avgEstimatedAmount: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface EmployeePayrollStatistics {
  employeeId: string;
  employeeName: string;
  idNumber: string;
  employmentStatus: string;
  latestGrossPay: number;
  latestDeductions: number;
  latestNetPay: number;
  latestPayPeriod: string | null;
}

class PayrollStatisticsService {
  /**
   * 获取所有活跃员工的薪资预估
   */
  async getPayrollEstimation(): Promise<PayrollEstimation> {
    const { data, error } = await supabase
      .from('view_payroll_period_estimation')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching payroll estimation:', error);
      throw error;
    }

    return {
      totalEmployees: data?.total_employees || 0,
      totalEstimatedAmount: Number(data?.total_estimated_amount) || 0,
      avgEstimatedAmount: Number(data?.avg_estimated_amount) || 0,
      minAmount: Number(data?.min_amount) || 0,
      maxAmount: Number(data?.max_amount) || 0,
    };
  }

  /**
   * 获取特定员工列表的薪资预估
   */
  async getEmployeesPayrollEstimation(employeeIds: string[]): Promise<PayrollEstimation> {
    if (!employeeIds || employeeIds.length === 0) {
      return {
        totalEmployees: 0,
        totalEstimatedAmount: 0,
        avgEstimatedAmount: 0,
      };
    }

    const { data, error } = await supabase
      .rpc('get_employees_payroll_estimation', {
        employee_ids: employeeIds
      });

    if (error) {
      console.error('Error fetching employees payroll estimation:', error);
      throw error;
    }

    const result = data?.[0];
    return {
      totalEmployees: result?.total_employees || 0,
      totalEstimatedAmount: Number(result?.total_estimated_amount) || 0,
      avgEstimatedAmount: Number(result?.avg_estimated_amount) || 0,
    };
  }

  /**
   * 获取员工薪资统计信息
   */
  async getEmployeePayrollStatistics(employeeIds?: string[]): Promise<EmployeePayrollStatistics[]> {
    let query = supabase
      .from('view_employee_payroll_statistics')
      .select('*');

    if (employeeIds && employeeIds.length > 0) {
      query = query.in('employee_id', employeeIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching employee payroll statistics:', error);
      throw error;
    }

    return (data || []).map(item => ({
      employeeId: item.employee_id,
      employeeName: item.employee_name,
      idNumber: item.id_number,
      employmentStatus: item.employment_status,
      latestGrossPay: Number(item.latest_gross_pay) || 0,
      latestDeductions: Number(item.latest_deductions) || 0,
      latestNetPay: Number(item.latest_net_pay) || 0,
      latestPayPeriod: item.latest_pay_period,
    }));
  }

  /**
   * 获取薪资历史趋势
   */
  async getPayrollHistoryTrend() {
    const { data, error } = await supabase
      .from('view_payroll_trend_unified')
      .select('*')
      .eq('is_recent_12_months', true)
      .order('pay_month', { ascending: false })
      .limit(12);

    if (error) {
      console.error('Error fetching payroll history trend:', error);
      throw error;
    }

    // 转换字段名以保持兼容性
    return (data || []).map(item => ({
      pay_month: item.pay_month,
      employee_count: item.employee_count,
      total_gross: item.total_gross_pay,
      total_deductions: item.total_deductions,
      total_net: item.total_net_pay,
      avg_net_pay: item.avg_net_pay
    }));
  }

  /**
   * 获取部门薪资统计
   */
  async getDepartmentPayrollStatistics() {
    const { data, error } = await supabase
      .from('view_department_payroll_statistics')
      .select('*')
      .order('department_name');

    if (error) {
      console.error('Error fetching department payroll statistics:', error);
      throw error;
    }

    return data || [];
  }
}

export const payrollStatisticsService = new PayrollStatisticsService();