/**
 * useEnhancedFileProcessor Hook
 * Excel文件处理和真实数据导入的增强版Hook
 * 
 * 新增功能:
 * - 真实Supabase数据库写入
 * - 集成现有的importPayrollItems逻辑
 * - 支持多种导入模式 (upsert/replace)
 * - 完整的事务管理和错误回滚
 * - 生产级进度跟踪和日志记录
 */

import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ExcelDataRow } from '@/types/payroll-import';
import type { 
  FileProcessingState,
  ImportPhase,
  ValidationResult,
  SheetParseResult,
  FileParseResult,
  DataConsistencyCheckResult
} from '../types/enhanced-types';
import { 
  isEmptyRow, 
  extractEmployeeIdentifier, 
  validateDataRows,
  checkDuplicateRows 
} from '../utils/validation-helpers';

// 导入真实导入功能
import { importPayrollItems } from '@/hooks/payroll/import-export/importers/payroll-items';
import type { ImportProgress, ImportMode, SalaryComponentCategory } from '@/hooks/payroll/import-export/types';

/**
 * 导入配置接口
 */
export interface RealImportConfig {
  periodId: string;
  mode: ImportMode;
  includeCategories?: SalaryComponentCategory[];
  enableValidation?: boolean;
  batchSize?: number;
}

/**
 * 真实导入结果接口
 */
export interface RealImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string; error?: string }>;
  warnings: string[];
  duration: number;
  importedDataTypes: ImportDataGroup[];
}

/**
 * useEnhancedFileProcessor Hook 返回类型
 */
export interface UseEnhancedFileProcessorReturn {
  // 继承原有接口
  fileState: FileProcessingState;
  parseResult: FileParseResult | null;
  consistencyResult: DataConsistencyCheckResult | null;
  
  // 原有核心操作
  processFile: (file: File, onProgress?: (phase: ImportPhase, progress: number) => void) => Promise<FileParseResult>;
  validateConsistency: (parseResult: FileParseResult) => DataConsistencyCheckResult;
  clearResults: () => void;
  
  // 原有数据访问
  getSheetData: (sheetName: string) => ExcelDataRow[] | null;
  getEmployeeData: (employeeName: string) => Array<{ sheet: string; data: ExcelDataRow }>;
  getDataByType: (dataType: ImportDataGroup) => ExcelDataRow[];
  
  // 新增：真实导入功能
  performRealImport: (config: RealImportConfig, onProgress?: (progress: ImportProgress) => void) => Promise<RealImportResult>;
  isRealImporting: boolean;
  realImportResult: RealImportResult | null;
  
  // 原有状态查询
  isProcessing: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  processingProgress: number;
  
  // 原有统计信息
  getStatistics: () => {
    totalFiles: number;
    totalSheets: number;
    totalRows: number;
    validRows: number;
    uniqueEmployees: number;
    dataTypes: ImportDataGroup[];
  };
  
  // 新增：导入历史
  getImportHistory: () => Array<{
    timestamp: number;
    config: RealImportConfig;
    result: RealImportResult;
  }>;
}

/**
 * 数据类型检测规则 (从原Hook复制)
 */
const DATA_TYPE_DETECTION_RULES = {
  [ImportDataGroup.EARNINGS]: {
    keywords: ['薪资', '工资', '收入', '基本工资', '绩效', '奖金', '补贴'],
    headers: ['基本工资', '岗位工资', '绩效奖金', '加班费', '交通补贴', '餐补', '通讯费']
  },
  [ImportDataGroup.CONTRIBUTION_BASES]: {
    keywords: ['缴费', '社保', '公积金', '基数', '养老', '医疗', '失业'],
    headers: ['养老保险基数', '医疗保险基数', '失业保险基数', '住房公积金基数']
  },
  [ImportDataGroup.CATEGORY_ASSIGNMENT]: {
    keywords: ['人员类别', '类别', '身份', '性质'],
    headers: ['人员类别', '员工类别', '身份类别', '用工性质']
  },
  [ImportDataGroup.JOB_ASSIGNMENT]: {
    keywords: ['部门', '职位', '岗位', '职务', '机构'],
    headers: ['部门', '职位', '岗位', '职务名称', '机构名称']
  }
};

/**
 * 检测工作表的数据类型 (从原Hook复制)
 */
const detectSheetDataType = (sheetName: string, headers: string[]): ImportDataGroup | null => {
  const normalizedSheetName = sheetName.toLowerCase();
  const normalizedHeaders = headers.map(h => h.toLowerCase());
  
  for (const [dataType, rules] of Object.entries(DATA_TYPE_DETECTION_RULES)) {
    // 检查工作表名称
    if (rules.keywords.some(keyword => normalizedSheetName.includes(keyword.toLowerCase()))) {
      return dataType as ImportDataGroup;
    }
    
    // 检查表头匹配度
    const matchedHeaders = rules.headers.filter(header => 
      normalizedHeaders.some(h => h.includes(header.toLowerCase()))
    );
    
    if (matchedHeaders.length >= 2) {
      return dataType as ImportDataGroup;
    }
  }
  
  return null;
};

/**
 * 解析单个工作表 (从原Hook复制并增强)
 */
const parseWorksheet = (
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  onProgress?: (progress: number) => void
): SheetParseResult => {
  const result: SheetParseResult = {
    sheetName,
    headers: [],
    data: [],
    dataType: null,
    rowCount: 0,
    validRowCount: 0,
    errors: [],
    warnings: []
  };
  
  try {
    // 转换为JSON格式
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length === 0) {
      result.warnings.push('工作表为空');
      return result;
    }
    
    // 提取表头（第一行）
    result.headers = jsonData[0]?.map(header => String(header || '').trim()) || [];
    
    if (result.headers.length === 0) {
      result.errors.push('未找到有效的表头');
      return result;
    }
    
    // 检测数据类型
    result.dataType = detectSheetDataType(sheetName, result.headers);
    
    // 处理数据行
    const dataRows = jsonData.slice(1); // 跳过表头
    result.rowCount = dataRows.length;
    
    dataRows.forEach((row, index) => {
      const rowData: ExcelDataRow = {
        rowNumber: index + 2, // Excel行号从2开始（考虑表头）
        _sheetName: sheetName,
        _dataType: result.dataType || undefined
      };
      
      // 映射列数据
      result.headers.forEach((header, colIndex) => {
        if (header) {
          rowData[header] = row[colIndex] || '';
        }
      });
      
      // 跳过空行
      if (!isEmptyRow(rowData)) {
        result.data.push(rowData);
        result.validRowCount++;
      }
      
      // 进度报告
      if (onProgress && index % 50 === 0) {
        onProgress(Math.round((index / dataRows.length) * 100));
      }
    });
    
    // 数据验证
    if (result.validRowCount === 0) {
      result.warnings.push('未找到有效的数据行');
    }
    
  } catch (error) {
    result.errors.push(`工作表解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return result;
};

/**
 * useEnhancedFileProcessor Hook 实现
 */
export const useEnhancedFileProcessor = (): UseEnhancedFileProcessorReturn => {
  // 状态管理 - 继承原有状态
  const [fileState, setFileState] = useState<FileProcessingState>({
    file: null,
    fileName: '',
    fileSize: 0,
    parsedData: [],
    parseResult: null,
    isUploading: false,
    isParsing: false,
    isValidating: false
  });
  
  const [parseResult, setParseResult] = useState<FileParseResult | null>(null);
  const [consistencyResult, setConsistencyResult] = useState<DataConsistencyCheckResult | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // 新增：真实导入相关状态
  const [isRealImporting, setIsRealImporting] = useState(false);
  const [realImportResult, setRealImportResult] = useState<RealImportResult | null>(null);
  const [importHistory, setImportHistory] = useState<Array<{
    timestamp: number;
    config: RealImportConfig;
    result: RealImportResult;
  }>>([]);
  
  // 引用用于异步操作
  const processingRef = useRef<boolean>(false);
  const importingRef = useRef<boolean>(false);
  
  /**
   * 处理Excel文件 (从原Hook复制)
   */
  const processFile = useCallback(async (
    file: File,
    onProgress?: (phase: ImportPhase, progress: number) => void
  ): Promise<FileParseResult> => {
    if (processingRef.current) {
      throw new Error('文件处理正在进行中，请稍后再试');
    }
    
    processingRef.current = true;
    
    try {
      // 更新状态
      setFileState(prev => ({
        ...prev,
        file,
        fileName: file.name,
        fileSize: file.size,
        isParsing: true,
        isValidating: false
      }));
      
      setProcessingProgress(0);
      onProgress?.('parsing', 0);
      
      // 读取文件
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      onProgress?.('parsing', 25);
      setProcessingProgress(25);
      
      // 解析所有工作表
      const sheets: SheetParseResult[] = [];
      const sheetNames = workbook.SheetNames;
      
      for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        const worksheet = workbook.Sheets[sheetName];
        
        const sheetResult = parseWorksheet(worksheet, sheetName, (sheetProgress) => {
          const overallProgress = 25 + Math.round((i / sheetNames.length) * 50) + 
                                 Math.round((sheetProgress / 100) * (50 / sheetNames.length));
          setProcessingProgress(overallProgress);
          onProgress?.('parsing', overallProgress);
        });
        
        sheets.push(sheetResult);
      }
      
      onProgress?.('validating', 75);
      setProcessingProgress(75);
      
      // 构建解析结果
      const result: FileParseResult = {
        fileName: file.name,
        fileSize: file.size,
        sheets,
        totalRows: sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0),
        validRows: sheets.reduce((sum, sheet) => sum + sheet.validRowCount, 0),
        employeeCount: 0,
        dataTypes: Array.from(new Set(sheets.map(sheet => sheet.dataType).filter(Boolean))) as ImportDataGroup[],
        globalErrors: [],
        globalWarnings: [],
        processedAt: Date.now()
      };
      
      // 计算员工数量
      const allEmployees = new Set<string>();
      sheets.forEach(sheet => {
        sheet.data.forEach(row => {
          const employeeName = extractEmployeeIdentifier(row, sheet.headers);
          if (employeeName) {
            allEmployees.add(employeeName);
          }
        });
      });
      result.employeeCount = allEmployees.size;
      
      // 全局验证
      if (result.totalRows === 0) {
        result.globalErrors.push('文件中没有找到任何数据');
      }
      
      if (result.employeeCount === 0) {
        result.globalWarnings.push('未找到有效的员工信息');
      }
      
      if (result.dataTypes.length === 0) {
        result.globalWarnings.push('未能识别数据类型，请确认工作表名称和数据格式');
      }
      
      // 更新状态
      setFileState(prev => ({
        ...prev,
        isParsing: false,
        isValidating: true,
        parsedData: sheets.flatMap(sheet => sheet.data),
        parseResult: result
      }));
      
      setParseResult(result);
      
      onProgress?.('validating', 90);
      setProcessingProgress(90);
      
      // 执行一致性检查
      const consistency = validateConsistency(result);
      setConsistencyResult(consistency);
      
      setFileState(prev => ({
        ...prev,
        isValidating: false
      }));
      
      onProgress?.('completed', 100);
      setProcessingProgress(100);
      
      return result;
      
    } catch (error) {
      setFileState(prev => ({
        ...prev,
        isParsing: false,
        isValidating: false
      }));
      
      onProgress?.('error', 0);
      setProcessingProgress(0);
      
      throw error;
    } finally {
      processingRef.current = false;
    }
  }, []);
  
  /**
   * 验证数据一致性 (从原Hook复制)
   */
  const validateConsistency = useCallback((result: FileParseResult): DataConsistencyCheckResult => {
    const employeeSheetMap = new Map<string, string[]>();
    const employeeDataMap = new Map<string, Array<{ sheet: string; count: number }>>();
    
    // 收集每个员工在哪些工作表中出现
    result.sheets.forEach(sheet => {
      const sheetEmployees = new Set<string>();
      
      sheet.data.forEach(row => {
        const employeeName = extractEmployeeIdentifier(row, sheet.headers);
        if (employeeName) {
          sheetEmployees.add(employeeName);
          
          // 记录员工出现的工作表
          if (!employeeSheetMap.has(employeeName)) {
            employeeSheetMap.set(employeeName, []);
          }
          if (!employeeSheetMap.get(employeeName)!.includes(sheet.sheetName)) {
            employeeSheetMap.get(employeeName)!.push(sheet.sheetName);
          }
        }
      });
      
      // 统计每个工作表的员工数据
      Array.from(sheetEmployees).forEach(employeeName => {
        if (!employeeDataMap.has(employeeName)) {
          employeeDataMap.set(employeeName, []);
        }
        employeeDataMap.get(employeeName)!.push({
          sheet: sheet.sheetName,
          count: sheet.data.filter(row => 
            extractEmployeeIdentifier(row, sheet.headers) === employeeName
          ).length
        });
      });
    });
    
    const allEmployees = Array.from(employeeSheetMap.keys()).sort();
    const allSheets = result.sheets.map(s => s.sheetName);
    
    // 检查重复员工
    const duplicateEmployees = Array.from(employeeDataMap.entries())
      .filter(([_, data]) => data.some(d => d.count > 1))
      .map(([employeeName, data]) => ({
        employeeName,
        occurrences: data.reduce((sum, d) => sum + d.count, 0),
        sheets: data.map(d => d.sheet)
      }));
    
    // 检查缺失员工
    const missingEmployees: DataConsistencyCheckResult['missingEmployees'] = [];
    if (allSheets.length > 1) {
      allEmployees.forEach(employeeName => {
        const presentInSheets = employeeSheetMap.get(employeeName) || [];
        const missingFromSheets = allSheets.filter(sheet => !presentInSheets.includes(sheet));
        
        if (missingFromSheets.length > 0) {
          missingEmployees.push({
            employeeName,
            presentInSheets,
            missingFromSheets
          });
        }
      });
    }
    
    const consistency: DataConsistencyCheckResult = {
      isConsistent: duplicateEmployees.length === 0 && missingEmployees.length === 0,
      employeeList: allEmployees,
      inconsistentEmployees: [],
      duplicateEmployees,
      missingEmployees
    };
    
    return consistency;
  }, []);
  
  /**
   * 新增：执行真实导入
   */
  const performRealImport = useCallback(async (
    config: RealImportConfig,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<RealImportResult> => {
    if (importingRef.current) {
      throw new Error('导入操作正在进行中，请稍后再试');
    }
    
    if (!parseResult) {
      throw new Error('请先处理Excel文件后再执行导入');
    }
    
    importingRef.current = true;
    setIsRealImporting(true);
    setRealImportResult(null);
    
    try {
      const startTime = Date.now();
      console.log('🚀 开始真实数据导入...', config);
      
      // 获取薪资明细数据 (目前主要支持EARNINGS类型)
      const earningsData = getDataByType(ImportDataGroup.EARNINGS);
      
      if (earningsData.length === 0) {
        throw new Error('未找到可导入的薪资明细数据');
      }
      
      console.log(`📊 准备导入 ${earningsData.length} 条薪资记录`);
      
      // 使用全局进度跟踪
      const globalProgressRef = { current: 0 };
      
      // 调用真实的导入函数
      const importResult = await importPayrollItems(
        earningsData,
        config.periodId,
        config.mode,
        {
          includeCategories: config.includeCategories
        },
        (progress) => {
          // 转发进度更新
          if (onProgress && progress.phase) {
            const safeProgress: ImportProgress = {
              phase: progress.phase,
              global: {
                totalGroups: 1,
                processedGroups: 0,
                totalRecords: earningsData.length,
                processedRecords: globalProgressRef.current,
                dataGroups: [ImportDataGroup.EARNINGS]
              },
              current: progress.current || {
                groupName: ImportDataGroup.EARNINGS,
                groupIndex: 0,
                sheetName: '薪资明细',
                totalRecords: earningsData.length,
                processedRecords: globalProgressRef.current,
                successCount: 0,
                errorCount: 0
              },
              message: progress.message,
              errors: progress.errors || [],
              warnings: progress.warnings || []
            };
            onProgress(safeProgress);
          }
        },
        globalProgressRef
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 构造标准化结果
      const result: RealImportResult = {
        success: importResult.success,
        totalRows: importResult.totalRows,
        successCount: importResult.successCount,
        failedCount: importResult.failedCount,
        skippedCount: importResult.skippedCount,
        errors: importResult.errors,
        warnings: importResult.warnings || [],
        duration,
        importedDataTypes: [ImportDataGroup.EARNINGS]
      };
      
      console.log('✅ 真实导入完成:', result);
      
      // 保存到历史记录
      setImportHistory(prev => [...prev, {
        timestamp: endTime,
        config,
        result
      }]);
      
      setRealImportResult(result);
      return result;
      
    } catch (error) {
      console.error('❌ 真实导入失败:', error);
      
      const failedResult: RealImportResult = {
        success: false,
        totalRows: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [{
          row: -1,
          message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        warnings: [],
        duration: 0,
        importedDataTypes: []
      };
      
      setRealImportResult(failedResult);
      throw error;
    } finally {
      importingRef.current = false;
      setIsRealImporting(false);
    }
  }, [parseResult]);
  
  /**
   * 清除结果 (从原Hook复制并增强)
   */
  const clearResults = useCallback(() => {
    setFileState({
      file: null,
      fileName: '',
      fileSize: 0,
      parsedData: [],
      parseResult: null,
      isUploading: false,
      isParsing: false,
      isValidating: false
    });
    setParseResult(null);
    setConsistencyResult(null);
    setProcessingProgress(0);
    setRealImportResult(null); // 新增：清除导入结果
  }, []);
  
  /**
   * 获取指定工作表的数据 (从原Hook复制)
   */
  const getSheetData = useCallback((sheetName: string): ExcelDataRow[] | null => {
    if (!parseResult) return null;
    
    const sheet = parseResult.sheets.find(s => s.sheetName === sheetName);
    return sheet ? sheet.data : null;
  }, [parseResult]);
  
  /**
   * 获取指定员工的数据 (从原Hook复制)
   */
  const getEmployeeData = useCallback((employeeName: string): Array<{ sheet: string; data: ExcelDataRow }> => {
    if (!parseResult) return [];
    
    const result: Array<{ sheet: string; data: ExcelDataRow }> = [];
    
    parseResult.sheets.forEach(sheet => {
      sheet.data.forEach(row => {
        const rowEmployeeName = extractEmployeeIdentifier(row, sheet.headers);
        if (rowEmployeeName === employeeName) {
          result.push({
            sheet: sheet.sheetName,
            data: row
          });
        }
      });
    });
    
    return result;
  }, [parseResult]);
  
  /**
   * 按数据类型获取数据 (从原Hook复制)
   */
  const getDataByType = useCallback((dataType: ImportDataGroup): ExcelDataRow[] => {
    if (!parseResult) return [];
    
    return parseResult.sheets
      .filter(sheet => sheet.dataType === dataType)
      .flatMap(sheet => sheet.data);
  }, [parseResult]);
  
  /**
   * 获取统计信息 (从原Hook复制)
   */
  const getStatistics = useCallback(() => {
    if (!parseResult) {
      return {
        totalFiles: 0,
        totalSheets: 0,
        totalRows: 0,
        validRows: 0,
        uniqueEmployees: 0,
        dataTypes: []
      };
    }
    
    return {
      totalFiles: 1,
      totalSheets: parseResult.sheets.length,
      totalRows: parseResult.totalRows,
      validRows: parseResult.validRows,
      uniqueEmployees: parseResult.employeeCount,
      dataTypes: parseResult.dataTypes
    };
  }, [parseResult]);
  
  /**
   * 新增：获取导入历史
   */
  const getImportHistory = useCallback(() => {
    return [...importHistory].reverse(); // 最新的在前
  }, [importHistory]);
  
  // 计算属性
  const isProcessing = fileState.isParsing || fileState.isValidating;
  const hasErrors = parseResult ? 
    parseResult.globalErrors.length > 0 || parseResult.sheets.some(s => s.errors.length > 0) : false;
  const hasWarnings = parseResult ? 
    parseResult.globalWarnings.length > 0 || parseResult.sheets.some(s => s.warnings.length > 0) : false;
  
  return {
    // 继承原有接口
    fileState,
    parseResult,
    consistencyResult,
    
    // 原有核心操作
    processFile,
    validateConsistency,
    clearResults,
    
    // 原有数据访问
    getSheetData,
    getEmployeeData,
    getDataByType,
    
    // 新增：真实导入功能
    performRealImport,
    isRealImporting,
    realImportResult,
    
    // 原有状态查询
    isProcessing,
    hasErrors,
    hasWarnings,
    processingProgress,
    
    // 原有统计信息
    getStatistics,
    
    // 新增：导入历史
    getImportHistory
  };
};