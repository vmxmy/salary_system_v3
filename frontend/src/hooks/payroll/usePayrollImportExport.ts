import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import * as XLSX from 'xlsx';
import type { Database } from '@/types/supabase';

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
  total: number;
  processed: number;
  currentRow?: number;
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
 * 薪资导入导出 Hook
 */
export function usePayrollImportExport() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    phase: 'parsing',
    total: 0,
    processed: 0,
    errors: [],
    warnings: []
  });

  // 获取导入模板列表
  const useImportTemplates = () => {
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
  };

  // 解析Excel文件
  const parseExcelFile = useCallback(async (file: File): Promise<ExcelDataRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // 获取第一个工作表
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // 转换为JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false, // 保持日期格式
            dateNF: 'yyyy-mm-dd'
          });
          
          resolve(jsonData as ExcelDataRow[]);
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

  // 导入收入项数据
  const importEarnings = useCallback(async (
    data: ExcelDataRow[],
    periodId: string
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
          .eq('employee_id', employee.id)
          .eq('period_id', periodId)
          .single();
        
        if (existingPayroll) {
          payrollId = existingPayroll.id;
        } else {
          const { data: newPayroll } = await supabase
            .from('payrolls')
            .insert({
              employee_id: employee.id,
              period_id: periodId,
              pay_date: new Date().toISOString().split('T')[0],
              status: 'draft',
              gross_pay: 0,
              total_deductions: 0,
              net_pay: 0
            })
            .select()
            .single();
          
          payrollId = newPayroll?.id;
        }
        
        // 导入收入项
        const earningItems = [];
        const earningFields = [
          { field: '基本工资', componentKey: 'basic_salary' },
          { field: '岗位工资', componentKey: 'position_salary' },
          { field: '绩效奖金', componentKey: 'performance_bonus' },
          { field: '加班费', componentKey: 'overtime_pay' },
          { field: '津贴', componentKey: 'allowance' },
          { field: '补贴', componentKey: 'subsidy' }
        ];
        
        for (const { field, componentKey } of earningFields) {
          const amount = row[field] || row[componentKey];
          if (amount && Number(amount) > 0) {
            // 查找组件ID
            const { data: component } = await supabase
              .from('salary_components')
              .select('id')
              .eq('system_key', componentKey)
              .single();
            
            if (component) {
              earningItems.push({
                payroll_id: payrollId,
                component_id: component.id,
                amount: Number(amount),
                period_id: periodId
              });
            }
          }
        }
        
        // 批量插入薪资项
        if (earningItems.length > 0) {
          await supabase
            .from('payroll_items' as any)
            .insert(earningItems);
        }
        
        results.push({ row, success: true });
      } catch (error) {
        results.push({ 
          row, 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      }
    }
    
    return results;
  }, []);

  // 导入社保基数数据
  const importContributionBases = useCallback(async (
    data: ExcelDataRow[],
    periodId: string
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
        
        // 社保基数字段映射
        const baseFields = [
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
          period_id: periodId,
          effective_date: new Date().toISOString().split('T')[0]
        };
        
        for (const { field, baseType } of baseFields) {
          const value = row[field] || row[baseType];
          if (value && Number(value) > 0) {
            baseData[baseType] = Number(value);
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
      }
    }
    
    return results;
  }, []);

  // 导入人员类别分配
  const importCategoryAssignments = useCallback(async (
    data: ExcelDataRow[],
    periodId: string
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
        
        const categoryName = row['人员类别'] || row['category_name'] || row['personnel_category'];
        if (!categoryName) {
          throw new Error('人员类别不能为空');
        }
        
        // 查找人员类别
        const { data: category } = await supabase
          .from('employee_categories')
          .select('id')
          .eq('category_name', categoryName)
          .single();
        
        if (!category) {
          throw new Error(`找不到人员类别: ${categoryName}`);
        }
        
        // 插入或更新员工的人员类别分配
        const { error } = await supabase
          .from('employee_category_assignments')
          .upsert({
            employee_id: employee.id,
            employee_category_id: category.id,
            assigned_at: new Date().toISOString()
          }, {
            onConflict: 'employee_id'
          });
        
        if (error) throw error;
        
        results.push({ row, success: true });
      } catch (error) {
        results.push({ 
          row, 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      }
    }
    
    return results;
  }, []);

  // 导入岗位分配数据
  const importJobAssignments = useCallback(async (
    data: ExcelDataRow[],
    periodId: string
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
        
        // 准备岗位分配数据
        const assignmentData: any = {
          employee_id: employee.id,
          period_id: periodId,
          created_at: new Date().toISOString()
        };
        
        // 查找部门
        const departmentName = row['部门'] || row['department_name'];
        if (departmentName) {
          const { data: department } = await supabase
            .from('departments')
            .select('id')
            .eq('name', departmentName)
            .single();
          
          if (department) {
            assignmentData.department_id = department.id;
          }
        }
        
        // 查找职位
        const positionName = row['职位'] || row['position_name'];
        if (positionName) {
          const { data: position } = await supabase
            .from('positions')
            .select('id')
            .eq('name', positionName)
            .single();
          
          if (position) {
            assignmentData.position_id = position.id;
          }
        }
        
        // 查找职级
        const rankName = row['职级'] || row['rank_name'];
        if (rankName) {
          const { data: rank } = await supabase
            .from('job_ranks')
            .select('id')
            .eq('name', rankName)
            .single();
          
          if (rank) {
            assignmentData.rank_id = rank.id;
          }
        }
        
        // 插入岗位分配记录
        const { error } = await supabase
          .from('employee_job_history')
          .insert(assignmentData);
        
        if (error) throw error;
        
        results.push({ row, success: true });
      } catch (error) {
        results.push({ 
          row, 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      }
    }
    
    return results;
  }, []);

  // 导入扣除项数据
  const importDeductions = useCallback(async (
    data: ExcelDataRow[],
    periodId: string
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
          .eq('employee_id', employee.id)
          .eq('period_id', periodId)
          .single();
        
        if (existingPayroll) {
          payrollId = existingPayroll.id;
        } else {
          const { data: newPayroll } = await supabase
            .from('payrolls')
            .insert({
              employee_id: employee.id,
              period_id: periodId,
              pay_date: new Date().toISOString().split('T')[0],
              status: 'draft',
              gross_pay: 0,
              total_deductions: 0,
              net_pay: 0
            })
            .select()
            .single();
          
          payrollId = newPayroll?.id;
        }
        
        // 导入扣除项
        const deductionItems = [];
        const deductionFields = [
          { field: '养老保险', componentKey: 'pension_insurance' },
          { field: '医疗保险', componentKey: 'medical_insurance' },
          { field: '失业保险', componentKey: 'unemployment_insurance' },
          { field: '工伤保险', componentKey: 'work_injury_insurance' },
          { field: '生育保险', componentKey: 'maternity_insurance' },
          { field: '住房公积金', componentKey: 'housing_fund' },
          { field: '个人所得税', componentKey: 'income_tax' }
        ];
        
        for (const { field, componentKey } of deductionFields) {
          const amount = row[field] || row[componentKey];
          if (amount && Number(amount) > 0) {
            // 查找组件ID
            const { data: component } = await supabase
              .from('salary_components')
              .select('id')
              .eq('system_key', componentKey)
              .single();
            
            if (component) {
              deductionItems.push({
                payroll_id: payrollId,
                component_id: component.id,
                amount: Number(amount),
                period_id: periodId
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
        const excelData = await parseExcelFile(params.file);
        result.totalRows = excelData.length;
        setImportProgress(prev => ({ ...prev, total: excelData.length }));
        
        // 2. 验证数据
        if (params.config.validateBeforeImport) {
          setImportProgress(prev => ({ ...prev, phase: 'validating' }));
          const validation = await validateImportData(excelData, params.config);
          result.errors = validation.errors;
          result.warnings = validation.warnings;
          
          if (!validation.isValid) {
            throw new Error('数据验证失败，请检查错误信息');
          }
        }
        
        // 3. 导入数据
        setImportProgress(prev => ({ ...prev, phase: 'importing' }));
        
        // 导入收入项
        if (params.config.dataGroups.includes('earnings') || 
            params.config.dataGroups.includes('EARNINGS')) {
          const earningsResults = await importEarnings(excelData, params.periodId);
          earningsResults.forEach(r => {
            if (r.success) result.successCount++;
            else {
              result.failedCount++;
              result.errors.push({
                row: excelData.indexOf(r.row) + 2,
                message: r.error || '导入失败'
              });
            }
          });
        }
        
        // 导入扣除项
        if (params.config.dataGroups.includes('deductions') || 
            params.config.dataGroups.includes('DEDUCTIONS')) {
          const deductionsResults = await importDeductions(excelData, params.periodId);
          deductionsResults.forEach(r => {
            if (r.success) result.successCount++;
            else {
              result.failedCount++;
              result.errors.push({
                row: excelData.indexOf(r.row) + 2,
                message: r.error || '导入失败'
              });
            }
          });
        }
        
        // 导入社保基数
        if (params.config.dataGroups.includes('contribution_bases') || 
            params.config.dataGroups.includes('CONTRIBUTION_BASES')) {
          const basesResults = await importContributionBases(excelData, params.periodId);
          basesResults.forEach(r => {
            if (r.success) result.successCount++;
            else {
              result.failedCount++;
              result.errors.push({
                row: excelData.indexOf(r.row) + 2,
                message: r.error || '导入失败'
              });
            }
          });
        }
        
        // 导入人员类别
        if (params.config.dataGroups.includes('category_assignment') || 
            params.config.dataGroups.includes('CATEGORY_ASSIGNMENT')) {
          const categoryResults = await importCategoryAssignments(excelData, params.periodId);
          categoryResults.forEach(r => {
            if (r.success) result.successCount++;
            else {
              result.failedCount++;
              result.errors.push({
                row: excelData.indexOf(r.row) + 2,
                message: r.error || '导入失败'
              });
            }
          });
        }
        
        // 导入岗位分配
        if (params.config.dataGroups.includes('job_assignment') || 
            params.config.dataGroups.includes('JOB_ASSIGNMENT')) {
          const jobResults = await importJobAssignments(excelData, params.periodId);
          jobResults.forEach(r => {
            if (r.success) result.successCount++;
            else {
              result.failedCount++;
              result.errors.push({
                row: excelData.indexOf(r.row) + 2,
                message: r.error || '导入失败'
              });
            }
          });
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
      total: 0,
      processed: 0,
      errors: [],
      warnings: []
    });
  };

  return {
    // 查询
    queries: {
      useImportTemplates
    },

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
        if (importProgress.total === 0) return 0;
        return Math.round(
          (importProgress.processed / importProgress.total) * 100
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