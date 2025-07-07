// 员工管理系统类型定义
export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  gender: '男' | '女' | null;
  date_of_birth: string | null;
  hire_date: string;
  first_work_date: string | null;
  employee_status: 'active' | 'inactive' | 'terminated';
  department_id: string | null;
  position_id: string | null;
  personnel_category_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface EmployeeWithDetails {
  // 从视图 v_employees_with_id_numbers 获取的字段
  id: string;
  employee_code: string;
  display_name: string;
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  hire_date: string | null;
  first_work_date: string | null;
  current_status: string;
  id_number_status: string;
  id_number_reference: string | null;
  department_id: string;
  department_name: string;
  position: string;
  job_level: string;
  personnel_category: string;
  personnel_category_id: string;
  personnel_category_name: string;
  created_at: string;
  updated_at: string;
  
  // 兼容性字段映射
  name?: string;
  employee_number?: string;
  is_active?: boolean;
  id_number_masked?: string;
  position_name?: string;
  position_id?: string;
  phone_number?: string;
  email?: string;
  education_level?: string;
  housing_fund_number?: string;
  employee_status?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  name: string;
  code: string;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonnelCategory {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  department_id?: string;
  position_id?: string;
  personnel_category_id?: string;
  employee_status?: Employee['employee_status'];
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

// 组件 Props 类型
export interface EmployeeTableProps {
  data: EmployeeWithDetails[];
  loading?: boolean;
  onRowSelect?: (employees: EmployeeWithDetails[]) => void;
  onEdit?: (employee: EmployeeWithDetails) => void;
  onDelete?: (employee: EmployeeWithDetails) => void;
  onView?: (employee: EmployeeWithDetails) => void;
  permissions?: UserPermissions;
  className?: string;
}

export interface EmployeeFormProps {
  employee?: EmployeeWithDetails;
  mode: 'create' | 'edit' | 'view';
  onSubmit?: (data: Partial<Employee>) => void;
  onCancel?: () => void;
  loading?: boolean;
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

// 列配置类型
export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  sensitive?: boolean; // 是否为敏感数据列
}

// 导出相关类型
export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  columns: string[];
  filters?: EmployeeFilters;
  includeSensitiveData?: boolean;
}