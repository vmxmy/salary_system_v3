// 基于真实 Supabase 数据库结构的员工类型定义

// 完全匹配Supabase数据库schema
export interface Employee {
  id: string;
  user_id: string | null;
  employee_name: string | null;
  id_number: string | null;
  hire_date: string;
  termination_date: string | null;
  employment_status: string; // 使用数据库的实际枚举值
  gender: string | null; // 使用数据库的实际枚举值
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
  manager_id: string | null;
}

// 员工基本信息视图类型（view_employee_basic_info）
export interface EmployeeBasicInfo {
  employee_id: string;
  employee_name: string;
  id_number?: string;
  hire_date: string;
  termination_date?: string;
  gender?: string;
  date_of_birth?: string;
  employment_status: string;
  department_id?: string;
  department_name?: string;
  position_id?: string;
  position_name?: string;
  rank_id?: string;
  rank_name?: string;
  job_start_date?: string;
  category_id?: string;
  category_name?: string;
  category_start_date?: string;
  has_occupational_pension?: string;
  mobile_phone?: string;
  email?: string;
  work_email?: string;
  personal_email?: string;
  primary_bank_account?: string;
  bank_name?: string;
  branch_name?: string;
  latest_institution?: string;
  latest_degree?: string;
  latest_field_of_study?: string;
  latest_graduation_date?: string;
  created_at: string;
  updated_at: string;
}

// 员工当前状态视图类型（v_employee_current_status）
export interface EmployeeCurrentStatus {
  employee_id: string;
  employee_name: string;
  employment_status: string;
  department_name: string | null;
  position_name: string | null;
  rank_name: string | null;
  job_start_date: string | null;
  category_name: string | null;
  category_start_date: string | null;
  has_occupational_pension: string | null;
}

// 员工联系方式类型 - 完全匹配数据库枚举值
export interface EmployeeContact {
  id: string;
  employee_id: string;
  contact_type: 'personal_email' | 'work_email' | 'mobile_phone' | 'home_phone' | 'address';
  contact_details: string;
  is_primary: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// 员工银行账户类型
export interface EmployeeBankAccount {
  id: string;
  employee_id: string;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  branch_name: string | null;
  is_primary: boolean | null;
  effective_start_date: string;
  effective_end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// 员工教育背景类型
export interface EmployeeEducation {
  id: string;
  employee_id: string;
  institution_name: string | null;
  degree: string;
  field_of_study: string | null;
  graduation_date: string | null;
  notes: string | null;
  created_at: string;
}

// 员工工作历史类型
export interface EmployeeJobHistory {
  id: string;
  employee_id: string;
  department_id: string;
  position_id: string;
  rank_id: string;
  effective_start_date: string;
  effective_end_date: string | null;
  notes: string | null;
  created_at: string;
}

// 员工缴费基数类型
export interface EmployeeContributionBase {
  id: string;
  employee_id: string;
  insurance_type_id: string;
  contribution_base: string;
  effective_start_date: string;
  effective_end_date: string;
  created_at: string;
}

// 员工文档类型
export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_path: string | null;
  file_url: string | null;
  upload_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 员工专项扣除类型
export interface EmployeeSpecialDeduction {
  id: string;
  employee_id: string;
  deduction_type: string;
  deduction_amount: string;
  effective_start_date: string;
  effective_end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 扩展的员工信息，包含所有相关数据
export interface EmployeeWithDetails extends EmployeeBasicInfo {
  contacts: EmployeeContact[];
  bankAccounts: EmployeeBankAccount[];
  education: EmployeeEducation[];
  jobHistory: EmployeeJobHistory[];
  contributionBases: EmployeeContributionBase[];
  documents: EmployeeDocument[];
  specialDeductions: EmployeeSpecialDeduction[];
}

// 员工列表项类型（用于表格显示）
export interface EmployeeListItem {
  id: string;
  employee_id: string;
  employee_name: string;
  id_number: string | null;
  hire_date: string | null;
  termination_date: string | null;
  gender: string | null;
  date_of_birth: string | null;
  employment_status: string;
  current_status: string; // 使用数据库实际枚举值
  manager_id: string | null;
  department_id: string | null;
  department_name: string | null;
  position_id: string | null;
  position_name: string | null;
  rank_id: string | null;
  rank_name: string | null;
  job_start_date: string | null;
  category_id: string | null;
  category_name: string | null;
  category_start_date: string | null;
  has_occupational_pension: string | null;
  mobile_phone: string | null;
  email: string | null;
  work_email: string | null;
  personal_email: string | null;
  primary_bank_account: string | null;
  bank_name: string | null;
  branch_name: string | null;
  latest_institution: string | null;
  latest_degree: string | null;
  latest_field_of_study: string | null;
  latest_graduation_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  base_salary: number | null;
}

// 员工创建/更新请求类型（基础版本）
export interface CreateEmployeeRequest {
  employee_name: string;
  id_number?: string;
  hire_date: string;
  employment_status?: 'active' | 'inactive';
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  mobile_phone?: string;
  email?: string;
  work_email?: string;
  personal_email?: string;
}

// 组织分配信息类型
export interface OrganizationalAssignment {
  department_id: string;
  position_id: string;
  rank_id?: string;    // 职级ID，可选
  start_date: string;  // 任职开始日期 (effective_start_date)
  end_date?: string;   // 任职结束日期 (effective_end_date)，null表示当前有效
  notes?: string;      // 备注
}

// 员工类别分配信息类型
export interface CategoryAssignment {
  employee_category_id: string;
  effective_start_date: string;
  effective_end_date?: string;
  notes?: string;
}

// 银行账户创建信息类型
export interface BankAccountCreate {
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  branch_name?: string;
  is_primary: boolean;
  effective_start_date: string;
  effective_end_date?: string;
}

// 教育背景创建信息类型
export interface EducationCreate {
  institution_name: string;
  degree: string;
  field_of_study: string;
  graduation_date: string;
  notes?: string;
}

// 完整员工创建请求类型（包含所有关联数据）
export interface FullEmployeeCreateRequest extends CreateEmployeeRequest {
  // 组织分配信息
  organizational_assignment?: OrganizationalAssignment;
  
  // 员工类别分配信息
  category_assignment?: CategoryAssignment;
  
  // 银行账户信息（支持多个）
  bank_accounts?: BankAccountCreate[];
  
  // 教育背景信息（支持多个）
  education?: EducationCreate[];
  
  // 联系方式（已包含在基础字段中：mobile_phone, email, work_email, personal_email）
}

// 员工创建操作结果
export interface EmployeeCreateResult {
  employee: Employee;
  organizational_assignment?: any; // employee_assignments 记录
  category_assignment?: any; // employee_category_assignments 记录
  bank_accounts?: EmployeeBankAccount[];
  education?: EmployeeEducation[];
}

// 用于创建表单的下拉选项类型
export interface LookupOption {
  id: string;
  name: string;
  description: string | null;
}

export interface EmployeeFormOptions {
  departments: LookupOption[];
  positions: LookupOption[];
  categories: LookupOption[];
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  id: string;
}

// 员工查询参数
export interface EmployeeQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
  department_id?: string;
  employment_status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 员工查询结果
export interface EmployeeQueryResult {
  data: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}