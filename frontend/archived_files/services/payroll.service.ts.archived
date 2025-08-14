import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// 类型定义
// type Payroll = Database['public']['Tables']['payrolls']['Row'];
type PayrollInsert = Database['public']['Tables']['payrolls']['Insert'];
type PayrollUpdate = Database['public']['Tables']['payrolls']['Update'];
// type PayrollItem = Database['public']['Tables']['payroll_items']['Row'];

// 薪资状态枚举
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

// 薪资服务类
export class PayrollService {
  // 获取最近有薪资记录的月份
  static async getLatestPayrollMonth(): Promise<string | null> {
    const { data, error } = await supabase
      .from('view_payroll_summary')
      .select('pay_period_start')
      .order('pay_period_start', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      // 从pay_period_start中提取年月 (YYYY-MM-DD -> YYYY-MM)
      return data[0].pay_period_start.substring(0, 7);
    }
    
    return null;
  }

  // 获取薪资列表
  static async getPayrolls(filters?: {
    status?: PayrollStatusType;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    // 如果有搜索条件，我们需要使用不同的查询策略
    if (filters?.search && filters.search.trim()) {
      return this.getPayrollsWithSearch({
        ...filters,
        search: filters.search
      });
    }

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
      `, { count: 'exact' })

    // 应用过滤条件
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

    // 分页
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order('pay_period_start', { ascending: false })
      .order('payroll_id', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // 转换数据格式以匹配原来的结构
    const transformedData = (data || []).map(item => ({
      id: item.payroll_id,
      payroll_id: item.payroll_id,
      pay_date: item.pay_date,
      pay_period_start: item.pay_period_start,
      pay_period_end: item.pay_period_end,
      employee_id: item.employee_id,
      employee_name: item.employee_name, // 统一使用employee_name字段
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

  // 带搜索功能的薪资列表查询
  static async getPayrollsWithSearch(filters: {
    status?: PayrollStatusType;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    search: string;
    page?: number;
    pageSize?: number;
  }) {
    const searchTerm = `%${filters.search.trim()}%`;

    // 直接在视图上进行搜索
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
      `, { count: 'exact' })

    // 搜索条件：员工姓名、部门名称或状态匹配
    query = query.or(`employee_name.ilike.${searchTerm},department_name.ilike.${searchTerm},status.ilike.${searchTerm}`);

    // 应用其他过滤条件
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters.startDate) {
      query = query.gte('pay_period_start', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('pay_period_start', filters.endDate);
    }

    // 分页
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order('pay_period_start', { ascending: false })
      .order('payroll_id', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // 转换数据格式以匹配原来的结构
    const transformedData = (data || []).map(item => ({
      id: item.payroll_id,
      payroll_id: item.payroll_id,
      pay_date: item.pay_date,
      pay_period_start: item.pay_period_start,
      pay_period_end: item.pay_period_end,
      employee_id: item.employee_id,
      employee_name: item.employee_name, // 统一使用employee_name字段
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

  // 获取薪资详情（包含明细项）
  static async getPayrollDetails(payrollId: string) {
    const { data, error } = await supabase
      .from('view_payroll_unified')
      .select('*')
      .eq('payroll_id', payrollId)
      .not('payroll_item_id', 'is', null) // 只获取有明细项的记录
      .order('category_sort_order', { ascending: true })
      .order('component_name', { ascending: true });

    if (error) throw error;
    
    // 统一字段名映射
    return (data || []).map(item => ({
      ...item,
      amount: item.item_amount, // 映射amount字段
      item_notes: item.item_notes
    }));
  }

  // 更新薪资记录
  static async updatePayroll(payrollId: string, updates: PayrollUpdate) {
    const { data, error } = await supabase
      .from('payrolls')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', payrollId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 创建薪资记录
  static async createPayroll(data: PayrollInsert) {
    const { data: result, error } = await supabase
      .from('payrolls')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // 批量创建薪资记录（为整个部门或公司）
  static async createBatchPayrolls(params: {
    employeeIds: string[];
    payPeriodStart: string;
    payPeriodEnd: string;
    payDate: string;
  }) {
    const payrolls: PayrollInsert[] = params.employeeIds.map(employeeId => ({
      employee_id: employeeId,
      pay_period_start: params.payPeriodStart,
      pay_period_end: params.payPeriodEnd,
      pay_date: params.payDate,
      status: PayrollStatus.DRAFT,
      gross_pay: 0,
      total_deductions: 0,
      net_pay: 0
    }));

    const { data, error } = await supabase
      .from('payrolls')
      .insert(payrolls)
      .select();

    if (error) throw error;
    return data || [];
  }

  // 更新薪资状态
  static async updatePayrollStatus(
    payrollId: string, 
    status: PayrollStatusType,
    notes?: string
  ) {
    const update: PayrollUpdate = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      update.notes = notes;
    }

    const { data, error } = await supabase
      .from('payrolls')
      .update(update)
      .eq('id', payrollId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 批量更新薪资状态
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

  // 触发薪资计算（调用数据库函数）
  static async calculatePayrolls(payrollIds: string[]) {
    // 这里需要调用数据库的计算函数
    // 具体实现取决于数据库中的函数定义
    const { data, error } = await supabase.rpc('calculate_payrolls', {
      payroll_ids: payrollIds
    });

    if (error) throw error;
    return data;
  }

  // 获取薪资统计
  static async getPayrollStatistics(params: {
    year: number;
    month?: number;
    departmentId?: string;
  }) {
    let query = supabase
      .from('view_department_payroll_statistics')
      .select('*')
      .eq('pay_year', params.year);

    if (params.month) {
      query = query.eq('pay_month', params.month);
    }
    if (params.departmentId) {
      query = query.eq('department_id', params.departmentId);
    }

    const { data, error } = await query
      .order('pay_month', { ascending: false })
      .order('department_name');

    if (error) throw error;
    return data || [];
  }

  // 获取成本分析数据
  static async getCostAnalysis(params: {
    startMonth: string;
    endMonth: string;
  }) {
    const { data, error } = await supabase
      .from('view_payroll_cost_analysis')
      .select('*')
      .gte('pay_month_string', params.startMonth)
      .lte('pay_month_string', params.endMonth)
      .order('pay_year', { ascending: false })
      .order('pay_month', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 删除薪资记录（仅限草稿状态）
  static async deletePayroll(payrollId: string) {
    // 先检查状态
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

  // 获取员工五险一金信息
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
    
    // 处理数据格式，确保数值字段保持正确的小数位数
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

  // 获取员工当月缴费基数信息
  static async getEmployeeMonthlyContributionBases(employeeId: string, yearMonth: string) {
    const { data, error } = await supabase
      .from('view_employee_insurance_base_monthly_latest')
      .select(`
        employee_id,
        employee_name,
        id_number,
        employment_status,
        insurance_type_id,
        insurance_type_name,
        insurance_type_key,
        month,
        month_string,
        year,
        month_number,
        contribution_base,
        effective_start_date,
        effective_end_date
      `)
      .eq('employee_id', employeeId)
      .eq('month_string', yearMonth)
      .order('insurance_type_key');

    if (error) throw error;
    
    // 处理数据格式，确保缴费基数保持2位小数
    const processedData = (data || []).map(item => ({
      ...item,
      contribution_base: formatNumber(item.contribution_base, 2)
    }));
    
    return processedData;
  }

  // 兼容旧方法名，内部调用新方法
  static async getEmployeeContributionBases(employeeId: string, yearMonth: string) {
    return this.getEmployeeMonthlyContributionBases(employeeId, yearMonth);
  }

  // 获取所有保险类型
  static async getInsuranceTypes() {
    const { data, error } = await supabase
      .from('insurance_types')
      .select('*')
      .order('system_key');

    if (error) throw error;
    return data || [];
  }
}

// 导出便捷方法
export const {
  getPayrolls,
  getPayrollDetails,
  updatePayroll,
  createPayroll,
  createBatchPayrolls,
  updatePayrollStatus,
  updateBatchPayrollStatus,
  calculatePayrolls,
  getPayrollStatistics,
  getCostAnalysis,
  deletePayroll,
  getEmployeeInsuranceDetails,
  getEmployeeContributionBases,
  getEmployeeMonthlyContributionBases,
  getInsuranceTypes
} = PayrollService;

// 创建默认导出实例
export const payrollService = PayrollService;