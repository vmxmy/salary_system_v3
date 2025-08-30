/**
 * 动态字段获取功能测试工具
 */
import { getDynamicTargetFields } from '@/hooks/payroll/import-export/utils/field-mapping';
import { ImportDataGroup } from '@/types/payroll-import';

/**
 * 测试动态字段获取功能
 */
export const testDynamicFieldsRetrieval = async () => {
  console.log('🧪 开始测试动态字段获取功能...');
  
  const testGroups: ImportDataGroup[] = ['earnings', 'job', 'category', 'bases', 'all'];
  
  for (const dataGroup of testGroups) {
    console.log(`\n📊 测试数据组: ${dataGroup}`);
    try {
      const fields = await getDynamicTargetFields(dataGroup);
      
      console.log(`✅ 成功获取 ${fields.length} 个动态字段:`);
      
      // 按类型分组显示
      const fieldsByType = fields.reduce((acc, field) => {
        if (!acc[field.type]) acc[field.type] = [];
        acc[field.type].push(field);
        return acc;
      }, {} as Record<string, any[]>);
      
      Object.entries(fieldsByType).forEach(([type, typeFields]) => {
        console.log(`  ${type}: ${typeFields.length} 个字段`);
        typeFields.forEach(field => {
          console.log(`    - ${field.name} ${field.required ? '(必填)' : '(可选)'} [来源: ${field.source_table}]`);
        });
      });
      
    } catch (error) {
      console.error(`❌ 数据组 ${dataGroup} 测试失败:`, error);
    }
  }
  
  console.log('\n🏁 动态字段获取功能测试完成');
};

/**
 * 比较新旧字段获取方法
 */
export const compareFieldRetrievalMethods = async () => {
  console.log('\n🔄 对比新旧字段获取方法...');
  
  // 测试 earnings 数据组
  const dataGroup = 'earnings';
  
  try {
    // 新方法：动态获取
    const dynamicFields = await getDynamicTargetFields(dataGroup);
    console.log(`🆕 动态方法获取字段数: ${dynamicFields.length}`);
    console.log('📋 动态字段:', dynamicFields.map(f => f.name));
    
    // 显示字段来源统计
    const sourceStats = dynamicFields.reduce((acc, field) => {
      acc[field.source_table || 'unknown'] = (acc[field.source_table || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 字段来源统计:', sourceStats);
    
  } catch (error) {
    console.error('❌ 对比测试失败:', error);
  }
};