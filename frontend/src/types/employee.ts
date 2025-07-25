// 基于真实 Supabase 数据库结构的员工类型定义

export interface Employee {
  id: string;
  user_id?: string;
  full_name: string;
  id_number?: string;
  hire_date: string;
  termination_date?: string;
  employment_status: 'active' | 'inactive' | 'terminated';
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

// 员工当前状态视图类型（v_employee_current_status）
export interface EmployeeCurrentStatus {
  employee_id: string;
  full_name: string;
  employment_status: string;
  department_name?: string;
  position_name?: string;
  rank_name?: string;
  job_start_date?: string;
  category_name?: string;
  category_start_date?: string;
  has_occupational_pension?: string;
}

// 员工联系方式类型
export interface EmployeeContact {
  id: string;
  employee_id: string;
  contact_type: 'mobile_phone' | 'email' | 'landline' | 'address';
  contact_details: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// 员工银行账户类型
export interface EmployeeBankAccount {
  id: string;
  employee_id: string;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  branch_name?: string;
  is_primary: boolean;
  effective_start_date: string;
  effective_end_date?: string;
  created_at: string;
  updated_at: string;
}

// 员工教育背景类型
export interface EmployeeEducation {
  id: string;
  employee_id: string;
  institution_name: string;
  degree: string;
  field_of_study: string;
  graduation_date: string;
  notes?: string;
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
  effective_end_date?: string;
  notes?: string;
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
  file_path?: string;
  file_url?: string;
  upload_date: string;
  notes?: string;
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
  effective_end_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 扩展的员工信息，包含所有相关数据
export interface EmployeeWithDetails extends EmployeeCurrentStatus {
  contacts: EmployeeContact[];
  bankAccounts: EmployeeBankAccount[];
  education: EmployeeEducation[];
  jobHistory: EmployeeJobHistory[];
  contributionBases: EmployeeContributionBase[];
  documents: EmployeeDocument[];
  specialDeductions: EmployeeSpecialDeduction[];
  hire_date: string;
  date_of_birth?: string;
  gender?: string;
  id_number?: string;
}

// 员工列表项类型（用于表格显示）
export interface EmployeeListItem {
  id: string;
  employee_id: string;
  full_name: string;
  employment_status: string;
  department_name?: string;
  position_name?: string;
  category_name?: string;
  hire_date?: string;
  mobile_phone?: string;
  email?: string;
  primary_bank_account?: string; // 主要银行账户号码
  bank_name?: string; // 银行名称
}

// 员工创建/更新请求类型
export interface CreateEmployeeRequest {
  full_name: string;
  id_number?: string;
  hire_date: string;
  employment_status?: 'active' | 'inactive';
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  manager_id?: string;
  contacts?: Omit<EmployeeContact, 'id' | 'employee_id' | 'created_at' | 'updated_at'>[];
  bankAccounts?: Omit<EmployeeBankAccount, 'id' | 'employee_id' | 'created_at' | 'updated_at'>[];
  education?: Omit<EmployeeEducation, 'id' | 'employee_id' | 'created_at'>[];
  documents?: Omit<EmployeeDocument, 'id' | 'employee_id' | 'created_at' | 'updated_at'>[];
  specialDeductions?: Omit<EmployeeSpecialDeduction, 'id' | 'employee_id' | 'created_at' | 'updated_at'>[];
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