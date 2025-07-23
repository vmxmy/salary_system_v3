// 薪酬组件类型定义
export interface PayrollComponent {
  code: string;
  name: string;
  description?: string;
  type_lookup_id: number;
  subtype_lookup_id: number;
  data_type_lookup_id: number;
  calculation_type_lookup_id: number;
  is_taxable: boolean;
  is_social_insurance_base: boolean;
  is_housing_fund_base: boolean;
  display_order: number;
  is_visible_on_payslip: boolean;
  is_editable_by_user: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  tags: Record<string, any>;
}

// 组件分类
export interface ComponentCategory {
  id: number;
  value: string;
  display_name: string;
  display_order: number;
}

// 筛选条件
export interface ComponentFilters {
  search: string;
  category: string | null;
  personnelType: string | null;
  isActive: boolean | null;
  isTaxable: boolean | null;
}

// 组件统计
export interface ComponentStats {
  total: number;
  active: number;
  byCategory: Record<string, number>;
  byPersonnelType: Record<string, number>;
}

// 表单数据
export interface ComponentFormData {
  code: string;
  name: string;
  description: string;
  type_lookup_id: number;
  subtype_lookup_id: number;
  data_type_lookup_id: number;
  calculation_type_lookup_id: number;
  is_taxable: boolean;
  is_social_insurance_base: boolean;
  is_housing_fund_base: boolean;
  display_order: number;
  is_visible_on_payslip: boolean;
  is_editable_by_user: boolean;
  is_active: boolean;
  tags: Record<string, any>;
}

// 批量操作
export interface BatchOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'export';
  selectedCodes: string[];
}

// 操作模式
export type ModalMode = 'view' | 'create' | 'edit';