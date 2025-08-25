/**
 * useFileProcessor Hook
 * Excel文件处理和数据解析专用Hook
 * 
 * 核心功能:
 * - Excel文件读取和工作表解析
 * - 数据行提取和字段映射
 * - 数据验证和一致性检查
 * - 进度跟踪和错误处理
 * - 支持多工作表和不同数据类型
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

// 类型定义已移至 enhanced-types.ts 文件

/**
 * useFileProcessor Hook 返回类型
 */
export interface UseFileProcessorReturn {
  // 核心状态
  fileState: FileProcessingState;
  parseResult: FileParseResult | null;
  consistencyResult: DataConsistencyCheckResult | null;
  
  // 核心操作
  processFile: (file: File, onProgress?: (phase: ImportPhase, progress: number) => void) => Promise<FileParseResult>;
  validateConsistency: (parseResult: FileParseResult) => DataConsistencyCheckResult;
  clearResults: () => void;
  
  // 数据访问
  getSheetData: (sheetName: string) => ExcelDataRow[] | null;
  getEmployeeData: (employeeName: string) => Array<{ sheet: string; data: ExcelDataRow }>;
  getDataByType: (dataType: ImportDataGroup) => ExcelDataRow[];
  
  // 状态查询
  isProcessing: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  processingProgress: number;
  
  // 统计信息
  getStatistics: () => {
    totalFiles: number;
    totalSheets: number;
    totalRows: number;
    validRows: number;
    uniqueEmployees: number;
    dataTypes: ImportDataGroup[];
  };
}

/**
 * 数据类型检测规则
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
 * 检测工作表的数据类型
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
 * 解析单个工作表
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
 * useFileProcessor Hook 实现
 */
export const useFileProcessor = (): UseFileProcessorReturn => {
  // 状态管理
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
  
  // 引用用于异步操作
  const processingRef = useRef<boolean>(false);
  
  /**
   * 处理Excel文件
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
   * 验证数据一致性
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
    
    // 检查缺失员工（如果有多个工作表，员工应该在所有工作表中出现）
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
    
    // 检查不一致的员工数据
    const inconsistentEmployees: DataConsistencyCheckResult['inconsistentEmployees'] = [];
    
    const consistency: DataConsistencyCheckResult = {
      isConsistent: duplicateEmployees.length === 0 && missingEmployees.length === 0,
      employeeList: allEmployees,
      inconsistentEmployees,
      duplicateEmployees,
      missingEmployees
    };
    
    return consistency;
  }, []);
  
  /**
   * 清除结果
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
  }, []);
  
  /**
   * 获取指定工作表的数据
   */
  const getSheetData = useCallback((sheetName: string): ExcelDataRow[] | null => {
    if (!parseResult) return null;
    
    const sheet = parseResult.sheets.find(s => s.sheetName === sheetName);
    return sheet ? sheet.data : null;
  }, [parseResult]);
  
  /**
   * 获取指定员工的数据
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
   * 按数据类型获取数据
   */
  const getDataByType = useCallback((dataType: ImportDataGroup): ExcelDataRow[] => {
    if (!parseResult) return [];
    
    return parseResult.sheets
      .filter(sheet => sheet.dataType === dataType)
      .flatMap(sheet => sheet.data);
  }, [parseResult]);
  
  /**
   * 获取统计信息
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
  
  // 计算属性
  const isProcessing = fileState.isParsing || fileState.isValidating;
  const hasErrors = parseResult ? 
    parseResult.globalErrors.length > 0 || parseResult.sheets.some(s => s.errors.length > 0) : false;
  const hasWarnings = parseResult ? 
    parseResult.globalWarnings.length > 0 || parseResult.sheets.some(s => s.warnings.length > 0) : false;
  
  return {
    // 核心状态
    fileState,
    parseResult,
    consistencyResult,
    
    // 核心操作
    processFile,
    validateConsistency,
    clearResults,
    
    // 数据访问
    getSheetData,
    getEmployeeData,
    getDataByType,
    
    // 状态查询
    isProcessing,
    hasErrors,
    hasWarnings,
    processingProgress,
    
    // 统计信息
    getStatistics
  };
};