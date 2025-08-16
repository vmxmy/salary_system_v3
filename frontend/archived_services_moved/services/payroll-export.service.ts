import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { ImportDataGroup } from '@/types/payroll-import';
import { ImportTemplateService } from './import-template.service';

export interface ExportConfig {
  payPeriod: {
    start: Date;
    end: Date;
  };
  dataGroups: ImportDataGroup[];
  includeHeaders: boolean;
  fileName?: string;
}

export interface PayrollPeriod {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  employee_count: number;
  total_amount: number;
}

export class PayrollExportService {
  /**
   * 获取可用的薪资周期列表
   */
  static async getAvailablePeriods(): Promise<PayrollPeriod[]> {
    // 使用与薪资管理页面相同的视图
    const { data, error } = await supabase
      .from('view_payroll_summary')
      .select('pay_period_start, pay_period_end, pay_date, gross_pay')
      .order('pay_period_start', { ascending: false });

    if (error) throw error;

    // 按周期分组统计
    const periodMap = new Map<string, PayrollPeriod>();
    
    data?.forEach(payroll => {
      const key = `${payroll.pay_period_start}_${payroll.pay_period_end}`;
      
      if (periodMap.has(key)) {
        const period = periodMap.get(key)!;
        period.employee_count += 1;
        period.total_amount += parseFloat(payroll.gross_pay || '0');
      } else {
        periodMap.set(key, {
          id: key,
          pay_period_start: payroll.pay_period_start,
          pay_period_end: payroll.pay_period_end,
          pay_date: payroll.pay_date,
          employee_count: 1,
          total_amount: parseFloat(payroll.gross_pay || '0')
        });
      }
    });

    return Array.from(periodMap.values());
  }

  /**
   * 导出指定周期的薪资数据
   */
  static async exportPayrollData(config: ExportConfig): Promise<void> {
    // 使用本地日期格式化
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    console.log('[PayrollExportService] Export config:', {
      payPeriod: config.payPeriod,
      startDateFormatted: formatDate(config.payPeriod.start),
      endDateFormatted: formatDate(config.payPeriod.end),
      dataGroups: config.dataGroups
    });
    
    const workbook = XLSX.utils.book_new();
    
    for (const group of config.dataGroups) {
      console.log(`[PayrollExportService] Getting data for group: ${group}`);
      const sheetData = await this.getSheetDataForGroup(group, config.payPeriod);
      console.log(`[PayrollExportService] Sheet data for ${group}:`, {
        headers: sheetData.headers,
        dataLength: sheetData.data.length,
        sampleData: sheetData.data.slice(0, 2)
      });
      
      if (sheetData.data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(sheetData.data, {
          header: sheetData.headers
        });
        
        // 设置列宽
        worksheet['!cols'] = sheetData.headers.map(header => ({
          wch: Math.max(header.length * 1.5, 12)
        }));
        
        // 添加到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, this.getSheetName(group));
      }
    }
    
    // 检查工作簿是否为空
    if (workbook.SheetNames.length === 0) {
      console.error('[PayrollExportService] No data found for export');
      alert('没有找到可导出的数据，请检查选择的时间范围和数据类型。');
      return;
    }
    
    // 生成文件名
    const fileName = config.fileName || this.generateFileName(config);
    
    // 下载文件
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * 获取指定周期内有薪资记录的员工ID列表
   */
  private static async getEmployeeIdsWithPayroll(payPeriod: { start: Date; end: Date }): Promise<string[]> {
    // 使用本地日期格式化，避免时区问题
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const startDate = formatDate(payPeriod.start);
    const endDate = formatDate(payPeriod.end);
    
    console.log('[getEmployeeIdsWithPayroll] Query params:', {
      startDate,
      endDate,
      payPeriod
    });
    
    const { data, error } = await supabase
      .from('view_payroll_summary')
      .select('employee_id')
      .gte('pay_period_start', startDate)
      .lte('pay_period_end', endDate);
    
    if (error) {
      console.error('Error fetching employee IDs with payroll:', error);
      throw error;
    }
    
    const employeeIds = [...new Set(data?.map(item => item.employee_id) || [])];
    console.log('[getEmployeeIdsWithPayroll] Found employee IDs:', {
      count: employeeIds.length,
      ids: employeeIds.slice(0, 5) // 只显示前5个ID作为示例
    });
    
    // 返回去重后的员工ID列表
    return employeeIds;
  }

  /**
   * 获取指定数据组的工作表数据
   */
  private static async getSheetDataForGroup(
    group: ImportDataGroup,
    payPeriod: { start: Date; end: Date }
  ) {
    switch (group) {
      case ImportDataGroup.EARNINGS:
        return await this.getEarningsData(payPeriod);
      
      case ImportDataGroup.CONTRIBUTION_BASES:
        return await this.getContributionBasesData(payPeriod);
      
      case ImportDataGroup.CATEGORY_ASSIGNMENT:
        return await this.getCategoryAssignmentData(payPeriod);
      
      case ImportDataGroup.JOB_ASSIGNMENT:
        return await this.getJobAssignmentData(payPeriod);
      
      case ImportDataGroup.ALL:
        return await this.getAllData(payPeriod);
      
      default:
        return { headers: [], data: [] };
    }
  }

  /**
   * 获取收入数据
   */
  private static async getEarningsData(payPeriod: { start: Date; end: Date }) {
    // 使用本地日期格式化，避免时区问题
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // 直接使用 view_payroll_unified 获取收入数据，包含所有薪资组件明细
    const { data: payrollData, error } = await supabase
      .from('view_payroll_unified')
      .select(`
        payroll_id,
        employee_id,
        employee_name,
        id_number,
        component_name,
        component_type,
        item_amount
      `)
      .eq('component_type', 'earning')
      .gte('pay_period_start', formatDate(payPeriod.start))
      .lte('pay_period_end', formatDate(payPeriod.end))
      .order('employee_name')
      .order('component_name');

    if (error) {
      console.error('Error fetching earnings data:', error);
      throw error;
    }

    if (!payrollData || payrollData.length === 0) {
      return { headers: [], data: [] };
    }

    // 获取所有独特的收入组件名称
    const componentNames = [...new Set(payrollData.map(item => item.component_name))].sort();
    
    // 组装数据 - 按员工分组
    const dataMap = new Map<string, any>();
    
    payrollData.forEach(item => {
      const key = item.payroll_id; // 使用 payroll_id 作为唯一标识
      
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          '员工编号': item.employee_id || '', // 使用 employee_id 作为员工编号
          '员工姓名': item.employee_name || '',
          '身份证号': item.id_number || ''
        });
      }
      
      const data = dataMap.get(key);
      // 填充具体的收入数据
      if (item.component_name && item.item_amount !== null) {
        data[item.component_name] = parseFloat(item.item_amount.toString());
      }
    });

    // 构建完整的表头
    const headers = ['员工编号', '员工姓名', '身份证号', ...componentNames];

    // 确保所有数据行都有所有列
    const data = Array.from(dataMap.values()).map(row => {
      headers.forEach(header => {
        if (!(header in row)) {
          row[header] = 0; // 收入字段默认为0而不是空字符串
        }
      });
      return row;
    });

    console.log(`导出收入数据: ${data.length} 名员工, ${componentNames.length} 个收入项目`, {
      payPeriod,
      componentNames: componentNames.slice(0, 5), // 只显示前5个组件名
      sampleData: data.slice(0, 2) // 只显示前2个员工数据作为样本
    });
    
    return { headers, data };
  }

  /**
   * 获取缴费基数数据
   */
  private static async getContributionBasesData(payPeriod: { start: Date; end: Date }) {
    // 首先获取当月有薪资记录的员工ID列表
    const employeeIdsWithPayroll = await this.getEmployeeIdsWithPayroll(payPeriod);
    
    if (employeeIdsWithPayroll.length === 0) {
      return { headers: [], data: [] };
    }
    
    // 使用本地日期格式化，避免时区问题
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // 使用统一的保险基数视图获取数据
    const startDate = formatDate(payPeriod.start);
    const endDate = formatDate(payPeriod.end);
    
    const { data: bases, error } = await supabase
      .from('view_employee_insurance_base_unified')
      .select('*')
      .gte('effective_start_date', startDate)
      .lte('effective_end_date', endDate)
      .in('employee_id', employeeIdsWithPayroll); // 只查询有薪资记录的员工

    if (error) {
      console.error('Error fetching contribution bases data:', error);
      throw error;
    }

    if (!bases || bases.length === 0) {
      return { headers: [], data: [] };
    }

    // 组装数据 - 视图已经包含了员工信息，直接使用
    const dataMap = new Map<string, any>();
    
    bases.forEach((base: any) => {
      // 使用身份证号作为唯一标识
      const key = base.id_number || base.employee_id;
      
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          '员工编号': base.employee_id || '',
          '员工姓名': base.employee_name || '', // 统一字段名：直接使用employee_name
          '身份证号': base.id_number || ''
        });
      }
      
      const data = dataMap.get(key);
      const fieldName = this.getInsuranceFieldName(base.insurance_type_key);
      data[fieldName] = parseFloat(base.contribution_base);
    });

    const headers = [
      '员工编号',
      '员工姓名',
      '身份证号',
      '养老保险基数',
      '医疗保险基数',
      '失业保险基数',
      '工伤保险基数',
      '生育保险基数',
      '住房公积金基数',
      '职业年金基数',
      '大病医疗基数'
    ];

    const data = Array.from(dataMap.values()).map(row => {
      headers.forEach(header => {
        if (!(header in row)) {
          row[header] = '';
        }
      });
      return row;
    });

    return { headers, data };
  }

  /**
   * 获取人员类别数据 - 基于薪资周期的时间切片查询
   */
  private static async getCategoryAssignmentData(payPeriod: { start: Date; end: Date }) {
    // 首先获取当月有薪资记录的员工ID列表
    const employeeIdsWithPayroll = await this.getEmployeeIdsWithPayroll(payPeriod);
    
    if (employeeIdsWithPayroll.length === 0) {
      return { headers: [], data: [] };
    }
    
    // 使用本地日期格式化，避免时区问题
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const startDate = formatDate(payPeriod.start);
    const endDate = formatDate(payPeriod.end);
    
    const { data: assignments, error } = await supabase
      .from('employee_category_assignments')
      .select(`
        employee_id,
        employee_category_id,
        effective_start_date,
        effective_end_date,
        employees (
          employee_name,
          id_number
        ),
        employee_categories (
          name
        )
      `)
      .lte('effective_start_date', endDate)
      .or(`effective_end_date.gte.${startDate},effective_end_date.is.null`)
      .in('employee_id', employeeIdsWithPayroll); // 只查询有薪资记录的员工


    if (error) {
      console.error('Error fetching category assignment data:', error);
      throw error;
    }

    if (!assignments || assignments.length === 0) {
      console.warn('人员类别查询返回空数据');
      return { headers: [], data: [] };
    }

    const headers = [
      '员工编号',
      '员工姓名', 
      '身份证号',
      '人员类别',
      '生效日期',
      '失效日期'
    ];

    const data = assignments.map((assignment: any) => {
      const employee = assignment.employees;
      const category = assignment.employee_categories;
      
      return {
        '员工编号': assignment.employee_id || '', // 使用employee_id作为员工编号
        '员工姓名': employee?.employee_name || '', // 直接使用统一的employee_name字段
        '身份证号': employee?.id_number || '',
        '人员类别': category?.name || '',
        '生效日期': assignment.effective_start_date,
        '失效日期': assignment.effective_end_date || '' // 显示失效日期，便于了解时间切片
      };
    });

    return { headers, data };
  }

  /**
   * 获取职务信息数据 - 基于薪资周期的时间切片查询
   */
  private static async getJobAssignmentData(payPeriod: { start: Date; end: Date }) {
    // 首先获取当月有薪资记录的员工ID列表
    const employeeIdsWithPayroll = await this.getEmployeeIdsWithPayroll(payPeriod);
    
    if (employeeIdsWithPayroll.length === 0) {
      return { headers: [], data: [] };
    }
    
    // 使用本地日期格式化，避免时区问题
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const startDate = formatDate(payPeriod.start);
    const endDate = formatDate(payPeriod.end);
    
    const { data: jobs, error } = await supabase
      .from('employee_job_history')
      .select(`
        employee_id,
        department_id,
        position_id,
        rank_id,
        effective_start_date,
        effective_end_date,
        employees (
          employee_name,
          id_number
        ),
        departments (
          name
        ),
        positions (
          name
        )
      `)
      .lte('effective_start_date', endDate)
      .or(`effective_end_date.gte.${startDate},effective_end_date.is.null`)
      .in('employee_id', employeeIdsWithPayroll); // 只查询有薪资记录的员工


    if (error) {
      console.error('Error fetching job assignment data:', error);
      throw error;
    }

    if (!jobs || jobs.length === 0) {
      console.warn('职务信息查询返回空数据');
      return { headers: [], data: [] };
    }

    const headers = [
      '员工编号',
      '员工姓名',
      '身份证号',
      '部门名称',
      '职位名称', 
      '生效日期',
      '失效日期'
    ];

    const data = jobs.map((job: any) => {
      const employee = job.employees;
      const department = job.departments;
      const position = job.positions;
      
      return {
        '员工编号': job.employee_id || '', // 使用employee_id作为员工编号
        '员工姓名': employee?.employee_name || '', // 直接使用统一的employee_name字段
        '身份证号': employee?.id_number || '',
        '部门名称': department?.name || '',
        '职位名称': position?.name || '',
        '生效日期': job.effective_start_date,
        '失效日期': job.effective_end_date || '' // 显示失效日期，便于了解时间切片
      };
    });

    return { headers, data };
  }

  /**
   * 获取所有数据
   */
  private static async getAllData(payPeriod: { start: Date; end: Date }) {
    // 获取所有组的数据
    const [earnings, bases, categories, jobs] = await Promise.all([
      this.getEarningsData(payPeriod),
      this.getContributionBasesData(payPeriod),
      this.getCategoryAssignmentData(payPeriod),
      this.getJobAssignmentData(payPeriod)
    ]);

    // 合并数据（以员工标识为key）
    const mergedMap = new Map<string, any>();
    
    // 处理收入数据
    earnings.data.forEach(row => {
      const key = row['身份证号'] || row['员工编号'] || row['员工姓名'];
      mergedMap.set(key, { ...row });
    });

    // 合并基数数据
    bases.data.forEach(row => {
      const key = row['身份证号'] || row['员工编号'] || row['员工姓名'];
      const existing = mergedMap.get(key) || {};
      
      // 只合并基数字段
      bases.headers.forEach(header => {
        if (header.includes('基数')) {
          existing[header] = row[header];
        }
      });
      
      mergedMap.set(key, existing);
    });

    // 合并类别数据
    categories.data.forEach(row => {
      const key = row['身份证号'] || row['员工编号'] || row['员工姓名'];
      const existing = mergedMap.get(key) || {};
      
      existing['人员类别'] = row['人员类别'];
      existing['类别生效日期'] = row['生效日期'];
      
      mergedMap.set(key, existing);
    });

    // 合并职务数据
    jobs.data.forEach(row => {
      const key = row['身份证号'] || row['员工编号'] || row['员工姓名'];
      const existing = mergedMap.get(key) || {};
      
      existing['部门名称'] = row['部门名称'];
      existing['职位名称'] = row['职位名称'];
      existing['职务生效日期'] = row['生效日期'];
      
      mergedMap.set(key, existing);
    });

    // 构建完整的headers
    const headers = new Set<string>();
    mergedMap.forEach(row => {
      Object.keys(row).forEach(key => headers.add(key));
    });

    const orderedHeaders = Array.from(headers).sort((a, b) => {
      // 员工基本信息排在前面
      const priority = ['员工编号', '员工姓名', '身份证号'];
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.localeCompare(b);
    });

    const data = Array.from(mergedMap.values()).map(row => {
      orderedHeaders.forEach(header => {
        if (!(header in row)) {
          row[header] = '';
        }
      });
      return row;
    });

    return { headers: orderedHeaders, data };
  }

  /**
   * 获取保险字段名称映射
   */
  private static getInsuranceFieldName(systemKey: string): string {
    const mapping: Record<string, string> = {
      'pension': '养老保险基数',
      'medical': '医疗保险基数',
      'unemployment': '失业保险基数',
      'work_injury': '工伤保险基数',
      'maternity': '生育保险基数',
      'housing_fund': '住房公积金基数',
      'occupational_pension': '职业年金基数',
      'serious_illness': '大病医疗基数'
    };
    
    return mapping[systemKey] || systemKey;
  }

  /**
   * 获取工作表名称
   */
  private static getSheetName(group: ImportDataGroup): string {
    const names: Record<ImportDataGroup, string> = {
      [ImportDataGroup.EARNINGS]: '收入数据',
      [ImportDataGroup.CONTRIBUTION_BASES]: '缴费基数',
      [ImportDataGroup.CATEGORY_ASSIGNMENT]: '人员类别',
      [ImportDataGroup.JOB_ASSIGNMENT]: '职务信息',
      [ImportDataGroup.ALL]: '全部数据'
    };
    return names[group] || group;
  }

  /**
   * 生成文件名
   */
  private static generateFileName(config: ExportConfig): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    
    const periodStart = config.payPeriod.start;
    const periodStr = `${periodStart.getFullYear()}年${String(periodStart.getMonth() + 1).padStart(2, '0')}月`;
    
    let groupStr = '';
    if (config.dataGroups.length === 1) {
      groupStr = this.getSheetName(config.dataGroups[0]);
    } else if (config.dataGroups.includes(ImportDataGroup.ALL)) {
      groupStr = '全部数据';
    } else {
      groupStr = '多组数据';
    }
    
    return `薪资数据导出_${groupStr}_${periodStr}_${dateStr}.xlsx`;
  }
}