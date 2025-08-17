import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import * as XLSX from 'xlsx';
import type { Database } from '@/types/supabase';
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

// 导入配置
export interface ImportConfig {
  mode: 'append' | 'replace' | 'update';
  validateBeforeImport: boolean;
  skipDuplicates: boolean;
  dataGroups: string[];
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

// 导入进度
export interface ImportProgress {
  phase: 'parsing' | 'validating' | 'importing' | 'completed' | 'error';
  
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
  };
  
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
            'earnings': ['薪资项目', '收入数据', '薪资数据', '工资'],
            'bases': ['缴费基数', '社保基数', '公积金基数'],
            'category': ['人员类别', '员工类别', '人员分类'],
            'job': ['职务信息', '岗位信息', '部门职位', '职务分配', '岗位分配']
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

  // 定义各数据组的验证规则
  const validationRules: Record<string, ValidationRule[]> = {
    earnings: [
      { field: '员工姓名', required: true },
      { field: '基本工资', type: 'number', min: 0, max: 1000000 },
      { field: '岗位工资', type: 'number', min: 0, max: 1000000 },
      { field: '绩效奖金', type: 'number', min: 0, max: 1000000 },
      { field: '加班费', type: 'number', min: 0 },
      { field: '津贴', type: 'number', min: 0 },
      { field: '补贴', type: 'number', min: 0 }
    ],
    deductions: [
      { field: '员工姓名', required: true },
      { field: '养老保险', type: 'number', min: 0, max: 50000 },
      { field: '医疗保险', type: 'number', min: 0, max: 50000 },
      { field: '失业保险', type: 'number', min: 0, max: 50000 },
      { field: '工伤保险', type: 'number', min: 0, max: 50000 },
      { field: '生育保险', type: 'number', min: 0, max: 50000 },
      { field: '住房公积金', type: 'number', min: 0, max: 50000 },
      { field: '个人所得税', type: 'number', min: 0, max: 100000 }
    ],
    contribution_bases: [
      { field: '员工姓名', required: true },
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
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // 根据选择的数据组进行验证
    config.dataGroups.forEach(group => {
      const groupName = group.toLowerCase().replace('_', '');
      const rules = validationRules[groupName] || validationRules[group] || [];
      
      data.forEach((row, index) => {
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
          
          const error = validateField(value, rule);
          if (error) {
            errors.push({
              row: index + 2,
              field: fieldName,
              message: error
            });
          }
        });
      });
    });
    
    // 添加一些警告信息
    if (data.length > 1000) {
      warnings.push({
        row: 0,
        message: `数据量较大（${data.length}条），导入可能需要较长时间`
      });
    }
    
    // 检查是否有重复的员工
    const employeeNames = data.map(row => row['员工姓名'] || row['employee_name']).filter(Boolean);
    const duplicates = employeeNames.filter((name, index) => employeeNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      warnings.push({
        row: 0,
        message: `发现重复的员工：${[...new Set(duplicates)].join(', ')}`
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // 导入薪资项目明细数据（动态获取薪资组件）
  const importPayrollItems = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    options?: {
      includeCategories?: SalaryComponentCategory[];  // 要导入的薪资组件类别，默认：['basic_salary', 'benefits', 'personal_tax']
    },
    globalProgressRef?: { current: number }
  ) => {
    const results = [];
    
    // 默认配置：导入所有收入项类别(basic_salary, benefits) + 个人所得税(personal_tax)
    const defaultCategories: SalaryComponentCategory[] = ['basic_salary', 'benefits', 'personal_tax'];
    const includeCategories = options?.includeCategories || defaultCategories;
    
    // 获取指定类别的薪资组件
    const { data: salaryComponents, error: componentsError } = await supabase
      .from('salary_components')
      .select('id, name, type, category')
      .in('category', includeCategories);
    
    if (componentsError || !salaryComponents) {
      throw new Error('无法获取薪资组件列表');
    }
    
    // 创建组件名称到ID的映射
    const componentMap = new Map(
      salaryComponents.map(comp => [comp.name, comp])
    );
    
    // 调试：打印获取到的组件
    console.log('导入类别:', includeCategories);
    console.log('获取到的薪资组件:', salaryComponents.map(c => ({ name: c.name, type: c.type, category: c.category })));
    
    for (const row of data) {
      try {
        // 查找员工
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .or(`employee_name.eq.${row['员工姓名']},employee_name.eq.${row['employee_name']}`)
          .single();
        
        if (!employee) {
          throw new Error(`找不到员工: ${row['员工姓名'] || row['employee_name']}`);
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
          // 只创建框架记录，不计算总额（由存储过程负责）
          const { data: newPayroll } = await supabase
            .from('payrolls')
            .insert({
              employee_id: employee.id,
              period_id: periodId,
              pay_date: new Date().toISOString().split('T')[0],
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
        
        // 收集所有薪资项（动态匹配Excel列与数据库组件）
        const payrollItems = [];
        // 不再计算总额，由存储过程负责
        
        // 遍历Excel数据的所有列，匹配薪资组件
        for (const [columnName, value] of Object.entries(row)) {
          // 跳过非薪资数据列
          if (columnName === '员工姓名' || columnName === 'employee_name' || 
              columnName === '部门' || columnName === '职位' || 
              columnName === 'rowNumber' || columnName === '_sheetName') {
            continue;
          }
          
          // 检查是否匹配数据库中的薪资组件
          const component = componentMap.get(columnName);
          if (component && value && Number(value) !== 0) {
            const amount = Math.abs(Number(value));
            
            payrollItems.push({
              payroll_id: payrollId,
              component_id: component.id,
              amount: amount,
              period_id: periodId
            });
            
            // 不再在这里计算总额，由存储过程负责
          }
        }
        
        // 批量插入薪资项
        if (payrollItems.length > 0) {
          await supabase
            .from('payroll_items' as any)
            .insert(payrollItems);
          
          // 不再更新总额，由存储过程计算
          // 存储过程会基于 payroll_items 数据自动计算并更新 payrolls 表的总额字段
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
    const results = [];
    
    for (const row of data) {
      try {
        // 查找员工
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .or(`employee_name.eq.${row['员工姓名']},employee_name.eq.${row['employee_name']}`)
          .single();
        
        if (!employee) {
          throw new Error(`找不到员工: ${row['员工姓名'] || row['employee_name']}`);
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

  // 导入人员类别分配
  const importCategoryAssignments = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    globalProgressRef?: { current: number }
  ) => {
    console.log('🔍 开始导入人员类别分配');
    console.log('📊 数据行数:', data.length);
    console.log('📋 第一行数据示例:', data[0]);
    
    const results = [];
    
    for (const row of data) {
      try {
        console.log('➡️ 处理行:', row);
        
        // 查找员工姓名（尝试多个可能的字段名）
        const employeeName = row['员工姓名'] || row['姓名'] || row['employee_name'] || row['name'];
        console.log('👤 员工姓名:', employeeName);
        
        if (!employeeName) {
          console.error('❌ 缺少员工姓名，可用字段:', Object.keys(row));
          throw new Error('缺少员工姓名');
        }
        
        // 查找员工
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('id, employee_name')
          .eq('employee_name', employeeName)
          .single();
        
        if (employeeError) {
          console.error('❌ 查找员工失败:', employeeError);
          throw new Error(`找不到员工: ${employeeName}`);
        }
        
        console.log('✅ 找到员工:', employee);
        
        // 简化：只使用人员类别名称字段
        const categoryName = row['人员类别名称'] || row['人员类别'] || row['类别'];
        console.log('📁 人员类别:', categoryName);
        console.log('📝 可用字段:', Object.keys(row));
        
        if (!categoryName) {
          console.error('❌ 缺少人员类别名称，可用字段:', Object.keys(row));
          throw new Error('人员类别名称不能为空，请确保Excel中有"人员类别名称"字段');
        }
        
        // 查找人员类别
        console.log('🔎 查询人员类别表...');
        const { data: category, error: categoryError } = await supabase
          .from('employee_categories')
          .select('id, name')
          .eq('name', categoryName)
          .single();
        
        if (categoryError) {
          console.error('❌ 查找人员类别失败:', categoryError);
          console.log('💡 尝试查询所有可用类别...');
          
          const { data: allCategories } = await supabase
            .from('employee_categories')
            .select('id, name');
          
          console.log('📝 可用的人员类别:', allCategories?.map(c => c.name));
          throw new Error(`找不到人员类别: ${categoryName}`);
        }
        
        console.log('✅ 找到人员类别:', category);
        
        // 准备分配数据
        const assignmentData = {
          employee_id: employee.id,
          employee_category_id: category.id,
          period_id: periodId // 添加周期ID以跟踪
          // created_at 字段会自动设置
        };
        
        console.log('📤 准备插入/更新数据:', assignmentData);
        
        // 检查是否已存在该员工在当前期间的类别分配
        const { data: existingAssignment } = await supabase
          .from('employee_category_assignments')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('period_id', periodId)
          .maybeSingle();

        let insertedData;
        let error;

        if (existingAssignment) {
          // 如果已存在，更新现有记录
          console.log('📝 更新现有分配记录:', existingAssignment.id);
          const { data, error: updateError } = await supabase
            .from('employee_category_assignments')
            .update({
              employee_category_id: category.id
            })
            .eq('id', existingAssignment.id)
            .select();
          
          insertedData = data;
          error = updateError;
        } else {
          // 如果不存在，插入新记录
          console.log('➕ 插入新的分配记录');
          const { data, error: insertError } = await supabase
            .from('employee_category_assignments')
            .insert(assignmentData)
            .select();
          
          insertedData = data;
          error = insertError;
        }
        
        if (error) {
          console.error('❌ 插入/更新失败:', error);
          throw error;
        }
        
        console.log('✅ 成功插入/更新:', insertedData);
        results.push({ row, success: true });
        
      } catch (error) {
        console.error('❌ 处理失败:', error);
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
    
    console.log('📊 导入完成，结果统计:');
    console.log('✅ 成功:', results.filter(r => r.success).length);
    console.log('❌ 失败:', results.filter(r => !r.success).length);
    
    return results;
  }, []);

  // 导入岗位分配数据
  const importJobAssignments = useCallback(async (
    data: ExcelDataRow[],
    periodId: string,
    globalProgressRef?: { current: number }
  ) => {
    console.log('🏢 开始导入职务分配数据');
    console.log(`📊 数据行数: ${data.length}`);
    console.log(`🆔 周期ID: ${periodId}`);
    console.log('📋 原始数据预览:', data.slice(0, 3));
    
    const results = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`\n--- 处理第 ${i + 1}/${data.length} 行数据 ---`);
      console.log('🔍 当前行数据:', row);
      
      try {
        // 提取员工信息
        const employeeName = row['员工姓名'] || row['employee_name'];
        console.log(`👤 查找员工: "${employeeName}"`);
        
        // 查找员工
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('id, employee_name')
          .or(`employee_name.eq.${employeeName},employee_name.eq.${employeeName}`)
          .single();
          
        if (employeeError) {
          console.error('❌ 员工查询错误:', employeeError);
        }
        
        console.log('👤 员工查询结果:', employee);
        
        if (!employee) {
          throw new Error(`找不到员工: ${employeeName}`);
        }
        
        console.log(`✅ 员工找到: ${employee.employee_name} (ID: ${employee.id})`);
        
        // 准备岗位分配数据
        const assignmentData: any = {
          employee_id: employee.id,
          period_id: periodId,  // 使用正确的字段名 period_id
        };
        
        console.log('🏗️ 初始分配数据:', assignmentData);
        
        // 处理创建时间 - 支持Excel中的创建时间字段
        const excelCreatedAt = row['创建时间'] || row['created_at'] || row['创建日期'];
        console.log(`📅 Excel创建时间: "${excelCreatedAt}"`);
        
        if (excelCreatedAt) {
          try {
            // 尝试解析Excel中的时间格式
            const parsedDate = new Date(excelCreatedAt);
            if (!isNaN(parsedDate.getTime())) {
              assignmentData.created_at = parsedDate.toISOString();
              console.log(`✅ 使用Excel时间: ${assignmentData.created_at}`);
            } else {
              // 如果解析失败，使用当前时间
              assignmentData.created_at = new Date().toISOString();
              console.log(`⚠️ Excel时间解析失败，使用当前时间: ${assignmentData.created_at}`);
            }
          } catch {
            assignmentData.created_at = new Date().toISOString();
            console.log(`❌ Excel时间解析异常，使用当前时间: ${assignmentData.created_at}`);
          }
        } else {
          assignmentData.created_at = new Date().toISOString();
          console.log(`ℹ️ 无Excel时间，使用当前时间: ${assignmentData.created_at}`);
        }
        
        // 查找部门
        const departmentName = row['部门'] || row['department_name'];
        console.log(`🏢 查找部门: "${departmentName}"`);
        
        if (departmentName) {
          const { data: department, error: deptError } = await supabase
            .from('departments')
            .select('id, name')
            .eq('name', departmentName)
            .single();
          
          if (deptError) {
            console.error('❌ 部门查询错误:', deptError);
          }
          
          console.log('🏢 部门查询结果:', department);
          
          if (department) {
            assignmentData.department_id = department.id;
            console.log(`✅ 部门找到: ${department.name} (ID: ${department.id})`);
          } else {
            console.log(`❌ 未找到部门: "${departmentName}"`);
          }
        } else {
          console.log('⚠️ 未提供部门信息');
        }
        
        // 查找职位
        const positionName = row['职位'] || row['position_name'];
        console.log(`💼 查找职位: "${positionName}"`);
        
        if (positionName) {
          const { data: position, error: posError } = await supabase
            .from('positions')
            .select('id, name')
            .eq('name', positionName)
            .single();
          
          if (posError) {
            console.error('❌ 职位查询错误:', posError);
          }
          
          console.log('💼 职位查询结果:', position);
          
          if (position) {
            assignmentData.position_id = position.id;
            console.log(`✅ 职位找到: ${position.name} (ID: ${position.id})`);
          } else {
            console.log(`❌ 未找到职位: "${positionName}"`);
          }
        } else {
          console.log('⚠️ 未提供职位信息');
        }
        
        // 查找职级
        const rankName = row['职级'] || row['rank_name'];
        console.log(`🎖️ 查找职级: "${rankName}"`);
        
        if (rankName) {
          const { data: rank, error: rankError } = await supabase
            .from('job_ranks')
            .select('id, name')
            .eq('name', rankName)
            .single();
          
          if (rankError) {
            console.error('❌ 职级查询错误:', rankError);
          }
          
          console.log('🎖️ 职级查询结果:', rank);
          
          if (rank) {
            assignmentData.rank_id = rank.id;
            console.log(`✅ 职级找到: ${rank.name} (ID: ${rank.id})`);
          } else {
            console.log(`❌ 未找到职级: "${rankName}"`);
          }
        } else {
          console.log('ℹ️ 未提供职级信息（可选）');
        }
        
        console.log('🔧 最终分配数据:', assignmentData);
        
        // 验证必需字段
        console.log('🔍 验证必需字段...');
        if (!assignmentData.department_id) {
          console.error(`❌ 缺少部门ID: 部门名称="${departmentName}"`);
          throw new Error(`缺少部门信息: ${departmentName || '未提供部门'}`);
        }
        
        if (!assignmentData.position_id) {
          console.error(`❌ 缺少职位ID: 职位名称="${positionName}"`);
          throw new Error(`缺少职位信息: ${positionName || '未提供职位'}`);
        }
        
        console.log('✅ 必需字段验证通过');
        
        // 插入岗位分配记录
        console.log('💾 插入职务分配记录...');
        console.log('📋 插入数据详情:', assignmentData);
        
        const { data: insertResult, error } = await supabase
          .from('employee_job_history')
          .insert(assignmentData)
          .select();
        
        if (error) {
          console.error('❌ 职务分配插入错误:', error);
          console.error('📋 导致错误的数据:', assignmentData);
          throw error;
        }
        
        console.log('✅ 职务分配插入成功:', insertResult);
        results.push({ row, success: true, data: insertResult });
        
      } catch (error) {
        console.error(`❌ 第 ${i + 1} 行处理失败:`, error);
        console.error('📋 失败的行数据:', row);
        
        results.push({ 
          row, 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      } finally {
        // 更新全局进度和当前数据组进度
        if (globalProgressRef) {
          globalProgressRef.current++;
          console.log(`📈 进度更新: ${globalProgressRef.current} / ${data.length}`);
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
    
    // 导入结果统计
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n📊 职务分配导入完成统计:');
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${failCount} 条`);
    console.log(`📊 总计: ${results.length} 条`);
    
    if (failCount > 0) {
      console.log('\n❌ 失败详情:');
      results.filter(r => !r.success).forEach((result, index) => {
        console.log(`${index + 1}. ${result.error} - 数据:`, result.row);
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
    const results = [];
    
    for (const row of data) {
      try {
        // 查找员工
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .or(`employee_name.eq.${row['员工姓名']},employee_name.eq.${row['employee_name']}`)
          .single();
        
        if (!employee) {
          throw new Error(`找不到员工: ${row['员工姓名'] || row['employee_name']}`);
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
          // 只创建框架记录，不计算总额（由存储过程负责）
          const { data: newPayroll } = await supabase
            .from('payrolls')
            .insert({
              employee_id: employee.id,
              period_id: periodId,
              pay_date: new Date().toISOString().split('T')[0],
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
          const groupNames = {
            'earnings': '薪资数据',
            'bases': '缴费基数',
            'category': '人员类别',
            'job': '职务信息'
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
            const sheetNames = {
              'earnings': '薪资项目',
              'bases': '缴费基数',
              'category': '人员类别',
              'job': '职务信息'
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
          if (params.config.validateBeforeImport) {
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
            console.log(`💰 导入薪资数据：${groupData.length} 行`);
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
    XLSX.utils.book_append_sheet(wb, ws, '薪资数据');
    
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
      link.download = `薪资数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      // 获取导入阶段描述
      getPhaseDescription: (phase: ImportProgress['phase']) => {
        const descriptions = {
          parsing: '正在解析文件...',
          validating: '正在验证数据...',
          importing: '正在导入数据...',
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