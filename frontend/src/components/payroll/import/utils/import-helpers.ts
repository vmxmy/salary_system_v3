/**
 * 薪资导入辅助函数集
 * 包含所有从PayrollImportPage组件提取的纯函数
 * 这些函数无副作用，便于测试和复用
 */

import { ImportDataGroup } from '@/types/payroll-import';

// 导入阶段描述映射
export const PHASE_DESCRIPTIONS: Record<string, string> = {
  'idle': '准备中',
  'parsing': '解析文件',
  'validating': '验证数据',
  'importing': '导入数据',
  'creating_payrolls': '创建薪资记录',
  'inserting_items': '插入薪资项目',
  'completed': '完成',
  'error': '错误'
} as const;

/**
 * 获取导入阶段的中文描述
 * @param phase 导入阶段标识
 * @returns 中文描述
 */
export const getPhaseDescription = (phase: string): string => {
  return PHASE_DESCRIPTIONS[phase] || '处理中';
};

/**
 * 计算进度百分比
 * @param processedRecords 已处理记录数
 * @param totalRecords 总记录数
 * @returns 进度百分比 (0-100)
 */
export const getProgressPercentage = (processedRecords: number, totalRecords: number): number => {
  if (!totalRecords || totalRecords <= 0) return 0;
  return Math.round((processedRecords / totalRecords) * 100);
};

/**
 * 计算当前数据组的进度百分比
 * @param current 当前进度信息
 * @returns 当前组进度百分比 (0-100)
 */
export const getCurrentGroupPercentage = (current: { 
  processedRecords: number; 
  totalRecords: number; 
}): number => {
  if (!current.totalRecords || current.totalRecords <= 0) return 0;
  return Math.round((current.processedRecords / current.totalRecords) * 100);
};

/**
 * 数据组标签映射
 */
export const DATA_GROUP_LABELS: Record<ImportDataGroup, string> = {
  [ImportDataGroup.EARNINGS]: '薪资项目',
  [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
  [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别',
  [ImportDataGroup.JOB_ASSIGNMENT]: '职务信息',
  [ImportDataGroup.ALL]: '全部数据'
} as const;

/**
 * 获取数据组的中文标签
 * @param group 数据组类型
 * @returns 中文标签
 */
export const getDataGroupLabel = (group: ImportDataGroup): string => {
  return DATA_GROUP_LABELS[group] || group;
};

/**
 * Excel工作表名称映射
 */
export const SHEET_NAME_MAPPING: Record<ImportDataGroup, string> = {
  [ImportDataGroup.EARNINGS]: '薪资项目明细',
  [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
  [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别',
  [ImportDataGroup.JOB_ASSIGNMENT]: '职务分配',
  [ImportDataGroup.ALL]: ''
} as const;

/**
 * 根据选中的数据组获取期望的工作表名称
 * @param selectedGroups 选中的数据组数组
 * @returns 期望的工作表名称数组
 */
export const getExpectedSheets = (selectedGroups: ImportDataGroup[]): string[] => {
  const sheets: string[] = [];
  
  selectedGroups.forEach(group => {
    const sheetName = SHEET_NAME_MAPPING[group];
    if (sheetName) {
      sheets.push(sheetName);
    }
  });
  
  return sheets;
};

/**
 * 验证Excel文件基本信息
 * @param file 上传的文件
 * @returns 验证结果
 */
export const validateExcelFile = (file: File): { 
  isValid: boolean; 
  error?: string; 
} => {
  // 文件大小检查 (最大50MB)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      isValid: false,
      error: '文件大小不能超过50MB'
    };
  }

  // 文件类型检查
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: '只支持Excel文件格式(.xlsx, .xls)'
    };
  }

  return { isValid: true };
};

/**
 * 计算工作表数据一致性
 * @param employeesBySheet 各工作表的员工数据
 * @param rowCountBySheet 各工作表的行数
 * @returns 一致性检查结果
 */
export const calculateDataConsistency = (
  employeesBySheet: { [sheetName: string]: Set<string> },
  rowCountBySheet: { [sheetName: string]: number }
) => {
  const sheetNames = Object.keys(rowCountBySheet);
  const rowCounts = Object.values(rowCountBySheet);
  
  // 检查行数一致性
  const allSheetsHaveSameRowCount = rowCounts.length > 1 ? 
    rowCounts.every(count => count === rowCounts[0]) : true;
  
  // 检查员工列表一致性
  const allEmployees = new Set<string>();
  const employeeSheetCount: { [employee: string]: string[] } = {};
  
  Object.entries(employeesBySheet).forEach(([sheetName, employees]) => {
    employees.forEach(emp => {
      allEmployees.add(emp);
      if (!employeeSheetCount[emp]) {
        employeeSheetCount[emp] = [];
      }
      employeeSheetCount[emp].push(sheetName);
    });
  });
  
  // 找出在部分工作表中缺失的员工
  const missingInSheets: { employee: string; sheets: string[] }[] = [];
  allEmployees.forEach(employee => {
    const employeeSheets = employeeSheetCount[employee];
    if (employeeSheets.length < sheetNames.length) {
      const missingSheets = sheetNames.filter(sheet => !employeeSheets.includes(sheet));
      missingInSheets.push({ employee, sheets: missingSheets });
    }
  });
  
  return {
    allSheetsHaveSameRowCount,
    rowCountVariance: [...new Set(rowCounts)],
    employeeListConsistent: missingInSheets.length === 0,
    missingInSheets: missingInSheets.slice(0, 10) // 只返回前10个
  };
};

/**
 * 格式化导入结果信息
 * @param result 导入结果
 * @returns 格式化的结果描述
 */
export const formatImportResult = (result: {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount?: number;
}): string => {
  const { totalRows, successCount, failedCount, skippedCount = 0 } = result;
  
  let description = `总计 ${totalRows} 条数据，`;
  description += `成功 ${successCount} 条`;
  
  if (failedCount > 0) {
    description += `，失败 ${failedCount} 条`;
  }
  
  if (skippedCount > 0) {
    description += `，跳过 ${skippedCount} 条`;
  }
  
  return description;
};

/**
 * 生成工作表映射关系
 * @param expectedSheets 期望的工作表名称
 * @param foundSheets 实际找到的工作表名称
 * @returns 映射关系分析
 */
export const generateSheetMapping = (
  expectedSheets: string[], 
  foundSheets: string[]
) => {
  const missingSheets = expectedSheets.filter(sheet => !foundSheets.includes(sheet));
  const unexpectedSheets = foundSheets.filter(sheet => !expectedSheets.includes(sheet) && sheet !== '使用说明');
  
  return {
    expected: expectedSheets,
    found: foundSheets,
    missing: missingSheets,
    unexpected: unexpectedSheets,
    hasAllRequired: missingSheets.length === 0
  };
};