/**
 * 增强的薪资导入类型定义
 * 基于原有types/payroll-import.ts，增加了更严格的类型约束和新的接口
 */

import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type { ImportConfig as BaseImportConfig, ExcelDataRow, ImportResult, ImportError, ImportWarning } from '@/types/payroll-import';

// 重新导出原有类型
export { ImportDataGroup, ImportMode } from '@/types/payroll-import';
export type { ExcelDataRow, ImportResult, ImportError, ImportWarning } from '@/types/payroll-import';

// 增强的进度跟踪类型
export interface DetailedImportProgress {
  // 全局进度
  global: {
    totalRecords: number;
    processedRecords: number;
  };
  
  // 当前数据组进度
  current: {
    groupName: string;
    totalRecords: number;
    processedRecords: number;
  };
  
  // 状态信息
  phase: ImportPhase;
  startTime: number | null;
  estimatedEndTime: number | null;
  currentOperation: string;
  isActive: boolean;
}

// 导入阶段类型
export type ImportPhase = 
  | 'idle'
  | 'parsing' 
  | 'validating'
  | 'importing'
  | 'creating_payrolls'
  | 'inserting_items'
  | 'completed'
  | 'error';

// 工作表信息类型
export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  isEmpty: boolean;
  hasData: boolean;
  dataType?: ImportDataGroup;
}

// 解析结果类型
export interface ParseResult {
  sheets: SheetInfo[];
  expectedSheets: string[];
  missingSheets: string[];
  unexpectedSheets: string[];
  totalRows: number;
  validRows: number;
  emptyRows: number;
  totalEmployees: number;
  duplicateEmployees: string[];
  dataConsistency: DataConsistencyResult;
  warnings: string[];
  hasErrors: boolean;
  errors: string[];
}

// 数据一致性检查结果
export interface DataConsistencyResult {
  allSheetsHaveSameRowCount: boolean;
  rowCountVariance: number[];
  employeeListConsistent: boolean;
  missingInSheets: Array<{
    employee: string;
    sheets: string[];
  }>;
}

// 增强的导入配置
export interface EnhancedImportConfig extends BaseImportConfig {
  // 验证选项
  validation: {
    enableStrictMode: boolean;
    requiredFields: string[];
    customRules: ValidationRule[];
  };
  
  // 性能选项
  performance: {
    batchSize: number;
    maxConcurrency: number;
    enableProgressTracking: boolean;
  };
  
  // 错误处理选项
  errorHandling: {
    stopOnFirstError: boolean;
    maxErrorCount: number;
    autoRetryCount: number;
  };
}

// 验证规则类型
export interface ValidationRule {
  field: string;
  type: 'required' | 'dataType' | 'range' | 'custom';
  parameters: Record<string, any>;
  errorMessage: string;
}

// 文件上传状态类型
export type UploadStatus = 
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'completed'
  | 'error';

// 文件上传信息
export interface FileUploadInfo {
  file: File | null;
  status: UploadStatus;
  progress: number;
  error?: string;
  parseResult?: ParseResult;
}

// 导入状态管理
export interface ImportStateManager {
  // 基础状态
  activeTab: 'import' | 'export';
  importing: boolean;
  selectedMonth: string;
  selectedPeriodId: string | null;
  selectedDataGroups: ImportDataGroup[];
  
  // 文件状态
  uploadInfo: FileUploadInfo;
  parsedData: any[];
  
  // 配置状态
  importConfig: EnhancedImportConfig;
  
  // 结果状态
  importResult: ImportResult | null;
  failedRows: any[];
  retryMode: boolean;
  
  // UI状态
  showPreviewModal: boolean;
}

// 操作方法类型
export interface ImportActions {
  // 配置操作
  setActiveTab: (tab: 'import' | 'export') => void;
  handleMonthChange: (month: string) => void;
  handleGroupToggle: (group: ImportDataGroup) => void;
  handleSelectAllDataGroups: () => void;
  
  // 文件操作
  handleFileUpload: (file: File) => Promise<void>;
  handleClearUpload: () => void;
  
  // 导入操作
  handleShowPreview: () => void;
  handleImport: () => Promise<void>;
  handleRetryFailed: () => void;
  
  // 状态重置
  resetImportState: () => void;
}

// Hook返回值类型
export interface UseImportStateReturn {
  state: ImportStateManager;
  actions: ImportActions;
  computed: {
    canImport: boolean;
    canRetry: boolean;
    importProgress: DetailedImportProgress;
    configurationStatus: 'incomplete' | 'ready' | 'invalid';
  };
}

// 组件Props类型定义
export interface ImportConfigPanelProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedDataGroups: ImportDataGroup[];
  onGroupToggle: (group: ImportDataGroup) => void;
  onSelectAllGroups: () => void;
  availableMonths: any[];
  disabled?: boolean;
}

export interface FileUploadZoneProps {
  uploadInfo: FileUploadInfo;
  onFileUpload: (file: File) => void;
  onClearUpload: () => void;
  disabled?: boolean;
}

export interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  parseResult: ParseResult | null;
  parsedData: any[];
  onConfirm: () => void;
}

export interface ImportProgressTrackerProps {
  progress: DetailedImportProgress;
  isVisible: boolean;
}

// 常量类型
export const IMPORT_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  DEFAULT_BATCH_SIZE: 100,
  MAX_RETRY_COUNT: 3
} as const;

// 错误类型
export type ImportErrorType = 
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'PARSING_ERROR'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'BUSINESS_RULE_ERROR'
  | 'UNKNOWN_ERROR';

// 增强的错误信息
export interface EnhancedImportError extends ImportError {
  errorType: ImportErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestedAction?: string;
  context?: Record<string, any>;
}

// 简化的验证结果类型 (用于useImportState)
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: number;
}

// 详细的验证结果类型 
export type DetailedValidationResult<T = any> = {
  isValid: boolean;
  data?: T;
  errors: EnhancedImportError[];
  warnings: ImportWarning[];
};

// 工作表解析结果
export interface SheetParseResult {
  sheetName: string;
  headers: string[];
  data: ExcelDataRow[];
  dataType: ImportDataGroup | null;
  rowCount: number;
  validRowCount: number;
  errors: string[];
  warnings: string[];
}

// 文件解析结果
export interface FileParseResult {
  fileName: string;
  fileSize: number;
  sheets: SheetParseResult[];
  totalRows: number;
  validRows: number;
  employeeCount: number;
  dataTypes: ImportDataGroup[];
  globalErrors: string[];
  globalWarnings: string[];
  processedAt: number;
}

// 数据一致性检查结果
export interface DataConsistencyCheckResult {
  isConsistent: boolean;
  employeeList: string[];
  inconsistentEmployees: Array<{
    employeeName: string;
    sheets: string[];
    issue: string;
  }>;
  duplicateEmployees: Array<{
    employeeName: string;
    occurrences: number;
    sheets: string[];
  }>;
  missingEmployees: Array<{
    employeeName: string;
    presentInSheets: string[];
    missingFromSheets: string[];
  }>;
}

// 文件处理状态
export interface FileProcessingState {
  file: File | null;
  fileName: string;
  fileSize: number;
  parsedData: ExcelDataRow[];
  parseResult: FileParseResult | null;
  isUploading: boolean;
  isParsing: boolean;
  isValidating: boolean;
}

// 导入状态配置
export interface ImportStateConfig {
  selectedMonth: string;
  selectedDataGroups: ImportDataGroup[];
  importMode: ImportMode;
  selectedPeriodId: string | null;
  payPeriod: {
    start: Date;
    end: Date;
  };
  options: {
    validateBeforeImport: boolean;
    skipInvalidRows: boolean;
    batchSize: number;
  };
}

// 异步操作结果类型
export type AsyncOperationResult<T> = Promise<{
  success: boolean;
  data?: T;
  error?: EnhancedImportError;
}>;