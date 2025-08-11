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
    const workbook = XLSX.utils.book_new();
    
    for (const group of config.dataGroups) {
      const sheetData = await this.getSheetDataForGroup(group, config.payPeriod);
      
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
    
    // 生成文件名
    const fileName = config.fileName || this.generateFileName(config);
    
    // 下载文件
    XLSX.writeFile(workbook, fileName);
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
    // 获取该周期的所有薪资记录
    const { data: payrolls } = await supabase
      .from('view_payroll_summary')
      .select(`
        payroll_id,
        employee_id,
        employee_name,
        id_number
      `)
      .gte('pay_period_start', payPeriod.start.toISOString().split('T')[0])
      .lte('pay_period_end', payPeriod.end.toISOString().split('T')[0]);

    if (!payrolls || payrolls.length === 0) {
      return { headers: [], data: [] };
    }

    // 获取所有收入组件
    const { data: components } = await supabase
      .from('salary_components')
      .select('id, name')
      .eq('type', 'earning')
      .order('name');

    const componentMap = new Map(components?.map(c => [c.id, c.name]) || []);
    
    // 获取薪资明细
    const payrollIds = payrolls.map(p => p.payroll_id);
    const { data: payrollItems } = await supabase
      .from('payroll_items')
      .select('payroll_id, component_id, amount')
      .in('payroll_id', payrollIds)
      .in('component_id', Array.from(componentMap.keys()));

    // 组装数据
    const dataMap = new Map<string, any>();
    
    payrolls.forEach(payroll => {
      const key = payroll.payroll_id;
      
      dataMap.set(key, {
        '员工编号': '',  // 视图中没有员工编号，需要单独查询
        '员工姓名': payroll.employee_name || '',
        '身份证号': payroll.id_number || ''
      });
    });

    // 填充收入数据
    payrollItems?.forEach(item => {
      const data = dataMap.get(item.payroll_id);
      if (data) {
        const componentName = componentMap.get(item.component_id);
        if (componentName) {
          data[componentName] = parseFloat(item.amount);
        }
      }
    });

    // 确保所有组件都有列
    const headers = ['员工编号', '员工姓名', '身份证号'];
    components?.forEach(comp => {
      headers.push(comp.name);
    });

    // 确保所有数据行都有所有列
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
   * 获取缴费基数数据
   */
  private static async getContributionBasesData(payPeriod: { start: Date; end: Date }) {
    // 获取该周期的员工基数数据
    const { data: bases } = await supabase
      .from('employee_contribution_bases')
      .select(`
        employee_id,
        insurance_type_id,
        contribution_base,
        employees!inner (
          employee_code,
          full_name,
          id_number
        ),
        insurance_types!inner (
          system_key,
          name
        )
      `)
      .lte('effective_start_date', payPeriod.end.toISOString())
      .or(`effective_end_date.gte.${payPeriod.start.toISOString()},effective_end_date.is.null`);

    if (!bases || bases.length === 0) {
      return { headers: [], data: [] };
    }

    // 组装数据
    const dataMap = new Map<string, any>();
    
    bases.forEach(base => {
      const employee = (base as any).employees;
      const insuranceType = (base as any).insurance_types;
      const key = employee.id_number || employee.employee_code || employee.full_name;
      
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          '员工编号': employee.employee_code || '',
          '员工姓名': employee.full_name || '',
          '身份证号': employee.id_number || ''
        });
      }
      
      const data = dataMap.get(key);
      const fieldName = this.getInsuranceFieldName(insuranceType.system_key);
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
   * 获取人员类别数据
   */
  private static async getCategoryAssignmentData(payPeriod: { start: Date; end: Date }) {
    const { data: assignments } = await supabase
      .from('employee_category_assignments')
      .select(`
        employee_id,
        effective_start_date,
        employees!inner (
          employee_code,
          full_name,
          id_number
        ),
        employee_categories!inner (
          code,
          name
        )
      `)
      .lte('effective_start_date', payPeriod.end.toISOString())
      .or(`effective_end_date.gte.${payPeriod.start.toISOString()},effective_end_date.is.null`);

    if (!assignments || assignments.length === 0) {
      return { headers: [], data: [] };
    }

    const headers = [
      '员工编号',
      '员工姓名',
      '身份证号',
      '人员类别代码',
      '人员类别',
      '生效日期'
    ];

    const data = assignments.map(assignment => {
      const employee = (assignment as any).employees;
      const category = (assignment as any).employee_categories;
      
      return {
        '员工编号': employee.employee_code || '',
        '员工姓名': employee.full_name || '',
        '身份证号': employee.id_number || '',
        '人员类别代码': category.code || '',
        '人员类别': category.name || '',
        '生效日期': assignment.effective_start_date
      };
    });

    return { headers, data };
  }

  /**
   * 获取职务信息数据
   */
  private static async getJobAssignmentData(payPeriod: { start: Date; end: Date }) {
    const { data: jobs } = await supabase
      .from('employee_job_history')
      .select(`
        employee_id,
        effective_start_date,
        employees!inner (
          employee_code,
          full_name,
          id_number
        ),
        departments!inner (
          code,
          name
        ),
        positions!inner (
          code,
          name
        ),
        ranks (
          code,
          name
        )
      `)
      .lte('effective_start_date', payPeriod.end.toISOString())
      .or(`effective_end_date.gte.${payPeriod.start.toISOString()},effective_end_date.is.null`);

    if (!jobs || jobs.length === 0) {
      return { headers: [], data: [] };
    }

    const headers = [
      '员工编号',
      '员工姓名',
      '身份证号',
      '部门代码',
      '部门名称',
      '职位代码',
      '职位名称',
      '职级代码',
      '职级名称',
      '生效日期'
    ];

    const data = jobs.map(job => {
      const employee = (job as any).employees;
      const department = (job as any).departments;
      const position = (job as any).positions;
      const rank = (job as any).ranks;
      
      return {
        '员工编号': employee.employee_code || '',
        '员工姓名': employee.full_name || '',
        '身份证号': employee.id_number || '',
        '部门代码': department?.code || '',
        '部门名称': department?.name || '',
        '职位代码': position?.code || '',
        '职位名称': position?.name || '',
        '职级代码': rank?.code || '',
        '职级名称': rank?.name || '',
        '生效日期': job.effective_start_date
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
      
      existing['人员类别代码'] = row['人员类别代码'];
      existing['人员类别'] = row['人员类别'];
      
      mergedMap.set(key, existing);
    });

    // 合并职务数据
    jobs.data.forEach(row => {
      const key = row['身份证号'] || row['员工编号'] || row['员工姓名'];
      const existing = mergedMap.get(key) || {};
      
      existing['部门代码'] = row['部门代码'];
      existing['部门名称'] = row['部门名称'];
      existing['职位代码'] = row['职位代码'];
      existing['职位名称'] = row['职位名称'];
      existing['职级代码'] = row['职级代码'];
      existing['职级名称'] = row['职级名称'];
      
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