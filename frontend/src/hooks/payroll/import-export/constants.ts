import type { ValidationRule } from './types';

// 查询键管理
export const importExportQueryKeys = {
  all: ['payroll-import-export'] as const,
  templates: () => [...importExportQueryKeys.all, 'templates'] as const,
  template: (id: string) => [...importExportQueryKeys.all, 'template', id] as const,
  exportData: (params: any) => [...importExportQueryKeys.all, 'export', params] as const,
};

// 基础验证规则（兜底方案）
export const getBasicValidationRules = (): Record<string, ValidationRule[]> => {
  return {
    'employee_name': [
      { type: 'required', message: '员工姓名不能为空' }
    ],
    'amount': [
      { type: 'number', message: '金额必须是数字' },
      { type: 'range', message: '金额必须大于等于0', params: { min: 0 } }
    ],
    'base_amount': [
      { type: 'number', message: '基数必须是数字' },
      { type: 'range', message: '基数必须大于等于0', params: { min: 0 } }
    ],
    'category_name': [
      { type: 'required', message: '人员类别不能为空' }
    ],
    'department_name': [
      { type: 'required', message: '部门名称不能为空' }
    ],
    'position_name': [
      { type: 'required', message: '职位名称不能为空' }
    ]
  };
};

// Excel解析相关常量
export const EXCEL_PARSING_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SHEET_NAMES: {
    PAYROLL_ITEMS: ['薪资项目', '薪资明细', 'Payroll Items', 'Payroll'],
    CATEGORY_ASSIGNMENTS: ['人员类别', '类别分配', 'Category Assignments', 'Categories'],
    JOB_ASSIGNMENTS: ['岗位分配', '职务分配', 'Job Assignments', 'Jobs'],
    CONTRIBUTION_BASES: ['缴费基数', '社保基数', 'Contribution Bases', 'Bases'],
    DEDUCTIONS: ['扣除项', '扣款项', 'Deductions']
  },
  HEADERS_ROW: 1,
  DATA_START_ROW: 2
} as const;

// 字段映射常量
export const FIELD_MAPPINGS = {
  // 基础字段映射
  BASIC_FIELDS: new Map([
    ['员工姓名', 'employee_name'],
    ['employee_name', 'employee_name'],
    ['姓名', 'employee_name'],
    ['name', 'employee_name']
  ]),
  
  // 分配字段映射
  ASSIGNMENT_FIELDS: new Map([
    ['人员类别', 'category_name'],
    ['category_name', 'category_name'],
    ['类别', 'category_name'],
    ['部门', 'department_name'],
    ['department_name', 'department_name'],
    ['职位', 'position_name'],
    ['position_name', 'position_name'],
    ['岗位', 'position_name']
  ]),
  
  // 缴费基数字段映射
  CONTRIBUTION_BASE_FIELDS: new Map([
    ['养老基数', 'pension_base'],
    ['养老保险基数', 'pension_base'],
    ['医疗基数', 'medical_base'],
    ['医疗保险基数', 'medical_base'],
    ['失业基数', 'unemployment_base'],
    ['失业保险基数', 'unemployment_base'],
    ['工伤基数', 'injury_base'],
    ['工伤保险基数', 'injury_base'],
    ['生育基数', 'maternity_base'],
    ['生育保险基数', 'maternity_base'],
    ['公积金基数', 'housing_fund_base'],
    ['住房公积金基数', 'housing_fund_base']
  ])
} as const;

// 导入配置常量
export const IMPORT_CONFIG = {
  BATCH_SIZE: 100,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  PROGRESS_UPDATE_INTERVAL: 100
} as const;

// 字段匹配配置 - 精确匹配模式
export const FIELD_MATCHING_CONFIG = {
  EXACT_MATCH_ONLY: true, // 只使用精确匹配
  MAX_SUGGESTIONS: 5      // 最大建议字段数量
} as const;