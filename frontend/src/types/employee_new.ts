// 员工管理系统类型定义（适配数据库设计文档）
// 基于 @/Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3/docs/database_schema_design.md

// UUID 类型定义
export type UUID = string;

// 员工主表
export interface Employee {
  id: UUID; // UUID 主键
  user_id: UUID | null; // 关联到 Supabase 的认证用户
  full_name: string; // 员工全名
  id_number_encrypted: string | null; // 加密后的身份证号
  id_number_nonce: string | null; // 加密所需的一次性随机数
  hire_date: string; // 入职日期
  termination_date: string | null; // 离职日期
  employment_status: 'active' | 'inactive' | 'on_leave'; // 就业状态
  gender: 'male' | 'female' | 'other' | null; // 性别
  date_of_birth: string | null; // 出生日期
  created_at: string; // 创建时间
  updated_at: string; // 更新时间
  // 以下字段是在 ALTER TABLE 语句中添加的
  employee_code: string | null; // 员工编号
  current_status: 'active' | 'inactive' | 'terminated'; // 当前状态
  first_work_date: string | null; // 首次工作日期
  position_text: string | null; // 职位文本（非外键）
  job_level_text: string | null; // 职级文本（非外键）
  department_id: UUID | null; // 部门外键
  position_id: UUID | null; // 职位外键
  personnel_category_id: UUID | null; // 人员类别外键
}

// 员工详细信息表
export interface EmployeePersonalDetails {
  id: UUID;
  employee_id: UUID; // 员工外键
  education_level: string | null; // 教育程度
  interrupted_service_years: number | null; // 工龄间断年限
  social_security_number: string | null; // 社保账号
  housing_fund_number: string | null; // 公积金账号
  political_status: string | null; // 政治面貌
  marital_status: string | null; // 婚姻状况
  created_at: string;
  updated_at: string;
}

// 员工联系方式表
export type ContactMethodType = 'personal_email' | 'work_email' | 'mobile_phone' | 'home_phone' | 'address';

export interface EmployeeContact {
  id: UUID;
  employee_id: UUID; // 员工外键
  contact_type: ContactMethodType; // 联系方式类型
  contact_value_encrypted: string; // 加密的联系信息
  nonce: string; // 加密随机数
  is_primary: boolean; // 是否为主要联系方式
  created_at: string;
}

// 员工银行账户表
export interface EmployeeBankAccount {
  id: UUID;
  employee_id: UUID; // 员工外键
  bank_name_encrypted: string; // 加密的银行名称
  account_number_encrypted: string; // 加密的银行账号
  account_holder_name_encrypted: string; // 加密的账户持有人姓名
  nonce: string; // 加密随机数
  is_primary: boolean; // 是否为主要账户
  effective_start_date: string; // 生效开始日期
  effective_end_date: string | null; // 生效结束日期
  created_at: string;
}

// 员工教育背景表
export interface EmployeeEducation {
  id: UUID;
  employee_id: UUID; // 员工外键
  institution_name: string; // 毕业院校
  degree: string; // 学位
  field_of_study: string; // 专业
  graduation_date: string | null; // 毕业日期
  notes: string | null; // 备注
  created_at: string;
}

// 员工职位历史表
export interface EmployeeJobHistory {
  id: UUID;
  employee_id: UUID; // 员工外键
  department_id: UUID; // 部门外键
  position_id: UUID; // 职位外键
  rank_id: UUID; // 职级外键
  effective_start_date: string; // 生效开始日期
  effective_end_date: string | null; // 生效结束日期
  notes: string | null; // 备注
  created_at: string;
}

// 部门表
export interface Department {
  id: UUID; // UUID 主键
  name: string; // 部门名称
  parent_department_id: UUID | null; // 上级部门外键
  created_at: string;
  updated_at: string;
}

// 职位表
export interface Position {
  id: UUID; // UUID 主键
  name: string; // 职位名称
  description: string | null; // 描述
  created_at: string;
}

// 员工身份类别表
export interface EmployeeCategory {
  id: UUID; // UUID 主键
  name: string; // 类别名称
  description: string | null; // 描述
  parent_category_id: UUID | null; // 上级类别外键
  created_at: string;
}

// 员工职级表
export interface JobRank {
  id: UUID; // UUID 主键
  name: string; // 职级名称
  description: string | null; // 描述
  created_at: string;
}

// 薪资组件表
export type ComponentType = 'earning' | 'deduction';

export interface SalaryComponent {
  id: UUID; // UUID 主键
  name: string; // 组件名称
  type: ComponentType; // 组件类型
  description: string | null; // 描述
  is_taxable: boolean; // 是否应税
  created_at: string;
}

// 薪资单主表
export type PayrollStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface Payroll {
  id: UUID; // UUID 主键
  employee_id: UUID; // 员工外键
  pay_period_start: string; // 薪资周期开始日期
  pay_period_end: string; // 薪资周期结束日期
  pay_date: string; // 发薪日期
  gross_pay: number; // 应发合计
  total_deductions: number; // 扣发合计
  net_pay: number; // 实发工资
  status: PayrollStatus; // 状态
  notes: string | null; // 备注
  created_at: string;
  updated_at: string;
}

// 薪资单项明细表
export interface PayrollItem {
  id: UUID; // UUID 主键
  payroll_id: UUID; // 薪资单外键
  component_id: UUID; // 薪资组件外键
  amount: number; // 金额
  notes: string | null; // 备注
  created_at: string;
}

// 薪资组件详情（用于展示）
export interface SalaryComponentWithDetails extends SalaryComponent {
  // 可以添加关联信息，如使用该组件的员工数量等
}

// 薪资单详情（用于展示）
export interface PayrollWithDetails extends Payroll {
  employee_name: string; // 员工姓名
  department_name: string; // 部门名称
  items: PayrollItem[]; // 薪资项明细
}

// 薪资单项详情（用于展示）
export interface PayrollItemWithDetails extends PayrollItem {
  component_name: string; // 组件名称
  component_type: ComponentType; // 组件类型
}

// 社保险种表
export interface InsuranceType {
  id: UUID; // UUID 主键
  system_key: string; // 系统键名
  name: string; // 险种名称
  description: string | null; // 描述
  created_at: string;
}

// 社保政策表
export interface SocialInsurancePolicy {
  id: UUID; // UUID 主键
  name: string; // 政策名称
  region: string; // 地区
  effective_start_date: string; // 生效开始日期
  effective_end_date: string | null; // 生效结束日期
  created_at: string;
}

// 政策规则明细表
export interface PolicyRule {
  id: UUID; // UUID 主键
  policy_id: UUID; // 政策外键
  insurance_type_id: UUID; // 险种外键
  employee_rate: number; // 个人缴费费率
  employer_rate: number; // 单位缴费费率
  base_floor: number; // 缴费基数下限
  base_ceiling: number; // 缴费基数上限
  created_at: string;
}

// 员工缴费基数表
export interface EmployeeContributionBase {
  id: UUID; // UUID 主键
  employee_id: UUID; // 员工外键
  insurance_type_id: UUID; // 险种外键
  contribution_base: number; // 缴费基数
  effective_start_date: string; // 生效开始日期
  effective_end_date: string | null; // 生效结束日期
  created_at: string;
}

// 税收管辖区表
export interface TaxJurisdiction {
  id: UUID; // UUID 主键
  country_code: string; // 国家代码
  name: string; // 管辖区名称
  created_at: string;
}

// 税收政策表
export interface TaxPolicy {
  id: UUID; // UUID 主键
  jurisdiction_id: UUID; // 管辖区外键
  name: string; // 政策名称
  effective_start_date: string; // 生效开始日期
  effective_end_date: string | null; // 生效结束日期
  standard_monthly_threshold: number; // 月度起征点
  created_at: string;
}

// 累进税率表
export interface TaxBracket {
  id: UUID; // UUID 主键
  policy_id: UUID; // 政策外键
  bracket_level: number; // 级别
  annual_income_floor: number; // 年收入下限
  annual_income_ceiling: number | null; // 年收入上限
  rate: number; // 税率
  quick_deduction: number; // 速算扣除数
}

// 专项附加扣除类型表
export interface SpecialDeductionType {
  id: UUID; // UUID 主键
  policy_id: UUID; // 政策外键
  system_key: string; // 系统键名
  name: string; // 扣除项名称
  standard_monthly_amount: number; // 标准月扣除额
  description: string | null; // 描述
  created_at: string;
}

// 员工专项附加扣除申报表
export interface EmployeeSpecialDeduction {
  id: UUID; // UUID 主键
  employee_id: UUID; // 员工外键
  deduction_type_id: UUID; // 扣除类型外键
  claimed_monthly_amount: number; // 申报月扣除额
  effective_start_date: string; // 生效开始日期
  effective_end_date: string | null; // 生效结束日期
  created_at: string;
}

// 综合员工信息视图（用于前端展示）
export interface EmployeeWithDetails {
  // 员工基本信息
  id: UUID;
  employee_code: string | null;
  full_name: string;
  display_name: string;
  gender: string;
  date_of_birth: string | null;
  hire_date: string | null;
  first_work_date: string | null;
  current_status: string;
  id_number: string | null; // 解密后的身份证号（仅在有权限时显示）
  employment_status: string;
  termination_date: string | null;
  
  // 部门信息
  department_id: UUID | null;
  department_name: string | null;
  
  // 职位信息
  position_id: UUID | null;
  position_name: string | null;
  position_text: string | null;
  
  // 职级信息
  job_level_text: string | null;
  
  // 人员类别信息
  personnel_category_id: UUID | null;
  personnel_category_name: string | null;
  
  // 时间戳
  created_at: string;
  updated_at: string;
  
  // 个人详情
  education_level: string | null;
  interrupted_service_years: number | null;
  social_security_number: string | null;
  housing_fund_number: string | null;
  political_status: string | null;
  marital_status: string | null;
  
  // 联系方式
  phone_number: string | null; // 解密后的联系方式
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  
  // 银行账户信息
  bank_name: string | null; // 解密后的银行名称
  bank_code: string | null;
  branch_name: string | null;
  account_holder_name: string | null; // 解密后的账户持有人姓名
  account_number: string | null; // 解密后的银行账号
  account_type: string | null;
  
  // 教育背景
  education_details: EmployeeEducation[] | null;
  
  // 工作履历
  job_history: EmployeeJobHistory[] | null;
}

// 表格相关类型
export interface ColumnFilter {
  id: string;
  value: unknown;
}

export interface SortingState {
  id: string;
  desc: boolean;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

// API 响应类型
export interface EmployeeListResponse {
  data: EmployeeWithDetails[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// 搜索和过滤类型
export interface EmployeeFilters {
  search?: string;
  department_id?: UUID;
  position_id?: UUID;
  personnel_category_id?: UUID;
  current_status?: Employee['current_status'];
  employment_status?: Employee['employment_status'];
  date_range?: {
    start: string;
    end: string;
  };
}

// 权限相关类型
export interface UserPermissions {
  canViewSensitiveData: boolean;
  canEditEmployee: boolean;
  canDeleteEmployee: boolean;
  canCreateEmployee: boolean;
  canExportData: boolean;
}

// 批量操作类型
export interface BulkAction {
  id: string;
  label: string;
  icon?: string;
  action: (employees: EmployeeWithDetails[]) => void;
  requiresConfirmation?: boolean;
  confirmMessage?: string;
}