/**
 * 数据验证辅助函数
 * 从PayrollImportPage组件提取的验证相关逻辑
 */

import type { ExcelDataRow, ImportConfig } from '@/types/payroll-import';
import type { ValidationResult } from '../types/enhanced-types';

/**
 * 检查数据行是否为空
 * @param row Excel数据行
 * @returns 是否为空行
 */
export const isEmptyRow = (row: ExcelDataRow): boolean => {
  const values = Object.values(row).filter(value => 
    value !== null && 
    value !== undefined && 
    value !== '' && 
    !['rowNumber', '_sheetName', '_dataType'].includes(String(value))
  );
  return values.length === 0;
};

/**
 * 提取员工标识信息
 * @param row Excel数据行
 * @param headers 表头信息
 * @returns 员工姓名或null
 */
export const extractEmployeeIdentifier = (row: ExcelDataRow, headers: string[]): string | null => {
  // 员工姓名字段的可能名称
  const nameFields = ['员工姓名', '姓名', 'employee_name', '员工', 'name'];
  
  for (const header of headers) {
    if (nameFields.some(field => 
      header === field || 
      header.includes('员工') || 
      header.includes('姓名') || 
      header.includes('name')
    )) {
      const value = row[header];
      if (value && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  
  return null;
};

/**
 * 验证必填字段
 * @param row Excel数据行
 * @param requiredFields 必填字段数组
 * @returns 验证结果
 */
export const validateRequiredFields = (
  row: ExcelDataRow, 
  requiredFields: string[]
): {
  isValid: boolean;
  missingFields: string[];
} => {
  const missingFields = requiredFields.filter(field => {
    const value = row[field];
    return !value || String(value).trim() === '';
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * 验证数值字段
 * @param value 字段值
 * @returns 是否为有效数值
 */
export const isValidNumber = (value: any): boolean => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
};

/**
 * 验证日期字段
 * @param value 字段值
 * @returns 是否为有效日期
 */
export const isValidDate = (value: any): boolean => {
  if (!value) return false;
  
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * 数据类型验证器映射
 */
export const DATA_VALIDATORS = {
  string: (value: any) => value != null && String(value).trim() !== '',
  number: isValidNumber,
  date: isValidDate,
  boolean: (value: any) => typeof value === 'boolean' || ['true', 'false', '1', '0'].includes(String(value).toLowerCase())
} as const;

/**
 * 根据数据类型验证字段值
 * @param value 字段值
 * @param dataType 数据类型
 * @returns 是否有效
 */
export const validateFieldByType = (value: any, dataType: keyof typeof DATA_VALIDATORS): boolean => {
  const validator = DATA_VALIDATORS[dataType];
  return validator ? validator(value) : true;
};

/**
 * 批量验证数据行
 * @param rows Excel数据行数组
 * @param fieldRules 字段规则配置
 * @returns 验证结果汇总
 */
export const validateDataRows = (
  rows: ExcelDataRow[],
  fieldRules: {
    field: string;
    required?: boolean;
    dataType?: keyof typeof DATA_VALIDATORS;
  }[]
): {
  validRows: ExcelDataRow[];
  invalidRows: Array<{
    row: ExcelDataRow;
    errors: string[];
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
} => {
  const validRows: ExcelDataRow[] = [];
  const invalidRows: Array<{ row: ExcelDataRow; errors: string[] }> = [];
  
  rows.forEach(row => {
    const errors: string[] = [];
    
    fieldRules.forEach(rule => {
      const { field, required, dataType } = rule;
      const value = row[field];
      
      // 检查必填字段
      if (required && (!value || String(value).trim() === '')) {
        errors.push(`字段 ${field} 为必填项`);
        return;
      }
      
      // 如果字段有值，检查数据类型
      if (value && dataType && !validateFieldByType(value, dataType)) {
        errors.push(`字段 ${field} 的数据类型不正确，期望 ${dataType}`);
      }
    });
    
    if (errors.length === 0) {
      validRows.push(row);
    } else {
      invalidRows.push({ row, errors });
    }
  });
  
  return {
    validRows,
    invalidRows,
    summary: {
      total: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length
    }
  };
};

/**
 * 检查重复数据
 * @param rows Excel数据行数组
 * @param keyFields 用于判断重复的关键字段
 * @returns 重复检查结果
 */
export const checkDuplicateRows = (
  rows: ExcelDataRow[],
  keyFields: string[]
): {
  uniqueRows: ExcelDataRow[];
  duplicateGroups: Array<{
    key: string;
    rows: ExcelDataRow[];
  }>;
} => {
  const rowMap = new Map<string, ExcelDataRow[]>();
  
  rows.forEach(row => {
    // 生成唯一键
    const key = keyFields
      .map(field => String(row[field] || '').trim())
      .join('|');
    
    if (!rowMap.has(key)) {
      rowMap.set(key, []);
    }
    rowMap.get(key)!.push(row);
  });
  
  const uniqueRows: ExcelDataRow[] = [];
  const duplicateGroups: Array<{ key: string; rows: ExcelDataRow[] }> = [];
  
  rowMap.forEach((rowGroup, key) => {
    if (rowGroup.length === 1) {
      uniqueRows.push(rowGroup[0]);
    } else {
      duplicateGroups.push({ key, rows: rowGroup });
      // 保留第一行作为唯一行
      uniqueRows.push(rowGroup[0]);
    }
  });
  
  return { uniqueRows, duplicateGroups };
};

/**
 * 验证导入配置
 * @param config 导入配置
 * @returns 验证结果
 */
export const validateImportConfig = (config: ImportConfig): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 验证数据组选择
  if (!config.dataGroup || config.dataGroup.length === 0) {
    errors.push('请至少选择一种数据类型');
  }

  // 验证薪资周期
  if (!config.payPeriod || !config.payPeriod.start || !config.payPeriod.end) {
    errors.push('请配置有效的薪资周期');
  } else if (config.payPeriod.start >= config.payPeriod.end) {
    errors.push('薪资周期开始时间必须早于结束时间');
  }

  // 验证批处理大小
  if (config.options && config.options.batchSize) {
    if (config.options.batchSize < 1 || config.options.batchSize > 1000) {
      warnings.push('建议批处理大小设置在1-1000之间');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: Date.now()
  };
};

/**
 * 验证文件内容
 * @param file 文件对象
 * @returns 验证结果
 */
export const validateFileContent = (file: File): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基础文件检查
  if (!file) {
    errors.push('请选择要上传的文件');
    return {
      isValid: false,
      errors,
      warnings,
      timestamp: Date.now()
    };
  }

  // 文件类型检查
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('只支持Excel文件格式(.xlsx, .xls)');
  }

  // 文件大小检查
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    errors.push('文件大小不能超过50MB');
  }

  // 文件名检查
  if (file.name.includes('#') || file.name.includes('&')) {
    warnings.push('文件名包含特殊字符，可能影响处理');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: Date.now()
  };
};