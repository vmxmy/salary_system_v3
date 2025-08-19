// 扩展类型定义 - 用于补充缺失的视图和函数类型
// 这些类型应该在重新生成 supabase.ts 时被包含

export interface ViewEmployeeInsuranceBaseMonthlyLatest {
  employee_id: string;
  employee_name: string;
  insurance_type_id: string;
  insurance_type_name: string;
  insurance_type_key: string;
  latest_contribution_base: number;
  base_last_updated: string;
  base_period_display: string;
}

export interface VStandardInsuranceComponents {
  insurance_type: string;
  payer_type: 'employee' | 'employer';
  standard_name: string;
  component_id: string;
}

// RPC 函数参数和返回类型
export interface QuickExportPayrollSummaryParams {
  period_id: string;
  department_ids?: string[];
}

export interface BatchApprovePayrollsParams {
  payroll_ids: string[];
  approver_comment?: string;
}

export interface BatchRejectPayrollsParams {
  payroll_ids: string[];
  rejection_reason: string;
}

// 类型辅助函数
export function isViewEmployeeInsuranceBaseMonthlyLatest(data: any): data is ViewEmployeeInsuranceBaseMonthlyLatest[] {
  return Array.isArray(data) && data.every(item => 
    'employee_id' in item && 
    'insurance_type_key' in item &&
    'latest_contribution_base' in item
  );
}