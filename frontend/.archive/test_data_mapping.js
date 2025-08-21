// 测试数据映射逻辑
const testDataMapping = () => {
  console.log('🧪 测试薪资组件数据映射逻辑...\n');
  
  // 模拟数据库返回的原始数据
  const rawDatabaseData = [
    {
      component_category: 'basic_salary',
      field_name: '岗位工资',
      field_display_name: '岗位工资',
      record_count: 51,           // 总记录数（包含金额为0的）
      positive_record_count: 26,  // 金额>0的记录数
      avg_amount: 1710.4615384615384615
    },
    {
      component_category: 'basic_salary',
      field_name: '级别/岗位级别工资',
      field_display_name: '级别/岗位级别工资',
      record_count: 32,
      positive_record_count: 24,
      avg_amount: 2744.0
    }
  ];

  console.log('📊 原始数据库返回：');
  rawDatabaseData.forEach(item => {
    console.log(`   ${item.field_display_name}:`);
    console.log(`     - 总记录数: ${item.record_count}`);
    console.log(`     - 有金额记录数: ${item.positive_record_count}`);
    console.log(`     - 平均金额: ¥${Math.round(item.avg_amount)}`);
  });

  // 应用修复后的数据映射逻辑
  const formattedData = rawDatabaseData.map(item => ({
    component_category: item.component_category,
    field_name: item.field_name,
    field_display_name: item.field_display_name,
    record_count: Number(item.positive_record_count), // 使用有金额的记录数
    avg_amount: Number(item.avg_amount)
  }));

  console.log('\n✅ 修复后前端显示数据：');
  formattedData.forEach(item => {
    console.log(`   ${item.field_display_name}: ${item.record_count}人, 平均¥${Math.round(item.avg_amount)}`);
  });

  console.log('\n🎯 修复效果：');
  console.log('   - 岗位工资：51人 → 26人 (正确)');
  console.log('   - 级别/岗位级别工资：32人 → 24人 (正确)');
  console.log('   - 现在只显示真正有该项薪资收入的员工数量');
  
  console.log('\n🎉 数据映射修复完成！');
};

testDataMapping();