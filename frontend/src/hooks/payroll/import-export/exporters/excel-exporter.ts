import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { ExportConfig } from '../types';
import { getExportTemplate } from '../config/export-templates';
import { generateExcelFromTemplate, generateFileName, validateTemplate } from '../generators/excel-generator';
import { generateStyledExcelFromTemplate, generateStyledFileName } from '../generators/excel-generator-styled';

/**
 * 转换日期格式 - 确保与数据库格式匹配
 * 输入格式可能是: "2025-06", "2025年6月", "2025-6"
 * 输出格式: "2025年6月" (与数据库期间名称格式匹配)
 */
const convertToChinesePeriodFormat = (periodInput: string): string => {
  console.log('🔄 转换日期格式 - 输入:', periodInput);
  
  // 如果已经是中文格式，直接返回
  if (periodInput.includes('年') && periodInput.includes('月')) {
    console.log('✅ 已是中文格式，直接返回:', periodInput);
    return periodInput;
  }
  
  // 处理 YYYY-MM 或 YYYY-M 格式
  if (periodInput.includes('-')) {
    const [year, month] = periodInput.split('-');
    const chineseFormat = `${year}年${parseInt(month)}月`;
    console.log('✅ YYYY-MM格式转换为:', chineseFormat);
    return chineseFormat;
  }
  
  // 如果无法识别格式，返回原值并警告
  console.warn('⚠️ 无法识别日期格式:', periodInput);
  return periodInput;
};

// 复制usePayrollExport中已验证的完整导出配置
interface PayrollExportConfig {
  periodId?: string;
  periodMonth?: string;
  departmentId?: string;
  employeeIds?: string[];
  status?: string;
  format?: 'xlsx' | 'csv' | 'json';
  filename?: string;
  includeDetails?: boolean;
  includeInsurance?: boolean;
  includeJobAssignments?: boolean;
  includeCategoryAssignments?: boolean;
  selectedDataGroups?: string[];
  template?: string;
}

/**
 * 获取完整的导出数据 - 完全复制usePayrollExport中的fetchComprehensiveData逻辑
 */
const fetchComprehensiveData = async (config: PayrollExportConfig) => {
  const result: any = {};
  let employeeIdsWithPayroll: string[] = [];
  let periodId: string | null = null;
  
  // 如果有 periodMonth，先查找对应的 period_id
  if (config.periodMonth) {
    const { data: periodData, error: periodError } = await supabase
      .from('payroll_periods')
      .select('id')
      .eq('period_name', config.periodMonth)
      .single();
    
    if (!periodError && periodData) {
      periodId = periodData.id;
    }
  }
  
  // 始终先获取薪资数据，以便获取有薪资记录的员工ID列表
  if (true) {
    console.log('🔍 查询薪资数据 - periodMonth:', config.periodMonth, 'periodId:', config.periodId);
    
    let payrollQuery = supabase
      .from('view_payroll_summary')
      .select('*');

    // 应用过滤条件 - 使用 periodMonth 来过滤薪资周期
    if (config.periodMonth) {
      payrollQuery = payrollQuery.eq('period_name', config.periodMonth);
      console.log('📅 使用period_name过滤:', config.periodMonth);
    } else if (config.periodId) {
      payrollQuery = payrollQuery.eq('period_id', config.periodId);
      console.log('🆔 使用period_id过滤:', config.periodId);
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
    if (payrollError) {
      console.error('❌ 薪资数据查询失败:', payrollError);
      throw payrollError;
    }
    
    console.log('✅ 薪资数据查询结果:', payrollData?.length || 0, '条记录');

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
      
      // 将部门和职位信息合并到详细数据中，确保包含汇总字段
      result.payrollDetails = (details || []).map(detail => {
        const payrollInfo = payrollInfoMap.get(detail.payroll_id);
        const originalPayroll = payrollData.find(p => p.payroll_id === detail.payroll_id);
        
        return {
          ...detail,
          department_name: payrollInfo?.department_name || '',
          position_name: payrollInfo?.position_name || '',
          // 确保包含汇总字段（从原始薪资数据中获取）
          gross_pay: originalPayroll?.gross_pay || detail.gross_pay || 0,
          total_deductions: originalPayroll?.total_deductions || detail.total_deductions || 0,
          net_pay: originalPayroll?.net_pay || detail.net_pay || 0
        };
      });
    }
  }

  // 获取职务分配数据 - 只包含有薪资记录的员工
  if (config.includeJobAssignments || config.selectedDataGroups?.includes('job')) {
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
        .in('employee_id', employeeIdsWithPayroll);

      // 使用找到的 periodId 或配置中的 periodId 来过滤
      const targetPeriodId = periodId || config.periodId;
      if (targetPeriodId) {
        jobQuery = jobQuery.eq('period_id', targetPeriodId);
      }

      const { data: jobData, error: jobError } = await jobQuery;
      if (jobError) throw jobError;
      result.jobAssignments = jobData || [];
    } else {
      result.jobAssignments = [];
    }
  }

  // 获取人员类别数据 - 只包含有薪资记录的员工
  if (config.includeCategoryAssignments || config.selectedDataGroups?.includes('category')) {
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
        .in('employee_id', employeeIdsWithPayroll);

      // 使用找到的 periodId 或配置中的 periodId 来过滤
      const targetPeriodId = periodId || config.periodId;
      if (targetPeriodId) {
        categoryQuery = categoryQuery.eq('period_id', targetPeriodId);
      }

      const { data: categoryData, error: categoryError } = await categoryQuery;
      if (categoryError) throw categoryError;
      result.categoryAssignments = categoryData || [];
    } else {
      result.categoryAssignments = [];
    }
  }

  // 获取缴费基数数据 - 只包含有薪资记录的员工
  if (config.includeInsurance || config.selectedDataGroups?.includes('bases')) {
    if (employeeIdsWithPayroll.length > 0) {
      let basesQuery = supabase
        .from('view_employee_contribution_bases_by_period')
        .select(`
          employee_id,
          employee_name,
          insurance_type_key,
          insurance_type_name,
          latest_contribution_base,
          base_period_display
        `)
        .in('employee_id', employeeIdsWithPayroll);

      // 缴费基数视图使用 period_id 字段
      const targetPeriodId = periodId || config.periodId;
      if (targetPeriodId) {
        basesQuery = basesQuery.eq('period_id', targetPeriodId);
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
            period_display: item.base_period_display || '',
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
            employeeData.pension_base = item.latest_contribution_base;
            break;
          case 'medical':
            employeeData.medical_base = item.latest_contribution_base;
            break;
          case 'unemployment':
            employeeData.unemployment_base = item.latest_contribution_base;
            break;
          case 'work_injury':
            employeeData.work_injury_base = item.latest_contribution_base;
            break;
          case 'maternity':
            employeeData.maternity_base = item.latest_contribution_base;
            break;
          case 'housing_fund':
            employeeData.housing_fund_base = item.latest_contribution_base;
            break;
          case 'occupational_pension':
            employeeData.occupational_pension_base = item.latest_contribution_base;
            break;
          case 'serious_illness':
            employeeData.serious_illness_base = item.latest_contribution_base;
            break;
        }
      });
      
      result.contributionBases = Array.from(employeeBasesMap.values());
    } else {
      result.contributionBases = [];
    }
  }

  return result;
};

/**
 * 生成多sheet Excel缓冲区 - 完整的四个数据组导出
 */
const generateMultiSheetExcelBuffer = async (
  periodId: string,
  config: ExportConfig
): Promise<ArrayBuffer> => {
  console.log('🚀 开始导出Excel - periodId:', periodId, 'config:', config);
  
  // 获取完整数据 - 转换为中文格式并使用 periodMonth
  const chinesePeriodName = convertToChinesePeriodFormat(periodId);
  const comprehensiveData = await fetchComprehensiveData({
    periodMonth: chinesePeriodName, // 传递中文月份格式 (YYYY年MM月)
    selectedDataGroups: ['earnings', 'bases', 'job', 'category'],
    includeDetails: true,
    includeInsurance: true,
    includeJobAssignments: true,
    includeCategoryAssignments: true
  });

  console.log('📊 获取到的数据:', {
    payroll: comprehensiveData.payroll?.length || 0,
    contributionBases: comprehensiveData.contributionBases?.length || 0,
    jobAssignments: comprehensiveData.jobAssignments?.length || 0,
    categoryAssignments: comprehensiveData.categoryAssignments?.length || 0,
    payrollDetails: comprehensiveData.payrollDetails?.length || 0
  });

  // 创建工作簿
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
      '职级': item.job_ranks?.name || item.ranks?.name || ''  // 新增：职级信息
    }));

    const jobSheet = XLSX.utils.json_to_sheet(jobData);
    jobSheet['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }  // 保持5列宽度配置
    ];
    XLSX.utils.book_append_sheet(workbook, jobSheet, '职务分配');
    sheetsCreated++;
  }

  // 创建人员类别工作表
  if (comprehensiveData.categoryAssignments && comprehensiveData.categoryAssignments.length > 0) {
    const categoryData = comprehensiveData.categoryAssignments.map((item: any, index: number) => ({
      '序号': index + 1,
      '员工姓名': item.employees?.employee_name || '',
      '人员类别名称': item.employee_categories?.name || ''      // 修正：使用 name 而不是 category_name
    }));

    const categorySheet = XLSX.utils.json_to_sheet(categoryData);
    categorySheet['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 20 }  // 调整列宽配置，移除人员类别编码和创建时间的列宽
    ];
    XLSX.utils.book_append_sheet(workbook, categorySheet, '人员类别');
    sheetsCreated++;
  }

  // 创建详细薪资项目工作表 - 使用透视表格式，每个薪资项目作为列
  if (comprehensiveData.payrollDetails && comprehensiveData.payrollDetails.length > 0) {
    // 步骤1: 按员工分组数据
    const employeeDetailsMap = new Map<string, any>();
    const componentNames = new Set<string>();
    const componentTypesMap = new Map<string, string>(); // 存储组件类型
    
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
          // 使用视图中已有的汇总字段
          gross_pay: item.gross_pay || 0,
          total_deductions: item.total_deductions || 0,
          net_pay: item.net_pay || 0,
          components: {},
          incomeComponents: {}, // 收入项
          deductionComponents: {} // 扣除项
        });
      }
      
      const employeeData = employeeDetailsMap.get(key);
      // 将薪资项目名称作为属性存储
      employeeData.components[item.component_name] = item.item_amount || item.amount || 0;
      
      // 根据 component_type 分类存储（优化：利用 component_type 字段）
      if (item.component_type === 'earning' || item.component_type === 'income') {
        employeeData.incomeComponents[item.component_name] = item.item_amount || item.amount || 0;
      } else if (item.component_type === 'deduction') {
        employeeData.deductionComponents[item.component_name] = Math.abs(item.item_amount || item.amount || 0);
      }
      
      componentNames.add(item.component_name);
      // 存储组件类型信息
      componentTypesMap.set(item.component_name, item.component_type || 'unknown');
    });
    
    // 步骤2: 将薪资项目名称排序（收入项在前，扣除项在后）
    const sortedComponents = Array.from(componentNames).sort((a, b) => {
      // 使用 component_type 进行准确排序
      const aType = componentTypesMap.get(a) || 'unknown';
      const bType = componentTypesMap.get(b) || 'unknown';
      
      // 收入项排在前面
      if ((aType === 'earning' || aType === 'income') && bType === 'deduction') return -1;
      if (aType === 'deduction' && (bType === 'earning' || bType === 'income')) return 1;
      
      // 同类型按名称排序
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
      
      // 立即修复：使用视图中已有的准确值，而不是重新计算
      row['应发合计'] = item.gross_pay;  // 使用数据库计算的准确值
      row['扣款合计'] = item.total_deductions;  // 使用数据库计算的准确值
      row['实发工资'] = item.net_pay;  // 使用数据库计算的准确值
      
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

  // 确保至少有一个工作表
  if (sheetsCreated === 0) {
    console.warn('⚠️ 没有创建任何工作表，创建一个空的默认工作表');
    const emptySheet = XLSX.utils.json_to_sheet([{
      '提示': '当前选择的薪资周期没有数据',
      '薪资周期': periodId,
      '导出时间': new Date().toLocaleString('zh-CN')
    }]);
    XLSX.utils.book_append_sheet(workbook, emptySheet, '导出说明');
    sheetsCreated++;
  }

  console.log(`📁 总共创建了 ${sheetsCreated} 个工作表`);
  
  // 生成Excel文件缓冲区
  const buffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  return buffer;
};

/**
 * 生成Excel缓冲区 - 单个数据组导出（兼容旧代码）
 */
export const generateExcelBuffer = async (
  data: any[],
  config: ExportConfig
): Promise<ArrayBuffer> => {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 创建工作表数据 - 根据 view_payroll_summary 的实际字段
  const wsData = data.map(row => ({
    '薪资ID': row.payroll_id,
    '员工ID': row.employee_id,
    '员工姓名': row.employee_name,
    '身份证号': row.id_number,
    '部门': row.department_name,
    '职位': row.position_name,
    '人员类别': row.category_name,
    '薪资周期': row.period_name,
    '周期代码': row.period_code,
    '周期开始': row.period_start,
    '周期结束': row.period_end,
    '计划发薪日': row.scheduled_pay_date,
    '实际发薪日': row.actual_pay_date,
    '应发工资': row.gross_pay,
    '扣款合计': row.total_deductions,
    '实发工资': row.net_pay,
    '薪资状态': row.payroll_status === 'draft' ? '草稿' : 
                row.payroll_status === 'submitted' ? '已提交' :
                row.payroll_status === 'approved' ? '已审批' :
                row.payroll_status === 'paid' ? '已发放' : 
                row.payroll_status === 'cancelled' ? '已取消' : row.payroll_status,
    '周期状态': row.period_status === 'preparing' ? '准备中' :
                row.period_status === 'ready' ? '就绪' :
                row.period_status === 'processing' ? '处理中' :
                row.period_status === 'completed' ? '已完成' :
                row.period_status === 'closed' ? '已关闭' : row.period_status,
    '创建时间': row.created_at,
    '更新时间': row.updated_at
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
};

/**
 * 基于配置的薪资数据导出 - 推荐使用的新方法
 */
export const exportPayrollToExcelWithTemplate = async (config: ExportConfig): Promise<void> => {
  const exportPeriodId = config.filters?.periodId || new Date().toISOString().slice(0, 7);
  console.log('🎯 基于配置的导出 - periodId:', exportPeriodId, 'config:', config);

  // 获取导出模板
  const template = getExportTemplate(config.template || 'payroll_complete');
  if (!template) {
    throw new Error(`未找到导出模板: ${config.template}`);
  }

  // 验证模板配置
  const validation = validateTemplate(template);
  if (!validation.valid) {
    console.error('❌ 模板配置验证失败:', validation.errors);
    throw new Error(`模板配置错误: ${validation.errors.join(', ')}`);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ 模板配置警告:', validation.warnings);
  }

  // 获取数据
  const chinesePeriodName = convertToChinesePeriodFormat(exportPeriodId);
  console.log('📊 使用中文格式查询数据:', chinesePeriodName);

  const comprehensiveData = await fetchComprehensiveData({
    periodMonth: chinesePeriodName,
    selectedDataGroups: ['earnings', 'bases', 'job', 'category'],
    includeDetails: true,  // 必须设置为true以获取薪资明细
    includeInsurance: true,
    includeJobAssignments: true,
    includeCategoryAssignments: true
  });

  console.log('📋 获取到的完整数据:', {
    payroll: comprehensiveData.payroll?.length || 0,
    contributionBases: comprehensiveData.contributionBases?.length || 0,
    jobAssignments: comprehensiveData.jobAssignments?.length || 0,
    categoryAssignments: comprehensiveData.categoryAssignments?.length || 0,
    payrollDetails: comprehensiveData.payrollDetails?.length || 0
  });

  // 调试：检查payrollDetails的数据结构
  if (comprehensiveData.payrollDetails && comprehensiveData.payrollDetails.length > 0) {
    console.log('📊 薪资明细数据样本:', comprehensiveData.payrollDetails[0]);
    console.log('📊 薪资明细字段:', Object.keys(comprehensiveData.payrollDetails[0]));
  }

  // 准备数据格式，映射到模板中的工作表
  const templateData: Record<string, any[]> = {};
  
  if (template.sheets.payroll) {
    templateData.payroll = comprehensiveData.payroll || [];
  }
  
  if (template.sheets.contributionBases) {
    templateData.contributionBases = comprehensiveData.contributionBases || [];
  }
  
  if (template.sheets.jobAssignments) {
    templateData.jobAssignments = comprehensiveData.jobAssignments || [];
  }
  
  if (template.sheets.categoryAssignments) {
    templateData.categoryAssignments = comprehensiveData.categoryAssignments || [];
  }

  if (template.sheets.payrollDetails) {
    templateData.payrollDetails = comprehensiveData.payrollDetails || [];
    console.log('📋 映射薪资明细数据到模板:', {
      配置了payrollDetails工作表: !!template.sheets.payrollDetails,
      透视模式: template.sheets.payrollDetails.pivotMode,
      数据条数: templateData.payrollDetails.length
    });
  }

  // 使用带样式的Excel生成器
  console.log('🎨 使用ExcelJS生成带样式的Excel文件');
  const buffer = await generateStyledExcelFromTemplate({
    template,
    data: templateData,
    includeEmptySheets: false
  });

  // 生成文件名
  const fileName = generateStyledFileName(template, exportPeriodId, config.format || 'xlsx');

  // 下载文件
  await downloadExcelFile(buffer, fileName);
  
  console.log(`✅ 基于配置的Excel导出成功: ${fileName}`);
};

/**
 * 下载Excel文件的通用函数
 */
async function downloadExcelFile(buffer: ArrayBuffer, fileName: string): Promise<void> {
  // 创建下载链接
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 清理URL
  window.URL.revokeObjectURL(url);
}

/**
 * 导出薪资数据到Excel - 支持多sheet导出（兼容旧版本）
 */
export const exportPayrollToExcel = async (config: ExportConfig): Promise<void> => {
  // 优先使用新的配置化导出方式
  if (config.template === 'payroll_complete' || config.template === 'payroll_multi_sheet') {
    return await exportPayrollToExcelWithTemplate(config);
  }

  // 保留原有的硬编码导出方式作为后备
  const exportPeriodId = config.filters?.periodId || new Date().toISOString().slice(0, 7);
  console.log('🎯 exportPayrollToExcel - 接收到的periodId:', exportPeriodId, 'config:', config);
  
  let buffer: ArrayBuffer;
  let fileName: string;
  
  // 根据模板类型决定导出方式
  if (config.template === 'payroll_multi_sheet' || config.template === 'payroll_complete') {
    // 使用多sheet导出（四个数据组） - 默认导出所有四个数据组
    buffer = await generateMultiSheetExcelBuffer(exportPeriodId, config);
    fileName = `薪资完整导出_${exportPeriodId}.${config.format || 'xlsx'}`;
  } else {
    // 使用传统的单sheet导出（薪资汇总）
    const chinesePeriodName = convertToChinesePeriodFormat(exportPeriodId);
    console.log('📋 单表导出 - 使用中文格式查询:', chinesePeriodName);
    
    const { data, error } = await supabase
      .from('view_payroll_summary')
      .select('*')
      .eq('period_name', chinesePeriodName);
    
    if (error) {
      throw new Error(`导出数据失败: ${error.message}`);
    }
    
    buffer = await generateExcelBuffer((data || []) as any[], config);
    fileName = `薪资数据导出_${exportPeriodId}.${config.format || 'xlsx'}`;
  }
  
  // 创建下载链接
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 清理URL
  window.URL.revokeObjectURL(url);
  
  console.log(`✅ Excel文件导出成功: ${fileName}`);
};

/**
 * 生成导入模板Excel
 */
export const generateImportTemplate = async (templateType: string): Promise<void> => {
  const wb = XLSX.utils.book_new();
  
  let templateData: any[] = [];
  let sheetName = '';
  
  switch (templateType) {
    case 'payroll_items':
      templateData = [
        {
          '员工姓名': '张三',
          '基本工资': 5000,
          '岗位工资': 2000,
          '绩效奖金': 1000,
          '加班费': 500,
          '津贴': 300,
          '补贴': 200
        }
      ];
      sheetName = '薪资项目模板';
      break;
      
    case 'category_assignments':
      templateData = [
        {
          '员工姓名': '张三',
          '人员类别': '正式员工'
        }
      ];
      sheetName = '人员类别分配模板';
      break;
      
    case 'job_assignments':
      templateData = [
        {
          '员工姓名': '张三',
          '部门': '技术部',
          '职位': '软件工程师',
          '职级': '高级'
        }
      ];
      sheetName = '职务分配模板';
      break;
      
    case 'contribution_bases':
      templateData = [
        {
          '员工姓名': '张三',
          '养老保险基数': 8000,
          '医疗保险基数': 8000,
          '失业保险基数': 8000,
          '工伤保险基数': 8000,
          '生育保险基数': 8000,
          '住房公积金基数': 8000
        }
      ];
      sheetName = '缴费基数模板';
      break;
      
    case 'deductions':
      templateData = [
        {
          '员工姓名': '张三',
          '养老保险': 640,
          '医疗保险': 160,
          '失业保险': 80,
          '住房公积金': 960,
          '个人所得税': 200
        }
      ];
      sheetName = '扣除项模板';
      break;
      
    default:
      throw new Error(`不支持的模板类型: ${templateType}`);
  }
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // 设置列宽
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const colWidths = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    colWidths.push({ wch: 15 });
  }
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // 生成Excel文件
  const wbout = XLSX.write(wb, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  // 创建下载链接
  const blob = new Blob([wbout], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sheetName}.xlsx`;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 清理URL
  window.URL.revokeObjectURL(url);
  
  console.log(`✅ 模板文件下载成功: ${sheetName}.xlsx`);
};