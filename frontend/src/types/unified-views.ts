/**
 * 统一视图的TypeScript类型定义
 * 对应数据库中优化后的统一视图
 */

// ============ 保险基数相关 ============

/**
 * 统一的员工保险基数视图
 * 对应: view_employee_insurance_base_unified
 */
export interface EmployeeInsuranceBaseUnified {
  employee_id: string;
  employee_name: string;
  id_number: string;
  employment_status?: string;
  insurance_type_id: string;
  insurance_type_name: string;
  insurance_type_key: string;
  month: string;
  month_string: string;
  year: number;
  month_number: number;
  contribution_base: number;
  effective_start_date: string;
  effective_end_date?: string | null;
  rn: number; // 排序号，1表示最新记录
  is_current_year: boolean;
  is_current_month: boolean;
  has_explicit_base: boolean;
}

// ============ 薪资相关 ============

/**
 * 统一的薪资详细视图
 * 对应: view_payroll_unified
 */
export interface PayrollUnified {
  // 薪资基本信息
  payroll_id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  payroll_created_at: string;
  payroll_updated_at: string;
  
  // 薪资项目明细
  payroll_item_id?: string | null;
  component_id?: string | null;
  component_name?: string | null;
  component_type?: string | null;
  component_category?: string | null;
  category_name?: string | null;
  category_sort_order?: number | null;
  item_amount?: number | null;
  item_notes?: string | null;
  
  // 员工信息
  employee_name: string;
  id_number: string;
  department_id?: string | null;
  department_name?: string | null;
  position_id?: string | null;
  position_name?: string | null;
  employee_category_name?: string | null;
  primary_bank_account?: string | null;
  bank_name?: string | null;
  branch_name?: string | null;
  
  // 时间维度
  pay_month: string;
  pay_month_string: string;
  pay_year: number;
  pay_month_number: number;
  
  // 标识字段
  is_recent_year: boolean;
  is_recent_12_months: boolean;
  is_current_month: boolean;
}

/**
 * 统一的薪资趋势视图
 * 对应: view_payroll_trend_unified
 */
export interface PayrollTrendUnified {
  pay_month: string;
  pay_month_string: string;
  pay_year: number;
  pay_month_number: number;
  employee_count: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  avg_net_pay: number;
  period_start: string;
  period_end: string;
  payroll_count: number;
  is_recent_year: boolean;
  is_recent_12_months: boolean;
}

// ============ 兼容性接口 ============
// 为了保持向后兼容，定义一些映射接口

/**
 * 薪资列表项（兼容旧接口）
 */
export interface PayrollListItem {
  id: string;
  payroll_id: string;
  pay_date: string;
  pay_period_start: string;
  pay_period_end: string;
  employee_id: string;
  employee_name: string; // 统一使用employee_name
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  employee: {
    id: string;
    employee_name: string;
    id_number: string | null;
  };
  department_name: string | null;
}

/**
 * 薪资明细项（兼容旧接口）
 */
export interface PayrollDetailItem {
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  id_number: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: string;
  payroll_item_id: string;
  component_id: string;
  component_name: string;
  component_type: string;
  component_category: string;
  category_name: string;
  amount: number; // 映射自item_amount
  item_notes: string | null;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  category_sort_order: number;
}

/**
 * 薪资历史趋势（兼容旧接口）
 */
export interface PayrollHistoryTrend {
  pay_month: string;
  employee_count: number;
  total_gross: number; // 映射自total_gross_pay
  total_deductions: number;
  total_net: number; // 映射自total_net_pay
  avg_net_pay: number;
}

// ============ 辅助类型 ============

/**
 * 查询过滤器类型
 */
export interface UnifiedViewFilters {
  // 保险基数查询过滤器
  insuranceBase?: {
    month?: string;
    year?: number;
    employeeIds?: string[];
    insuranceTypeIds?: string[];
    onlyLatest?: boolean; // rn = 1
    onlyCurrentYear?: boolean;
    onlyCurrentMonth?: boolean;
  };
  
  // 薪资查询过滤器
  payroll?: {
    payrollId?: string;
    employeeId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    onlyRecentYear?: boolean;
    onlyRecent12Months?: boolean;
    onlyCurrentMonth?: boolean;
    includeDetails?: boolean; // 是否包含明细项
  };
  
  // 趋势查询过滤器
  trend?: {
    limit?: number;
    onlyRecentYear?: boolean;
    onlyRecent12Months?: boolean;
    year?: number;
  };
}

/**
 * 字段映射助手
 */
export const FieldMapping = {
  // 保险基数字段映射
  insuranceBase: {
    toUnified: (old: any): Partial<EmployeeInsuranceBaseUnified> => ({
      ...old,
      // 如果有旧字段名需要映射，在这里处理
    }),
    fromUnified: (unified: EmployeeInsuranceBaseUnified): any => ({
      ...unified,
      // 如果需要转换回旧格式，在这里处理
    })
  },
  
  // 薪资字段映射
  payroll: {
    toUnified: (old: any): Partial<PayrollUnified> => ({
      ...old,
      employee_name: old.employee_name || old.employee_name,
      item_amount: old.amount || old.item_amount,
    }),
    fromUnified: (unified: PayrollUnified): any => ({
      ...unified,
      employee_name: unified.employee_name, // 兼容旧字段名
      amount: unified.item_amount, // 兼容旧字段名
    })
  },
  
  // 趋势字段映射
  trend: {
    toUnified: (old: any): Partial<PayrollTrendUnified> => ({
      ...old,
      total_gross_pay: old.total_gross || old.total_gross_pay,
      total_net_pay: old.total_net || old.total_net_pay,
    }),
    fromUnified: (unified: PayrollTrendUnified): PayrollHistoryTrend => ({
      pay_month: unified.pay_month,
      employee_count: unified.employee_count,
      total_gross: unified.total_gross_pay,
      total_deductions: unified.total_deductions,
      total_net: unified.total_net_pay,
      avg_net_pay: unified.avg_net_pay
    })
  }
};

// Export only the FieldMapping utility since it's the only value
export default {
  FieldMapping
};