// 薪资数据导入类型定义

// 导入数据分组类型
const ImportDataGroup = {
  EARNINGS: 'earnings',              // 收入数据
  CONTRIBUTION_BASES: 'bases',       // 缴费基数
  CATEGORY_ASSIGNMENT: 'category',   // 人员类别
  JOB_ASSIGNMENT: 'job',            // 职务信息
  ALL: 'all'                        // 全部数据
} as const;

export type ImportDataGroup = typeof ImportDataGroup[keyof typeof ImportDataGroup];
export { ImportDataGroup };

// 导入模式
const ImportMode = {
  CREATE: 'create',        // 新建模式（创建新记录）
  UPDATE: 'update',        // 更新模式（更新现有记录）
  UPSERT: 'upsert',       // 更新或创建
  APPEND: 'append'        // 追加模式（仅添加新字段）
} as const;

export type ImportMode = typeof ImportMode[keyof typeof ImportMode];
export { ImportMode };

// 导入配置
export interface ImportConfig {
  dataGroup: ImportDataGroup | ImportDataGroup[];  // 支持单个或多个分组
  mode: ImportMode;
  payPeriod: {
    start: Date;
    end: Date;
  };
  options: {
    validateBeforeImport?: boolean;     // 导入前验证
    skipInvalidRows?: boolean;          // 跳过无效行
    createMissingEmployees?: boolean;   // 创建缺失的员工
    overwriteExisting?: boolean;        // 覆盖现有数据
    batchSize?: number;                 // 批处理大小
  };
}

// Excel数据行定义
export interface ExcelDataRow {
  rowNumber: number;
  employeeCode?: string;      // 员工编号
  employeeName?: string;      // 员工姓名
  idNumber?: string;          // 身份证号
  _sheetName?: string;        // 来源工作表名称（内部字段）
  _dataType?: ImportDataGroup; // 数据类型（内部字段）
  [key: string]: any;         // 动态字段
}

// 收入数据导入格式
export interface EarningsImportData {
  employeeIdentifier: {
    code?: string;
    name?: string;
    idNumber?: string;
  };
  earnings: Record<string, number>;  // component_name -> amount
}

// 缴费基数导入格式
export interface ContributionBasesImportData {
  employeeIdentifier: {
    code?: string;
    name?: string;
    idNumber?: string;
  };
  bases: {
    pension?: number;
    medical?: number;
    unemployment?: number;
    work_injury?: number;
    maternity?: number;
    housing_fund?: number;
    occupational_pension?: number;
    serious_illness?: number;
  };
}

// 人员类别导入格式
export interface CategoryAssignmentImportData {
  employeeIdentifier: {
    code?: string;
    name?: string;
    idNumber?: string;
  };
  categoryCode: string;
  categoryName?: string;
  effectiveDate: Date;
}

// 职务信息导入格式
export interface JobAssignmentImportData {
  employeeIdentifier: {
    code?: string;
    name?: string;
    idNumber?: string;
  };
  departmentCode: string;
  departmentName?: string;
  positionCode: string;
  positionName?: string;
  rankCode?: string;
  rankName?: string;
  effectiveDate: Date;
}

// 统一导入数据格式
export interface UnifiedImportData {
  earnings?: EarningsImportData[];
  contributionBases?: ContributionBasesImportData[];
  categoryAssignments?: CategoryAssignmentImportData[];
  jobAssignments?: JobAssignmentImportData[];
}

// 导入结果
export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  processedData?: {
    group: ImportDataGroup;
    count: number;
  }[];
}

// 导入错误
export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

// 导入警告
export interface ImportWarning {
  row: number;
  field?: string;
  message: string;
  action: 'skipped' | 'defaulted' | 'modified';
}

// 字段映射配置
export interface FieldMapping {
  excelColumn: string;      // Excel列名
  dbField: string;          // 数据库字段名
  dataType: 'string' | 'number' | 'date' | 'boolean';
  required?: boolean;
  defaultValue?: any;
  validator?: (value: any) => boolean;
  transformer?: (value: any) => any;
}

// 分组字段映射
export interface GroupFieldMapping {
  [ImportDataGroup.EARNINGS]: FieldMapping[];
  [ImportDataGroup.CONTRIBUTION_BASES]: FieldMapping[];
  [ImportDataGroup.CATEGORY_ASSIGNMENT]: FieldMapping[];
  [ImportDataGroup.JOB_ASSIGNMENT]: FieldMapping[];
}