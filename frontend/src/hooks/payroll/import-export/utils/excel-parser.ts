import * as XLSX from 'xlsx';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ExcelDataRow, ImportProgress } from '../types';
import { analyzeFieldMapping } from './field-mapping';
import { EXCEL_PARSING_CONSTANTS } from '../constants';

/**
 * 解析Excel文件 - 支持单个数据组和全部数据的多工作表解析
 * 使用现代的 ArrayBuffer API 替代废弃的 readAsBinaryString
 */
export const parseExcelFile = async (
  file: File, 
  dataGroup?: ImportDataGroup,
  onProgressUpdate?: (progress: Partial<ImportProgress>) => void
): Promise<ExcelDataRow[]> => {
  return new Promise((resolve, reject) => {
    // 检查文件大小
    if (file.size > EXCEL_PARSING_CONSTANTS.MAX_FILE_SIZE) {
      reject(new Error(`文件大小超过限制 (${EXCEL_PARSING_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB)`));
      return;
    }

    // 检查文件访问权限
    if (file.lastModified === 0) {
      reject(new Error('文件可能被锁定或无法访问，请检查文件权限'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error('文件内容为空或无法读取');
        }
        
        // 使用现代的 ArrayBuffer API
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 定义工作表名称映射
        const sheetNameMapping: Record<Exclude<ImportDataGroup, 'all' | 'payroll' | 'deductions'>, string[]> = {
          'earnings': [...EXCEL_PARSING_CONSTANTS.SHEET_NAMES.PAYROLL_ITEMS],
          'bases': [...EXCEL_PARSING_CONSTANTS.SHEET_NAMES.CONTRIBUTION_BASES],
          'category': [...EXCEL_PARSING_CONSTANTS.SHEET_NAMES.CATEGORY_ASSIGNMENTS],
          'job': [...EXCEL_PARSING_CONSTANTS.SHEET_NAMES.JOB_ASSIGNMENTS]
        };
        
        // 根据数据组选择对应的工作表
        let sheetName = workbook.SheetNames[0]; // 默认第一个工作表
        
        if (dataGroup && dataGroup !== 'all') {
          // 单一数据组模式：找到匹配的工作表
          const possibleNames = sheetNameMapping[dataGroup] || [];
          const foundSheet = workbook.SheetNames.find(name => 
            possibleNames.some(possible => name.includes(possible))
          );
          
          if (foundSheet) {
            sheetName = foundSheet;
            console.log(`🎯 数据组 '${dataGroup}' 使用工作表: ${foundSheet}`);
          } else {
            console.log(`⚠️ 未找到匹配的工作表，使用第一个工作表: ${workbook.SheetNames[0]}，可用工作表: ${workbook.SheetNames.join(', ')}`);
          }
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          dateNF: 'yyyy-mm-dd'
        }) as ExcelDataRow[];
        
        console.log(`📊 工作表 "${sheetName}" 读取了 ${jsonData.length} 行数据`);
        
        // 如果有数据，分析字段映射
        if (jsonData.length > 0) {
          const excelColumns = Object.keys(jsonData[0]);
          console.log('🔍 开始分析Excel列名与数据库字段的匹配情况...');
          console.log('📊 Excel列名详情:', excelColumns);
          console.log('🎯 数据组类型:', dataGroup);
          
          try {
            // 异步执行字段映射分析
            const analysis = await analyzeFieldMapping(excelColumns, dataGroup, sheetName);
            console.log('📋 字段映射分析结果:', analysis);
            
            // 更新进度状态，包含映射分析结果
            if (onProgressUpdate) {
              onProgressUpdate({
                current: {
                  groupName: dataGroup || 'unknown',
                  groupIndex: 0,
                  sheetName,
                  totalRecords: jsonData.length,
                  processedRecords: 0,
                  fieldMappingAnalysis: analysis
                }
              });
            }
            
            // 如果有警告，输出到控制台
            if (analysis.warnings.length > 0) {
              console.warn('⚠️ 字段映射警告:', analysis.warnings);
            }
            
            // 如果有建议，输出到控制台
            if (analysis.recommendations.length > 0) {
              console.info('💡 字段映射建议:', analysis.recommendations);
            }
          } catch (error) {
            console.error('❌ 字段映射分析失败:', error);
          }
        }
        
        resolve(jsonData);
      } catch (error) {
        console.error('📊 Excel解析失败:', error);
        reject(error instanceof Error ? error : new Error('Excel文件解析失败'));
      }
    };
    
    // 增强的错误处理
    reader.onerror = (event) => {
      const error = event.target?.error;
      let errorMessage = '文件读取失败';
      
      if (error) {
        switch (error.name) {
          case 'NotReadableError':
            errorMessage = '文件无法读取，请检查文件是否被其他程序占用、损坏或权限不足';
            break;
          case 'SecurityError':
            errorMessage = '文件访问被浏览器安全策略阻止，请尝试重新选择文件';
            break;
          case 'AbortError':
            errorMessage = '文件读取被中断';
            break;
          default:
            errorMessage = `文件读取失败: ${error.message || '未知错误'}`;
        }
      }
      
      console.error('📁 Excel文件读取失败:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        errorName: error?.name,
        errorMessage: error?.message
      });
      
      reject(new Error(errorMessage));
    };
    
    // 使用现代的 readAsArrayBuffer API
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 解析多工作表Excel文件（用于"全部"数据组）
 * 使用现代的 ArrayBuffer API 替代废弃的 readAsBinaryString
 */
export const parseMultiSheetExcelFile = async (
  file: File,
  onProgressUpdate?: (progress: Partial<ImportProgress>) => void
): Promise<Record<string, ExcelDataRow[]>> => {
  return new Promise((resolve, reject) => {
    // 检查文件大小
    if (file.size > EXCEL_PARSING_CONSTANTS.MAX_FILE_SIZE) {
      reject(new Error(`文件大小超过限制 (${EXCEL_PARSING_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB)`));
      return;
    }

    // 检查文件访问权限
    if (file.lastModified === 0) {
      reject(new Error('文件可能被锁定或无法访问，请检查文件权限'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error('文件内容为空或无法读取');
        }
        
        // 使用现代的 ArrayBuffer API
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const result: Record<string, ExcelDataRow[]> = {};
        const totalSheets = workbook.SheetNames.length;
        
        for (let i = 0; i < workbook.SheetNames.length; i++) {
          const sheetName = workbook.SheetNames[i];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd'
          }) as ExcelDataRow[];
          
          console.log(`📊 工作表 "${sheetName}" 读取了 ${jsonData.length} 行数据`);
          
          result[sheetName] = jsonData;
          
          // 更新进度
          if (onProgressUpdate) {
            onProgressUpdate({
              phase: 'parsing',
              global: {
                totalGroups: totalSheets,
                processedGroups: i + 1,
                totalRecords: 0, // 将在后续计算
                processedRecords: 0,
                dataGroups: workbook.SheetNames
              },
              current: {
                groupName: sheetName,
                groupIndex: i,
                sheetName,
                totalRecords: jsonData.length,
                processedRecords: jsonData.length
              },
              message: `解析工作表 ${sheetName} (${i + 1}/${totalSheets})`
            });
          }
        }
        
        resolve(result);
      } catch (error) {
        console.error('📊 多工作表Excel解析失败:', error);
        reject(error instanceof Error ? error : new Error('多工作表Excel文件解析失败'));
      }
    };
    
    // 增强的错误处理
    reader.onerror = (event) => {
      const error = event.target?.error;
      let errorMessage = '多工作表文件读取失败';
      
      if (error) {
        switch (error.name) {
          case 'NotReadableError':
            errorMessage = '多工作表文件无法读取，请检查文件是否被其他程序占用、损坏或权限不足';
            break;
          case 'SecurityError':
            errorMessage = '多工作表文件访问被浏览器安全策略阻止，请尝试重新选择文件';
            break;
          case 'AbortError':
            errorMessage = '多工作表文件读取被中断';
            break;
          default:
            errorMessage = `多工作表文件读取失败: ${error.message || '未知错误'}`;
        }
      }
      
      console.error('📁 多工作表Excel文件读取失败:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        errorName: error?.name,
        errorMessage: error?.message
      });
      
      reject(new Error(errorMessage));
    };
    
    // 使用现代的 readAsArrayBuffer API
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 验证Excel文件格式
 */
export const validateExcelFile = (file: File): { valid: boolean; error?: string } => {
  // 检查文件类型
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];
  
  if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    return {
      valid: false,
      error: '不支持的文件格式，请上传 .xlsx、.xls 或 .csv 文件'
    };
  }
  
  // 检查文件大小
  if (file.size > EXCEL_PARSING_CONSTANTS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制 (${EXCEL_PARSING_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB)`
    };
  }
  
  // 检查文件是否为空
  if (file.size === 0) {
    return {
      valid: false,
      error: '文件为空，请选择有效的Excel文件'
    };
  }
  
  return { valid: true };
};

/**
 * 获取Excel文件的工作表名称列表
 * 使用现代的 ArrayBuffer API 替代废弃的 readAsBinaryString
 */
export const getExcelSheetNames = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    // 检查文件访问权限
    if (file.lastModified === 0) {
      reject(new Error('文件可能被锁定或无法访问，请检查文件权限'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error('文件内容为空或无法读取');
        }
        
        // 使用现代的 ArrayBuffer API
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Excel文件中没有找到工作表');
        }
        
        console.log(`📋 检测到工作表: ${workbook.SheetNames.join(', ')}`);
        resolve(workbook.SheetNames);
      } catch (error) {
        console.error('📊 获取工作表名称失败:', error);
        reject(error instanceof Error ? error : new Error('获取工作表名称失败'));
      }
    };
    
    // 增强的错误处理
    reader.onerror = (event) => {
      const error = event.target?.error;
      let errorMessage = '获取工作表名称时文件读取失败';
      
      if (error) {
        switch (error.name) {
          case 'NotReadableError':
            errorMessage = '文件无法读取，请检查文件是否被其他程序占用、损坏或权限不足';
            break;
          case 'SecurityError':
            errorMessage = '文件访问被浏览器安全策略阻止，请尝试重新选择文件';
            break;
          case 'AbortError':
            errorMessage = '文件读取被中断';
            break;
          default:
            errorMessage = `获取工作表名称失败: ${error.message || '未知错误'}`;
        }
      }
      
      console.error('📁 获取Excel工作表名称时文件读取失败:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        errorName: error?.name,
        errorMessage: error?.message
      });
      
      reject(new Error(errorMessage));
    };
    
    // 使用现代的 readAsArrayBuffer API
    reader.readAsArrayBuffer(file);
  });
};