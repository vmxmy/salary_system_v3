import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import * as XLSX from 'xlsx';
import uFuzzy from '@leeoniya/ufuzzy';
import type { Database } from '@/types/supabase';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportConfig as PayrollImportConfig } from '@/types/payroll-import';
// import type { SalaryComponentCategory } from './useSalaryComponentFields';

// 临时定义类型来避免导入错误
type SalaryComponentCategory = 
  | 'basic_salary'
  | 'benefits'
  | 'personal_insurance'
  | 'employer_insurance'
  | 'personal_tax'
  | 'other_deductions';

// 类型定义 - TODO: import_templates table not yet created
// type ImportTemplate = Database['public']['Tables']['import_templates']['Row'];
interface ImportTemplate {
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

// 导入进度
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

// 查询键管理
export const importExportQueryKeys = {
  all: ['payroll-import-export'] as const,
  templates: () => [...importExportQueryKeys.all, 'templates'] as const,
  template: (id: string) => [...importExportQueryKeys.all, 'template', id] as const,
  exportData: (params: any) => [...importExportQueryKeys.all, 'export', params] as const,
};

/**
 * 获取导入模板列表 Hook
 */
export function useImportTemplates() {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: importExportQueryKeys.templates(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_templates' as any)
        .select('*')
        .eq('category', 'payroll')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        handleError(error, { customMessage: '获取导入模板失败' });
        throw error;
      }

      return data || [];
    },
    staleTime: 30 * 60 * 1000 // 30分钟缓存
  });
}

/**
 * 薪资导入导出 Hook
 */
export function usePayrollImportExport() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    phase: 'parsing',
    global: {
      totalGroups: 0,
      processedGroups: 0,
      totalRecords: 0,
      processedRecords: 0,
      dataGroups: []
    },
    current: {
      groupName: '',
      groupIndex: 0,
      sheetName: '',
      totalRecords: 0,
      processedRecords: 0
    },
    errors: [],
    warnings: []
  });


  // 分析Excel列名与数据库字段的匹配情况
  const analyzeFieldMapping = useCallback(async (
    excelColumns: string[], 
    dataGroup?: ImportDataGroup
  ): Promise<FieldMappingAnalysis> => {
    console.log('🔍 开始分析字段映射...');
    console.log('📊 Excel列名:', excelColumns);
    console.log('📋 数据组:', dataGroup);

    // 获取薪资组件和验证规则
    const salaryComponents = await getSalaryComponents(dataGroup);
    const validationRules = await getValidationRules();
    
    // 构建数据库字段映射
    const dbFields = new Map<string, { type: string; required: boolean }>();
    
    // 添加基础字段
    dbFields.set('员工姓名', { type: 'basic', required: true });
    dbFields.set('employee_name', { type: 'basic', required: true });
    
    // 添加薪资组件字段
    salaryComponents.forEach(component => {
      dbFields.set(component.name, { 
        type: component.type === 'earning' ? 'earning' : 'deduction', 
        required: false 
      });
    });
    
    // 根据数据组添加特定字段
    if (dataGroup === 'category' || dataGroup === 'all') {
      dbFields.set('人员类别', { type: 'assignment', required: true });
      dbFields.set('category_name', { type: 'assignment', required: true });
    }
    
    if (dataGroup === 'job' || dataGroup === 'all') {
      dbFields.set('部门', { type: 'assignment', required: true });
      dbFields.set('职位', { type: 'assignment', required: true });
      dbFields.set('department_name', { type: 'assignment', required: true });
      dbFields.set('position_name', { type: 'assignment', required: true });
    }
    
    if (dataGroup === 'bases' || dataGroup === 'all') {
      ['养老基数', '医疗基数', '失业基数', '工伤基数', '生育基数', '公积金基数'].forEach(field => {
        dbFields.set(field, { type: 'contribution_base', required: false });
      });
    }

    const matchResults: ColumnMatchResult[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // 使用 uFuzzy 进行高效的模糊匹配
    // uFuzzy 是2025年最新的高性能模糊匹配库，仅7.5KB，零依赖
    const uf = new uFuzzy({
      // 配置选项
      intraMode: 1,  // 允许单个错误
      intraIns: 1,   // 插入成本
      intraSub: 1,   // 替换成本
      intraTrn: 1,   // 交换成本
      intraDel: 1    // 删除成本
    });

    // 构建搜索数据库字段列表
    const haystack = Array.from(dbFields.keys());
    
    console.log('🔍 使用 uFuzzy 进行字段匹配，数据库字段:', haystack);

    // 分析每个Excel列
    excelColumns.forEach(excelColumn => {
      console.log(`🔍 分析Excel列: "${excelColumn}"`);
      
      // 使用 uFuzzy 进行搜索
      const idxs = uf.filter(haystack, excelColumn);
      
      if (idxs && idxs.length > 0) {
        // 获取匹配信息和排序
        const info = uf.info(idxs, haystack, excelColumn);
        const order = uf.sort(info, haystack, excelColumn);
        
        if (order.length > 0) {
          // 获取最佳匹配
          const bestMatchIdx = info.idx[order[0]];
          const bestMatchField = haystack[bestMatchIdx];
          const fieldInfo = dbFields.get(bestMatchField);
          
          // 计算相似度分数 (uFuzzy 没有直接提供相似度分数，我们基于排名估算)
          const similarity = order[0] === 0 ? 1.0 : Math.max(0.6, 1 - (order[0] * 0.1));
          
          // 判断匹配类型
          let matchType: 'exact' | 'fuzzy' | 'unmapped';
          if (excelColumn.toLowerCase() === bestMatchField.toLowerCase()) {
            matchType = 'exact';
          } else if (similarity >= 0.7) {
            matchType = 'fuzzy';
          } else {
            matchType = 'unmapped';
          }
          
          // 获取建议列表（前3个匹配）
          const suggestions = order.slice(0, Math.min(3, order.length))
            .map(orderIdx => haystack[info.idx[orderIdx]]);
          
          matchResults.push({
            excelColumn,
            dbField: matchType !== 'unmapped' ? bestMatchField : null,
            matchType,
            suggestions,
            isRequired: fieldInfo?.required || false
          });
          
          // 添加警告
          if (matchType === 'fuzzy' && similarity < 0.8) {
            warnings.push(`列"${excelColumn}"与数据库字段"${bestMatchField}"相似度较低`);
          }
          
          console.log(`✅ 匹配结果: "${excelColumn}" -> "${bestMatchField}" (${matchType})`);
        } else {
          // 没有有效匹配
          matchResults.push({
            excelColumn,
            dbField: null,
            matchType: 'unmapped',
            suggestions: haystack.slice(0, 5) // 提供前5个字段作为建议
          });
          warnings.push(`列"${excelColumn}"未找到匹配的数据库字段`);
          console.log(`❌ 未匹配: "${excelColumn}"`);
        }
      } else {
        // uFuzzy 没有找到任何匹配
        matchResults.push({
          excelColumn,
          dbField: null,
          matchType: 'unmapped',
          suggestions: haystack.slice(0, 5)
        });
        warnings.push(`列"${excelColumn}"未找到匹配的数据库字段`);
        console.log(`❌ 无匹配: "${excelColumn}"`);
      }
    });

    // 检查必需字段是否都有匹配
    const requiredFields = Array.from(dbFields.entries()).filter(([_, info]) => info.required);
    const matchedRequiredFields = requiredFields.filter(([field, _]) => 
      matchResults.some(result => result.dbField === field)
    );
    
    if (matchedRequiredFields.length < requiredFields.length) {
      const missingFields = requiredFields
        .filter(([field, _]) => !matchResults.some(result => result.dbField === field))
        .map(([field, _]) => field);
      warnings.push(`缺少必需字段: ${missingFields.join(', ')}`);
      recommendations.push(`请确保Excel中包含以下必需列: ${missingFields.join(', ')}`);
    }
    
    // 统计信息
    const mappedColumns = matchResults.filter(r => r.dbField !== null).length;
    const unmappedColumns = matchResults.filter(r => r.dbField === null).length;

    console.log('📋 字段映射分析完成:', {
      总列数: excelColumns.length,
      已映射: mappedColumns,
      未映射: unmappedColumns,
      必需字段匹配: `${matchedRequiredFields.length}/${requiredFields.length}`
    });

    return {
      sheetName: '未知',
      dataGroup,
      totalColumns: excelColumns.length,
      mappedColumns,
      unmappedColumns,
      requiredFieldsMatched: matchedRequiredFields.length,
      requiredFieldsTotal: requiredFields.length,
      matchResults,
      warnings,
      recommendations
    };
  }, []);

  // 获取薪资组件的辅助函数 - 使用与导入相同的过滤条件
  const getSalaryComponents = useCallback(async (dataGroup?: ImportDataGroup) => {
    // 根据数据组确定薪资组件类别
    const defaultCategories: SalaryComponentCategory[] = ['basic_salary', 'benefits', 'personal_tax'];
    const includeCategories = defaultCategories; // 与 importPayrollItems 保持一致
    
    const { data: salaryComponents, error } = await supabase
      .from('salary_components')
      .select('name, type, category')
      .in('category', includeCategories)
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('获取薪资组件失败:', error);
      return [];
    }

    console.log(`🎯 字段映射使用的薪资组件类别: ${includeCategories.join(', ')}`);
    return salaryComponents || [];
  }, []);

  // 解析Excel文件 - 支持单个数据组和全部数据的多工作表解析
  const parseExcelFile = useCallback(async (file: File, dataGroup?: ImportDataGroup): Promise<ExcelDataRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // 定义工作表名称映射
          const sheetNameMapping: Record<Exclude<ImportDataGroup, 'all'>, string[]> = {
            'earnings': ['薪资项目明细'],
            'bases': ['缴费基数'],
            'category': ['人员类别'],
            'job': ['职务信息']
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
            
            // 异步执行字段映射分析（不阻塞解析流程）
            analyzeFieldMapping(excelColumns, dataGroup).then(analysis => {
              console.log('📋 字段映射分析结果:', analysis);
              
              // 更新进度状态，包含映射分析结果
              setImportProgress(prev => ({
                ...prev,
                current: {
                  ...prev.current,
                  sheetName,
                  fieldMappingAnalysis: analysis
                }
              }));
              
              // 如果有警告，输出到控制台
              if (analysis.warnings.length > 0) {
                console.warn('⚠️ 字段映射警告:', analysis.warnings);
              }
              
              // 如果有建议，输出到控制台
              if (analysis.recommendations.length > 0) {
                console.info('💡 字段映射建议:', analysis.recommendations);
              }
            }).catch(error => {
              console.error('❌ 字段映射分析失败:', error);
            });
          }
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  }, []);

  // 定义验证规则接口
  interface ValidationRule {
    field: string;
    required?: boolean;
    type?: 'string' | 'number' | 'date' | 'email' | 'idcard';
    pattern?: RegExp;
    min?: number;
    max?: number;
    customValidator?: (value: any, row: ExcelDataRow) => string | null;
  }

  // 动态获取验证规则
  const getValidationRules = useCallback(async (): Promise<Record<string, ValidationRule[]>> => {
    try {
      // 获取薪资组件
      const { data: salaryComponents, error } = await supabase
        .from('salary_components')
        .select('name, type')
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('获取薪资组件失败:', error);
        // 如果获取失败，返回基础验证规则
        return getBasicValidationRules();
      }

      console.log('🔍 动态获取到的薪资组件:', salaryComponents);

      // 根据薪资组件类型分组构建验证规则
      const earningComponents = salaryComponents?.filter(c => c.type === 'earning') || [];
      const deductionComponents = salaryComponents?.filter(c => c.type === 'deduction') || [];

      const rules: Record<string, ValidationRule[]> = {
        earnings: [
          { field: '员工姓名', required: true },
          // 动态添加收入项组件
          ...earningComponents.map(component => ({
            field: component.name,
            type: 'number' as const,
            min: 0,
            max: 1000000
          }))
        ],
        deductions: [
          { field: '员工姓名', required: true },
          // 动态添加扣除项组件
          ...deductionComponents.map(component => ({
            field: component.name,
            type: 'number' as const,
            min: 0,
            max: component.name === '个人所得税' ? 100000 : 50000
          }))
        ],
        contribution_bases: [
          { field: '员工姓名', required: true },
          // 基数相关字段（这些通常不是薪资组件，而是计算基础）
          { field: '养老基数', type: 'number', min: 0, max: 100000 },
          { field: '医疗基数', type: 'number', min: 0, max: 100000 },
          { field: '失业基数', type: 'number', min: 0, max: 100000 },
          { field: '工伤基数', type: 'number', min: 0, max: 100000 },
          { field: '生育基数', type: 'number', min: 0, max: 100000 },
          { field: '公积金基数', type: 'number', min: 0, max: 100000 }
        ],
        category_assignment: [
          { field: '员工姓名', required: true },
          { field: '人员类别', required: true }
        ],
        job_assignment: [
          { field: '员工姓名', required: true },
          { field: '部门', required: true },
          { field: '职位', required: true }
        ]
      };

      console.log('📋 动态构建的验证规则:', rules);
      return rules;
    } catch (error) {
      console.error('获取验证规则时发生错误:', error);
      return getBasicValidationRules();
    }
  }, []);

  // 基础验证规则（兜底方案）
  const getBasicValidationRules = (): Record<string, ValidationRule[]> => {
    return {
      earnings: [
        { field: '员工姓名', required: true },
      ],
      deductions: [
        { field: '员工姓名', required: true },
      ],
      contribution_bases: [
        { field: '员工姓名', required: true },
      ],
      category_assignment: [
        { field: '员工姓名', required: true },
        { field: '人员类别', required: true }
      ],
      job_assignment: [
        { field: '员工姓名', required: true },
        { field: '部门', required: true },
        { field: '职位', required: true }
      ]
    };
  };

  // 验证单个字段
  const validateField = (value: any, rule: ValidationRule): string | null => {
    // 检查必填
    if (rule.required && (!value || value === '')) {
      return `${rule.field}不能为空`;
    }

    // 如果值为空且非必填，跳过后续验证
    if (!value || value === '') return null;

    // 类型验证
    switch (rule.type) {
      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return `${rule.field}必须是有效的数字`;
        }
        if (rule.min !== undefined && numValue < rule.min) {
          return `${rule.field}不能小于${rule.min}`;
        }
        if (rule.max !== undefined && numValue > rule.max) {
          return `${rule.field}不能大于${rule.max}`;
        }
        break;
      
      case 'date':
        if (!Date.parse(value)) {
          return `${rule.field}必须是有效的日期格式`;
        }
        break;
      
      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          return `${rule.field}必须是有效的邮箱地址`;
        }
        break;
      
      case 'idcard':
        const idCardPattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i;
        if (!idCardPattern.test(value)) {
          return `${rule.field}必须是有效的身份证号码`;
        }
        break;
    }

    // 正则表达式验证
    if (rule.pattern && !rule.pattern.test(value)) {
      return `${rule.field}格式不正确`;
    }

    // 自定义验证
    if (rule.customValidator) {
      return rule.customValidator(value, {} as ExcelDataRow);
    }

    return null;
  };

  // 验证导入数据
  const validateImportData = useCallback(async (
    data: ExcelDataRow[],
    config: ImportConfig
  ): Promise<{ isValid: boolean; errors: any[]; warnings: any[] }> => {
    console.log('🔍 开始数据验证...');
    console.log(`📊 待验证数据行数: ${data.length}`);
    console.log('⚙️ 验证配置:', config);
    
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // 动态获取验证规则
    const validationRules = await getValidationRules();
    console.log('🛠️ 动态获取的验证规则:', validationRules);
    
    // 根据选择的数据组进行验证
    const dataGroups = Array.isArray(config.dataGroup) ? config.dataGroup : [config.dataGroup];
    console.log('📋 数据组类型:', dataGroups);
    
    dataGroups.forEach(group => {
      const groupName = group.toLowerCase().replace('_', '');
      const rules = validationRules[groupName] || validationRules[group] || [];
      
      console.log(`🔎 验证数据组: ${group}`);
      console.log(`📝 找到验证规则: ${rules.length} 条`);
      
      if (rules.length === 0) {
        console.log(`⚠️ 数据组 "${group}" 没有找到验证规则`);
      }
      
      data.forEach((row, index) => {
        console.log(`🔍 验证第 ${index + 1} 行数据...`);
        
        rules.forEach(rule => {
          // 支持多个可能的字段名
          const possibleFields = [
            rule.field,
            rule.field.replace('_', ''),
            rule.field.toLowerCase(),
            // 英文字段名映射
            rule.field === '员工姓名' ? 'employee_name' : null,
            rule.field === '基本工资' ? 'basic_salary' : null,
            rule.field === '岗位工资' ? 'position_salary' : null,
            rule.field === '绩效奖金' ? 'performance_bonus' : null,
            rule.field === '人员类别' ? 'category_name' : null,
            rule.field === '部门' ? 'department_name' : null,
            rule.field === '职位' ? 'position_name' : null,
          ].filter(Boolean);
          
          let value = null;
          let fieldName = rule.field;
          
          for (const field of possibleFields) {
            if (field && row[field] !== undefined) {
              value = row[field];
              fieldName = field;
              break;
            }
          }
          
          console.log(`  📝 验证字段: ${rule.field} -> ${fieldName} = ${value}`);
          
          const error = validateField(value, rule);
          if (error) {
            console.log(`  ❌ 验证失败: ${error}`);
            errors.push({
              row: index + 2,
              field: fieldName,
              message: error
            });
          } else {
            console.log(`  ✅ 验证通过: ${rule.field}`);
          }
        });
      });
    });
    
    console.log('\n📊 验证统计:');
    console.log(`❌ 错误数量: ${errors.length}`);
    console.log(`⚠️ 警告数量: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ 错误详情:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. 第${error.row}行 ${error.field}: ${error.message}`);
      });
    }
    
    // 添加一些警告信息
    console.log('\n🔍 检查数据量...');
    if (data.length > 1000) {
      const warning = `数据量较大（${data.length}条），导入可能需要较长时间`;
      console.log(`⚠️ ${warning}`);
      warnings.push({
        row: 0,
        message: warning
      });
    }
    
    // 检查是否有重复的员工
    console.log('🔍 检查重复员工...');
    const employeeNames = data.map(row => row['员工姓名'] || row['employee_name']).filter(Boolean);
    const duplicates = employeeNames.filter((name, index) => employeeNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];
      const warning = `发现重复的员工：${uniqueDuplicates.join(', ')}`;
      console.log(`⚠️ ${warning}`);
      warnings.push({
        row: 0,
        message: warning
      });
    } else {
      console.log('✅ 未发现重复员工');
    }
    
    const isValid = errors.length === 0;
    console.log(`\n🎯 验证结果: ${isValid ? '✅ 通过' : '❌ 失败'}`);
    console.log('🏁 数据验证完成\n');
    
    return {
      isValid,
      errors,
      warnings
    };
  }, [getValidationRules]);

  // 导入薪资项目明细数据（动态获取薪资组件）
  const importPayrollItems = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    options?: {
      includeCategories?: SalaryComponentCategory[];  // 要导入的薪资组件类别，默认：['basic_salary', 'benefits', 'personal_tax']
    },
    globalProgressRef?: { current: number }
  ) => {
    console.log('🚀 开始导入薪资项目明细数据');
    console.log(`📊 数据行数: ${data.length}`);
    console.log(`🔰 薪资周期ID: ${periodId}`);
    console.log('📋 配置选项:', options);
    
    const results: any[] = [];
    
    // 默认配置：导入所有收入项类别(basic_salary, benefits) + 个人所得税(personal_tax)
    const defaultCategories: SalaryComponentCategory[] = ['basic_salary', 'benefits', 'personal_tax'];
    const includeCategories = options?.includeCategories || defaultCategories;
    
    console.log('🎯 将导入的薪资组件类别:', includeCategories);
    
    // 获取指定类别的薪资组件
    console.log('🔍 查询薪资组件数据...');
    const { data: salaryComponents, error: componentsError } = await supabase
      .from('salary_components')
      .select('id, name, type, category')
      .in('category', includeCategories);
    
    if (componentsError) {
      console.error('❌ 获取薪资组件失败:', componentsError);
      throw new Error('无法获取薪资组件列表');
    }
    
    if (!salaryComponents || salaryComponents.length === 0) {
      console.error('❌ 未找到任何薪资组件');
      throw new Error('未找到符合条件的薪资组件');
    }
    
    console.log(`✅ 成功获取 ${salaryComponents.length} 个薪资组件`);
    
    // 创建组件名称到ID的映射
    const componentMap = new Map(
      salaryComponents.map(comp => [comp.name, comp])
    );
    
    // 调试：打印获取到的组件
    console.log('💼 薪资组件映射表:');
    salaryComponents.forEach(comp => {
      console.log(`  - ${comp.name} (${comp.category}/${comp.type}) -> ${comp.id}`);
    });
    console.log('🔗 组件名称映射Keys:', Array.from(componentMap.keys()));
    
    // 分析Excel数据的列结构
    if (data.length > 0) {
      const sampleRow = data[0];
      console.log('📝 Excel数据列结构分析:');
      console.log('  可用列名:', Object.keys(sampleRow));
      console.log('  示例数据行:', sampleRow);
      
      // 检查哪些Excel列可以匹配到薪资组件
      const matchedColumns = [];
      const unmatchedColumns = [];
      
      for (const columnName of Object.keys(sampleRow)) {
        if (componentMap.has(columnName)) {
          matchedColumns.push(columnName);
        } else if (!['员工姓名', 'employee_name', '部门', '职位', 'rowNumber', '_sheetName'].includes(columnName)) {
          unmatchedColumns.push(columnName);
        }
      }
      
      console.log('✅ 匹配到的薪资组件列:', matchedColumns);
      console.log('⚠️ 未匹配的数据列:', unmatchedColumns);
    }
    
    // 批量查询优化：预先获取所有需要的员工数据
    console.log('\n🚀 批量预加载数据优化...');
    const employeeNames = [...new Set(data.map(row => 
      row['员工姓名'] || row['employee_name']
    ).filter(Boolean))];
    
    console.log(`📊 需要查询的员工数量: ${employeeNames.length}`);
    const { data: allEmployees, error: employeesError } = await supabase
      .from('employees')
      .select('id, employee_name')
      .in('employee_name', employeeNames);
    
    if (employeesError) {
      console.error('❌ 批量查询员工失败:', employeesError);
      throw new Error(`批量查询员工失败: ${employeesError.message}`);
    }
    
    // 创建员工映射表（姓名 -> 员工信息）
    const employeeMap = new Map(
      (allEmployees || []).map(emp => [emp.employee_name, emp])
    );
    console.log(`✅ 成功预加载 ${employeeMap.size} 个员工数据`);
    
    // 检查是否有找不到的员工
    const missingEmployees = employeeNames.filter(name => !employeeMap.has(name));
    if (missingEmployees.length > 0) {
      console.warn('⚠️ 以下员工在数据库中不存在:', missingEmployees);
    }
    
    // 批量处理优化：先收集所有数据，然后批量插入
    console.log(`\n🚀 开始批量处理 ${data.length} 条数据...`);
    
    // Step 1: 获取薪资周期信息（只查询一次）
    console.log('🔍 查询薪资周期信息...');
    const { data: period, error: periodError } = await supabase
      .from('payroll_periods')
      .select('pay_date, period_year, period_month')
      .eq('id', periodId)
      .single();
    
    if (periodError) {
      console.error('❌ 查询薪资周期失败:', periodError);
      throw new Error(`查询薪资周期失败: ${periodError.message}`);
    }
    
    // 计算默认发薪日期
    let defaultPayDate: string;
    if (period?.pay_date) {
      defaultPayDate = period.pay_date;
    } else if (period?.period_year && period?.period_month) {
      const lastDay = new Date(period.period_year, period.period_month, 0).getDate();
      defaultPayDate = `${period.period_year}-${period.period_month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    } else {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      defaultPayDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    }
    console.log(`📅 默认发薪日期: ${defaultPayDate}`);
    
    // Step 2: 批量查询现有薪资记录
    console.log('🔍 批量查询现有薪资记录...');
    const employeeIds = [...employeeMap.values()].map(e => e.id);
    const { data: existingPayrolls } = await supabase
      .from('payrolls')
      .select('id, employee_id')
      .eq('period_id', periodId)
      .in('employee_id', employeeIds);
    
    const existingPayrollMap = new Map(
      (existingPayrolls || []).map(p => [p.employee_id, p.id])
    );
    console.log(`✅ 找到 ${existingPayrollMap.size} 条现有薪资记录`);
    
    // Step 3: 准备批量数据
    const newPayrollsToInsert = [];
    const allPayrollItems = [];
    const errors: any[] = [];
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
      // 更新进度
      if (globalProgressRef) {
        globalProgressRef.current++;
        setImportProgress(prev => ({
          ...prev,
          global: {
            ...prev.global,
            processedRecords: globalProgressRef.current
          },
          current: {
            ...prev.current,
            processedRecords: rowIndex + 1,
            successCount: rowIndex + 1 - errors.length,
            errorCount: errors.length
          },
          phase: 'importing' as const,
          message: `正在处理第 ${rowIndex + 1}/${data.length} 条记录...`
        }));
      }
      
      try {
        // 从映射表中查找员工
        const employeeName = row['员工姓名'] || row['employee_name'];
        const employee = employeeMap.get(employeeName);
        
        if (!employee) {
          errors.push({
            row: rowIndex + 1,
            message: `找不到员工: ${employeeName}`,
            error: `找不到员工: ${employeeName}` // 保持向后兼容
          });
          continue;
        }
        
        // 检查是否需要创建新的薪资记录
        let payrollId = existingPayrollMap.get(employee.id);
        
        if (!payrollId) {
          // 需要创建新记录，先收集起来
          newPayrollsToInsert.push({
            employee_id: employee.id,
            period_id: periodId,
            pay_date: defaultPayDate,
            status: 'draft' as const,
            _temp_row_index: rowIndex // 临时标记，用于后续关联
          });
        }
        
        // 收集薪资项数据（暂时不设置 payroll_id）
        for (const [columnName, value] of Object.entries(row)) {
          // 跳过非薪资项目列
          if (['员工姓名', 'employee_name', '部门', '职位', 'rowNumber', '_sheetName'].includes(columnName)) {
            continue;
          }
          
          const component = componentMap.get(columnName);
          if (component && value && Number(value) !== 0) {
            allPayrollItems.push({
              _employee_id: employee.id, // 临时标记
              _row_index: rowIndex,       // 临时标记
              component_id: component.id,
              amount: Math.abs(Number(value)),
              period_id: periodId
              // payroll_id 稍后填充
            });
          }
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        errors.push({
          row: rowIndex + 1,
          message: errorMessage,
          error: errorMessage // 保持向后兼容
        });
      }
    }
    
    // Step 4: 批量插入新的薪资记录
    let newPayrollMap = new Map();
    if (newPayrollsToInsert.length > 0) {
      console.log(`💾 批量创建 ${newPayrollsToInsert.length} 条新薪资记录...`);
      
      // 更新进度阶段
      setImportProgress(prev => ({
        ...prev,
        phase: 'creating_payrolls' as const,
        message: `正在创建薪资记录...`
      }));
      
      // 分批插入（每批500条）
      const chunkSize = 500;
      let createdCount = 0;
      for (let i = 0; i < newPayrollsToInsert.length; i += chunkSize) {
        const chunk = newPayrollsToInsert.slice(i, i + chunkSize);
        
        // 移除临时字段
        const cleanChunk = chunk.map(({ _temp_row_index, ...rest }) => rest);
        
        const { data: insertedPayrolls, error: insertError } = await supabase
          .from('payrolls')
          .insert(cleanChunk)
          .select('id, employee_id');
        
        if (insertError) {
          console.error('❌ 批量创建薪资记录失败:', insertError);
          throw new Error(`批量创建薪资记录失败: ${insertError.message}`);
        }
        
        // 更新映射
        (insertedPayrolls || []).forEach(p => {
          newPayrollMap.set(p.employee_id, p.id);
        });
        
        // 更新创建进度
        createdCount += chunk.length;
        setImportProgress(prev => ({
          ...prev,
          message: `已创建 ${createdCount}/${newPayrollsToInsert.length} 条薪资记录`
        }));
      }
      
      console.log(`✅ 成功创建 ${newPayrollMap.size} 条薪资记录`);
    }
    
    // Step 5: 为薪资项填充 payroll_id
    const finalPayrollItems = allPayrollItems.map(item => {
      const payrollId = existingPayrollMap.get(item._employee_id) || 
                       newPayrollMap.get(item._employee_id);
      
      if (!payrollId) {
        console.warn(`⚠️ 无法找到员工 ${item._employee_id} 的薪资记录`);
        return null;
      }
      
      // 移除临时字段，添加 payroll_id
      const { _employee_id, _row_index, ...rest } = item;
      return {
        ...rest,
        payroll_id: payrollId
      };
    }).filter(Boolean);
    
    // Step 6: 批量插入薪资项
    if (finalPayrollItems.length > 0) {
      console.log(`💾 批量插入 ${finalPayrollItems.length} 个薪资项...`);
      
      // 更新进度阶段
      setImportProgress(prev => ({
        ...prev,
        phase: 'inserting_items' as const,
        message: `正在插入薪资项目...`
      }));
      
      // 分批插入（每批1000条）
      const chunkSize = 1000;
      let totalInserted = 0;
      
      for (let i = 0; i < finalPayrollItems.length; i += chunkSize) {
        const chunk = finalPayrollItems.slice(i, i + chunkSize);
        
        const { error: insertError } = await supabase
          .from('payroll_items' as any)
          .insert(chunk);
        
        if (insertError) {
          // 处理重复数据的友好提示
          if (insertError.code === '23505' && insertError.message.includes('unique_payroll_item_component')) {
            console.warn(`⚠️ 批次 ${Math.floor(i / chunkSize) + 1} 包含重复数据，尝试使用 upsert`);
            
            // 改用 upsert 模式
            const { error: upsertError } = await supabase
              .from('payroll_items' as any)
              .upsert(chunk, {
                onConflict: 'payroll_id,component_id',
                ignoreDuplicates: false // 更新已存在的记录
              });
            
            if (upsertError) {
              console.error('❌ Upsert 失败:', upsertError);
              errors.push({
                row: 0,
                message: `薪资项插入失败: ${upsertError.message}`,
                error: `薪资项插入失败: ${upsertError.message}` // 保持向后兼容
              });
              continue;
            }
          } else {
            console.error('❌ 批量插入薪资项失败:', insertError);
            errors.push({
              row: 0,
              message: `薪资项插入失败: ${insertError.message}`,
              error: `薪资项插入失败: ${insertError.message}` // 保持向后兼容
            });
            continue;
          }
        }
        
        totalInserted += chunk.length;
        console.log(`✅ 已插入 ${totalInserted}/${finalPayrollItems.length} 个薪资项`);
        
        // 更新插入进度
        setImportProgress(prev => ({
          ...prev,
          message: `已插入 ${totalInserted}/${finalPayrollItems.length} 个薪资项`
        }));
      }
      
      console.log(`✅ 成功插入所有薪资项`);
    }
    
    // Step 7: 返回结果
    const preliminarySuccessCount = data.length - errors.length;
    console.log(`\n📊 导入完成统计:`);
    console.log(`  ✅ 成功: ${preliminarySuccessCount} 条`);
    console.log(`  ❌ 失败: ${errors.length} 条`);
    
    if (errors.length > 0) {
      console.log('❌ 错误详情:');
      errors.forEach(e => {
        console.log(`  - 第 ${e.row} 行: ${e.message || e.error}`);
      });
    }
    
    // 构建返回结果
    data.forEach((row, index) => {
      const hasError = errors.find(e => e.row === index + 1);
      if (hasError) {
        results.push({ 
          row, 
          success: false, 
          error: hasError.message || hasError.error // 使用message字段，向后兼容error字段
        });
      } else {
        results.push({ row, success: true });
      }
    });
    
    // 最终统计
    const finalSuccessCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log('\n📊 薪资项目导入完成统计:');
    console.log(`✅ 成功: ${finalSuccessCount} 条`);
    console.log(`❌ 失败: ${failureCount} 条`);
    console.log(`📊 总计: ${results.length} 条`);
    console.log(`📈 成功率: ${((finalSuccessCount / results.length) * 100).toFixed(1)}%`);
    
    // 更新最终进度状态
    setImportProgress(prev => ({
      ...prev,
      phase: 'completed' as const,
      message: `导入完成: 成功 ${finalSuccessCount} 条，失败 ${failureCount} 条`,
      current: {
        ...prev.current,
        processedRecords: results.length,
        successCount: finalSuccessCount,
        errorCount: failureCount
      }
    }));
    
    if (failureCount > 0) {
      console.log('\n❌ 失败详情:');
      results.filter(r => !r.success).forEach((result, index) => {
        console.log(`${index + 1}. ${result.error}`);
        console.log(`   数据:`, result.row);
      });
    }
    
    console.log('🏁 importPayrollItems 函数执行完成\n');
    
    return results;
  }, []);

  // 保留原函数以兼容旧代码（默认导入收入项类别和个税）
  const importEarnings = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    globalProgressRef?: { current: number }
  ) => {
    // 使用默认配置：basic_salary + benefits + personal_tax
    return importPayrollItems(data, periodId, undefined, globalProgressRef);
  }, [importPayrollItems]);

  // 导入社保基数数据
  const importContributionBases = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    globalProgressRef?: { current: number }
  ) => {
    const results: any[] = [];
    
    for (const row of data) {
      try {
        // 查找员工
        const employeeName = row['员工姓名'] || row['employee_name'];
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_name', employeeName)
          .single();
        
        if (!employee) {
          throw new Error(`找不到员工: ${employeeName}`);
        }
        
        // 社保基数字段映射 - 扩展支持更多基数类型
        const baseFields = [
          { field: '养老保险基数', baseType: 'pension_base' },
          { field: '医疗保险基数', baseType: 'medical_base' },
          { field: '失业保险基数', baseType: 'unemployment_base' },
          { field: '工伤保险基数', baseType: 'work_injury_base' },
          { field: '生育保险基数', baseType: 'maternity_base' },
          { field: '住房公积金基数', baseType: 'housing_fund_base' },
          { field: '职业年金基数', baseType: 'occupational_annuity_base' },
          { field: '大病医疗基数', baseType: 'serious_illness_base' },
          // 兼容旧的字段名称
          { field: '养老基数', baseType: 'pension_base' },
          { field: '医疗基数', baseType: 'medical_base' },
          { field: '失业基数', baseType: 'unemployment_base' },
          { field: '工伤基数', baseType: 'work_injury_base' },
          { field: '生育基数', baseType: 'maternity_base' },
          { field: '公积金基数', baseType: 'housing_fund_base' }
        ];
        
        // 准备基数数据
        const baseData: any = {
          employee_id: employee.id,
          period_id: periodId,  // 使用正确的字段名 period_id
          effective_date: new Date().toISOString().split('T')[0]
        };
        
        // 使用Set避免重复处理相同的基数类型
        const processedBaseTypes = new Set<string>();
        
        for (const { field, baseType } of baseFields) {
          // 如果该基数类型已处理过，跳过
          if (processedBaseTypes.has(baseType)) {
            continue;
          }
          
          const value = row[field] || row[baseType];
          if (value && Number(value) > 0) {
            baseData[baseType] = Number(value);
            processedBaseTypes.add(baseType);
          }
        }
        
        // 插入或更新社保基数
        const { error } = await supabase
          .from('employee_contribution_bases')
          .upsert(baseData, {
            onConflict: 'employee_id,period_id'
          });
        
        if (error) throw error;
        
        results.push({ row, success: true });
      } catch (error) {
        results.push({ 
          row, 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      } finally {
        // 更新全局进度和当前数据组进度
        if (globalProgressRef) {
          globalProgressRef.current++;
          setImportProgress(prev => ({
            ...prev,
            global: {
              ...prev.global,
              processedRecords: globalProgressRef.current
            },
            current: {
              ...prev.current,
              processedRecords: prev.current.processedRecords + 1
            }
          }));
        }
      }
    }
    
    return results;
  }, []);

  // 导入人员类别分配（使用批量插入优化）
  const importCategoryAssignments = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    globalProgressRef?: { current: number }
  ) => {
    console.log('🔍 开始导入人员类别分配（批量优化版）');
    console.log('📊 数据行数:', data.length);
    console.log('📋 第一行数据示例:', data[0]);
    
    const results: any[] = [];
    const errors: any[] = [];
    
    // Step 1: 批量预加载所有需要的数据
    console.log('\n🚀 批量预加载相关数据...');
    
    // 预加载所有员工
    const employeeNames = [...new Set(data.map(row => 
      row['员工姓名'] || row['姓名'] || row['employee_name'] || row['name']
    ).filter(Boolean))];
    
    console.log(`📊 需要查询的员工数量: ${employeeNames.length}`);
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, employee_name')
      .in('employee_name', employeeNames);
    
    const employeeMap = new Map((allEmployees || []).map(emp => [emp.employee_name, emp]));
    console.log(`✅ 预加载 ${employeeMap.size} 个员工数据`);
    
    // 预加载所有人员类别
    const categoryNames = [...new Set(data.map(row => 
      row['人员类别名称'] || row['人员类别'] || row['类别']
    ).filter(Boolean))];
    
    console.log(`📊 需要查询的类别数量: ${categoryNames.length}`);
    const { data: allCategories } = await supabase
      .from('employee_categories')
      .select('id, name')
      .in('name', categoryNames);
    
    const categoryMap = new Map((allCategories || []).map(cat => [cat.name, cat]));
    console.log(`✅ 预加载 ${categoryMap.size} 个类别数据`);
    
    // 预加载现有分配记录
    const employeeIds = Array.from(employeeMap.values()).map(emp => emp.id);
    const { data: existingAssignments } = await supabase
      .from('employee_category_assignments')
      .select('id, employee_id')
      .in('employee_id', employeeIds)
      .eq('period_id', periodId);
    
    const existingMap = new Map((existingAssignments || []).map(a => [a.employee_id, a]));
    console.log(`✅ 找到 ${existingMap.size} 条现有分配记录`);
    
    // Step 2: 准备批量数据
    console.log('\n📋 准备批量插入/更新数据...');
    const toInsert = [];
    const toUpdate = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // 查找员工
        const employeeName = row['员工姓名'] || row['姓名'] || row['employee_name'] || row['name'];
        if (!employeeName) {
          throw new Error(`第 ${i + 1} 行: 缺少员工姓名`);
        }
        
        const employee = employeeMap.get(employeeName);
        if (!employee) {
          throw new Error(`第 ${i + 1} 行: 找不到员工 ${employeeName}`);
        }
        
        // 查找类别
        const categoryName = row['人员类别名称'] || row['人员类别'] || row['类别'];
        if (!categoryName) {
          throw new Error(`第 ${i + 1} 行: 缺少人员类别`);
        }
        
        const category = categoryMap.get(categoryName);
        if (!category) {
          throw new Error(`第 ${i + 1} 行: 找不到人员类别 ${categoryName}`);
        }
        
        // 检查是否需要更新
        const existing = existingMap.get(employee.id);
        
        if (existing) {
          toUpdate.push({
            id: existing.id,
            employee_category_id: category.id
          });
        } else {
          toInsert.push({
            employee_id: employee.id,
            employee_category_id: category.id,
            period_id: periodId
          });
        }
        
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : '未知错误',
          data: row
        });
      }
      
      // 更新进度
      if (globalProgressRef) {
        globalProgressRef.current++;
        setImportProgress(prev => ({
          ...prev,
          global: {
            ...prev.global,
            processedRecords: globalProgressRef.current
          },
          current: {
            ...prev.current,
            processedRecords: i + 1
          }
        }));
      }
    }
    
    // Step 3: 执行批量操作
    console.log('\n🚀 执行批量数据库操作...');
    console.log(`📊 待插入: ${toInsert.length} 条, 待更新: ${toUpdate.length} 条`);
    
    // 批量插入新记录（每批 500 条）
    if (toInsert.length > 0) {
      const insertChunkSize = 500;
      for (let i = 0; i < toInsert.length; i += insertChunkSize) {
        const chunk = toInsert.slice(i, i + insertChunkSize);
        console.log(`💾 插入第 ${Math.floor(i / insertChunkSize) + 1} 批，共 ${chunk.length} 条`);
        
        const { error: insertError } = await supabase
          .from('employee_category_assignments')
          .insert(chunk);
        
        if (insertError) {
          console.error('❌ 批量插入失败:', insertError);
          chunk.forEach(() => {
            errors.push({
              message: `批量插入失败: ${insertError.message}`
            });
          });
        }
      }
    }
    
    // 批量更新现有记录
    if (toUpdate.length > 0) {
      console.log(`📝 批量更新 ${toUpdate.length} 条记录`);
      // Supabase 不支持批量更新，需要逐条更新
      // 但可以使用 Promise.all 并行执行
      const updatePromises = toUpdate.map(item => 
        supabase
          .from('employee_category_assignments')
          .update({ employee_category_id: item.employee_category_id })
          .eq('id', item.id)
      );
      
      const updateResults = await Promise.allSettled(updatePromises);
      updateResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          errors.push({
            message: `更新失败: ${result.reason}`
          });
        }
      });
    }
    
    // Step 4: 构建返回结果
    data.forEach((row, index) => {
      const hasError = errors.find(e => e.row === index + 1);
      if (hasError) {
        results.push({ 
          row, 
          success: false, 
          error: hasError.message 
        });
      } else {
        results.push({ row, success: true });
      }
    });
    
    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n📊 人员类别导入完成统计:');
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${failCount} 条`);
    console.log(`📊 总计: ${results.length} 条`);
    console.log(`📈 成功率: ${((successCount / results.length) * 100).toFixed(1)}%`);
    
    if (failCount > 0) {
      console.log('\n❌ 失败详情:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    }
    
    return results;
  }, []);

  // 导入岗位分配数据（使用批量插入优化）
  const importJobAssignments = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    globalProgressRef?: { current: number }
  ) => {
    console.log('🏢 开始导入职务分配数据（批量优化版）');
    console.log(`📊 数据行数: ${data.length}`);
    console.log(`🆔 周期ID: ${periodId}`);
    console.log('📋 原始数据预览:', data.slice(0, 3));
    
    const results: any[] = [];
    const errors: any[] = [];
    
    // Step 1: 批量预加载所有相关数据
    console.log('\n🚀 批量预加载职务分配相关数据...');
    
    // 1. 预加载所有员工
    const employeeNames = [...new Set(data.map(row => 
      row['员工姓名'] || row['employee_name']
    ).filter(Boolean))];
    
    console.log(`📊 需要查询的员工数量: ${employeeNames.length}`);
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, employee_name')
      .in('employee_name', employeeNames);
    
    const employeeMap = new Map((allEmployees || []).map(emp => [emp.employee_name, emp]));
    console.log(`✅ 预加载 ${employeeMap.size} 个员工数据`);
    
    // 2. 预加载所有部门
    const departmentNames = [...new Set(data.map(row => 
      row['部门'] || row['department_name']
    ).filter(Boolean))];
    
    console.log(`📊 需要查询的部门数量: ${departmentNames.length}`);
    const { data: allDepartments } = await supabase
      .from('departments')
      .select('id, name')
      .in('name', departmentNames);
    
    const departmentMap = new Map((allDepartments || []).map(dept => [dept.name, dept]));
    console.log(`✅ 预加载 ${departmentMap.size} 个部门数据`);
    
    // 3. 预加载所有职位
    const positionNames = [...new Set(data.map(row => 
      row['职位'] || row['position_name']
    ).filter(Boolean))];
    
    console.log(`📊 需要查询的职位数量: ${positionNames.length}`);
    const { data: allPositions } = await supabase
      .from('positions')
      .select('id, name')
      .in('name', positionNames);
    
    const positionMap = new Map((allPositions || []).map(pos => [pos.name, pos]));
    console.log(`✅ 预加载 ${positionMap.size} 个职位数据`);
    
    // 4. 预加载所有职级（如果有）
    const rankNames = [...new Set(data.map(row => 
      row['职级'] || row['rank_name']
    ).filter(Boolean))];
    
    let rankMap = new Map();
    if (rankNames.length > 0) {
      console.log(`📊 需要查询的职级数量: ${rankNames.length}`);
      const { data: allRanks } = await supabase
        .from('job_ranks')
        .select('id, name')
        .in('name', rankNames);
      
      rankMap = new Map((allRanks || []).map(rank => [rank.name, rank]));
      console.log(`✅ 预加载 ${rankMap.size} 个职级数据`);
    }
    
    // Step 2: 准备批量数据
    console.log('\n📋 准备批量插入数据...');
    const toInsert = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // 查找员工
        const employeeName = row['员工姓名'] || row['employee_name'];
        if (!employeeName) {
          throw new Error(`第 ${i + 1} 行: 缺少员工姓名`);
        }
        
        const employee = employeeMap.get(employeeName);
        if (!employee) {
          throw new Error(`第 ${i + 1} 行: 找不到员工 ${employeeName}`);
        }
        
        // 准备岗位分配数据
        const assignmentData: any = {
          employee_id: employee.id,
          period_id: periodId,
          created_at: new Date().toISOString()
        };
        
        // 处理Excel中的创建时间（如果有）
        const excelCreatedAt = row['创建时间'] || row['created_at'] || row['创建日期'];
        if (excelCreatedAt) {
          try {
            const parsedDate = new Date(excelCreatedAt);
            if (!isNaN(parsedDate.getTime())) {
              assignmentData.created_at = parsedDate.toISOString();
            }
          } catch {
            // 使用默认时间
          }
        }
        
        // 查找部门
        const departmentName = row['部门'] || row['department_name'];
        if (departmentName) {
          const department = departmentMap.get(departmentName);
          if (!department) {
            throw new Error(`第 ${i + 1} 行: 找不到部门 ${departmentName}`);
          }
          assignmentData.department_id = department.id;
        } else {
          throw new Error(`第 ${i + 1} 行: 缺少部门信息`);
        }
        
        // 查找职位
        const positionName = row['职位'] || row['position_name'];
        if (positionName) {
          const position = positionMap.get(positionName);
          if (!position) {
            throw new Error(`第 ${i + 1} 行: 找不到职位 ${positionName}`);
          }
          assignmentData.position_id = position.id;
        } else {
          throw new Error(`第 ${i + 1} 行: 缺少职位信息`);
        }
        
        // 查找职级（可选）
        const rankName = row['职级'] || row['rank_name'];
        if (rankName) {
          const rank = rankMap.get(rankName);
          if (rank) {
            assignmentData.rank_id = rank.id;
          }
        }
        
        toInsert.push(assignmentData);
        
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : '未知错误',
          data: row
        });
      }
      
      // 更新进度
      if (globalProgressRef) {
        globalProgressRef.current++;
        setImportProgress(prev => ({
          ...prev,
          global: {
            ...prev.global,
            processedRecords: globalProgressRef.current
          },
          current: {
            ...prev.current,
            processedRecords: i + 1
          }
        }));
      }
    }
    
    // Step 3: 执行批量插入
    console.log('\n🚀 执行批量数据库操作...');
    console.log(`📊 待插入: ${toInsert.length} 条`);
    
    if (toInsert.length > 0) {
      const insertChunkSize = 500;
      for (let i = 0; i < toInsert.length; i += insertChunkSize) {
        const chunk = toInsert.slice(i, i + insertChunkSize);
        console.log(`💾 插入第 ${Math.floor(i / insertChunkSize) + 1} 批，共 ${chunk.length} 条`);
        
        const { error: insertError } = await supabase
          .from('employee_job_history')
          .insert(chunk);
        
        if (insertError) {
          console.error('❌ 批量插入失败:', insertError);
          chunk.forEach(() => {
            errors.push({
              message: `批量插入失败: ${insertError.message}`
            });
          });
        }
      }
    }
    
    // Step 4: 构建返回结果
    data.forEach((row, index) => {
      const hasError = errors.find(e => e.row === index + 1);
      if (hasError) {
        results.push({ 
          row, 
          success: false, 
          error: hasError.message 
        });
      } else {
        results.push({ row, success: true });
      }
    });
    
    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n📊 职务分配导入完成统计:');
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${failCount} 条`);
    console.log(`📊 总计: ${results.length} 条`);
    console.log(`📈 成功率: ${((successCount / results.length) * 100).toFixed(1)}%`);
    
    if (failCount > 0) {
      console.log('\n❌ 失败详情:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    }
    
    return results;
  }, []);

  // 导入扣除项数据
  const importDeductions = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    globalProgressRef?: { current: number }
  ) => {
    const results: any[] = [];
    
    for (const row of data) {
      try {
        // 查找员工
        const employeeName = row['员工姓名'] || row['employee_name'];
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_name', employeeName)
          .single();
        
        if (!employee) {
          throw new Error(`找不到员工: ${employeeName}`);
        }
        
        // 查找或创建薪资记录
        let payrollId;
        const { data: existingPayroll } = await supabase
          .from('payrolls')
          .select('id')
          .match({ 
            employee_id: employee.id,
            period_id: periodId
          })
          .single();
        
        if (existingPayroll) {
          payrollId = existingPayroll.id;
        } else {
          // 获取薪资周期的发薪日期
          const { data: period } = await supabase
            .from('payroll_periods')
            .select('pay_date, period_year, period_month')
            .eq('id', periodId)
            .single();
          
          // 使用周期的发薪日期，如果没有则使用月末最后一天
          let payDate: string;
          if (period?.pay_date) {
            payDate = period.pay_date;
          } else if (period?.period_year && period?.period_month) {
            // 计算该月最后一天作为默认发薪日期
            const lastDay = new Date(period.period_year, period.period_month, 0).getDate();
            payDate = `${period.period_year}-${period.period_month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
          } else {
            // 最后的备选：当前月的最后一天
            const now = new Date();
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            payDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
          }
          
          // 只创建框架记录，不计算总额（由存储过程负责）
          const { data: newPayroll } = await supabase
            .from('payrolls')
            .insert({
              employee_id: employee.id,
              period_id: periodId,
              pay_date: payDate,
              status: 'draft'
              // 不设置 gross_pay、total_deductions、net_pay
              // 这些字段由存储过程计算
            })
            .select()
            .single();
          
          payrollId = newPayroll?.id;
        }
        
        if (!payrollId) {
          throw new Error('无法创建薪资记录');
        }
        
        // 导入扣除项
        const deductionItems = [];
        const deductionFields = [
          { field: '养老保险', componentName: '养老保险个人应缴费额' },
          { field: '医疗保险', componentName: '医疗保险个人应缴费额' },
          { field: '失业保险', componentName: '失业保险个人应缴费额' },
          { field: '工伤保险', componentName: '工伤保险个人应缴费额' },
          { field: '生育保险', componentName: '生育保险个人应缴费额' },
          { field: '住房公积金', componentName: '住房公积金个人应缴费额' },
          { field: '个人所得税', componentName: '个人所得税' }
        ];
        
        for (const { field, componentName } of deductionFields) {
          const amount = row[field];
          if (amount && Number(amount) > 0) {
            // 查找组件ID - 使用正确的name字段
            const { data: component } = await supabase
              .from('salary_components')
              .select('id')
              .eq('name', componentName)
              .single();
            
            if (component) {
              deductionItems.push({
                payroll_id: payrollId,
                component_id: component.id,
                amount: Number(amount)
                // period_id 不再需要，由存储过程处理
              });
            }
          }
        }
        
        // 批量插入薪资项
        if (deductionItems.length > 0) {
          await supabase
            .from('payroll_items' as any)
            .insert(deductionItems);
        }
        
        results.push({ row, success: true });
      } catch (error) {
        results.push({ 
          row, 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      } finally {
        // 更新全局进度和当前数据组进度
        if (globalProgressRef) {
          globalProgressRef.current++;
          setImportProgress(prev => ({
            ...prev,
            global: {
              ...prev.global,
              processedRecords: globalProgressRef.current
            },
            current: {
              ...prev.current,
              processedRecords: prev.current.processedRecords + 1
            }
          }));
        }
      }
    }
    
    return results;
  }, []);

  // 主导入函数
  const importExcel = useMutation({
    mutationFn: async (params: {
      file: File;
      config: ImportConfig;
      periodId: string;
    }): Promise<ImportResult> => {
      const result: ImportResult = {
        success: false,
        totalRows: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [],
        warnings: []
      };
      
      try {
        // 1. 解析Excel  
        setImportProgress(prev => ({ ...prev, phase: 'parsing' }));
        
        // 处理dataGroup参数（可能是单个或数组）
        const dataGroups = Array.isArray(params.config.dataGroup) 
          ? params.config.dataGroup 
          : [params.config.dataGroup];
        
        // 如果是"全部"，则按顺序处理四个数据组
        const actualDataGroups = dataGroups.includes('all') 
          ? ['earnings', 'bases', 'category', 'job'] as ImportDataGroup[]
          : dataGroups;
        
        console.log('📋 将处理的数据组:', actualDataGroups);
        console.log('📊 选择的数据组数量:', actualDataGroups.length);
        
        // 获取数据组显示名称
        const getDataGroupDisplayName = (group: ImportDataGroup): string => {
          const groupNames: Record<ImportDataGroup, string> = {
            [ImportDataGroup.EARNINGS]: '薪资项目明细',
            [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
            [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别',
            [ImportDataGroup.JOB_ASSIGNMENT]: '职务信息',
            [ImportDataGroup.ALL]: '全部数据'
          };
          return groupNames[group] || group;
        };
        
        // 3. 计算总行数并初始化进度
        let totalRowsToProcess = 0;
        const dataGroupInfo: { group: ImportDataGroup; data: ExcelDataRow[] }[] = [];
        
        // 预解析所有数据组以计算总行数
        for (const dataGroup of actualDataGroups) {
          console.log(`🔍 预解析数据组: ${dataGroup}`);
          const groupData = await parseExcelFile(params.file, dataGroup);
          console.log(`📊 数据组 "${dataGroup}" 解析到 ${groupData.length} 行数据`);
          if (groupData.length > 0) {
            totalRowsToProcess += groupData.length;
            dataGroupInfo.push({ group: dataGroup, data: groupData });
            result.totalRows += groupData.length;
            console.log(`✅ 数据组 "${dataGroup}" 添加到处理列表`);
          } else {
            console.log(`⚠️ 数据组 "${dataGroup}" 没有数据，跳过`);
          }
        }
        
        console.log('📋 最终要处理的数据组信息:', dataGroupInfo.map(item => ({ 
          group: item.group, 
          dataCount: item.data.length 
        })));
        console.log('📊 选择的数据组数量:', actualDataGroups.length);
        console.log('📊 有数据的数据组数量:', dataGroupInfo.length);
        console.log('📊 总行数:', totalRowsToProcess);
        
        // 设置总进度 - 使用选择的数据组数量而不是有数据的数据组数量
        console.log('🎯 设置总进度 - 选择的数据组数量:', actualDataGroups.length);
        console.log('🎯 设置总进度 - 有数据的数据组数量:', dataGroupInfo.length);
        console.log('🎯 设置总进度 - 总记录数:', totalRowsToProcess);
        console.log('🎯 设置总进度 - 数据组列表:', actualDataGroups.map(item => getDataGroupDisplayName(item)));
        
        setImportProgress(prev => ({ 
          ...prev, 
          phase: 'importing',
          global: {
            totalGroups: actualDataGroups.length, // 使用选择的数据组数量
            processedGroups: 0,
            totalRecords: totalRowsToProcess,
            processedRecords: 0,
            dataGroups: actualDataGroups.map(item => getDataGroupDisplayName(item)) // 显示所有选择的组
          },
          current: {
            groupName: '',
            groupIndex: 0,
            sheetName: '',
            totalRecords: 0,
            processedRecords: 0
          }
        }));
        
        // 4. 按顺序导入数据
        const globalProgressRef = { current: 0 };
        let processedGroupsCount = 0; // 跟踪实际处理的组数
        
        // 遍历所有选择的数据组（包括没有数据的）
        for (let actualGroupIndex = 0; actualGroupIndex < actualDataGroups.length; actualGroupIndex++) {
          const currentDataGroup = actualDataGroups[actualGroupIndex];
          console.log(`\n🔄 检查数据组: ${currentDataGroup}`);
          
          // 查找该组是否有数据
          const dataGroupItem = dataGroupInfo.find(item => item.group === currentDataGroup);
          
          if (!dataGroupItem) {
            console.log(`⚠️ 数据组 "${currentDataGroup}" 没有数据，跳过处理但计入进度`);
            processedGroupsCount++;
            
            // 更新已完成的数据组数（包括跳过的组）
            setImportProgress(prev => ({
              ...prev,
              global: {
                ...prev.global,
                processedGroups: processedGroupsCount
              }
            }));
            continue;
          }
          
          const { group: dataGroup, data: groupData } = dataGroupItem;
          console.log(`🔄 开始处理数据组: ${dataGroup}`);
          console.log(`📊 数据组 "${dataGroup}" 有 ${groupData.length} 行数据`);
          
          // 获取工作表名称
          const getSheetName = (group: ImportDataGroup): string => {
            const sheetNames: Record<ImportDataGroup, string> = {
              [ImportDataGroup.EARNINGS]: '薪资项目',
              [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
              [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别',
              [ImportDataGroup.JOB_ASSIGNMENT]: '职务信息',
              [ImportDataGroup.ALL]: '全部数据'
            };
            return sheetNames[group] || group;
          };
          
          // 更新当前数据组进度（重置当前组进度，但保持全局进度）
          setImportProgress(prev => ({
            ...prev,
            current: {
              groupName: getDataGroupDisplayName(dataGroup),
              groupIndex: actualGroupIndex, // 使用实际的组索引
              sheetName: getSheetName(dataGroup),
              totalRecords: groupData.length,
              processedRecords: 0
            }
          }));
          
          // 验证数据（如果需要）
          if (params.config.options?.validateBeforeImport) {
            setImportProgress(prev => ({ ...prev, phase: 'validating' }));
            const validation = await validateImportData(groupData, params.config);
            result.errors.push(...validation.errors);
            result.warnings.push(...validation.warnings);
            
            if (!validation.isValid) {
              console.log(`❌ 数据组 "${dataGroup}" 验证失败，跳过`);
              continue;
            }
          }
          
          // 根据数据组类型执行对应的导入
          if (dataGroup === 'earnings') {
            console.log(`💰 导入薪资项目明细：${groupData.length} 行`);
            const earningsResults = await importPayrollItems(groupData, params.periodId, {
              includeCategories: ['basic_salary', 'benefits', 'personal_tax']
            }, globalProgressRef);
            earningsResults.forEach(r => {
              if (r.success) result.successCount++;
              else {
                result.failedCount++;
                result.errors.push({
                  row: groupData.indexOf(r.row) + 2,
                  message: r.error || '导入失败'
                });
              }
            });
          }
          
          else if (dataGroup === 'bases') {
            console.log(`🏦 导入缴费基数数据：${groupData.length} 行`);
            const basesResults = await importContributionBases(groupData, params.periodId, globalProgressRef);
            basesResults.forEach(r => {
              if (r.success) result.successCount++;
              else {
                result.failedCount++;
                result.errors.push({
                  row: groupData.indexOf(r.row) + 2,
                  message: r.error || '导入失败'
                });
              }
            });
          }
          
          else if (dataGroup === 'category') {
            console.log(`👥 导入人员类别数据：${groupData.length} 行`);
            const categoryResults = await importCategoryAssignments(groupData, params.periodId, globalProgressRef);
            
            console.log('📊 人员类别导入结果:', categoryResults.length, '条');
            categoryResults.forEach(r => {
              if (r.success) {
                result.successCount++;
                console.log('✅ 成功导入:', r.row['员工姓名'] || r.row['姓名']);
              } else {
                result.failedCount++;
                result.errors.push({
                  row: groupData.indexOf(r.row) + 2,
                  message: r.error || '导入失败'
                });
                console.error('❌ 导入失败:', r.error);
              }
            });
          }
          
          else if (dataGroup === 'job') {
            console.log(`🏢 导入岗位分配数据：${groupData.length} 行`);
            const jobResults = await importJobAssignments(groupData, params.periodId, globalProgressRef);
            jobResults.forEach(r => {
              if (r.success) result.successCount++;
              else {
                result.failedCount++;
                result.errors.push({
                  row: groupData.indexOf(r.row) + 2,
                  message: r.error || '导入失败'
                });
              }
            });
          }
          
          console.log(`✅ 数据组 "${dataGroup}" 处理完成`);
          processedGroupsCount++;
          console.log(`📊 更新已完成组数: ${processedGroupsCount} / ${actualDataGroups.length}`);
          
          // 更新已完成的数据组数
          setImportProgress(prev => ({
            ...prev,
            global: {
              ...prev.global,
              processedGroups: processedGroupsCount
            }
          }));
        }
        
        result.success = result.failedCount === 0;
        setImportProgress(prev => ({ ...prev, phase: 'completed' }));
        
      } catch (error) {
        result.success = false;
        result.errors.push({
          row: 0,
          message: error instanceof Error ? error.message : '导入失败'
        });
        setImportProgress(prev => ({ ...prev, phase: 'error' }));
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  // 生成Excel导出数据
  const generateExcelBuffer = useCallback(async (
    data: any[],
    config: ExportConfig
  ): Promise<ArrayBuffer> => {
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 创建工作表数据
    const wsData = data.map(row => ({
      '员工编号': row.employee_code,
      '员工姓名': row.employee_name,
      '部门': row.department_name,
      '职位': row.position_name,
      '薪资月份': row.pay_month,
      '基本工资': row.basic_salary,
      '岗位工资': row.position_salary,
      '绩效奖金': row.performance_bonus,
      '加班费': row.overtime_pay,
      '津贴': row.allowance,
      '补贴': row.subsidy,
      '应发工资': row.gross_pay,
      '养老保险': row.pension_insurance,
      '医疗保险': row.medical_insurance,
      '失业保险': row.unemployment_insurance,
      '工伤保险': row.work_injury_insurance,
      '生育保险': row.maternity_insurance,
      '住房公积金': row.housing_fund,
      '个人所得税': row.income_tax,
      '扣款合计': row.total_deductions,
      '实发工资': row.net_pay,
      '状态': row.status === 'draft' ? '草稿' : 
             row.status === 'approved' ? '已审批' :
             row.status === 'paid' ? '已发放' : row.status
    }));
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 员工编号
      { wch: 12 }, // 员工姓名
      { wch: 15 }, // 部门
      { wch: 15 }, // 职位
      { wch: 10 }, // 薪资月份
      { wch: 10 }, // 基本工资
      { wch: 10 }, // 岗位工资
      { wch: 10 }, // 绩效奖金
      { wch: 10 }, // 加班费
      { wch: 10 }, // 津贴
      { wch: 10 }, // 补贴
      { wch: 12 }, // 应发工资
      { wch: 10 }, // 养老保险
      { wch: 10 }, // 医疗保险
      { wch: 10 }, // 失业保险
      { wch: 10 }, // 工伤保险
      { wch: 10 }, // 生育保险
      { wch: 10 }, // 住房公积金
      { wch: 10 }, // 个人所得税
      { wch: 12 }, // 扣款合计
      { wch: 12 }, // 实发工资
      { wch: 10 }  // 状态
    ];
    ws['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '薪资项目明细');
    
    // 生成Excel文件
    const wbout = XLSX.write(wb, { 
      bookType: config.format || 'xlsx', 
      type: 'array' 
    });
    
    return wbout;
  }, []);

  // 导出Excel
  const exportExcel = useMutation({
    mutationFn: async (params: ExportConfig) => {
      // 获取数据
      const { data, error } = await supabase.rpc('quick_export_payroll_summary', {
        p_period: params.filters?.periodId || new Date().toISOString().slice(0, 7)
      });
      
      if (error) {
        handleError(error, { customMessage: '导出数据失败' });
        throw error;
      }
      
      // 生成Excel
      const buffer = await generateExcelBuffer((data || []) as any[], params);
      
      // 创建下载链接
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `薪资项目明细_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    }
  });

  // 下载导入模板
  const downloadTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      // 获取模板配置
      const { data: template, error } = await supabase
        .from('import_templates' as any)
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (error) {
        handleError(error, { customMessage: '获取模板失败' });
        throw error;
      }
      
      // 生成模板Excel
      const wb = XLSX.utils.book_new();
      const wsData = (template as any).sample_data || [];
      const ws = XLSX.utils.json_to_sheet(wsData);
      
      // 设置列宽
      if ((template as any).column_widths) {
        ws['!cols'] = (template as any).column_widths;
      }
      
      XLSX.utils.book_append_sheet(wb, ws, '数据模板');
      
      // 添加说明工作表
      if ((template as any).instructions) {
        const instructionWs = XLSX.utils.aoa_to_sheet([
          ['导入说明'],
          [''],
          ...(template as any).instructions.split('\n').map((line: string) => [line])
        ]);
        XLSX.utils.book_append_sheet(wb, instructionWs, '说明');
      }
      
      // 下载文件
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(template as any).name || 'template'}_模板.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    }
  });

  // 重置导入进度
  const resetImportProgress = () => {
    setImportProgress({
      phase: 'parsing',
      global: {
        totalGroups: 0,
        processedGroups: 0,
        totalRecords: 0,
        processedRecords: 0,
        dataGroups: []
      },
      current: {
        groupName: '',
        groupIndex: 0,
        sheetName: '',
        totalRecords: 0,
        processedRecords: 0
      },
      errors: [],
      warnings: []
    });
  };

  return {
    // 操作
    mutations: {
      importExcel,
      exportExcel,
      downloadTemplate
    },

    // 进度状态
    importProgress,
    resetImportProgress,

    // 操作方法
    actions: {
      importExcel: importExcel.mutate,
      exportExcel: exportExcel.mutate,
      downloadTemplate: downloadTemplate.mutate,
      parseExcelFile,
      validateImportData
    },

    // 加载状态
    loading: {
      import: importExcel.isPending,
      export: exportExcel.isPending,
      template: downloadTemplate.isPending
    },

    // 工具函数
    utils: {
      // 分析Excel字段映射
      analyzeFieldMapping,
      
      // 获取字段映射分析结果
      getFieldMappingAnalysis: () => {
        return importProgress.current.fieldMappingAnalysis;
      },

      // 获取导入阶段描述
      getPhaseDescription: (phase: ImportProgress['phase']) => {
        const descriptions: Record<ImportProgress['phase'], string> = {
          parsing: '正在解析文件...',
          validating: '正在验证数据...',
          importing: '正在导入数据...',
          creating_payrolls: '正在创建薪资记录...',
          inserting_items: '正在插入薪资项...',
          completed: '导入完成',
          error: '导入失败'
        };
        return descriptions[phase] || phase;
      },

      // 获取进度百分比
      getProgressPercentage: () => {
        if (importProgress.global.totalRecords === 0) return 0;
        return Math.round(
          (importProgress.global.processedRecords / importProgress.global.totalRecords) * 100
        );
      },
      
      // 获取当前数据组进度百分比
      getCurrentGroupPercentage: () => {
        if (importProgress.current.totalRecords === 0) return 0;
        return Math.round(
          (importProgress.current.processedRecords / importProgress.current.totalRecords) * 100
        );
      },

      // 格式化文件大小
      formatFileSize: (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
      }
    }
  };
}