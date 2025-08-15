import type { TableColumn } from '@/hooks/core/useTableMetadata';

// 表格配置接口
export interface TableConfiguration {
  displayName: string;
  description?: string;
  defaultSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  searchFields?: string[];
  defaultHiddenColumns?: string[];
  columnTypes?: Record<string, TableColumn['type']>;
  columnOverrides?: Record<string, {
    label?: string;
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
  }>;
  permissions?: {
    create?: boolean;
    update?: boolean;
    delete?: boolean;
    export?: boolean;
  };
}

/**
 * 表格配置映射
 * 为不同的表/视图提供特定的配置
 */
export const TABLE_CONFIGS: Record<string, TableConfiguration> = {
  // 员工相关表
  'employees': {
    displayName: '员工管理',
    description: '员工基本信息管理',
    defaultSort: { field: 'employee_name', direction: 'asc' },
    searchFields: ['employee_name', 'id_number', 'phone', 'email'],
    defaultHiddenColumns: ['id', 'created_at', 'updated_at'],
    columnTypes: {
      'hire_date': 'date',
      'birth_date': 'date',
      'is_active': 'boolean',
      'phone': 'phone',
      'email': 'email',
    },
    columnOverrides: {
      'employee_name': { width: 120, label: '姓名' },
      'id_number': { width: 160, label: '身份证号' },
      'phone': { width: 130, label: '电话' },
      'email': { width: 180, label: '邮箱' },
    },
    permissions: {
      create: true,
      update: true,
      delete: true,
      export: true,
    },
  },

  'view_employees_with_details': {
    displayName: '员工详情列表',
    description: '包含部门、职位等详细信息的员工列表',
    defaultSort: { field: 'employee_name', direction: 'asc' },
    searchFields: ['employee_name', 'department_name', 'position_name'],
    defaultHiddenColumns: ['id', 'employee_id', 'department_id', 'position_id', 'created_at', 'updated_at'],
    columnTypes: {
      'hire_date': 'date',
      'birth_date': 'date',
      'is_active': 'boolean',
      'phone': 'phone',
      'email': 'email',
    },
    columnOverrides: {
      'employee_name': { width: 120, label: '员工姓名' },
      'department_name': { width: 120, label: '部门' },
      'position_name': { width: 120, label: '职位' },
    },
  },

  // 部门相关表
  'departments': {
    displayName: '部门管理',
    description: '组织架构部门管理',
    defaultSort: { field: 'department_name', direction: 'asc' },
    searchFields: ['department_name', 'department_code', 'description'],
    defaultHiddenColumns: ['id', 'created_at', 'updated_at'],
    columnTypes: {
      'is_active': 'boolean',
    },
    columnOverrides: {
      'department_name': { width: 150, label: '部门名称' },
      'department_code': { width: 100, label: '部门编码' },
      'parent_department_name': { width: 120, label: '上级部门' },
    },
    permissions: {
      create: true,
      update: true,
      delete: true,
      export: true,
    },
  },

  // 职位相关表
  'positions': {
    displayName: '职位管理',
    description: '岗位职位信息管理',
    defaultSort: { field: 'position_name', direction: 'asc' },
    searchFields: ['position_name', 'position_code', 'description'],
    defaultHiddenColumns: ['id', 'created_at', 'updated_at'],
    columnTypes: {
      'is_active': 'boolean',
      'position_level': 'number',
    },
    columnOverrides: {
      'position_name': { width: 150, label: '职位名称' },
      'position_code': { width: 100, label: '职位编码' },
      'position_level': { width: 80, label: '职位级别' },
    },
    permissions: {
      create: true,
      update: true,
      delete: true,
      export: true,
    },
  },

  // 人员类别表
  'personnel_categories': {
    displayName: '人员类别',
    description: '员工人员类别管理',
    defaultSort: { field: 'category_name', direction: 'asc' },
    searchFields: ['category_name', 'description'],
    defaultHiddenColumns: ['id', 'created_at', 'updated_at'],
    columnTypes: {
      'is_active': 'boolean',
    },
    columnOverrides: {
      'category_name': { width: 120, label: '类别名称' },
    },
    permissions: {
      create: true,
      update: true,
      delete: true,
      export: true,
    },
  },

  // 薪资相关表
  'payroll': {
    displayName: '薪资记录',
    description: '员工薪资发放记录',
    defaultSort: { field: 'pay_date', direction: 'desc' },
    searchFields: ['employee_name'],
    defaultHiddenColumns: ['id', 'employee_id', 'created_at', 'updated_at'],
    columnTypes: {
      'gross_pay': 'currency',
      'net_pay': 'currency',
      'total_deductions': 'currency',
      'base_salary': 'currency',
      'pay_date': 'date',
      'pay_period_start': 'date',
      'pay_period_end': 'date',
    },
    columnOverrides: {
      'employee_name': { width: 120, label: '员工姓名' },
      'gross_pay': { width: 120, label: '应发工资' },
      'net_pay': { width: 120, label: '实发工资' },
      'total_deductions': { width: 120, label: '总扣除' },
      'pay_date': { width: 120, label: '发薪日期' },
    },
    permissions: {
      create: true,
      update: true,
      delete: true,
      export: true,
    },
  },

  'view_payroll_summary': {
    displayName: '薪资汇总',
    description: '薪资记录汇总列表',
    defaultSort: { field: 'pay_date', direction: 'desc' },
    searchFields: ['employee_name', 'department_name'],
    defaultHiddenColumns: ['payroll_id', 'employee_id', 'department_id'],
    columnTypes: {
      'gross_pay': 'currency',
      'net_pay': 'currency',
      'total_deductions': 'currency',
      'pay_date': 'date',
      'pay_period_start': 'date',
      'pay_period_end': 'date',
    },
    columnOverrides: {
      'employee_name': { width: 120, label: '员工姓名' },
      'department_name': { width: 120, label: '部门' },
      'gross_pay': { width: 120, label: '应发工资' },
      'net_pay': { width: 120, label: '实发工资' },
    },
  },

  'view_payroll_unified': {
    displayName: '薪资详情',
    description: '包含薪资明细项的完整薪资信息',
    defaultSort: { field: 'pay_date', direction: 'desc' },
    searchFields: ['employee_name', 'component_name'],
    defaultHiddenColumns: ['payroll_id', 'employee_id', 'component_id'],
    columnTypes: {
      'amount': 'currency',
      'pay_date': 'date',
    },
    columnOverrides: {
      'employee_name': { width: 120, label: '员工姓名' },
      'component_name': { width: 120, label: '薪资项目' },
      'amount': { width: 120, label: '金额' },
    },
  },
};

/**
 * 获取表格配置
 * @param tableName 表名
 * @returns 表格配置
 */
export function getTableConfig(tableName: string): TableConfiguration | null {
  return TABLE_CONFIGS[tableName] || null;
}

/**
 * 获取所有支持的表名
 * @returns 支持的表名列表
 */
export function getSupportedTables(): string[] {
  return Object.keys(TABLE_CONFIGS);
}

/**
 * 检查表是否受支持
 * @param tableName 表名
 * @returns 是否受支持
 */
export function isTableSupported(tableName: string): boolean {
  return tableName in TABLE_CONFIGS;
}

/**
 * 获取表的默认权限
 * @param tableName 表名
 * @returns 权限配置
 */
export function getTablePermissions(tableName: string) {
  const config = getTableConfig(tableName);
  return config?.permissions || {
    create: false,
    update: false,
    delete: false,
    export: false,
  };
}