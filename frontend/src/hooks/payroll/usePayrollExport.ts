import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { useLoadingState } from '@/hooks/core/useLoadingState';
import * as XLSX from 'xlsx';
import type { Database } from '@/types/supabase';

// 导出配置
export interface ExportConfig {
  periodId?: string;
  periodMonth?: string; // 添加月份信息，格式：YYYY-MM
  departmentId?: string;
  employeeIds?: string[];
  status?: string;
  format?: 'xlsx' | 'csv' | 'json';
  filename?: string;
  includeDetails?: boolean;
  includeInsurance?: boolean;
  includeJobAssignments?: boolean;
  includeCategoryAssignments?: boolean;
  selectedDataGroups?: string[]; // 选中的数据组
  template?: string;
}

// 导出进度
export interface ExportProgress {
  phase: 'preparing' | 'fetching' | 'formatting' | 'generating' | 'completed' | 'error';
  total: number;
  processed: number;
  message?: string;
}

// 导出模板
export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  fields: string[];
  format: 'xlsx' | 'csv';
  isDefault?: boolean;
}

// 查询键管理
export const payrollExportQueryKeys = {
  all: ['payroll-export'] as const,
  templates: () => [...payrollExportQueryKeys.all, 'templates'] as const,
  template: (id: string) => [...payrollExportQueryKeys.all, 'template', id] as const,
  comprehensiveData: (config: ExportConfig) => [...payrollExportQueryKeys.all, 'comprehensive', config] as const,
};

/**
 * 薪资导出 Hook
 * 提供薪资数据导出到 Excel、CSV、JSON 的功能
 */
export function usePayrollExport() {
  const { handleError } = useErrorHandler();
  const { loadingState, setLoading, withLoading } = useLoadingState();
  const queryClient = useQueryClient();
  
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    phase: 'preparing',
    total: 0,
    processed: 0
  });

  // 获取导出模板列表
  const useExportTemplates = () => {
    return useQuery({
      queryKey: payrollExportQueryKeys.templates(),
      queryFn: async () => {
        // TODO: 当 export_templates 表创建后，从数据库获取
        // 现在返回默认模板
        const defaultTemplates: ExportTemplate[] = [
          {
            id: 'default-full',
            name: '完整薪资报表',
            description: '包含所有薪资项目和五险一金明细',
            fields: ['employee_name', 'department_name', 'gross_pay', 'deductions', 'net_pay'],
            format: 'xlsx',
            isDefault: true
          },
          {
            id: 'default-summary',
            name: '薪资汇总表',
            description: '仅包含基本薪资信息',
            fields: ['employee_name', 'gross_pay', 'net_pay'],
            format: 'xlsx'
          },
          {
            id: 'default-insurance',
            name: '五险一金明细表',
            description: '员工五险一金缴纳明细',
            fields: ['employee_name', 'pension', 'medical', 'unemployment', 'injury', 'maternity', 'housing_fund'],
            format: 'xlsx'
          }
        ];
        return defaultTemplates;
      },
      staleTime: 30 * 60 * 1000 // 30分钟缓存
    });
  };

  // 使用 React Query 获取综合数据
  const useComprehensiveExportData = (config: ExportConfig, enabled = false) => {
    return useQuery({
      queryKey: payrollExportQueryKeys.comprehensiveData(config),
      queryFn: async () => {
        const result: any = {};
        let employeeIdsWithPayroll: string[] = []; // 声明在外层作用域
        
        // 始终先获取薪资数据，以便获取有薪资记录的员工ID列表
        // 即使用户只选择导出其他数据类型，也需要知道哪些员工有薪资记录
        if (true) { // 总是执行此查询
          let payrollQuery = supabase
            .from('view_payroll_summary')
            .select('*');

          // 应用过滤条件
          if (config.periodId) {
            payrollQuery = payrollQuery.eq('period_id', config.periodId);
          }
          if (config.departmentId) {
            payrollQuery = payrollQuery.eq('department_id', config.departmentId);
          }
          if (config.employeeIds && config.employeeIds.length > 0) {
            payrollQuery = payrollQuery.in('employee_id', config.employeeIds);
          }
          if (config.status) {
            payrollQuery = payrollQuery.eq('payroll_status', config.status as any);
          }

          const { data: payrollData, error: payrollError } = await payrollQuery;
          if (payrollError) throw payrollError;

          // 只有在用户选择了导出薪资数据时，才包含在结果中
          if (config.selectedDataGroups?.includes('earnings') || config.selectedDataGroups?.includes('bases')) {
            result.payroll = payrollData || [];
          }
          
          // 保存员工ID列表供其他查询使用
          employeeIdsWithPayroll = (payrollData || [])
            .map(p => p.employee_id)
            .filter((id): id is string => id !== null && id !== undefined);

          // 获取详细薪资项目
          if (config.includeDetails && payrollData && payrollData.length > 0 && 
              (config.selectedDataGroups?.includes('earnings') || config.selectedDataGroups?.includes('bases'))) {
            const payrollIds = payrollData.map(p => p.payroll_id);
            const { data: details, error: detailError } = await supabase
              .from('view_payroll_unified')
              .select('*')
              .in('payroll_id', payrollIds);

            if (detailError) throw detailError;
            
            // 创建一个映射，用于快速查找部门和职位信息
            const payrollInfoMap = new Map(
              payrollData.map(p => [p.payroll_id, {
                department_name: p.department_name,
                position_name: p.position_name
              }])
            );
            
            // 将部门和职位信息合并到详细数据中
            result.payrollDetails = (details || []).map(detail => ({
              ...detail,
              department_name: payrollInfoMap.get(detail.payroll_id)?.department_name || '',
              position_name: payrollInfoMap.get(detail.payroll_id)?.position_name || ''
            }));
          }
        }

        // 获取职务分配数据
        if (config.includeJobAssignments || config.selectedDataGroups?.includes('job')) {
          let jobQuery = supabase
            .from('employee_job_history')
            .select(`
              id,
              employee_id,
              department_id,
              position_id,
              rank_id,
              period_id,
              created_at,
              employees!inner(employee_name),
              departments(name),
              positions(name)
            `);

          if (config.periodId) {
            // 根据周期ID筛选
            jobQuery = jobQuery.eq('period_id', config.periodId);
          }

          const { data: jobData, error: jobError } = await jobQuery;
          if (jobError) throw jobError;
          result.jobAssignments = jobData || [];
        }

        // 获取人员类别数据（从employee_category_assignments表获取）
        if (config.includeCategoryAssignments || config.selectedDataGroups?.includes('category')) {
          let categoryQuery = supabase
            .from('employee_category_assignments')
            .select(`
              id,
              employee_id,
              employee_category_id,
              period_id,
              created_at,
              employees!inner(employee_name),
              employee_categories(name)
            `);

          if (config.periodId) {
            // 根据周期ID筛选
            categoryQuery = categoryQuery.eq('period_id', config.periodId);
          }

          const { data: categoryData, error: categoryError } = await categoryQuery;
          if (categoryError) throw categoryError;
          result.categoryAssignments = categoryData || [];
        }

        // 获取缴费基数数据 - 使用视图获取所有保险类型的基数
        if (config.includeInsurance || config.selectedDataGroups?.includes('bases')) {
          let basesQuery = supabase
            .from('view_employee_insurance_base_monthly')
            .select(`
              employee_id,
              employee_name,
              period_id,
              period_display,
              insurance_type_key,
              insurance_type_name,
              contribution_base,
              employee_amount,
              employer_amount,
              department_name,
              position_name
            `);

          if (config.periodId) {
            basesQuery = basesQuery.eq('period_id', config.periodId);
          }

          const { data: basesData, error: basesError } = await basesQuery;
          if (basesError) throw basesError;
          
          // 转换数据格式：将多行记录转换为每个员工一行的格式
          const employeeBasesMap = new Map();
          
          (basesData || []).forEach(item => {
            if (!employeeBasesMap.has(item.employee_id)) {
              employeeBasesMap.set(item.employee_id, {
                employee_id: item.employee_id,
                employee_name: item.employee_name,
                period_id: item.period_id,
                period_display: item.period_display,
                department_name: item.department_name,
                position_name: item.position_name,
                pension_base: 0,
                medical_base: 0,
                unemployment_base: 0,
                work_injury_base: 0,
                maternity_base: 0,
                housing_fund_base: 0,
                occupational_pension_base: 0,
                serious_illness_base: 0
              });
            }
            
            const employeeData = employeeBasesMap.get(item.employee_id);
            // 根据保险类型key设置对应的基数
            switch(item.insurance_type_key) {
              case 'pension':
                employeeData.pension_base = item.contribution_base;
                break;
              case 'medical':
                employeeData.medical_base = item.contribution_base;
                break;
              case 'unemployment':
                employeeData.unemployment_base = item.contribution_base;
                break;
              case 'work_injury':
                employeeData.work_injury_base = item.contribution_base;
                break;
              case 'maternity':
                employeeData.maternity_base = item.contribution_base;
                break;
              case 'housing_fund':
                employeeData.housing_fund_base = item.contribution_base;
                break;
              case 'occupational_pension':
                employeeData.occupational_pension_base = item.contribution_base;
                break;
              case 'serious_illness':
                employeeData.serious_illness_base = item.contribution_base;
                break;
            }
          });
          
          result.contributionBases = Array.from(employeeBasesMap.values());
        }

        return result;
      },
      enabled,
      staleTime: 5 * 60 * 1000, // 5分钟缓存
      retry: 1
    });
  };

  // 获取综合数据（复用 useComprehensiveExportData 的逻辑）
  const fetchComprehensiveData = useCallback(async (config: ExportConfig) => {
    setExportProgress({ phase: 'fetching', total: 0, processed: 0, message: '正在获取数据...' });
    
    try {
      // 直接调用 useComprehensiveExportData 的 queryFn 逻辑
      const result = await queryClient.fetchQuery({
        queryKey: payrollExportQueryKeys.comprehensiveData(config),
        queryFn: async () => {
          const data: any = {};
          let employeeIdsWithPayroll: string[] = []; // 声明在外层作用域
          
          // 始终先获取薪资数据，以便获取有薪资记录的员工ID列表
          // 即使用户只选择导出其他数据类型，也需要知道哪些员工有薪资记录
          if (true) { // 总是执行此查询
            let payrollQuery = supabase
              .from('view_payroll_summary')
              .select('*');

            // 应用过滤条件
            if (config.periodId) {
              payrollQuery = payrollQuery.eq('period_id', config.periodId);
            }
            if (config.departmentId) {
              payrollQuery = payrollQuery.eq('department_id', config.departmentId);
            }
            if (config.employeeIds && config.employeeIds.length > 0) {
              payrollQuery = payrollQuery.in('employee_id', config.employeeIds);
            }
            if (config.status) {
              payrollQuery = payrollQuery.eq('payroll_status', config.status as any);
            }

            const { data: payrollData, error: payrollError } = await payrollQuery;
            if (payrollError) throw payrollError;

            // 只有在用户选择了导出薪资数据时，才包含在结果中
            if (config.selectedDataGroups?.includes('earnings') || config.selectedDataGroups?.includes('bases')) {
              data.payroll = payrollData || [];
            }
            
            // 保存员工ID列表供其他查询使用
            employeeIdsWithPayroll = (payrollData || [])
              .map(p => p.employee_id)
              .filter((id): id is string => id !== null && id !== undefined);

            // 获取详细薪资项目
            if (config.includeDetails && payrollData && payrollData.length > 0 && 
                (config.selectedDataGroups?.includes('earnings') || config.selectedDataGroups?.includes('bases'))) {
              const payrollIds = payrollData.map(p => p.payroll_id);
              const { data: details, error: detailError } = await supabase
                .from('view_payroll_unified')
                .select('*')
                .in('payroll_id', payrollIds);

              if (detailError) throw detailError;
              
              // 创建一个映射，用于快速查找部门和职位信息
              const payrollInfoMap = new Map(
                payrollData.map(p => [p.payroll_id, {
                  department_name: p.department_name,
                  position_name: p.position_name
                }])
              );
              
              // 将部门和职位信息合并到详细数据中
              data.payrollDetails = (details || []).map(detail => ({
                ...detail,
                department_name: payrollInfoMap.get(detail.payroll_id)?.department_name || '',
                position_name: payrollInfoMap.get(detail.payroll_id)?.position_name || ''
              }));
            }
          }

          // 获取职务分配数据 - 只包含有薪资记录的员工
          if (config.includeJobAssignments || config.selectedDataGroups?.includes('job')) {
            // 使用之前获取的员工ID列表
            
            if (employeeIdsWithPayroll.length > 0) {
              let jobQuery = supabase
                .from('employee_job_history')
                .select(`
                  id,
                  employee_id,
                  department_id,
                  position_id,
                  rank_id,
                  period_id,
                  created_at,
                  employees!inner(employee_name),
                  departments(name),
                  positions(name)
                `)
                .in('employee_id', employeeIdsWithPayroll); // 只查询有薪资记录的员工

              if (config.periodId) {
                // 根据周期ID筛选
                jobQuery = jobQuery.eq('period_id', config.periodId);
              }

              const { data: jobData, error: jobError } = await jobQuery;
              if (jobError) throw jobError;
              data.jobAssignments = jobData || [];
            } else {
              data.jobAssignments = [];
            }
          }

          // 获取人员类别数据 - 只包含有薪资记录的员工
          if (config.includeCategoryAssignments || config.selectedDataGroups?.includes('category')) {
            // 使用之前获取的员工ID列表
            
            if (employeeIdsWithPayroll.length > 0) {
              let categoryQuery = supabase
                .from('employee_category_assignments')
                .select(`
                  id,
                  employee_id,
                  employee_category_id,
                  period_id,
                  created_at,
                  employees!inner(employee_name),
                  employee_categories(name)
                `)
                .in('employee_id', employeeIdsWithPayroll); // 只查询有薪资记录的员工

              if (config.periodId) {
                // 根据周期ID筛选
                categoryQuery = categoryQuery.eq('period_id', config.periodId);
              }

              const { data: categoryData, error: categoryError } = await categoryQuery;
              if (categoryError) throw categoryError;
              data.categoryAssignments = categoryData || [];
            } else {
              data.categoryAssignments = [];
            }
          }

          // 获取缴费基数数据 - 只包含有薪资记录的员工
          if (config.includeInsurance || config.selectedDataGroups?.includes('bases')) {
            // 使用之前获取的员工ID列表
            
            if (employeeIdsWithPayroll.length > 0) {
              let basesQuery = supabase
                .from('view_employee_insurance_base_monthly')
                .select(`
                  employee_id,
                  employee_name,
                  period_id,
                  period_display,
                  insurance_type_key,
                  insurance_type_name,
                  contribution_base,
                  employee_amount,
                  employer_amount,
                  department_name,
                  position_name
                `)
                .in('employee_id', employeeIdsWithPayroll); // 只查询有薪资记录的员工

              if (config.periodId) {
                basesQuery = basesQuery.eq('period_id', config.periodId);
              }

              const { data: basesData, error: basesError } = await basesQuery;
              if (basesError) throw basesError;
              
              // 转换数据格式：将多行记录转换为每个员工一行的格式
              const employeeBasesMap = new Map();
              
              (basesData || []).forEach(item => {
              if (!employeeBasesMap.has(item.employee_id)) {
                employeeBasesMap.set(item.employee_id, {
                  employee_id: item.employee_id,
                  employee_name: item.employee_name,
                  period_id: item.period_id,
                  period_display: item.period_display,
                  department_name: item.department_name,
                  position_name: item.position_name,
                  pension_base: 0,
                  medical_base: 0,
                  unemployment_base: 0,
                  work_injury_base: 0,
                  maternity_base: 0,
                  housing_fund_base: 0,
                  occupational_pension_base: 0,
                  serious_illness_base: 0
                });
              }
              
              const employeeData = employeeBasesMap.get(item.employee_id);
              // 根据保险类型key设置对应的基数
              switch(item.insurance_type_key) {
                case 'pension':
                  employeeData.pension_base = item.contribution_base;
                  break;
                case 'medical':
                  employeeData.medical_base = item.contribution_base;
                  break;
                case 'unemployment':
                  employeeData.unemployment_base = item.contribution_base;
                  break;
                case 'work_injury':
                  employeeData.work_injury_base = item.contribution_base;
                  break;
                case 'maternity':
                  employeeData.maternity_base = item.contribution_base;
                  break;
                case 'housing_fund':
                  employeeData.housing_fund_base = item.contribution_base;
                  break;
                case 'occupational_pension':
                  employeeData.occupational_pension_base = item.contribution_base;
                  break;
                case 'serious_illness':
                  employeeData.serious_illness_base = item.contribution_base;
                  break;
              }
            });
            
            data.contributionBases = Array.from(employeeBasesMap.values());
            } else {
              data.contributionBases = [];
            }
          }

          return data;
        },
        staleTime: 5 * 60 * 1000
      });

      return result;
    } catch (error) {
      handleError(error, { customMessage: '获取数据失败' });
      throw error;
    }
  }, [queryClient, handleError]);

  // 转换为 Excel 格式
  const transformToExcelFormat = useCallback((data: any[], config: ExportConfig) => {
    setExportProgress({ 
      phase: 'formatting', 
      total: data.length, 
      processed: 0, 
      message: '正在格式化数据...' 
    });

    return data.map((item, index) => {
      setExportProgress(prev => ({ ...prev, processed: index + 1 }));

      const row: any = {
        '序号': index + 1,
        '员工姓名': item.employee_name,
        '部门': item.department_name,
        '职位': item.position_name,
        '薪资月份': item.period_name || item.period_code,
        '应发工资': item.gross_pay,
        '扣款合计': item.total_deductions,
        '实发工资': item.net_pay,
        '状态': item.payroll_status
      };

      // 如果包含详情，添加薪资项目列
      if (config.includeDetails && item.details) {
        item.details.forEach((detail: any) => {
          row[detail.component_name] = detail.amount;
        });
      }

      return row;
    });
  }, []);

  // 导出到 Excel
  const exportToExcel = useCallback(async (config: ExportConfig) => {
    return withLoading('isExporting', async () => {
      try {
        setExportProgress({ phase: 'preparing', total: 0, processed: 0, message: '准备导出...' });

        // 1. 获取综合数据
        const comprehensiveData = await fetchComprehensiveData(config);

        // 检查是否有数据
        const hasData = Object.values(comprehensiveData).some((data: any) => 
          Array.isArray(data) && data.length > 0
        );

        if (!hasData) {
          throw new Error('没有可导出的数据');
        }

        // 2. 生成 Excel 文件
        setExportProgress({ 
          phase: 'generating', 
          total: 100, 
          processed: 0, 
          message: '正在生成文件...' 
        });

        const workbook = XLSX.utils.book_new();
        let sheetsCreated = 0;

        // 创建薪资数据工作表
        if (comprehensiveData.payroll && comprehensiveData.payroll.length > 0) {
          const payrollData = comprehensiveData.payroll.map((item: any, index: number) => ({
            '序号': index + 1,
            '员工姓名': item.employee_name,
            '部门': item.department_name,
            '职位': item.position_name,
            '薪资月份': item.period_name || item.period_code,
            '应发工资': item.gross_pay,
            '扣款合计': item.total_deductions,
            '实发工资': item.net_pay,
            '状态': item.payroll_status
          }));

          const payrollSheet = XLSX.utils.json_to_sheet(payrollData);
          payrollSheet['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
          ];
          XLSX.utils.book_append_sheet(workbook, payrollSheet, '薪资收入');
          sheetsCreated++;
        }

        // 创建缴费基数工作表
        if (comprehensiveData.contributionBases && comprehensiveData.contributionBases.length > 0) {
          const basesData = comprehensiveData.contributionBases.map((item: any, index: number) => ({
            '序号': index + 1,
            '员工姓名': item.employee_name,
            '部门': item.department_name || '',
            '职位': item.position_name || '',
            '养老保险基数': item.pension_base || 0,
            '医疗保险基数': item.medical_base || 0,
            '失业保险基数': item.unemployment_base || 0,
            '工伤保险基数': item.work_injury_base || 0,
            '生育保险基数': item.maternity_base || 0,
            '住房公积金基数': item.housing_fund_base || 0,
            '职业年金基数': item.occupational_pension_base || 0,
            '大病医疗基数': item.serious_illness_base || 0
          }));

          const basesSheet = XLSX.utils.json_to_sheet(basesData);
          basesSheet['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
            { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }
          ];
          XLSX.utils.book_append_sheet(workbook, basesSheet, '缴费基数');
          sheetsCreated++;
        }

        // 创建职务分配工作表
        if (comprehensiveData.jobAssignments && comprehensiveData.jobAssignments.length > 0) {
          const jobData = comprehensiveData.jobAssignments.map((item: any, index: number) => ({
            '序号': index + 1,
            '员工姓名': item.employees?.employee_name || '',
            '部门': item.departments?.name || '',  // 修正：使用 name 而不是 department_name
            '职位': item.positions?.name || '',     // 修正：使用 name 而不是 position_name
            '创建时间': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
          }));

          const jobSheet = XLSX.utils.json_to_sheet(jobData);
          jobSheet['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
          ];
          XLSX.utils.book_append_sheet(workbook, jobSheet, '职务分配');
          sheetsCreated++;
        }

        // 创建人员类别工作表
        if (comprehensiveData.categoryAssignments && comprehensiveData.categoryAssignments.length > 0) {
          const categoryData = comprehensiveData.categoryAssignments.map((item: any, index: number) => ({
            '序号': index + 1,
            '员工姓名': item.employees?.employee_name || '',
            '人员类别编码': item.employee_categories?.code || '',     // 修正：可能是 code 而不是 category_code
            '人员类别名称': item.employee_categories?.name || '',      // 修正：使用 name 而不是 category_name
            '创建时间': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
          }));

          const categorySheet = XLSX.utils.json_to_sheet(categoryData);
          categorySheet['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
          ];
          XLSX.utils.book_append_sheet(workbook, categorySheet, '人员类别');
          sheetsCreated++;
        }

        // 创建详细薪资项目工作表 - 使用透视表格式，每个薪资项目作为列
        if (comprehensiveData.payrollDetails && comprehensiveData.payrollDetails.length > 0) {
          // 步骤1: 按员工分组数据
          const employeeDetailsMap = new Map<string, any>();
          const componentNames = new Set<string>();
          
          // 收集所有薪资项目名称并按员工分组
          comprehensiveData.payrollDetails.forEach((item: any) => {
            const key = `${item.employee_id}_${item.payroll_id}`;
            
            if (!employeeDetailsMap.has(key)) {
              employeeDetailsMap.set(key, {
                employee_id: item.employee_id,
                employee_name: item.employee_name,
                department_name: item.department_name || '',
                position_name: item.position_name || '',
                pay_month: item.pay_month || item.period_name || '',
                components: {}
              });
            }
            
            const employeeData = employeeDetailsMap.get(key);
            // 将薪资项目名称作为属性存储
            employeeData.components[item.component_name] = item.amount || 0;
            componentNames.add(item.component_name);
          });
          
          // 步骤2: 将薪资项目名称排序（收入项在前，扣除项在后）
          const sortedComponents = Array.from(componentNames).sort((a, b) => {
            // 可以根据实际的组件类型排序，这里简单按名称排序
            const incomeKeywords = ['基本工资', '岗位工资', '绩效', '奖金', '津贴', '补贴', '加班'];
            const deductionKeywords = ['养老', '医疗', '失业', '工伤', '生育', '公积金', '个税', '扣款'];
            
            const aIsIncome = incomeKeywords.some(keyword => a.includes(keyword));
            const bIsIncome = incomeKeywords.some(keyword => b.includes(keyword));
            const aIsDeduction = deductionKeywords.some(keyword => a.includes(keyword));
            const bIsDeduction = deductionKeywords.some(keyword => b.includes(keyword));
            
            if (aIsIncome && !bIsIncome) return -1;
            if (!aIsIncome && bIsIncome) return 1;
            if (aIsDeduction && !bIsDeduction) return 1;
            if (!aIsDeduction && bIsDeduction) return -1;
            
            return a.localeCompare(b, 'zh-CN');
          });
          
          // 步骤3: 构建导出数据
          const detailsData = Array.from(employeeDetailsMap.values()).map((item, index) => {
            const row: any = {
              '序号': index + 1,
              '员工姓名': item.employee_name,
              '部门': item.department_name,
              '职位': item.position_name,
              '薪资月份': item.pay_month
            };
            
            // 添加所有薪资项目列
            sortedComponents.forEach(componentName => {
              row[componentName] = item.components[componentName] || 0;
            });
            
            // 计算合计
            const totalIncome = sortedComponents
              .filter(name => !name.includes('扣') && !name.includes('个税') && 
                            !name.includes('养老') && !name.includes('医疗') && 
                            !name.includes('失业') && !name.includes('工伤') && 
                            !name.includes('生育') && !name.includes('公积金'))
              .reduce((sum, name) => sum + (item.components[name] || 0), 0);
            
            const totalDeduction = sortedComponents
              .filter(name => name.includes('扣') || name.includes('个税') || 
                            name.includes('养老') || name.includes('医疗') || 
                            name.includes('失业') || name.includes('工伤') || 
                            name.includes('生育') || name.includes('公积金'))
              .reduce((sum, name) => sum + Math.abs(item.components[name] || 0), 0);
            
            row['应发合计'] = totalIncome;
            row['扣款合计'] = totalDeduction;
            row['实发工资'] = totalIncome - totalDeduction;
            
            return row;
          });

          const detailsSheet = XLSX.utils.json_to_sheet(detailsData);
          
          // 设置列宽 - 基础列 + 动态薪资项目列 + 合计列
          const columnWidths = [
            { wch: 8 },  // 序号
            { wch: 12 }, // 员工姓名
            { wch: 15 }, // 部门
            { wch: 15 }, // 职位
            { wch: 12 }, // 薪资月份
            ...sortedComponents.map(() => ({ wch: 12 })), // 各薪资项目
            { wch: 12 }, // 应发合计
            { wch: 12 }, // 扣款合计
            { wch: 12 }  // 实发工资
          ];
          detailsSheet['!cols'] = columnWidths;
          
          XLSX.utils.book_append_sheet(workbook, detailsSheet, '薪资项目明细');
          sheetsCreated++;
        }

        setExportProgress({ 
          phase: 'generating', 
          total: 100, 
          processed: 80, 
          message: '正在保存文件...' 
        });

        // 3. 下载文件
        const filename = config.filename || `薪资数据_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);

        setExportProgress({ 
          phase: 'completed', 
          total: 100, 
          processed: 100, 
          message: '导出成功' 
        });

        return { success: true, count: sheetsCreated };
      } catch (error) {
        setExportProgress({ phase: 'error', total: 0, processed: 0, message: '导出失败' });
        handleError(error, { customMessage: '导出Excel失败' });
        throw error;
      }
    });
  }, [withLoading, fetchComprehensiveData, handleError]);

  // 导出到 CSV
  const exportToCSV = useCallback(async (config: ExportConfig) => {
    return withLoading('isExporting', async () => {
      try {
        setExportProgress({ phase: 'preparing', total: 0, processed: 0, message: '准备导出...' });

        // 1. 获取综合数据（CSV目前只导出薪资数据）
        const comprehensiveData = await fetchComprehensiveData(config);
        const data = comprehensiveData.payroll || [];

        if (!data || data.length === 0) {
          throw new Error('没有可导出的数据');
        }

        // 2. 转换格式
        const csvData = transformToExcelFormat(data, config);

        // 3. 生成 CSV 内容
        setExportProgress({ 
          phase: 'generating', 
          total: csvData.length, 
          processed: csvData.length, 
          message: '正在生成文件...' 
        });

        const headers = Object.keys(csvData[0]);
        const csvContent = [
          headers.join(','),
          ...csvData.map(row => 
            headers.map(header => {
              const value = row[header];
              // 处理包含逗号或引号的值
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ].join('\n');

        // 4. 下载文件
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', config.filename || `薪资数据_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setExportProgress({ 
          phase: 'completed', 
          total: csvData.length, 
          processed: csvData.length, 
          message: '导出成功' 
        });

        return { success: true, count: csvData.length };
      } catch (error) {
        setExportProgress({ phase: 'error', total: 0, processed: 0, message: '导出失败' });
        handleError(error, { customMessage: '导出CSV失败' });
        throw error;
      }
    });
  }, [withLoading, fetchComprehensiveData, transformToExcelFormat, handleError]);

  // 导出到 JSON
  const exportToJSON = useCallback(async (config: ExportConfig) => {
    return withLoading('isExporting', async () => {
      try {
        setExportProgress({ phase: 'preparing', total: 0, processed: 0, message: '准备导出...' });

        // 1. 获取综合数据
        const comprehensiveData = await fetchComprehensiveData(config);
        
        // 检查是否有数据
        const hasData = Object.values(comprehensiveData).some((data: any) => 
          Array.isArray(data) && data.length > 0
        );

        if (!hasData) {
          throw new Error('没有可导出的数据');
        }

        // 2. 生成 JSON 文件
        setExportProgress({ 
          phase: 'generating', 
          total: 100, 
          processed: 100, 
          message: '正在生成文件...' 
        });

        const jsonContent = JSON.stringify(comprehensiveData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', config.filename || `薪资数据_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 统计导出的数据条数
        const totalCount = Object.values(comprehensiveData).reduce((sum: number, data: any) => {
          return sum + (Array.isArray(data) ? data.length : 0);
        }, 0);

        setExportProgress({ 
          phase: 'completed', 
          total: totalCount, 
          processed: totalCount, 
          message: '导出成功' 
        });

        return { success: true, count: totalCount };
      } catch (error) {
        setExportProgress({ phase: 'error', total: 0, processed: 0, message: '导出失败' });
        handleError(error, { customMessage: '导出JSON失败' });
        throw error;
      }
    });
  }, [withLoading, fetchComprehensiveData, handleError]);

  // 下载导出模板
  const downloadTemplate = useCallback(async () => {
    return withLoading('isDownloading', async () => {
      try {
        // 创建模板数据
        const templateData = [
          {
            '员工姓名': '示例员工',
            '身份证号': '110101199001011234',
            '部门': '技术部',
            '职位': '工程师',
            '基本工资': 10000,
            '岗位工资': 3000,
            '绩效奖金': 2000,
            '加班费': 500,
            '津贴': 1000,
            '补贴': 500
          }
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // 设置列宽
        worksheet['!cols'] = [
          { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
          { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, '薪资导入模板');
        XLSX.writeFile(workbook, '薪资导入模板.xlsx');

        return { success: true };
      } catch (error) {
        handleError(error, { customMessage: '下载模板失败' });
        throw error;
      }
    });
  }, [withLoading, handleError]);

  return {
    // 导出功能
    exportToExcel,
    exportToCSV,
    exportToJSON,
    downloadTemplate,
    
    // 数据获取 Hook
    useComprehensiveExportData,
    
    // 模板管理
    templates: useExportTemplates(),
    
    // 导出进度
    exportProgress,
    
    // 加载状态
    loading: {
      isExporting: loadingState.isExporting,
      isDownloading: loadingState.isDownloading
    }
  };
}

// 导出便捷函数
export function useQuickExport() {
  const { exportToExcel, exportToCSV, loading } = usePayrollExport();

  const quickExportCurrentMonth = useCallback(async (format: 'xlsx' | 'csv' = 'xlsx') => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const config: ExportConfig = {
      filename: `薪资数据_${currentMonth}`,
      format
    };

    if (format === 'csv') {
      return exportToCSV(config);
    }
    return exportToExcel(config);
  }, [exportToExcel, exportToCSV]);

  return {
    quickExportCurrentMonth,
    loading
  };
}