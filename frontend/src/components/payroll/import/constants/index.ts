/**
 * 薪资导入模块常量定义
 * 集中管理所有模块相关的常量
 */

import { ImportDataGroup } from '@/types/payroll-import';

// 文件处理常量
export const FILE_CONSTANTS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ],
  ALLOWED_EXTENSIONS: ['.xlsx', '.xls']
} as const;

// 导入进度常量
export const PROGRESS_CONSTANTS = {
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  MIN_BATCH_SIZE: 10,
  UPDATE_INTERVAL: 100, // ms
  DEBOUNCE_DELAY: 300 // ms
} as const;

// 导入阶段常量
export const PHASE_CONSTANTS = {
  DESCRIPTIONS: {
    'idle': '准备中',
    'parsing': '解析文件',
    'validating': '验证数据',
    'importing': '导入数据',
    'creating_payrolls': '创建薪资记录',
    'inserting_items': '插入薪资项目',
    'completed': '完成',
    'error': '错误'
  },
  COLORS: {
    'idle': 'text-base-content',
    'parsing': 'text-info',
    'validating': 'text-warning',
    'importing': 'text-primary',
    'creating_payrolls': 'text-primary',
    'inserting_items': 'text-primary',
    'completed': 'text-success',
    'error': 'text-error'
  }
} as const;

// 数据组配置
export const DATA_GROUP_CONSTANTS = {
  LABELS: {
    [ImportDataGroup.EARNINGS]: '薪资项目',
    [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
    [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别',
    [ImportDataGroup.JOB_ASSIGNMENT]: '职务信息',
    [ImportDataGroup.ALL]: '全部数据'
  },
  SHEET_NAMES: {
    [ImportDataGroup.EARNINGS]: '薪资项目明细',
    [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
    [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别',
    [ImportDataGroup.JOB_ASSIGNMENT]: '职务分配',
    [ImportDataGroup.ALL]: ''
  },
  COLORS: {
    [ImportDataGroup.EARNINGS]: 'badge-primary',
    [ImportDataGroup.CONTRIBUTION_BASES]: 'badge-secondary',
    [ImportDataGroup.CATEGORY_ASSIGNMENT]: 'badge-accent',
    [ImportDataGroup.JOB_ASSIGNMENT]: 'badge-info',
    [ImportDataGroup.ALL]: 'badge-neutral'
  },
  ICONS: {
    [ImportDataGroup.EARNINGS]: '💰',
    [ImportDataGroup.CONTRIBUTION_BASES]: '📊',
    [ImportDataGroup.CATEGORY_ASSIGNMENT]: '👥',
    [ImportDataGroup.JOB_ASSIGNMENT]: '💼',
    [ImportDataGroup.ALL]: '📋'
  }
} as const;

// 验证规则常量
export const VALIDATION_CONSTANTS = {
  REQUIRED_FIELDS: {
    [ImportDataGroup.EARNINGS]: ['员工姓名', '员工编号'],
    [ImportDataGroup.CONTRIBUTION_BASES]: ['员工姓名', '基本工资'],
    [ImportDataGroup.CATEGORY_ASSIGNMENT]: ['员工姓名', '人员类别'],
    [ImportDataGroup.JOB_ASSIGNMENT]: ['员工姓名', '部门', '职位'],
    [ImportDataGroup.ALL]: ['员工姓名']
  },
  EMPLOYEE_IDENTIFIER_FIELDS: [
    '员工姓名', '姓名', 'employee_name', '员工', 'name',
    '员工编号', '工号', 'employee_code', 'emp_code'
  ],
  MAX_ERRORS_PER_ROW: 10,
  MAX_TOTAL_ERRORS: 100
} as const;

// UI状态常量
export const UI_CONSTANTS = {
  MODAL_Z_INDEX: 1000,
  PROGRESS_BAR_HEIGHT: '6px',
  CARD_BORDER_RADIUS: '0.75rem',
  ANIMATION_DURATION: 300, // ms
  TOAST_DURATION: 5000 // ms
} as const;

// 错误消息常量
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: '文件大小不能超过50MB',
  INVALID_FILE_TYPE: '只支持Excel文件格式(.xlsx, .xls)',
  NO_FILE_SELECTED: '请选择要上传的文件',
  NO_DATA_GROUPS: '请选择要导入的数据类型',
  NO_PARSED_DATA: '没有可导入的数据',
  INVALID_PERIOD_STATUS: '当前周期状态不允许导入数据',
  NETWORK_ERROR: '网络错误，请检查网络连接',
  PERMISSION_DENIED: '没有权限执行此操作',
  UNKNOWN_ERROR: '发生未知错误，请重试'
} as const;

// 成功消息常量
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: '文件上传成功',
  DATA_PARSED: '数据解析完成',
  IMPORT_COMPLETED: '数据导入完成',
  TEMPLATE_DOWNLOADED: '模板下载完成',
  EXPORT_COMPLETED: '数据导出完成'
} as const;

// 步骤配置常量
export const STEP_CONSTANTS = {
  IMPORT_STEPS: [
    { key: 'config', label: '基础配置', icon: '⚙️' },
    { key: 'upload', label: '上传文件', icon: '📁' },
    { key: 'execute', label: '执行导入', icon: '🚀' }
  ],
  EXPORT_STEPS: [
    { key: 'config', label: '导出配置', icon: '⚙️' },
    { key: 'generate', label: '生成文件', icon: '📄' },
    { key: 'download', label: '下载文件', icon: '⬇️' }
  ]
} as const;

// 性能监控常量
export const PERFORMANCE_CONSTANTS = {
  SLOW_OPERATION_THRESHOLD: 5000, // ms
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
  MAX_CONCURRENT_OPERATIONS: 3,
  RETRY_DELAYS: [1000, 2000, 5000] // ms
} as const;

// 默认配置
export const DEFAULT_CONFIG = {
  IMPORT: {
    batchSize: PROGRESS_CONSTANTS.DEFAULT_BATCH_SIZE,
    validateBeforeImport: true,
    skipInvalidRows: false,
    createMissingEmployees: false,
    overwriteExisting: true
  },
  EXPORT: {
    includeHeaders: true,
    includeEmptyRows: false,
    dateFormat: 'YYYY-MM-DD',
    numberPrecision: 2
  },
  UI: {
    autoCloseToasts: true,
    showProgressDetails: true,
    enableAnimations: true,
    compactMode: false
  }
} as const;

// 查询键常量
export const QUERY_KEYS = {
  IMPORT_TEMPLATES: ['payroll', 'import', 'templates'],
  AVAILABLE_MONTHS: ['payroll', 'months'],
  IMPORT_PROGRESS: ['payroll', 'import', 'progress'],
  PAYROLL_PERIODS: ['payroll', 'periods']
} as const;

// CSS类名常量
export const CSS_CLASSES = {
  CARD_GRADIENT: 'bg-gradient-to-br from-base-100 to-base-200',
  CARD_ELEVATED: 'shadow-lg hover:shadow-xl transition-shadow duration-300',
  CARD_BORDERED: 'border border-base-300',
  BUTTON_PRIMARY: 'btn btn-primary',
  BUTTON_SECONDARY: 'btn btn-secondary',
  BUTTON_GHOST: 'btn btn-ghost',
  PROGRESS_PRIMARY: 'progress progress-primary',
  PROGRESS_SUCCESS: 'progress progress-success',
  PROGRESS_ERROR: 'progress progress-error'
} as const;