#!/usr/bin/env node

/**
 * 按薪资周期批量导入个人所得税脚本
 * 功能：从老系统批量导入指定薪资周期的所有员工个人所得税数据到新系统
 * 使用：node import-personal-tax-by-period.js <薪资周期>
 * 示例：node import-personal-tax-by-period.js 2025-01
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
 * 从老系统查询指定薪资周期的所有员工个人所得税数据
 */
async function queryOldSystemTaxData(payPeriod) {
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
      AND pe.deductions_details ? 'PERSONAL_INCOME_TAX'
      AND (pe.deductions_details->'PERSONAL_INCOME_TAX'->>'amount')::numeric > 0
      ORDER BY e.last_name, e.first_name;
    `;
    
    const result = await client.query(query, [startDate, endDateStr]);
    return result.rows;
    
  } catch (error) {
    console.error('查询老系统个税数据失败:', error.message);
    return [];
  } finally {
    await client.end();
  }
}

/**
 * 导入单个员工的个人所得税到新系统
 */
async function importEmployeeTax(employeeData, payPeriod) {
  try {
    const { full_name, deductions_details, gross_pay } = employeeData;
    
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
      return { success: false, reason: 'employee_not_found' };
    }
    
    const employeeId = employeeResult[0].id;
    
    // 获取对应的薪资记录
    const startDate = `${payPeriod}-01`;
    const { data: payrollResult, error: payrollError } = await supabase
      .from('payrolls')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('pay_period_start', startDate)
      .limit(1);
    
    if (payrollError) {
      throw new Error(`查询薪资记录失败: ${payrollError.message}`);
    }
    
    if (!payrollResult || payrollResult.length === 0) {
      console.log(`⚠️  跳过：新系统中未找到 ${full_name} 的薪资记录`);
      return { success: false, reason: 'payroll_not_found' };
    }
    
    const payrollId = payrollResult[0].id;
    
    // 从老系统数据中提取个税信息
    const personalIncomeTax = deductions_details.PERSONAL_INCOME_TAX;
    
    if (!personalIncomeTax || !personalIncomeTax.amount) {
      console.log(`⚠️  跳过：${full_name} 无个税数据`);
      return { success: false, reason: 'no_tax_data' };
    }
    
    const taxAmount = parseFloat(personalIncomeTax.amount);
    const grossPayAmount = parseFloat(gross_pay);
    
    // 计算应纳税所得额（简化计算）
    const taxableIncome = Math.max(0, grossPayAmount - 5000); // 假设起征点为5000
    const effectiveTaxRate = taxAmount > 0 ? taxAmount / taxableIncome : 0;
    
    // 导入个税计算日志
    const taxData = {
      payroll_id: payrollId,
      employee_id: employeeId,
      taxable_income: taxableIncome,
      tax_amount: taxAmount,
      effective_tax_rate: effectiveTaxRate,
      personal_allowance: 5000,
      calculation_method: 'monthly',
      notes: `批量导入 - ${payPeriod}`,
      created_at: new Date().toISOString()
    };
    
    const { error: insertTaxError } = await supabase
      .from('personal_income_tax_calculation_logs')
      .upsert(taxData, {
        onConflict: 'payroll_id,employee_id'
      });
    
    if (insertTaxError) {
      throw new Error(`插入个税记录失败: ${insertTaxError.message}`);
    }
    
    // 同步个税到payroll_items表
    const { data: taxComponentData } = await supabase
      .from('salary_components')
      .select('id')
      .eq('name', '个人所得税')
      .eq('category', 'personal_tax')
      .limit(1);
    
    if (taxComponentData && taxComponentData.length > 0) {
      const { error: upsertItemError } = await supabase
        .from('payroll_items')
        .upsert({
          payroll_id: payrollId,
          component_id: taxComponentData[0].id,
          amount: taxAmount,
          notes: `批量导入个税 - ${payPeriod}`
        }, {
          onConflict: 'payroll_id,component_id'
        });
      
      if (upsertItemError) {
        console.error(`❌ 同步 ${full_name} 个税到payroll_items失败:`, upsertItemError.message);
      }
    }
    
    return { 
      success: true, 
      employee_name: full_name, 
      tax_amount: taxAmount 
    };
    
  } catch (error) {
    console.error(`❌ 导入 ${employeeData.full_name} 个税失败:`, error.message);
    return { success: false, reason: 'import_error', error: error.message };
  }
}

/**
 * 显示使用帮助
 */
function showUsage() {
  console.log('\n📖 使用方法:');
  console.log('node import-personal-tax-by-period.js <薪资周期>');
  console.log('');
  console.log('📋 参数说明:');
  console.log('  薪资周期: YYYY-MM 格式，如 2025-01');
  console.log('');
  console.log('💡 使用示例:');
  console.log('  node import-personal-tax-by-period.js 2025-01  # 导入2025年1月所有员工个税');
  console.log('');
}

/**
 * 生成导入摘要报告
 */
function generateSummaryReport(payPeriod, results) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 个人所得税导入摘要报告`);
  console.log('='.repeat(80));
  console.log(`📅 薪资周期: ${payPeriod}`);
  console.log(`🕐 导入时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ 成功导入: ${successful.length} 人`);
  console.log(`❌ 导入失败: ${failed.length} 人`);
  console.log(`📊 总计处理: ${results.length} 人`);

  if (successful.length > 0) {
    console.log('\n✅ 成功导入列表:');
    console.log('-'.repeat(80));
    let totalTax = 0;
    successful.forEach((result, index) => {
      console.log(`${index + 1}. ${result.employee_name}: ¥${result.tax_amount.toFixed(2)}`);
      totalTax += result.tax_amount;
    });
    console.log('-'.repeat(80));
    console.log(`💰 个税总额: ¥${totalTax.toFixed(2)}`);
  }

  if (failed.length > 0) {
    console.log('\n❌ 失败处理列表:');
    console.log('-'.repeat(80));
    const failureReasons = {};
    failed.forEach(result => {
      const reason = result.reason || 'unknown';
      if (!failureReasons[reason]) {
        failureReasons[reason] = [];
      }
      failureReasons[reason].push(result.employee_name || 'Unknown');
    });

    Object.keys(failureReasons).forEach(reason => {
      const reasonText = {
        'employee_not_found': '新系统中未找到员工',
        'payroll_not_found': '新系统中未找到薪资记录',
        'no_tax_data': '无个税数据',
        'import_error': '导入错误'
      }[reason] || reason;
      
      console.log(`\n${reasonText} (${failureReasons[reason].length}人):`);
      failureReasons[reason].forEach(name => {
        console.log(`  - ${name}`);
      });
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 批量个人所得税导入工具');
  console.log('='.repeat(60));
  
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
  console.log('='.repeat(60));
  
  try {
    console.log('🔍 查询老系统个税数据...');
    const oldTaxData = await queryOldSystemTaxData(payPeriod);
    
    if (oldTaxData.length === 0) {
      console.log('⚠️  老系统中未找到该薪资周期的个税数据');
      process.exit(0);
    }
    
    console.log(`📋 找到 ${oldTaxData.length} 条个税记录，开始导入...`);
    console.log('-'.repeat(60));
    
    const results = [];
    
    // 逐个处理员工个税数据
    for (let i = 0; i < oldTaxData.length; i++) {
      const employeeData = oldTaxData[i];
      console.log(`[${i + 1}/${oldTaxData.length}] 处理 ${employeeData.full_name}...`);
      
      const result = await importEmployeeTax(employeeData, payPeriod);
      results.push({
        ...result,
        employee_name: employeeData.full_name
      });
      
      if (result.success) {
        console.log(`✅ ${employeeData.full_name}: ¥${result.tax_amount.toFixed(2)}`);
      }
      
      // 添加小延迟避免过快请求
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 生成摘要报告
    generateSummaryReport(payPeriod, results);
    
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      console.log('\n✅ 导入完成！');
      console.log(`📊 成功导入 ${successCount} 人的个人所得税数据`);
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
  queryOldSystemTaxData,
  importEmployeeTax,
  generateSummaryReport
};