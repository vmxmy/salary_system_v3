#!/usr/bin/env node

/**
 * 老系统与新系统工资字段映射分析脚本
 * 功能：建立老系统earnings_details字段与新系统salary_components的正确映射关系
 * 使用：node earnings-mapping-analysis.js
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
 * 建立正确的映射关系
 * 基于老系统实际使用的字段和新系统的组件定义
 */
const EARNINGS_MAPPING = {
  // 基本工资类（basic_salary category）
  'BASIC_SALARY': {
    new_component_name: '基本工资',
    description: '基本工资',
    category: 'basic_salary',
    priority: 1
  },
  'POSITION_SALARY_GENERAL': {
    new_component_name: '岗位工资',
    description: '岗位工资',
    category: 'basic_salary',
    priority: 2
  },
  'SALARY_GRADE': {
    new_component_name: '薪级工资',
    description: '薪级工资',
    category: 'basic_salary',
    priority: 3
  },
  'PROBATION_SALARY': {
    new_component_name: '试用期工资',
    description: '试用期工资',
    category: 'basic_salary',
    priority: 4
  },

  // 津贴补贴类（benefits category）
  'GENERAL_ALLOWANCE': {
    new_component_name: '津贴',
    description: '津贴',
    category: 'benefits',
    priority: 5
  },
  'BASIC_PERFORMANCE': {
    new_component_name: '基础绩效',
    description: '基础绩效',
    category: 'benefits',
    priority: 6
  },
  'BASIC_PERFORMANCE_AWARD': {
    new_component_name: '基础绩效奖',
    description: '基础绩效奖',
    category: 'benefits',
    priority: 7
  },
  'MONTHLY_PERFORMANCE_BONUS': {
    new_component_name: '月奖励绩效',
    description: '月奖励绩效',
    category: 'benefits',
    priority: 8
  },
  'PERFORMANCE_SALARY': {
    new_component_name: '绩效工资',
    description: '绩效工资',
    category: 'benefits',
    priority: 9
  },
  'ALLOWANCE_GENERAL': {
    new_component_name: '补助',
    description: '补助',
    category: 'benefits',
    priority: 10
  },
  'REFORM_ALLOWANCE_1993': {
    new_component_name: '九三年工改保留津补贴',
    description: '九三年工改保留津补贴',
    category: 'benefits',
    priority: 11
  },
  'ONLY_CHILD_PARENT_BONUS': {
    new_component_name: '独生子女父母奖励金',
    description: '独生子女父母奖励金',
    category: 'benefits',
    priority: 12
  }
};

/**
 * 查询老系统中实际使用的earnings字段
 */
async function analyzeOldSystemEarnings() {
  const client = new Client(OLD_SYSTEM_CONFIG);
  
  try {
    await client.connect();
    
    const query = `
      SELECT DISTINCT 
          earnings_key,
          earnings_name,
          COUNT(*) as usage_count,
          AVG(earnings_amount::numeric) as avg_amount,
          MIN(earnings_amount::numeric) as min_amount,
          MAX(earnings_amount::numeric) as max_amount
      FROM (
          SELECT 
              CONCAT(e.last_name, e.first_name) as full_name,
              earnings_pair.key as earnings_key,
              earnings_pair.value->>'name' as earnings_name,
              earnings_pair.value->>'amount' as earnings_amount
          FROM payroll.payroll_entries pe
          JOIN payroll.payroll_runs pr ON pe.payroll_run_id = pr.id
          JOIN payroll.payroll_periods pp ON pe.payroll_period_id = pp.id
          JOIN hr.employees e ON pe.employee_id = e.id
          CROSS JOIN jsonb_each(pe.earnings_details) as earnings_pair
          WHERE pp.start_date >= '2025-01-01'
              AND pp.start_date < '2025-02-01'
              AND pe.earnings_details IS NOT NULL
      ) t
      WHERE earnings_amount IS NOT NULL 
          AND earnings_amount != '0'
      GROUP BY earnings_key, earnings_name
      ORDER BY usage_count DESC;
    `;
    
    const result = await client.query(query);
    return result.rows;
    
  } catch (error) {
    console.error('查询老系统earnings失败:', error.message);
    return [];
  } finally {
    await client.end();
  }
}

/**
 * 查询新系统中的salary_components
 */
async function getNewSystemComponents() {
  try {
    const { data: components, error } = await supabase
      .from('salary_components')
      .select('id, name, category, type, description')
      .eq('type', 'earning')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return components;
    
  } catch (error) {
    console.error('查询新系统salary_components失败:', error.message);
    return [];
  }
}

/**
 * 验证映射关系
 */
async function validateMapping(oldSystemData, newSystemData) {
  console.log('\n📊 映射关系验证');
  console.log('='.repeat(80));
  
  // 创建新系统组件名称映射
  const newComponentMap = {};
  newSystemData.forEach(comp => {
    newComponentMap[comp.name] = comp;
  });
  
  const validMapping = [];
  const invalidMapping = [];
  const unmappedOldFields = [];
  
  // 验证每个老系统字段的映射
  Object.keys(EARNINGS_MAPPING).forEach(oldKey => {
    const mapping = EARNINGS_MAPPING[oldKey];
    const newComponent = newComponentMap[mapping.new_component_name];
    
    if (newComponent) {
      validMapping.push({
        old_key: oldKey,
        new_component: newComponent,
        mapping_info: mapping
      });
    } else {
      invalidMapping.push({
        old_key: oldKey,
        missing_component: mapping.new_component_name,
        mapping_info: mapping
      });
    }
  });
  
  // 检查老系统中有哪些字段没有映射
  oldSystemData.forEach(oldField => {
    if (!EARNINGS_MAPPING[oldField.earnings_key]) {
      unmappedOldFields.push(oldField);
    }
  });
  
  return {
    validMapping,
    invalidMapping,
    unmappedOldFields,
    newComponentMap
  };
}

/**
 * 生成映射报告
 */
function generateMappingReport(oldSystemData, newSystemData, validation) {
  console.log('\n📋 老系统与新系统工资字段映射分析报告');
  console.log('='.repeat(80));
  console.log(`📅 分析时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(80));
  
  console.log('\n🔍 老系统earnings字段统计:');
  console.log('-'.repeat(80));
  console.log(`总计字段数: ${oldSystemData.length}`);
  oldSystemData.forEach((field, index) => {
    const mapping = EARNINGS_MAPPING[field.earnings_key];
    const status = mapping ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${field.earnings_key} (${field.earnings_name})`);
    console.log(`   使用次数: ${field.usage_count}, 平均金额: ¥${parseFloat(field.avg_amount).toFixed(2)}`);
    if (mapping) {
      console.log(`   映射到: ${mapping.new_component_name} (${mapping.category})`);
    }
    console.log('');
  });
  
  console.log('\n🔍 新系统salary_components统计:');
  console.log('-'.repeat(80));
  console.log(`总计组件数: ${newSystemData.length}`);
  
  const componentsByCategory = {};
  newSystemData.forEach(comp => {
    if (!componentsByCategory[comp.category]) {
      componentsByCategory[comp.category] = [];
    }
    componentsByCategory[comp.category].push(comp);
  });
  
  Object.keys(componentsByCategory).forEach(category => {
    console.log(`\n${category.toUpperCase()} (${componentsByCategory[category].length}个):`);
    componentsByCategory[category].forEach(comp => {
      const isUsed = validation.validMapping.some(v => v.new_component.id === comp.id);
      const status = isUsed ? '✅' : '⚠️';
      console.log(`  ${status} ${comp.name}`);
    });
  });
  
  console.log('\n✅ 有效映射关系:');
  console.log('-'.repeat(80));
  validation.validMapping.forEach((mapping, index) => {
    console.log(`${index + 1}. ${mapping.old_key} → ${mapping.new_component.name}`);
    console.log(`   类别: ${mapping.new_component.category}, ID: ${mapping.new_component.id}`);
  });
  
  if (validation.invalidMapping.length > 0) {
    console.log('\n❌ 无效映射关系 (新系统中缺失的组件):');
    console.log('-'.repeat(80));
    validation.invalidMapping.forEach((mapping, index) => {
      console.log(`${index + 1}. ${mapping.old_key} → ${mapping.missing_component} (缺失)`);
    });
  }
  
  if (validation.unmappedOldFields.length > 0) {
    console.log('\n⚠️  未映射的老系统字段:');
    console.log('-'.repeat(80));
    validation.unmappedOldFields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.earnings_key} (${field.earnings_name})`);
      console.log(`   使用次数: ${field.usage_count}, 平均金额: ¥${parseFloat(field.avg_amount).toFixed(2)}`);
    });
  }
  
  console.log('\n📊 映射统计摘要:');
  console.log('-'.repeat(80));
  console.log(`老系统字段总数: ${oldSystemData.length}`);
  console.log(`新系统组件总数: ${newSystemData.length}`);
  console.log(`有效映射数: ${validation.validMapping.length}`);
  console.log(`无效映射数: ${validation.invalidMapping.length}`);
  console.log(`未映射字段数: ${validation.unmappedOldFields.length}`);
  console.log(`映射覆盖率: ${((validation.validMapping.length / oldSystemData.length) * 100).toFixed(1)}%`);
  
  console.log('\n='.repeat(80));
}

/**
 * 导出映射配置供其他脚本使用
 */
function exportMappingConfig(validation) {
  const mappingConfig = {
    timestamp: new Date().toISOString(),
    earnings_mapping: {},
    component_lookup: {}
  };
  
  // 构建映射配置
  validation.validMapping.forEach(mapping => {
    mappingConfig.earnings_mapping[mapping.old_key] = {
      component_id: mapping.new_component.id,
      component_name: mapping.new_component.name,
      category: mapping.new_component.category,
      priority: mapping.mapping_info.priority
    };
    
    mappingConfig.component_lookup[mapping.new_component.name] = {
      id: mapping.new_component.id,
      category: mapping.new_component.category
    };
  });
  
  return mappingConfig;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 老系统与新系统工资字段映射分析工具');
  
  try {
    console.log('🔍 分析老系统earnings字段...');
    const oldSystemData = await analyzeOldSystemEarnings();
    
    console.log('🔍 查询新系统salary_components...');
    const newSystemData = await getNewSystemComponents();
    
    console.log('🔍 验证映射关系...');
    const validation = await validateMapping(oldSystemData, newSystemData);
    
    // 生成分析报告
    generateMappingReport(oldSystemData, newSystemData, validation);
    
    // 导出映射配置
    const mappingConfig = exportMappingConfig(validation);
    
    console.log('\n✅ 分析完成！');
    console.log(`📊 建议使用 ${validation.validMapping.length} 个有效映射关系进行数据导入`);
    
    if (validation.invalidMapping.length > 0) {
      console.log(`⚠️  需要在新系统中创建 ${validation.invalidMapping.length} 个缺失的薪资组件`);
    }
    
    if (validation.unmappedOldFields.length > 0) {
      console.log(`⚠️  需要为 ${validation.unmappedOldFields.length} 个老系统字段建立映射关系`);
    }
    
    return mappingConfig;
    
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
  EARNINGS_MAPPING,
  analyzeOldSystemEarnings,
  getNewSystemComponents,
  validateMapping,
  exportMappingConfig
};