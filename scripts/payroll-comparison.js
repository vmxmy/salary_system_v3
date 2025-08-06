#!/usr/bin/env node

/**
 * 薪资数据对比脚本
 * 功能：对比新老系统中指定员工的薪资数据
 * 使用：node payroll-comparison.js <员工姓名> <薪资周期>
 * 示例：node payroll-comparison.js 汪琳 2025-01
 */

require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const OLD_SYSTEM_CONFIG = {
  host: process.env.OLD_DB_HOST || '8.137.160.207',
  port: parseInt(process.env.OLD_DB_PORT) || 5432,
  database: process.env.OLD_DB_NAME || 'salary_system',
  user: process.env.OLD_DB_USER || 'salary_system',
  password: process.env.OLD_DB_PASSWORD || 'caijing123!'
};

// 新系统 Supabase 连接配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rjlymghylrshudywrzec.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ACCESS_TOKEN;

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 查询老系统员工薪资数据
 */
async function queryOldSystemData(employeeName, payPeriod) {
  const client = new Client(OLD_SYSTEM_CONFIG);
  
  try {
    await client.connect();
    
    // 构建日期范围
    const startDate = `${payPeriod}-01`;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const query = `
      SELECT 
        CONCAT(e.last_name, e.first_name) as full_name,
        e.id_number,
        pe.gross_pay,
        pe.total_deductions,
        pe.net_pay,
        pe.earnings_details,
        pe.deductions_details,
        pe.calculated_at,
        pp.name as period_name,
        pp.start_date,
        pp.end_date
      FROM payroll.payroll_entries pe
      JOIN payroll.payroll_runs pr ON pe.payroll_run_id = pr.id
      JOIN payroll.payroll_periods pp ON pe.payroll_period_id = pp.id
      JOIN hr.employees e ON pe.employee_id = e.id
      WHERE CONCAT(e.last_name, e.first_name) = $1
      AND pp.start_date >= $2
      AND pp.start_date < $3
      ORDER BY pe.calculated_at DESC
      LIMIT 1;
    `;
    
    const result = await client.query(query, [employeeName, startDate, endDateStr]);
    return result.rows[0] || null;
    
  } catch (error) {
    console.error('查询老系统数据失败:', error.message);
    return null;
  } finally {
    await client.end();
  }
}

/**
 * 查询新系统员工薪资数据（使用 Supabase 客户端）
 */
async function queryNewSystemData(employeeName, payPeriod) {
  try {
    const startDate = `${payPeriod}-01`;
    
    // 首先查找员工ID
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id, full_name, id_number')
      .eq('full_name', employeeName)
      .limit(1);
    
    if (employeeError) {
      console.error('查询员工信息失败:', employeeError.message);
      return null;
    }
    
    if (!employeeData || employeeData.length === 0) {
      return null;
    }
    
    const employee = employeeData[0];
    
    // 然后查询薪资数据
    const { data: payrollData, error: payrollError } = await supabase
      .from('payrolls')
      .select(`
        id,
        gross_pay,
        total_deductions,
        net_pay,
        pay_period_start,
        pay_period_end,
        status,
        created_at,
        updated_at
      `)
      .eq('employee_id', employee.id)
      .eq('pay_period_start', startDate)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (payrollError) {
      console.error('查询薪资数据失败:', payrollError.message);
      return null;
    }
    
    if (!payrollData || payrollData.length === 0) {
      return null;
    }
    
    const payroll = payrollData[0];
    
    // 查询保险计算详情
    const { data: insuranceData, error: insuranceError } = await supabase
      .from('insurance_calculation_logs')
      .select(`
        insurance_types!inner(name, system_key),
        contribution_base,
        employee_amount,
        employer_amount
      `)
      .eq('payroll_id', payroll.id)
      .eq('employee_id', employee.id);
    
    if (insuranceError) {
      console.error('查询保险数据失败:', insuranceError.message);
    }
    
    // 构建保险详情对象
    const insuranceDetails = {};
    if (insuranceData) {
      insuranceData.forEach(item => {
        const systemKey = item.insurance_types.system_key;
        const name = item.insurance_types.name;
        
        insuranceDetails[`${systemKey.toUpperCase()}_PERSONAL`] = {
          name: `${name}个人应缴费额`,
          amount: parseFloat(item.employee_amount || 0),
          type: 'PERSONAL_DEDUCTION',
          contribution_base: parseFloat(item.contribution_base || 0)
        };
        
        insuranceDetails[`${systemKey.toUpperCase()}_EMPLOYER`] = {
          name: `${name}单位应缴费额`,
          amount: parseFloat(item.employer_amount || 0),
          type: 'EMPLOYER_DEDUCTION',
          contribution_base: parseFloat(item.contribution_base || 0)
        };
      });
    }
    
    // 查询个税数据
    const { data: taxData, error: taxError } = await supabase
      .from('personal_income_tax_calculation_logs')
      .select('tax_amount, taxable_income, effective_tax_rate')
      .eq('payroll_id', payroll.id)
      .eq('employee_id', employee.id)
      .limit(1);
    
    if (taxError) {
      console.error('查询个税数据失败:', taxError.message);
    }
    
    const personalIncomeTax = {
      name: '个人所得税',
      amount: taxData && taxData.length > 0 ? parseFloat(taxData[0].tax_amount) : 0,
      type: 'PERSONAL_DEDUCTION',
      taxable_income: taxData && taxData.length > 0 ? parseFloat(taxData[0].taxable_income) : 0,
      effective_tax_rate: taxData && taxData.length > 0 ? parseFloat(taxData[0].effective_tax_rate) : 0
    };
    
    // 合并员工信息和薪资数据
    return {
      full_name: employee.full_name,
      id_number: employee.id_number,
      gross_pay: payroll.gross_pay,
      total_deductions: payroll.total_deductions,
      net_pay: payroll.net_pay,
      pay_period_start: payroll.pay_period_start,
      pay_period_end: payroll.pay_period_end,
      status: payroll.status,
      created_at: payroll.created_at,
      updated_at: payroll.updated_at,
      insurance_details: insuranceDetails,
      personal_income_tax: personalIncomeTax
    };
    
  } catch (error) {
    console.error('查询新系统数据失败:', error.message);
    return null;
  }
}

/**
 * 对比保险详情
 */
function compareInsuranceDetails(oldDeductions, newInsurance) {
  const insuranceComparison = {};
  
  // 定义保险类型映射关系
  const insuranceMapping = {
    'PENSION': { old: 'PENSION_PERSONAL_AMOUNT', new: 'PENSION_PERSONAL', name: '养老保险个人' },
    'MEDICAL': { old: 'MEDICAL_PERSONAL_AMOUNT', new: 'MEDICAL_PERSONAL', name: '医疗保险个人' },
    'UNEMPLOYMENT': { old: 'UNEMPLOYMENT_PERSONAL_AMOUNT', new: 'UNEMPLOYMENT_PERSONAL', name: '失业保险个人' },
    'WORK_INJURY': { old: 'INJURY_PERSONAL_AMOUNT', new: 'WORK_INJURY_PERSONAL', name: '工伤保险个人' },
    'MATERNITY': { old: 'MATERNITY_PERSONAL_AMOUNT', new: 'MATERNITY_PERSONAL', name: '生育保险个人' },
    'HOUSING_FUND': { old: 'HOUSING_FUND_PERSONAL', new: 'HOUSING_FUND_PERSONAL', name: '住房公积金个人' },
    'OCCUPATIONAL_PENSION': { old: 'OCCUPATIONAL_PENSION_PERSONAL_AMOUNT', new: 'OCCUPATIONAL_PENSION_PERSONAL', name: '职业年金个人' },
    'SERIOUS_ILLNESS': { old: 'SERIOUS_ILLNESS_PERSONAL_AMOUNT', new: 'SERIOUS_ILLNESS_PERSONAL', name: '大病医疗个人' }
  };
  
  Object.keys(insuranceMapping).forEach(key => {
    const mapping = insuranceMapping[key];
    const oldValue = parseFloat(oldDeductions?.[mapping.old]?.amount || 0);
    const newValue = parseFloat(newInsurance?.[mapping.new]?.amount || 0);
    
    insuranceComparison[key] = {
      name: mapping.name,
      old_value: oldValue,
      new_value: newValue,
      difference: newValue - oldValue,
      match: Math.abs(newValue - oldValue) < 0.01,
      percentage_diff: oldValue > 0 ? ((newValue - oldValue) / oldValue * 100).toFixed(2) : 0,
      contribution_base: {
        old: parseFloat(oldDeductions?.[mapping.old]?.base || 0),
        new: parseFloat(newInsurance?.[mapping.new]?.contribution_base || 0)
      }
    };
  });
  
  return insuranceComparison;
}

/**
 * 对比个人所得税
 */
function comparePersonalIncomeTax(oldDeductions, newTax) {
  const oldValue = parseFloat(oldDeductions?.PERSONAL_INCOME_TAX?.amount || 0);
  const newValue = parseFloat(newTax?.amount || 0);
  
  return {
    name: '个人所得税',
    old_value: oldValue,
    new_value: newValue,
    difference: newValue - oldValue,
    match: Math.abs(newValue - oldValue) < 0.01,
    percentage_diff: oldValue > 0 ? ((newValue - oldValue) / oldValue * 100).toFixed(2) : 0
  };
}

/**
 * 生成对比报告
 */
function generateComparisonReport(employeeName, payPeriod, oldData, newData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportData = {
    metadata: {
      employee_name: employeeName,
      pay_period: payPeriod,
      comparison_date: new Date().toISOString(),
      report_version: '1.0'
    },
    old_system: oldData ? {
      full_name: oldData.full_name,
      id_number: oldData.id_number,
      gross_pay: parseFloat(oldData.gross_pay || 0),
      total_deductions: parseFloat(oldData.total_deductions || 0),
      net_pay: parseFloat(oldData.net_pay || 0),
      period_name: oldData.period_name,
      calculated_at: oldData.calculated_at,
      earnings_details: oldData.earnings_details,
      deductions_details: oldData.deductions_details
    } : null,
    new_system: newData ? {
      full_name: newData.full_name,
      id_number: newData.id_number,
      gross_pay: parseFloat(newData.gross_pay || 0),
      total_deductions: parseFloat(newData.total_deductions || 0),
      net_pay: parseFloat(newData.net_pay || 0),
      pay_period_start: newData.pay_period_start,
      pay_period_end: newData.pay_period_end,
      status: newData.status,
      created_at: newData.created_at,
      updated_at: newData.updated_at,
      insurance_details: newData.insurance_details || {},
      personal_income_tax: newData.personal_income_tax || {}
    } : null,
    comparison: {}
  };

  // 计算差异
  if (oldData && newData) {
    const oldGross = parseFloat(oldData.gross_pay || 0);
    const newGross = parseFloat(newData.gross_pay || 0);
    const oldDeductions = parseFloat(oldData.total_deductions || 0);
    const newDeductions = parseFloat(newData.total_deductions || 0);
    const oldNet = parseFloat(oldData.net_pay || 0);
    const newNet = parseFloat(newData.net_pay || 0);

    reportData.comparison = {
      gross_pay: {
        old_value: oldGross,
        new_value: newGross,
        difference: newGross - oldGross,
        match: Math.abs(newGross - oldGross) < 0.01,
        percentage_diff: oldGross > 0 ? ((newGross - oldGross) / oldGross * 100).toFixed(2) : 0
      },
      total_deductions: {
        old_value: oldDeductions,
        new_value: newDeductions,
        difference: newDeductions - oldDeductions,
        match: Math.abs(newDeductions - oldDeductions) < 0.01,
        percentage_diff: oldDeductions > 0 ? ((newDeductions - oldDeductions) / oldDeductions * 100).toFixed(2) : 0
      },
      net_pay: {
        old_value: oldNet,
        new_value: newNet,
        difference: newNet - oldNet,
        match: Math.abs(newNet - oldNet) < 0.01,
        percentage_diff: oldNet > 0 ? ((newNet - oldNet) / oldNet * 100).toFixed(2) : 0
      },
      insurance_details: compareInsuranceDetails(oldData.deductions_details, newData.insurance_details),
      personal_income_tax: comparePersonalIncomeTax(oldData.deductions_details, newData.personal_income_tax),
      overall_match: Math.abs(newGross - oldGross) < 0.01 && 
                    Math.abs(newDeductions - oldDeductions) < 0.01 && 
                    Math.abs(newNet - oldNet) < 0.01
    };
  }

  return reportData;
}

/**
 * 格式化控制台输出
 */
function printConsoleReport(reportData) {
  const { metadata, old_system, new_system, comparison } = reportData;
  
  console.log('\n' + '='.repeat(80));
  console.log(`📊 薪资数据对比报告`);
  console.log('='.repeat(80));
  console.log(`👤 员工姓名: ${metadata.employee_name}`);
  console.log(`📅 薪资周期: ${metadata.pay_period}`);
  console.log(`🕐 对比时间: ${new Date(metadata.comparison_date).toLocaleString('zh-CN')}`);
  console.log('='.repeat(80));

  if (!old_system && !new_system) {
    console.log('❌ 新老系统均未找到该员工的薪资数据');
    return;
  }

  if (!old_system) {
    console.log('⚠️  老系统未找到该员工的薪资数据');
  }

  if (!new_system) {
    console.log('⚠️  新系统未找到该员工的薪资数据');
  }

  if (old_system && new_system) {
    console.log('\n📈 数据对比结果:');
    console.log('-'.repeat(80));
    
    const formatCurrency = (amount) => `¥${parseFloat(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
    const getMatchIcon = (match) => match ? '✅' : '❌';
    
    console.log(`应发合计: ${getMatchIcon(comparison.gross_pay.match)}`);
    console.log(`  老系统: ${formatCurrency(comparison.gross_pay.old_value)}`);
    console.log(`  新系统: ${formatCurrency(comparison.gross_pay.new_value)}`);
    console.log(`  差　异: ${formatCurrency(comparison.gross_pay.difference)} (${comparison.gross_pay.percentage_diff}%)`);
    
    console.log(`\n扣发合计: ${getMatchIcon(comparison.total_deductions.match)}`);
    console.log(`  老系统: ${formatCurrency(comparison.total_deductions.old_value)}`);
    console.log(`  新系统: ${formatCurrency(comparison.total_deductions.new_value)}`);
    console.log(`  差　异: ${formatCurrency(comparison.total_deductions.difference)} (${comparison.total_deductions.percentage_diff}%)`);
    
    console.log(`\n实发合计: ${getMatchIcon(comparison.net_pay.match)}`);
    console.log(`  老系统: ${formatCurrency(comparison.net_pay.old_value)}`);
    console.log(`  新系统: ${formatCurrency(comparison.net_pay.new_value)}`);
    console.log(`  差　异: ${formatCurrency(comparison.net_pay.difference)} (${comparison.net_pay.percentage_diff}%)`);
    
    // 显示详细的保险对比
    console.log('\n🏥 五险一金详细对比:');
    console.log('-'.repeat(80));
    
    Object.keys(comparison.insurance_details || {}).forEach(key => {
      const insurance = comparison.insurance_details[key];
      if (insurance.old_value > 0 || insurance.new_value > 0) {
        console.log(`${insurance.name}: ${getMatchIcon(insurance.match)}`);
        console.log(`  老系统: ${formatCurrency(insurance.old_value)}`);
        console.log(`  新系统: ${formatCurrency(insurance.new_value)}`);
        console.log(`  差　异: ${formatCurrency(insurance.difference)} (${insurance.percentage_diff}%)`);
        console.log('');
      }
    });
    
    // 显示个税对比
    if (comparison.personal_income_tax) {
      console.log('💰 个人所得税对比:');
      console.log('-'.repeat(80));
      const tax = comparison.personal_income_tax;
      console.log(`${tax.name}: ${getMatchIcon(tax.match)}`);
      console.log(`  老系统: ${formatCurrency(tax.old_value)}`);
      console.log(`  新系统: ${formatCurrency(tax.new_value)}`);
      console.log(`  差　异: ${formatCurrency(tax.difference)} (${tax.percentage_diff}%)`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`🎯 整体匹配: ${comparison.overall_match ? '✅ 完全一致' : '❌ 存在差异'}`);
  }

  console.log('='.repeat(80));
}

/**
 * 保存详细报告到文件
 */
function saveDetailedReport(reportData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const fileName = `payroll-comparison-${reportData.metadata.employee_name}-${reportData.metadata.pay_period}-${timestamp}.json`;
  const filePath = path.join(__dirname, '..', 'reports', fileName);
  
  // 确保reports目录存在
  const reportsDir = path.dirname(filePath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`📄 详细报告已保存: ${filePath}`);
  
  return filePath;
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ 使用方法: node payroll-comparison.js <员工姓名> <薪资周期>');
    console.error('📝 示例: node payroll-comparison.js 汪琳 2025-01');
    process.exit(1);
  }

  const [employeeName, payPeriod] = args;
  
  // 验证薪资周期格式
  if (!/^\d{4}-\d{2}$/.test(payPeriod)) {
    console.error('❌ 薪资周期格式错误，应为 YYYY-MM 格式，如: 2025-01');
    process.exit(1);
  }

  console.log(`🔍 开始查询员工 "${employeeName}" 在 ${payPeriod} 的薪资数据...`);

  try {
    // 并行查询新老系统数据
    const [oldData, newData] = await Promise.all([
      queryOldSystemData(employeeName, payPeriod),
      queryNewSystemData(employeeName, payPeriod)
    ]);

    // 生成对比报告
    const reportData = generateComparisonReport(employeeName, payPeriod, oldData, newData);
    
    // 输出控制台报告
    printConsoleReport(reportData);
    
    // 保存详细报告
    saveDetailedReport(reportData);
    
  } catch (error) {
    console.error('❌ 执行过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  queryOldSystemData,
  queryNewSystemData,
  generateComparisonReport,
  printConsoleReport,
  saveDetailedReport
};