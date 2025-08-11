// 员工薪资元数据接口 - 基于现有薪资汇总视图
export interface EmployeeMetadata {
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  id_number?: string;
  department_name: string;
  position_name: string;
  category_name: string;
  
  // 薪资期间
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  
  // 薪资金额
  gross_pay: string;           // 应发工资总额
  total_deductions: string;    // 扣除总额
  net_pay: string;            // 实发工资
  
  // 银行信息
  primary_bank_account?: string;
  bank_name?: string;
  branch_name?: string;
  
  // 状态信息
  status: 'draft' | 'confirmed' | 'locked' | 'archived';
  
  // 时间戳
  created_at: string;
  updated_at: string;
}

// 筛选条件接口
export interface FilterOptions {
  period?: string;              // 薪资期间
  departmentId?: string;        // 部门ID
  positionId?: string;          // 职位ID
  employeeStatus?: 'active' | 'resigned' | 'suspended'; // 员工状态
  dataStatus?: 'draft' | 'confirmed' | 'locked' | 'archived'; // 数据状态
  searchText?: string;          // 搜索文本
  salaryMin?: number;           // 最小工资
  salaryMax?: number;           // 最大工资
  hasAdjustment?: 'yes' | 'no'; // 是否有调整
  sortField?: string;           // 排序字段
  sortOrder?: 'ascend' | 'descend'; // 排序方向
}

// 分页信息接口
export interface PaginationOptions {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
}

// 统计信息接口
export interface StatisticsInfo {
  totalEmployees: number;       // 总员工数
  totalSalary: number;          // 应发工资总额
  totalTax: number;             // 个税总额
  averageSalary: number;        // 平均工资
  departmentCount: number;      // 部门数量
  positionCount: number;        // 职位数量
}

// 导出选项接口
export interface ExportOptions {
  format: 'xlsx' | 'csv';
  includeHeaders: boolean;
  includeStatistics: boolean;
  columns: string[];            // 要导出的列
  filters?: FilterOptions;      // 应用的筛选条件
}

// 导入选项接口
export interface ImportOptions {
  overrideExisting: boolean;    // 覆盖已存在数据
  createMissing: boolean;       // 创建缺失的部门/职位
  validateData: boolean;        // 验证数据完整性
  skipErrors: boolean;          // 跳过错误行
}

// 导入结果接口
export interface ImportResult {
  success: number;              // 成功导入数量
  failed: number;               // 失败数量
  skipped: number;              // 跳过数量
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

// 批量操作结果接口
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    message: string;
  }>;
}

// 历史记录接口
export interface HistoryRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  field_name: string;
  field_label: string;
  old_value: any;
  new_value: any;
  changed_at: string;
  changed_by: string;
  change_reason?: string;
}

// 审计日志接口
export interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'lock' | 'unlock' | 'import' | 'export';
  table_name: string;
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id: string;
  user_name: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  description?: string;
}

// 部门接口
export interface Department {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 职位接口
export interface Position {
  id: string;
  name: string;
  code?: string;
  department_id?: string;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 人员类别接口
export interface PersonnelCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}