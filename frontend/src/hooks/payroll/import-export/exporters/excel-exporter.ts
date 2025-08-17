import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { ExportConfig } from '../types';

/**
 * 生成Excel缓冲区
 */
export const generateExcelBuffer = async (
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
};

/**
 * 导出薪资数据到Excel
 */
export const exportPayrollToExcel = async (config: ExportConfig): Promise<void> => {
  // 获取数据
  const { data, error } = await supabase.rpc('quick_export_payroll_summary', {
    p_period: config.filters?.periodId || new Date().toISOString().slice(0, 7)
  });
  
  if (error) {
    throw new Error(`导出数据失败: ${error.message}`);
  }
  
  // 生成Excel
  const buffer = await generateExcelBuffer((data || []) as any[], config);
  
  // 创建下载链接
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // 生成文件名
  const periodId = config.filters?.periodId || new Date().toISOString().slice(0, 7);
  const fileName = `薪资数据导出_${periodId}.${config.format || 'xlsx'}`;
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