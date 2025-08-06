#!/usr/bin/env node

/**
 * 薪资数据导入脚本
 * 功能：从老系统导入缴费基数或个人所得税数据到新系统
 * 使用：node data-import.js <薪资周期> <员工姓名> <导入类型>
 * 
 * 导入类型：
 * 1 = 缴费基数导入
 * 2 = 个人所得税导入
 * 
 * 示例：
 * node data-import.js 2025-01 汪琳 1  # 导入汪琳2025年1月的缴费基数
 * node data-import.js 2025-01 汪琳 2  # 导入汪琳2025年1月的个人所得税
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
 * 从老系统查询员工缴费基数数据
 */
async function queryOldSystemContributionBases(employeeName, payPeriod) {
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
        pe.deductions_details,
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
    console.error('查询老系统缴费基数失败:', error.message);
    return null;
  } finally {
    await client.end();
  }
}

/**
 * 从老系统查询员工个人所得税数据
 */
async function queryOldSystemPersonalIncomeTax(employeeName, payPeriod) {
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
    console.error('查询老系统个税数据失败:', error.message);
    return null;
  } finally {
    await client.end();
  }
}

/**
 * 导入缴费基数到新系统
 */
async function importContributionBases(employeeName, payPeriod, oldData) {
  try {
    console.log('🔄 开始导入缴费基数...');
    
    // 获取员工ID
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('full_name', employeeName)
      .limit(1);
    
    if (employeeError) {
      throw new Error(`查询员工失败: ${employeeError.message}`);
    }
    
    if (!employeeData || employeeData.length === 0) {
      throw new Error('新系统中未找到该员工');
    }
    
    const employeeId = employeeData[0].id;
    
    // 获取所有保险类型
    const { data: insuranceTypes, error: insuranceError } = await supabase
      .from('insurance_types')
      .select('id, system_key, name');
    
    if (insuranceError) {
      throw new Error(`查询保险类型失败: ${insuranceError.message}`);
    }
    
    // 解析老系统的扣款详情，提取缴费基数
    const deductionsDetails = oldData.deductions_details;
    const startDate = oldData.start_date;
    const endDate = oldData.end_date;
    
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
    
    let importedCount = 0;
    
    // 为每种保险类型导入缴费基数
    for (const [oldField, systemKey] of Object.entries(fieldMapping)) {
      if (deductionsDetails[oldField]) {
        const insuranceType = insuranceTypes.find(t => t.system_key === systemKey);
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
        
        if (contributionBase > 0) {
          // 检查是否已存在
          const { data: existingBase } = await supabase
            .from('employee_contribution_bases')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('insurance_type_id', insuranceType.id)
            .eq('effective_start_date', startDate)
            .limit(1);
          
          if (existingBase && existingBase.length > 0) {
            // 更新现有记录
            const { error: updateError } = await supabase
              .from('employee_contribution_bases')
              .update({
                contribution_base: contributionBase,
                effective_end_date: endDate
              })
              .eq('id', existingBase[0].id);
            
            if (updateError) {
              console.error(`❌ 更新${insuranceType.name}缴费基数失败:`, updateError.message);
            } else {
              console.log(`✅ 更新${insuranceType.name}缴费基数: ¥${contributionBase}`);
              importedCount++;
            }
          } else {
            // 插入新记录
            const { error: insertError } = await supabase
              .from('employee_contribution_bases')
              .insert({
                employee_id: employeeId,
                insurance_type_id: insuranceType.id,
                contribution_base: contributionBase,
                effective_start_date: startDate,
                effective_end_date: endDate
              });
            
            if (insertError) {
              console.error(`❌ 插入${insuranceType.name}缴费基数失败:`, insertError.message);
            } else {
              console.log(`✅ 导入${insuranceType.name}缴费基数: ¥${contributionBase}`);
              importedCount++;
            }
          }
        }
      }
    }
    
    console.log(`🎉 缴费基数导入完成，共导入 ${importedCount} 项`);
    return importedCount;
    
  } catch (error) {
    console.error('❌ 导入缴费基数失败:', error.message);
    return 0;
  }
}

/**
 * 导入个人所得税到新系统
 */
async function importPersonalIncomeTax(employeeName, payPeriod, oldData) {
  try {
    console.log('🔄 开始导入个人所得税...');
    
    // 获取员工ID
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('full_name', employeeName)
      .limit(1);
    
    if (employeeError) {
      throw new Error(`查询员工失败: ${employeeError.message}`);
    }
    
    if (!employeeData || employeeData.length === 0) {
      throw new Error('新系统中未找到该员工');
    }
    
    const employeeId = employeeData[0].id;
    
    // 获取对应的薪资记录
    const startDate = `${payPeriod}-01`;
    const { data: payrollData, error: payrollError } = await supabase
      .from('payrolls')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('pay_period_start', startDate)
      .limit(1);
    
    if (payrollError) {
      throw new Error(`查询薪资记录失败: ${payrollError.message}`);
    }
    
    if (!payrollData || payrollData.length === 0) {
      throw new Error('新系统中未找到对应的薪资记录');
    }
    
    const payrollId = payrollData[0].id;
    
    // 从老系统数据中提取个税信息
    const deductionsDetails = oldData.deductions_details;
    const personalIncomeTax = deductionsDetails.PERSONAL_INCOME_TAX;
    
    if (!personalIncomeTax || !personalIncomeTax.amount) {
      throw new Error('老系统中未找到个人所得税数据');
    }
    
    const taxAmount = parseFloat(personalIncomeTax.amount);
    const grossPay = parseFloat(oldData.gross_pay);
    
    // 计算应纳税所得额（简化计算）
    const taxableIncome = grossPay - 5000; // 假设起征点为5000
    const effectiveTaxRate = taxAmount > 0 ? taxAmount / taxableIncome : 0;
    
    // 检查是否已存在记录
    const { data: existingTax } = await supabase
      .from('personal_income_tax_calculation_logs')
      .select('id')
      .eq('payroll_id', payrollId)
      .eq('employee_id', employeeId)
      .limit(1);
    
    const taxData = {
      payroll_id: payrollId,
      employee_id: employeeId,
      taxable_income: Math.max(0, taxableIncome),
      tax_amount: taxAmount,
      effective_tax_rate: effectiveTaxRate,
      personal_allowance: 5000,
      calculation_details: {
        source: 'imported_from_old_system',
        gross_pay: grossPay,
        import_date: new Date().toISOString(),
        old_system_data: personalIncomeTax
      },
      calculation_method: 'monthly',
      notes: `从老系统导入的个人所得税数据 - ${payPeriod}`
    };
    
    if (existingTax && existingTax.length > 0) {
      // 更新现有记录
      const { error: updateError } = await supabase
        .from('personal_income_tax_calculation_logs')
        .update(taxData)
        .eq('id', existingTax[0].id);
      
      if (updateError) {
        throw new Error(`更新个税记录失败: ${updateError.message}`);
      }
      
      console.log(`✅ 更新个人所得税: ¥${taxAmount}`);
    } else {
      // 插入新记录
      const { error: insertError } = await supabase
        .from('personal_income_tax_calculation_logs')
        .insert(taxData);
      
      if (insertError) {
        throw new Error(`插入个税记录失败: ${insertError.message}`);
      }
      
      console.log(`✅ 导入个人所得税: ¥${taxAmount}`);
    }
    
    console.log('🎉 个人所得税导入完成');
    return 1;
    
  } catch (error) {
    console.error('❌ 导入个人所得税失败:', error.message);
    return 0;
  }
}

/**
 * 显示使用帮助
 */
function showUsage() {
  console.log('\n📖 使用方法:');
  console.log('node data-import.js <薪资周期> <员工姓名> <导入类型>');
  console.log('');
  console.log('📋 参数说明:');
  console.log('  薪资周期: YYYY-MM 格式，如 2025-01');
  console.log('  员工姓名: 员工的完整姓名，如 汪琳');
  console.log('  导入类型: 1=缴费基数, 2=个人所得税');
  console.log('');
  console.log('💡 使用示例:');
  console.log('  node data-import.js 2025-01 汪琳 1  # 导入汪琳2025年1月的缴费基数');
  console.log('  node data-import.js 2025-01 汪琳 2  # 导入汪琳2025年1月的个人所得税');
  console.log('');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 薪资数据导入工具');
  console.log('='.repeat(60));
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('❌ 参数不足');
    showUsage();
    process.exit(1);
  }
  
  const [payPeriod, employeeName, importTypeStr] = args;
  const importType = parseInt(importTypeStr);
  
  // 验证参数
  if (!/^\d{4}-\d{2}$/.test(payPeriod)) {
    console.error('❌ 薪资周期格式错误，应为 YYYY-MM 格式，如: 2025-01');
    process.exit(1);
  }
  
  if (!employeeName || employeeName.trim().length === 0) {
    console.error('❌ 员工姓名不能为空');
    process.exit(1);
  }
  
  if (![1, 2].includes(importType)) {
    console.error('❌ 导入类型必须为 1(缴费基数) 或 2(个人所得税)');
    process.exit(1);
  }
  
  const importTypeName = importType === 1 ? '缴费基数' : '个人所得税';
  
  console.log(`👤 员工姓名: ${employeeName}`);
  console.log(`📅 薪资周期: ${payPeriod}`);
  console.log(`📦 导入类型: ${importTypeName}`);
  console.log('='.repeat(60));
  
  try {
    if (importType === 1) {
      // 导入缴费基数
      console.log('🔍 查询老系统缴费基数数据...');
      const oldData = await queryOldSystemContributionBases(employeeName, payPeriod);
      
      if (!oldData) {
        console.error('❌ 老系统中未找到该员工的薪资数据');
        process.exit(1);
      }
      
      const importedCount = await importContributionBases(employeeName, payPeriod, oldData);
      
      if (importedCount > 0) {
        console.log('\n✅ 导入成功！');
        console.log(`📊 共导入 ${importedCount} 项缴费基数数据`);
      } else {
        console.log('\n⚠️  未导入任何数据');
      }
      
    } else {
      // 导入个人所得税
      console.log('🔍 查询老系统个人所得税数据...');
      const oldData = await queryOldSystemPersonalIncomeTax(employeeName, payPeriod);
      
      if (!oldData) {
        console.error('❌ 老系统中未找到该员工的薪资数据');
        process.exit(1);
      }
      
      const importedCount = await importPersonalIncomeTax(employeeName, payPeriod, oldData);
      
      if (importedCount > 0) {
        console.log('\n✅ 导入成功！');
        console.log('📊 个人所得税数据已导入');
      } else {
        console.log('\n⚠️  导入失败');
      }
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
  queryOldSystemContributionBases,
  queryOldSystemPersonalIncomeTax,
  importContributionBases,
  importPersonalIncomeTax
};