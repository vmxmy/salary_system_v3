#!/usr/bin/env node

/**
 * 综合薪资数据导入脚本
 * 功能：从老系统全面导入指定薪资周期的所有数据到新系统
 * 包括：收入明细(earnings)、个人所得税、缴费基数
 * 使用：node comprehensive-payroll-import.js <薪资周期>
 * 示例：node comprehensive-payroll-import.js 2025-01
 */

require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

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
 * 从老系统查询指定薪资周期的完整薪资数据
 */
async function queryOldSystemCompleteData(payPeriod) {
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
        pp.start_date,
        pp.end_date,
        pe.calculated_at
      FROM payroll.payroll_entries pe
      JOIN payroll.payroll_runs pr ON pe.payroll_run_id = pr.id
      JOIN payroll.payroll_periods pp ON pe.payroll_period_id = pp.id
      JOIN hr.employees e ON pe.employee_id = e.id
      WHERE pp.start_date >= $1
      AND pp.start_date < $2
      ORDER BY e.last_name, e.first_name;
    `;
    
    const result = await client.query(query, [startDate, endDateStr]);
    return result.rows;
    
  } catch (error) {
    console.error('查询老系统完整数据失败:', error.message);
    return [];
  } finally {
    await client.end();
  }
}

/**
 * 获取新系统的薪资组件映射
 */
async function getSalaryComponentMapping() {
  try {
    const { data: components, error } = await supabase
      .from('salary_components')
      .select('id, name, type, category');
    
    if (error) {
      throw error;
    }
    
    // 创建名称到组件的映射
    const componentMap = {};
    components.forEach(comp => {
      componentMap[comp.name] = comp;
    });
    
    return componentMap;
    
  } catch (error) {
    console.error('获取薪资组件映射失败:', error.message);
    return {};
  }
}

/**
 * 获取保险类型映射
 */
async function getInsuranceTypeMapping() {
  try {
    const { data: insuranceTypes, error } = await supabase
      .from('insurance_types')
      .select('id, system_key, name');
    
    if (error) {
      throw error;
    }
    
    // 创建system_key到保险类型的映射
    const insuranceMap = {};
    insuranceTypes.forEach(type => {
      insuranceMap[type.system_key] = type;
    });
    
    return insuranceMap;
    
  } catch (error) {
    console.error('获取保险类型映射失败:', error.message);
    return {};
  }
}

/**
 * 导入收入明细到payroll_items
 */
async function importEarningsDetails(payrollId, earningsDetails, componentMap) {
  const importResults = [];
  
  // 老系统收入项目映射到新系统
  const earningsMapping = {
    'BASIC_SALARY': '基本工资',
    'SALARY_GRADE': '薪级工资',
    'POSITION_SALARY_GENERAL': '岗位工资',
    'GENERAL_ALLOWANCE': '津贴',
    'PROBATION_SALARY': '试用期工资',
    'BASIC_PERFORMANCE': '基础绩效',
    'BASIC_PERFORMANCE_AWARD': '基础绩效奖',
    'MONTHLY_PERFORMANCE_BONUS': '月奖励绩效',
    'SPECIAL_ALLOWANCE': '特殊津贴',
    'OVERTIME_PAY': '加班费',
    'BONUS': '奖金',
    'ANNUAL_BONUS': '年终奖',
    'OTHER_INCOME': '其他收入'
  };
  
  for (const [oldKey, amount] of Object.entries(earningsDetails)) {
    const componentName = earningsMapping[oldKey];
    if (!componentName) {
      console.log(`⚠️  跳过未知收入项目: ${oldKey}`);
      continue;
    }
    
    const component = componentMap[componentName];
    if (!component) {
      console.log(`⚠️  新系统中未找到组件: ${componentName}`);
      continue;
    }
    
    const earningAmount = parseFloat(amount.amount || amount);
    if (earningAmount <= 0) {
      continue;
    }
    
    try {
      const { error } = await supabase
        .from('payroll_items')
        .upsert({
          payroll_id: payrollId,
          component_id: component.id,
          amount: earningAmount,
          notes: `导入收入明细 - ${oldKey}`
        }, {
          onConflict: 'payroll_id,component_id'
        });
      
      if (error) {
        console.error(`❌ 导入收入项目失败 ${componentName}:`, error.message);
        importResults.push({ type: 'earning', name: componentName, success: false, error: error.message });
      } else {
        importResults.push({ type: 'earning', name: componentName, success: true, amount: earningAmount });
      }
      
    } catch (error) {
      console.error(`❌ 导入收入项目异常 ${componentName}:`, error.message);
      importResults.push({ type: 'earning', name: componentName, success: false, error: error.message });
    }
  }
  
  return importResults;
}

/**
 * 导入个人所得税
 */
async function importPersonalIncomeTax(employeeId, payrollId, deductionsDetails, grossPay, componentMap) {
  const personalIncomeTax = deductionsDetails.PERSONAL_INCOME_TAX;
  
  if (!personalIncomeTax || !personalIncomeTax.amount) {
    return { type: 'tax', success: false, reason: 'no_tax_data' };
  }
  
  const taxAmount = parseFloat(personalIncomeTax.amount);
  if (taxAmount <= 0) {
    return { type: 'tax', success: false, reason: 'zero_tax' };
  }
  
  try {
    const grossPayAmount = parseFloat(grossPay);
    const taxableIncome = Math.max(0, grossPayAmount - 5000);
    const effectiveTaxRate = taxAmount > 0 ? taxAmount / taxableIncome : 0;
    
    // 导入个税计算日志
    const { error: taxLogError } = await supabase
      .from('personal_income_tax_calculation_logs')
      .upsert({
        payroll_id: payrollId,
        employee_id: employeeId,
        taxable_income: taxableIncome,
        tax_amount: taxAmount,
        effective_tax_rate: effectiveTaxRate,
        personal_allowance: 5000,
        calculation_method: 'monthly',
        notes: '综合导入个税数据',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'payroll_id,employee_id'
      });
    
    if (taxLogError) {
      throw new Error(`个税日志导入失败: ${taxLogError.message}`);
    }
    
    // 同步个税到payroll_items
    const taxComponent = componentMap['个人所得税'];
    if (taxComponent) {
      const { error: taxItemError } = await supabase
        .from('payroll_items')
        .upsert({
          payroll_id: payrollId,
          component_id: taxComponent.id,
          amount: taxAmount,
          notes: '综合导入个税明细'
        }, {
          onConflict: 'payroll_id,component_id'
        });
      
      if (taxItemError) {
        throw new Error(`个税明细导入失败: ${taxItemError.message}`);
      }
    }
    
    return { type: 'tax', success: true, amount: taxAmount };
    
  } catch (error) {
    console.error('❌ 导入个税失败:', error.message);
    return { type: 'tax', success: false, error: error.message };
  }
}

/**
 * 导入缴费基数
 */
async function importContributionBases(employeeId, deductionsDetails, startDate, endDate, insuranceMap) {
  const importResults = [];
  
  // 定义老系统字段到新系统保险类型的映射
  const fieldMapping = {
    'PENSION_PERSONAL_AMOUNT': 'pension',
    'MEDICAL_PERSONAL_AMOUNT': 'medical', 
    'UNEMPLOYMENT_PERSONAL_AMOUNT': 'unemployment',
    'INJURY_PERSONAL_AMOUNT': 'work_injury',
    'MATERNITY_PERSONAL_AMOUNT': 'maternity',
    'HOUSING_FUND_PERSONAL': 'housing_fund',
    'OCCUPATIONAL_PENSION_PERSONAL_AMOUNT': 'occupational_pension',
    'SERIOUS_ILLNESS_PERSONAL_AMOUNT': 'serious_illness'
  };
  
  for (const [oldField, systemKey] of Object.entries(fieldMapping)) {
    if (!deductionsDetails[oldField]) {
      continue;
    }
    
    const insuranceType = insuranceMap[systemKey];
    if (!insuranceType) {
      console.log(`⚠️  跳过未知保险类型: ${systemKey}`);
      continue;
    }
    
    const deductionDetail = deductionsDetails[oldField];
    let contributionBase = 0;
    
    // 尝试从多个可能的字段中获取缴费基数
    if (deductionDetail.base) {
      contributionBase = parseFloat(deductionDetail.base);
    } else if (deductionDetail.contribution_base) {
      contributionBase = parseFloat(deductionDetail.contribution_base);
    } else if (deductionDetail.amount && deductionDetail.rate) {
      // 如果有金额和费率，反推缴费基数
      contributionBase = parseFloat(deductionDetail.amount) / parseFloat(deductionDetail.rate);
    }
    
    if (contributionBase <= 0) {
      continue;
    }
    
    try {
      const { error } = await supabase
        .from('employee_contribution_bases')
        .upsert({
          employee_id: employeeId,
          insurance_type_id: insuranceType.id,
          contribution_base: contributionBase,
          effective_start_date: startDate,
          effective_end_date: endDate
        }, {
          onConflict: 'employee_id,insurance_type_id,effective_start_date'
        });
      
      if (error) {
        console.error(`❌ 导入${insuranceType.name}缴费基数失败:`, error.message);
        importResults.push({ 
          type: 'contribution_base', 
          name: insuranceType.name, 
          success: false, 
          error: error.message 
        });
      } else {
        importResults.push({ 
          type: 'contribution_base', 
          name: insuranceType.name, 
          success: true, 
          amount: contributionBase 
        });
      }
      
    } catch (error) {
      console.error(`❌ 导入${insuranceType.name}缴费基数异常:`, error.message);
      importResults.push({ 
        type: 'contribution_base', 
        name: insuranceType.name, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  return importResults;
}

/**
 * 导入单个员工的完整薪资数据
 */
async function importEmployeeCompleteData(employeeData, payPeriod, componentMap, insuranceMap) {
  try {
    const { 
      full_name, 
      earnings_details, 
      deductions_details, 
      gross_pay,
      start_date,
      end_date 
    } = employeeData;
    
    console.log(`\n--- 处理员工: ${full_name} ---`);
    
    // 获取员工ID
    const { data: employeeResult, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('full_name', full_name)
      .limit(1);
    
    if (employeeError) {
      throw new Error(`查询员工失败: ${employeeError.message}`);
    }
    
    if (!employeeResult || employeeResult.length === 0) {
      console.log(`⚠️  跳过：新系统中未找到员工 ${full_name}`);
      return { 
        employee_name: full_name, 
        success: false, 
        reason: 'employee_not_found',
        details: []
      };
    }
    
    const employeeId = employeeResult[0].id;
    
    // 获取或创建薪资记录
    const startDate = `${payPeriod}-01`;
    let payrollId;
    
    const { data: payrollResult, error: payrollError } = await supabase
      .from('payrolls')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('pay_period_start', startDate)
      .limit(1);
    
    if (payrollError) {
      throw new Error(`查询薪资记录失败: ${payrollError.message}`);
    }
    
    if (payrollResult && payrollResult.length > 0) {
      payrollId = payrollResult[0].id;
      console.log(`✓ 使用现有薪资记录: ${payrollId}`);
    } else {
      // 创建新的薪资记录
      const { data: newPayroll, error: createError } = await supabase
        .from('payrolls')
        .insert({
          employee_id: employeeId,
          pay_period_start: startDate,
          pay_period_end: `${payPeriod}-31`,
          gross_pay: parseFloat(gross_pay || 0),
          total_deductions: 0,
          net_pay: 0,
          status: 'draft'
        })
        .select('id')
        .single();
      
      if (createError) {
        throw new Error(`创建薪资记录失败: ${createError.message}`);
      }
      
      payrollId = newPayroll.id;
      console.log(`✓ 创建新薪资记录: ${payrollId}`);
    }
    
    const importDetails = [];
    
    // 1. 导入收入明细
    if (earnings_details && Object.keys(earnings_details).length > 0) {
      console.log('  导入收入明细...');
      const earningsResults = await importEarningsDetails(payrollId, earnings_details, componentMap);
      importDetails.push(...earningsResults);
      
      const successfulEarnings = earningsResults.filter(r => r.success);
      console.log(`  ✓ 收入明细: ${successfulEarnings.length}/${earningsResults.length} 项成功`);
    }
    
    // 2. 导入个人所得税
    if (deductions_details && deductions_details.PERSONAL_INCOME_TAX) {
      console.log('  导入个人所得税...');
      const taxResult = await importPersonalIncomeTax(
        employeeId, 
        payrollId, 
        deductions_details, 
        gross_pay, 
        componentMap
      );
      importDetails.push(taxResult);
      
      if (taxResult.success) {
        console.log(`  ✓ 个人所得税: ¥${taxResult.amount}`);
      } else {
        console.log(`  ⚠️ 个人所得税: ${taxResult.reason || taxResult.error}`);
      }
    }
    
    // 3. 导入缴费基数
    if (deductions_details && Object.keys(deductions_details).length > 0) {
      console.log('  导入缴费基数...');
      const contributionResults = await importContributionBases(
        employeeId, 
        deductions_details, 
        start_date, 
        end_date, 
        insuranceMap
      );
      importDetails.push(...contributionResults);
      
      const successfulContributions = contributionResults.filter(r => r.success);
      console.log(`  ✓ 缴费基数: ${successfulContributions.length}/${contributionResults.length} 项成功`);
    }
    
    return {
      employee_name: full_name,
      success: true,
      payroll_id: payrollId,
      details: importDetails
    };
    
  } catch (error) {
    console.error(`❌ 导入 ${employeeData.full_name} 数据失败:`, error.message);
    return {
      employee_name: employeeData.full_name,
      success: false,
      error: error.message,
      details: []
    };
  }
}

/**
 * 生成详细导入报告
 */
function generateDetailedReport(payPeriod, results) {
  console.log('\n' + '='.repeat(100));
  console.log(`📊 综合薪资数据导入详细报告`);
  console.log('='.repeat(100));
  console.log(`📅 薪资周期: ${payPeriod}`);
  console.log(`🕐 导入时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(100));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ 成功处理员工: ${successful.length} 人`);
  console.log(`❌ 处理失败员工: ${failed.length} 人`);
  console.log(`📊 总计处理: ${results.length} 人`);

  // 统计各类型数据导入情况
  let totalEarnings = 0, totalTax = 0, totalContributions = 0;
  let successfulEarnings = 0, successfulTax = 0, successfulContributions = 0;
  let totalTaxAmount = 0, totalEarningsAmount = 0;

  successful.forEach(result => {
    result.details.forEach(detail => {
      if (detail.type === 'earning') {
        totalEarnings++;
        if (detail.success) {
          successfulEarnings++;
          totalEarningsAmount += detail.amount || 0;
        }
      } else if (detail.type === 'tax') {
        totalTax++;
        if (detail.success) {
          successfulTax++;
          totalTaxAmount += detail.amount || 0;
        }
      } else if (detail.type === 'contribution_base') {
        totalContributions++;
        if (detail.success) {
          successfulContributions++;
        }
      }
    });
  });

  console.log('\n📈 数据导入统计:');
  console.log('-'.repeat(100));
  console.log(`收入明细: ${successfulEarnings}/${totalEarnings} 项成功，总金额: ¥${totalEarningsAmount.toFixed(2)}`);
  console.log(`个人所得税: ${successfulTax}/${totalTax} 项成功，总金额: ¥${totalTaxAmount.toFixed(2)}`);
  console.log(`缴费基数: ${successfulContributions}/${totalContributions} 项成功`);

  if (successful.length > 0) {
    console.log('\n✅ 成功处理的员工:');
    console.log('-'.repeat(100));
    successful.forEach((result, index) => {
      const earningsCount = result.details.filter(d => d.type === 'earning' && d.success).length;
      const taxCount = result.details.filter(d => d.type === 'tax' && d.success).length;
      const contributionCount = result.details.filter(d => d.type === 'contribution_base' && d.success).length;
      
      console.log(`${index + 1}. ${result.employee_name}`);
      console.log(`   收入明细: ${earningsCount}项, 个税: ${taxCount}项, 缴费基数: ${contributionCount}项`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ 处理失败的员工:');
    console.log('-'.repeat(100));
    failed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.employee_name}: ${result.reason || result.error}`);
    });
  }

  console.log('\n' + '='.repeat(100));
}

/**
 * 显示使用帮助
 */
function showUsage() {
  console.log('\n📖 使用方法:');
  console.log('node comprehensive-payroll-import.js <薪资周期>');
  console.log('');
  console.log('📋 参数说明:');
  console.log('  薪资周期: YYYY-MM 格式，如 2025-01');
  console.log('');
  console.log('🔧 功能说明:');
  console.log('  - 导入所有收入明细(earnings)到payroll_items表');
  console.log('  - 导入个人所得税到personal_income_tax_calculation_logs和payroll_items表');
  console.log('  - 导入缴费基数到employee_contribution_bases表');
  console.log('  - 自动触发薪资重新计算');
  console.log('');
  console.log('💡 使用示例:');
  console.log('  node comprehensive-payroll-import.js 2025-01  # 导入2025年1月所有薪资数据');
  console.log('');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 综合薪资数据导入工具');
  console.log('='.repeat(80));
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('❌ 参数不足');
    showUsage();
    process.exit(1);
  }
  
  const payPeriod = args[0];
  
  // 验证薪资周期格式
  if (!/^\d{4}-\d{2}$/.test(payPeriod)) {
    console.error('❌ 薪资周期格式错误，应为 YYYY-MM 格式，如: 2025-01');
    process.exit(1);
  }
  
  console.log(`📅 薪资周期: ${payPeriod}`);
  console.log('='.repeat(80));
  
  try {
    console.log('🔍 准备导入环境...');
    
    // 获取映射数据
    console.log('  获取薪资组件映射...');
    const componentMap = await getSalaryComponentMapping();
    
    console.log('  获取保险类型映射...');
    const insuranceMap = await getInsuranceTypeMapping();
    
    console.log('  查询老系统数据...');
    const oldSystemData = await queryOldSystemCompleteData(payPeriod);
    
    if (oldSystemData.length === 0) {
      console.log('⚠️  老系统中未找到该薪资周期的数据');
      process.exit(0);
    }
    
    console.log(`📋 找到 ${oldSystemData.length} 条员工记录，开始综合导入...`);
    console.log('='.repeat(80));
    
    const results = [];
    
    // 逐个处理员工数据
    for (let i = 0; i < oldSystemData.length; i++) {
      const employeeData = oldSystemData[i];
      console.log(`\n[${i + 1}/${oldSystemData.length}] 开始处理 ${employeeData.full_name}...`);
      
      const result = await importEmployeeCompleteData(
        employeeData, 
        payPeriod, 
        componentMap, 
        insuranceMap
      );
      
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${employeeData.full_name}: 处理完成`);
      } else {
        console.log(`❌ ${employeeData.full_name}: ${result.reason || result.error}`);
      }
      
      // 添加小延迟避免过快请求
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 生成详细报告
    generateDetailedReport(payPeriod, results);
    
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      console.log('\n✅ 综合导入完成！');
      console.log(`📊 成功处理 ${successCount} 人的完整薪资数据`);
    } else {
      console.log('\n⚠️  未成功导入任何数据');
    }
    
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
  queryOldSystemCompleteData,
  importEmployeeCompleteData,
  getSalaryComponentMapping,
  getInsuranceTypeMapping
};