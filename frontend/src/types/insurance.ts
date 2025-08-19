/**
 * 保险相关类型定义
 */

// 保险类型配置接口
export interface InsuranceTypeInfo {
  id: string;
  system_key: string;
  name: string;
  description?: string;
  is_active: boolean;
}

// 员工类别接口
export interface EmployeeCategory {
  id: string;
  name: string;
  parent_category_id?: string;
  parent_name?: string;
  children?: EmployeeCategory[];
  level: number;
}

// 保险规则配置接口
export interface InsuranceRuleConfig {
  id?: string;
  insurance_type_id: string;
  employee_category_id: string;
  is_applicable: boolean;
  employee_rate?: number;
  employer_rate?: number;
  base_floor?: number;
  base_ceiling?: number;
  effective_date?: string;
  end_date?: string;
  description?: string;
}

// 批量配置接口
export interface BatchConfigParams {
  insurance_type_id: string;
  category_ids: string[];
  config: Omit<InsuranceRuleConfig, 'id' | 'insurance_type_id' | 'employee_category_id'>;
  inherit_from_parent?: boolean;
}