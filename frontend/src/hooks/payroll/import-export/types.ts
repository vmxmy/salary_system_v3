import type { Database } from '@/types/supabase';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportConfig as PayrollImportConfig } from '@/types/payroll-import';

// 临时定义类型来避免导入错误
export type SalaryComponentCategory = 
  | 'basic_salary'
  | 'benefits'
  | 'personal_insurance'
  | 'employer_insurance'
  | 'personal_tax'
  | 'other_deductions';

// 类型定义 - TODO: import_templates table not yet created
// type ImportTemplate = Database['public']['Tables']['import_templates']['Row'];
export interface ImportTemplate {
  id: string;
  name: string;
  description?: string;
  template_data: any;
  created_at: string;
}

// Excel数据行类型
export interface ExcelDataRow {
  [key: string]: any;
}

// 使用从 payroll-import 导入的 ImportConfig，同时扩展一些额外字段
export interface ImportConfig extends PayrollImportConfig {
  fieldMappings?: Record<string, string>;
}

// 导入结果
export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
  processedData?: any[];
}

// 导出配置
export interface ExportConfig {
  template: string;
  filters?: {
    periodId?: string;
    departmentId?: string;
    status?: string;
  };
  includeDetails?: boolean;
  includeInsurance?: boolean;
  format?: 'xlsx' | 'csv';
}

// 列名匹配结果接口
export interface ColumnMatchResult {
  excelColumn: string;
  dbField: string | null;
  matchType: 'exact' | 'fuzzy' | 'unmapped';
  suggestions?: string[];
  isRequired?: boolean;
}

// 字段匹配分析结果
export interface FieldMappingAnalysis {
  sheetName: string;
  dataGroup: ImportDataGroup | undefined;
  totalColumns: number;
  mappedColumns: number;
  unmappedColumns: number;
  requiredFieldsMatched: number;
  requiredFieldsTotal: number;
  matchResults: ColumnMatchResult[];
  warnings: string[];
  recommendations: string[];
}

// 向后兼容的基础导入进度接口
export interface ImportProgress {
  phase: 'parsing' | 'validating' | 'importing' | 'creating_payrolls' | 'inserting_items' | 'completed' | 'error';
  
  // 全局进度
  global: {
    totalGroups: number;           // 需要处理的数据组总数
    processedGroups: number;       // 已完成的数据组数
    totalRecords: number;          // 需要处理的总记录数
    processedRecords: number;      // 已处理的记录数
    dataGroups: string[];          // 需要处理的数据组列表
  };
  
  // 当前数据组进度
  current: {
    groupName: string;             // 当前处理的数据组名称
    groupIndex: number;            // 当前数据组索引（从0开始）
    sheetName: string;             // 当前处理的工作表名称
    totalRecords: number;          // 当前工作表的总记录数
    processedRecords: number;      // 当前工作表已处理的记录数
    currentRecord?: number;        // 当前处理的记录行号
    successCount?: number;         // 成功记录数
    errorCount?: number;           // 错误记录数
    fieldMappingAnalysis?: FieldMappingAnalysis;  // 字段映射分析结果
  };
  
  // 进度消息
  message?: string;                // 当前进度的文字描述
  
  errors: any[];
  warnings: any[];
}

// 验证规则接口
export interface ValidationRule {
  type: 'required' | 'number' | 'email' | 'phone' | 'range' | 'regex' | 'enum';
  message: string;
  params?: any;
}

// 薪资组件类型 - 匹配实际数据库结构
export interface SalaryComponent {
  id: string;
  name: string;
  category: SalaryComponentCategory | null;
  type: 'earning' | 'deduction';
  is_taxable: boolean;
  base_dependency: boolean | null;
  description: string | null;
  stability_level: string | null;
  copy_strategy: string | null;
  copy_notes: string | null;
  created_at: string;
  // 兼容字段（用于业务逻辑）
  is_required?: boolean;
}