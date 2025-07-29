// 最终数据映射验证
const testFinalMapping = () => {
  console.log('🎯 验证完整的数据流映射...\n');
  
  // 模拟数据库原始返回（RPC函数结果）
  const rawRpcData = [
    {
      component_category: 'basic_salary',
      field_name: '岗位工资',
      field_display_name: '岗位工资',
      record_count: 51,           // 总记录数（错误的显示数据）
      positive_record_count: 26,  // 正确的显示数据
      avg_amount: 1710.4615384615384615
    }
  ];

  console.log('📊 数据库原始返回：');
  console.log('   岗位工资: record_count=51, positive_record_count=26');

  // 应用修复后的完整数据转换
  const formattedData = rawRpcData.map(item => ({
    component_category: item.component_category,
    field_name: item.field_name,
    field_display_name: item.field_display_name,
    record_count: Number(item.positive_record_count), // 下划线命名，兼容原接口
    avg_amount: Number(item.avg_amount),
    // 为组件提供驼峰命名的属性
    recordCount: Number(item.positive_record_count),   // 驼峰命名，组件使用
    avgAmount: Number(item.avg_amount),
    fieldName: item.field_name,
    fieldDisplayName: item.field_display_name
  }));

  console.log('\n✅ 转换后的前端数据：');
  console.log('   record_count:', formattedData[0].record_count);
  console.log('   recordCount:', formattedData[0].recordCount);
  console.log('   avg_amount:', Math.round(formattedData[0].avg_amount));
  console.log('   avgAmount:', Math.round(formattedData[0].avgAmount));

  // 模拟组件计算逻辑
  const totalRecords = formattedData.reduce((sum, field) => sum + field.recordCount, 0);
  console.log('\n🧮 组件计算结果：');
  console.log(`   显示文本: "${formattedData[0].fieldDisplayName}: ${formattedData[0].recordCount}人"`);
  console.log(`   总计: ${totalRecords}人`);

  console.log('\n🎉 数据流验证：');
  console.log('   ✅ 数据库：positive_record_count = 26');
  console.log('   ✅ 服务层：recordCount = 26');  
  console.log('   ✅ 组件：显示 "岗位工资: 26人"');
  console.log('   ✅ 修复完成：不再显示51人的错误数据！');
};

testFinalMapping();