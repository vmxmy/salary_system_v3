import * as XLSX from 'xlsx';
import { ImportDataGroup } from '@/types/payroll-import';
import templateSchema from '@/config/import-template-schema.json';

/**
 * Excel文件验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: 'MISSING_SHEET' | 'INVALID_FIELDS' | 'EMPLOYEE_MISMATCH' | 'DATA_TYPE_ERROR';
  sheetName?: string;
  field?: string;
  message: string;
  severity: 'critical' | 'error';
}

export interface ValidationWarning {
  type: 'MISSING_OPTIONAL_FIELD' | 'UNKNOWN_FIELD' | 'EMPTY_SHEET';
  sheetName?: string;
  field?: string;
  message: string;
  severity: 'warning' | 'info';
}

export interface ValidationSummary {
  totalSheets: number;
  validSheets: number;
  recognizedGroups: ImportDataGroup[];
  employeeCount: number;
  employeeConsistency: {
    isConsistent: boolean;
    differences?: string[];
  };
}

/**
 * Sheet数据摘要
 */
export interface SheetSummary {
  name: string;
  dataGroup: ImportDataGroup | null;
  rowCount: number;
  columnCount: number;
  fields: string[];
  employees: Set<string>;
}

/**
 * Excel验证服务
 */
export class ExcelValidationService {
  private templateSchema = templateSchema;

  /**
   * Step 2: 验证Excel文件结构和数据一致性
   */
  async validateExcelFile(workbook: XLSX.WorkBook): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sheetSummaries: SheetSummary[] = [];
    const recognizedGroups: ImportDataGroup[] = [];

    // 1. 分析每个Sheet
    for (const sheetName of workbook.SheetNames) {
      if (sheetName === '使用说明') continue;

      const summary = this.analyzeSheet(workbook.Sheets[sheetName], sheetName);
      sheetSummaries.push(summary);

      // 2. 验证Sheet名称映射
      const schemaEntry = this.templateSchema.sheetMappings[sheetName];
      if (!schemaEntry) {
        warnings.push({
          type: 'UNKNOWN_FIELD',
          sheetName,
          message: `无法识别的工作表"${sheetName}"，将被忽略`,
          severity: 'warning'
        });
        continue;
      }

      summary.dataGroup = schemaEntry.dataGroup as ImportDataGroup;
      recognizedGroups.push(summary.dataGroup);

      // 3. 验证字段完整性
      const fieldValidation = this.validateSheetFields(summary, schemaEntry);
      errors.push(...fieldValidation.errors);
      warnings.push(...fieldValidation.warnings);
    }

    // 4. 验证员工一致性
    const employeeConsistency = this.validateEmployeeConsistency(sheetSummaries);
    if (!employeeConsistency.isConsistent) {
      errors.push({
        type: 'EMPLOYEE_MISMATCH',
        message: `各Sheet中的员工不一致: ${employeeConsistency.differences.join(', ')}`,
        severity: 'error'
      });
    }

    // 5. 汇总验证结果
    const summary: ValidationSummary = {
      totalSheets: sheetSummaries.length,
      validSheets: sheetSummaries.filter(s => s.dataGroup !== null).length,
      recognizedGroups,
      employeeCount: this.getUniqueEmployeeCount(sheetSummaries),
      employeeConsistency
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary
    };
  }

  /**
   * 分析单个Sheet
   */
  private analyzeSheet(worksheet: XLSX.WorkSheet, sheetName: string): SheetSummary {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = (jsonData[0] as string[]) || [];
    const employees = new Set<string>();

    // 收集员工标识
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;

      // 查找身份证号列（主要标识）
      const idIndex = headers.indexOf('身份证号');
      const nameIndex = headers.indexOf('员工姓名');
      const codeIndex = headers.indexOf('员工编号');

      if (idIndex >= 0 && row[idIndex]) {
        employees.add(row[idIndex]);
      } else if (nameIndex >= 0 && row[nameIndex]) {
        employees.add(row[nameIndex]);
      } else if (codeIndex >= 0 && row[codeIndex]) {
        employees.add(row[codeIndex]);
      }
    }

    return {
      name: sheetName,
      dataGroup: null,
      rowCount: jsonData.length - 1, // 减去标题行
      columnCount: headers.length,
      fields: headers,
      employees
    };
  }

  /**
   * 验证Sheet字段
   */
  private validateSheetFields(
    summary: SheetSummary,
    schemaEntry: any
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 检查必填字段
    const requiredFields = schemaEntry.fields.required || [];
    const missingRequired = requiredFields.filter(
      field => !summary.fields.includes(field)
    );

    if (missingRequired.length > 0) {
      errors.push({
        type: 'INVALID_FIELDS',
        sheetName: summary.name,
        message: `缺少必填字段: ${missingRequired.join(', ')}`,
        severity: 'error'
      });
    }

    // 检查可选字段
    const optionalFields = schemaEntry.fields.optional || [];
    const missingOptional = optionalFields.filter(
      field => !summary.fields.includes(field)
    );

    if (missingOptional.length > 0) {
      warnings.push({
        type: 'MISSING_OPTIONAL_FIELD',
        sheetName: summary.name,
        message: `缺少可选字段: ${missingOptional.join(', ')}`,
        severity: 'info'
      });
    }

    // 检查未知字段
    const allExpectedFields = [...requiredFields, ...optionalFields];
    const unknownFields = summary.fields.filter(
      field => !allExpectedFields.includes(field) && field !== '员工编号' && field !== '员工姓名' && field !== '身份证号'
    );

    if (unknownFields.length > 0) {
      warnings.push({
        type: 'UNKNOWN_FIELD',
        sheetName: summary.name,
        message: `包含未知字段: ${unknownFields.join(', ')}`,
        severity: 'warning'
      });
    }

    // 检查是否为空表
    if (summary.rowCount === 0) {
      warnings.push({
        type: 'EMPTY_SHEET',
        sheetName: summary.name,
        message: `工作表"${summary.name}"没有数据`,
        severity: 'warning'
      });
    }

    return { errors, warnings };
  }

  /**
   * 验证员工一致性
   */
  private validateEmployeeConsistency(
    summaries: SheetSummary[]
  ): { isConsistent: boolean; differences: string[] } {
    if (summaries.length <= 1) {
      return { isConsistent: true, differences: [] };
    }

    // 获取所有Sheet的员工集合
    const employeeSets = summaries.map(s => s.employees);
    
    // 找出所有员工的并集
    const allEmployees = new Set<string>();
    employeeSets.forEach(set => {
      set.forEach(emp => allEmployees.add(emp));
    });

    // 检查每个Sheet是否包含所有员工
    const differences: string[] = [];
    summaries.forEach(summary => {
      const missing = Array.from(allEmployees).filter(
        emp => !summary.employees.has(emp)
      );
      
      if (missing.length > 0) {
        differences.push(
          `${summary.name}缺少${missing.length}名员工`
        );
      }
    });

    return {
      isConsistent: differences.length === 0,
      differences
    };
  }

  /**
   * 获取唯一员工数量
   */
  private getUniqueEmployeeCount(summaries: SheetSummary[]): number {
    const allEmployees = new Set<string>();
    summaries.forEach(summary => {
      summary.employees.forEach(emp => allEmployees.add(emp));
    });
    return allEmployees.size;
  }

  /**
   * 识别Sheet对应的数据组
   */
  static identifyDataGroup(sheetName: string): ImportDataGroup | null {
    const schemaEntry = templateSchema.sheetMappings[sheetName];
    return schemaEntry ? (schemaEntry.dataGroup as ImportDataGroup) : null;
  }

  /**
   * 获取数据组对应的Sheet名称
   */
  static getSheetNameForGroup(group: ImportDataGroup): string {
    for (const [sheetName, config] of Object.entries(templateSchema.sheetMappings)) {
      if (config.dataGroup === group) {
        return sheetName;
      }
    }
    return group;
  }
}