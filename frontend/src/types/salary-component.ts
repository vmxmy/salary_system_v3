/**
 * 薪资组件类型定义
 * 用于系统薪资字段管理功能
 */

export interface SalaryComponent {
  id: string;
  name: string;
  type: ComponentType;
  category: ComponentCategory | null;
  description?: string | null;
  is_taxable: boolean;
  base_dependency?: boolean | null;
  copy_strategy?: string | null;
  stability_level?: string | null;
  copy_notes?: string | null;
  created_at: string;
}

// 薪资组件类型枚举
export type ComponentType = 
  | 'earning'        // 收入项
  | 'deduction';     // 扣除项

// 薪资组件类别枚举
export type ComponentCategory = 
  | 'basic_salary'        // 基本工资
  | 'benefits'           // 津贴补贴
  | 'personal_insurance' // 个人保险
  | 'employer_insurance' // 单位保险
  | 'personal_tax'       // 个人税费
  | 'other_deductions';  // 其他扣除

// 复制策略枚举
export type CopyStrategy = 
  | 'auto'      // 自动复制
  | 'optional'  // 可选复制
  | 'manual';   // 手动设置

// 稳定性级别枚举
export type StabilityLevel = 
  | 'fixed'      // 固定项目
  | 'semi_fixed' // 半固定项目
  | 'variable';  // 变动项目

// 创建薪资组件的请求参数
export interface CreateSalaryComponentRequest {
  name: string;
  type: ComponentType;
  category: ComponentCategory;
  description?: string;
  is_taxable: boolean;
  base_dependency?: boolean;
  copy_strategy?: CopyStrategy;
  stability_level?: StabilityLevel;
  copy_notes?: string;
}

// 更新薪资组件的请求参数
export interface UpdateSalaryComponentRequest extends Partial<CreateSalaryComponentRequest> {
  id: string;
}

// 薪资组件查询参数
export interface SalaryComponentQuery {
  type?: ComponentType;
  category?: ComponentCategory;
  is_taxable?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// 薪资组件统计信息
export interface SalaryComponentStats {
  total: number;
  by_type: Record<ComponentType, number>;
  by_category: Record<ComponentCategory, number>;
  taxable_count: number;
  non_taxable_count: number;
}

// 组件类型显示配置
export const COMPONENT_TYPE_CONFIG: Record<ComponentType, {
  label: string;
  color: string;
  icon: string;
}> = {
  earning: {
    label: '收入项',
    color: 'text-success',
    icon: '📈'
  },
  deduction: {
    label: '扣除项', 
    color: 'text-error',
    icon: '📉'
  }
};

// 组件类别显示配置
export const COMPONENT_CATEGORY_CONFIG: Record<ComponentCategory, {
  label: string;
  color: string;
  description: string;
}> = {
  basic_salary: {
    label: '基本工资',
    color: 'badge-primary',
    description: '基础工资项目'
  },
  benefits: {
    label: '津贴补贴',
    color: 'badge-secondary',
    description: '各类津贴和补贴'
  },
  personal_insurance: {
    label: '个人保险',
    color: 'badge-accent',
    description: '个人承担的保险费用'
  },
  employer_insurance: {
    label: '单位保险',
    color: 'badge-neutral',
    description: '单位承担的保险费用'
  },
  personal_tax: {
    label: '个人税费',
    color: 'badge-warning',
    description: '个人所得税等税费'
  },
  other_deductions: {
    label: '其他扣除',
    color: 'badge-error',
    description: '其他各类扣除项目'
  }
};

// 复制策略配置
export const COPY_STRATEGY_CONFIG: Record<CopyStrategy, {
  label: string;
  description: string;
}> = {
  auto: {
    label: '自动复制',
    description: '自动从上月复制数据'
  },
  optional: {
    label: '可选复制',
    description: '可选择是否复制'
  },
  manual: {
    label: '手动设置',
    description: '需要手动输入数据'
  }
};

// 稳定性级别配置
export const STABILITY_LEVEL_CONFIG: Record<StabilityLevel, {
  label: string;
  description: string;
  color: string;
}> = {
  fixed: {
    label: '固定项目',
    description: '金额相对稳定',
    color: 'badge-success'
  },
  semi_fixed: {
    label: '半固定项目',
    description: '偶尔会有变动',
    color: 'badge-warning'
  },
  variable: {
    label: '变动项目',
    description: '经常变动的项目',
    color: 'badge-error'
  }
};