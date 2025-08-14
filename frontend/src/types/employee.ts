// 基于真实 Supabase 数据库结构的员工类型定义

export interface Employee {
  id: string;
  user_id?: string;
  employee_name: string;
  id_number?: string;
  hire_date: string;
  termination_date?: string;
  employment_status: 'active' | 'inactive' | 'terminated';
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
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
  id_number?: string; // 身份证号
  hire_date?: string;
  termination_date?: string; // 离职日期
  gender?: string; // 性别
  date_of_birth?: string; // 出生日期
  employment_status: string;
  current_status: 'active' | 'inactive' | 'terminated'; // 添加当前状态字段
  manager_id?: string; // 上级主管ID
  department_id?: string; // 部门ID
  department_name?: string;
  position_id?: string; // 职位ID
  position_name?: string;
  rank_id?: string; // 职级ID
  rank_name?: string; // 职级名称
  job_start_date?: string; // 任职开始日期
  category_id?: string; // 人员类别ID
  category_name?: string;
  category_start_date?: string; // 类别开始日期
  has_occupational_pension?: string; // 是否有职业年金
  mobile_phone?: string;
  email?: string;
  work_email?: string; // 工作邮箱
  personal_email?: string; // 个人邮箱
  primary_bank_account?: string; // 主要银行账户号码
  bank_name?: string; // 银行名称
  branch_name?: string; // 支行名称
  latest_institution?: string; // 最新教育机构
  latest_degree?: string; // 最新学位
  latest_field_of_study?: string; // 最新专业
  latest_graduation_date?: string; // 最新毕业日期
  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
  base_salary?: number; // 添加基本工资字段
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
  description?: string;
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