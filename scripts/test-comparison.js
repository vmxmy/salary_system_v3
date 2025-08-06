#!/usr/bin/env node

/**
 * 薪资对比工具测试脚本
 * 功能：测试数据库连接和对比功能
 * 使用：npm run test
 */

require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { 
  queryOldSystemData, 
  queryNewSystemData, 
  generateComparisonReport,
  printConsoleReport 
} = require('./payroll-comparison.js');

// 测试用例配置
const TEST_CASES = [
  { name: '汪琳', period: '2025-01' },
  { name: '韩霜', period: '2025-01' },
  { name: '李薇', period: '2025-01' }
];

// 老系统数据库连接配置
const OLD_SYSTEM_CONFIG = {
  connectionString: process.env.OLD_DB_CONNECTION_STRING || 'postgresql://salary_system:caijing123!@8.137.160.207:5432/salary_system'
};

// 新系统 Supabase 连接配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rjlymghylrshudywrzec.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ACCESS_TOKEN;

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 测试数据库连接
 */
async function testDatabaseConnections() {
  console.log('🔌 测试数据库连接...\n');
  
  // 测试老系统数据库连接
  console.log('📊 测试老系统数据库连接...');
  try {
    const oldClient = new Client(OLD_SYSTEM_CONFIG);
    await oldClient.connect();
    const result = await oldClient.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ 老系统数据库连接成功');
    console.log(`   时间: ${result.rows[0].current_time}`);
    console.log(`   版本: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`);
    await oldClient.end();
  } catch (error) {
    console.log('❌ 老系统数据库连接失败:');
    console.log(`   错误: ${error.message}`);
    return false;
  }
  
  console.log();
  
  // 测试新系统 Supabase 连接
  console.log('🆕 测试新系统 Supabase 连接...');
  try {
    // 测试 Supabase 连接 - 查询系统信息表
    const { data, error } = await supabase
      .from('employees')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ 新系统 Supabase 连接成功');
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   项目: rjlymghylrshudywrzec`);
    console.log(`   员工记录数: ${data || 0}`);
  } catch (error) {
    console.log('❌ 新系统 Supabase 连接失败:');
    console.log(`   错误: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 测试数据查询功能
 */
async function testDataQueries() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 测试数据查询功能...\n');
  
  let successCount = 0;
  let totalTests = 0;
  
  for (const testCase of TEST_CASES) {
    totalTests++;
    console.log(`🧪 测试用例 ${totalTests}: ${testCase.name} (${testCase.period})`);
    console.log('-'.repeat(60));
    
    try {
      // 并行查询新老系统数据
      const [oldData, newData] = await Promise.all([
        queryOldSystemData(testCase.name, testCase.period),
        queryNewSystemData(testCase.name, testCase.period)
      ]);
      
      // 检查数据可用性
      if (!oldData && !newData) {
        console.log('⚠️  新老系统均未找到数据');
      } else if (!oldData) {
        console.log('⚠️  老系统未找到数据');
        console.log(`✅ 新系统数据: 应发=${newData.gross_pay}, 扣发=${newData.total_deductions}, 实发=${newData.net_pay}`);
      } else if (!newData) {
        console.log('⚠️  新系统未找到数据');
        console.log(`✅ 老系统数据: 应发=${oldData.gross_pay}, 扣发=${oldData.total_deductions}, 实发=${oldData.net_pay}`);
      } else {
        // 生成对比报告
        const report = generateComparisonReport(testCase.name, testCase.period, oldData, newData);
        
        console.log(`✅ 老系统数据: 应发=${oldData.gross_pay}, 扣发=${oldData.total_deductions}, 实发=${oldData.net_pay}`);
        console.log(`✅ 新系统数据: 应发=${newData.gross_pay}, 扣发=${newData.total_deductions}, 实发=${newData.net_pay}`);
        console.log(`🎯 数据匹配: ${report.comparison.overall_match ? '✅ 完全一致' : '❌ 存在差异'}`);
        
        if (report.comparison.overall_match) {
          successCount++;
        } else {
          console.log(`   应发差异: ${report.comparison.gross_pay.difference}`);
          console.log(`   扣发差异: ${report.comparison.total_deductions.difference}`);
          console.log(`   实发差异: ${report.comparison.net_pay.difference}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ 查询失败: ${error.message}`);
    }
    
    console.log();
  }
  
  return { successCount, totalTests };
}

/**
 * 测试报告生成功能
 */
async function testReportGeneration() {
  console.log('='.repeat(80));
  console.log('📄 测试报告生成功能...\n');
  
  try {
    // 使用第一个测试用例生成完整报告
    const testCase = TEST_CASES[0];
    console.log(`📝 为 ${testCase.name} (${testCase.period}) 生成完整报告...`);
    
    const [oldData, newData] = await Promise.all([
      queryOldSystemData(testCase.name, testCase.period),
      queryNewSystemData(testCase.name, testCase.period)
    ]);
    
    if (oldData || newData) {
      const report = generateComparisonReport(testCase.name, testCase.period, oldData, newData);
      printConsoleReport(report);
      console.log('✅ 报告生成测试通过');
      return true;
    } else {
      console.log('⚠️  无法测试报告生成：缺少测试数据');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ 报告生成测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 性能测试
 */
async function performanceTest() {
  console.log('\n' + '='.repeat(80));
  console.log('⚡ 性能测试...\n');
  
  const startTime = Date.now();
  
  try {
    // 并行执行多个查询
    const promises = TEST_CASES.map(testCase => 
      Promise.all([
        queryOldSystemData(testCase.name, testCase.period),
        queryNewSystemData(testCase.name, testCase.period)
      ])
    );
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ 性能测试完成`);
    console.log(`   查询数量: ${TEST_CASES.length * 2} 个数据库查询`);
    console.log(`   总耗时: ${duration}ms`);
    console.log(`   平均耗时: ${Math.round(duration / TEST_CASES.length)}ms/员工`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ 性能测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🧪 薪资对比工具测试套件');
  console.log('='.repeat(80));
  
  let totalScore = 0;
  let maxScore = 0;
  
  // 1. 数据库连接测试
  maxScore += 20;
  if (await testDatabaseConnections()) {
    totalScore += 20;
    console.log('✅ 数据库连接测试: 20/20分');
  } else {
    console.log('❌ 数据库连接测试: 0/20分');
    console.log('💡 请检查数据库配置和网络连接');
    return;
  }
  
  // 2. 数据查询测试
  maxScore += 40;
  const queryResults = await testDataQueries();
  const queryScore = Math.round((queryResults.successCount / queryResults.totalTests) * 40);
  totalScore += queryScore;
  console.log(`${queryScore === 40 ? '✅' : '⚠️'} 数据查询测试: ${queryScore}/40分 (${queryResults.successCount}/${queryResults.totalTests} 成功)`);
  
  // 3. 报告生成测试
  maxScore += 20;
  if (await testReportGeneration()) {
    totalScore += 20;
    console.log('✅ 报告生成测试: 20/20分');
  } else {
    console.log('❌ 报告生成测试: 0/20分');
  }
  
  // 4. 性能测试
  maxScore += 20;
  if (await performanceTest()) {
    totalScore += 20;
    console.log('✅ 性能测试: 20/20分');
  } else {
    console.log('❌ 性能测试: 0/20分');
  }
  
  // 最终得分
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(80));
  console.log(`🎯 总分: ${totalScore}/${maxScore} (${Math.round((totalScore/maxScore)*100)}%)`);
  
  if (totalScore === maxScore) {
    console.log('🎉 所有测试通过！薪资对比工具运行正常。');
  } else if (totalScore >= maxScore * 0.8) {
    console.log('😊 大部分测试通过，工具基本可用。');
  } else {
    console.log('😞 测试失败较多，请检查配置和环境。');
  }
  
  console.log('='.repeat(80));
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testDatabaseConnections,
  testDataQueries,
  testReportGeneration,
  performanceTest,
  runTests
};