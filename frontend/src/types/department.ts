import type { Database } from './supabase';

// Base department types from database
export type Department = Database['public']['Tables']['departments']['Row'];
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
export type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

// Department hierarchy view type
export interface DepartmentHierarchy {
  id: string;
  name: string;
  parent_department_id: string | null;
  full_path: string;
  level: number;
}

// Department payroll statistics view type
export interface DepartmentPayrollStatistics {
  department_id: string | null;
  department_name: string | null;
  period_code?: string | null;
  period_name?: string | null;
  pay_year: number | null;
  pay_month: number | null;
  employee_count: number | null;
  total_gross_pay: number | null;
  total_deductions: number | null;
  total_net_pay: number | null;
  avg_gross_pay: number | null;
  avg_net_pay: number | null;
  min_gross_pay: number | null;
  max_gross_pay: number | null;
  dept_gross_pay_percentage?: number | null;
  dept_employee_percentage?: number | null;
  // Computed fields
  pay_month_string?: string;
  pay_period_start?: string;
  pay_period_end?: string;
}

// Extended department node for tree structures
export interface DepartmentNode extends Department {
  children?: DepartmentNode[];
  employee_count?: number;
  level?: number;
  full_path?: string;
  code?: string;
  manager?: string;
  description?: string;
}

// Department with additional details
export interface DepartmentWithDetails extends Department {
  parent?: { name: string } | null;
  manager?: { employee_name: string } | null;
  employee_count?: number;
  children_count?: number;
  full_path?: string;
  level?: number;
  code?: string;
  description?: string;
}

// Department employee basic info
export interface DepartmentEmployee {
  id: string;
  employee_id: string;
  name: string;
  department_id: string;
  department_name?: string;
  position_name?: string;
  personnel_category?: string;
  status: string;
  assignment_start_date?: string;
}

// Department form data
export interface DepartmentFormData {
  name: string;
  parent_department_id?: string | null;
}

// Department search filters
export interface DepartmentSearchFilters {
  searchTerm?: string;
  parentId?: string;
  level?: number;
  hasEmployees?: boolean;
  employeeCountMin?: number;
  employeeCountMax?: number;
  avgSalaryMin?: number;
  avgSalaryMax?: number;
}

// Department batch operation
export interface DepartmentBatchOperation {
  id: string;
  action: 'update' | 'delete' | 'move';
  data?: {
    name?: string;
    parent_department_id?: string | null;
    newParentId?: string | null;
    [key: string]: any;
  };
}

// Department statistics
export interface DepartmentStats {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  total_positions: number;
  budget_allocated?: number;
  budget_used?: number;
  payroll_summary?: {
    current_month: DepartmentPayrollStatistics;
    previous_month: DepartmentPayrollStatistics;
    yearly_total: number;
  };
}

// View mode for department display
export type DepartmentViewMode = 'tree' | 'cards' | 'table';

// Department export format
export type DepartmentExportFormat = 'excel' | 'csv' | 'json' | 'pdf';

// Department import validation result
export interface DepartmentImportResult {
  success: boolean;
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  errors?: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  imported_departments: Department[];
}