/**
 * 测试表格字段和数据映射关系
 * 用于检查哪些字段没有正确加载到数据中
 */

// 模拟薪资视图的实际字段
const actualViewFields = [
  'payroll_id',
  'pay_date', 
  'pay_period_start',
  'pay_period_end',
  'employee_id',
  'employee_name',
  'department_name',
  'gross_pay',
  'total_deductions', 
  'net_pay',
  'status'
];

// MetadataService中配置的字段标签
const configuredLabels = {
  'payroll_id': '薪资ID',
  'pay_date': '发薪日期', 
  'pay_period_start': '计薪开始',
  'pay_period_end': '计薪结束',
  'employee_id': '员工ID',
  'employee_name': '员工姓名',
  'department_name': '部门',
  'gross_pay': '应发工资',
  'total_deductions': '扣除合计',
  'net_pay': '实发工资',
  'status': '薪资状态'
};

// 默认可见字段配置
const defaultVisibleFields = [
  'employee_name',        // 员工姓名
  'department_name',  // 部门  
  'pay_date',         // 发薪日期
  'status',           // 状态
  'gross_pay',        // 应发工资
  'total_deductions', // 扣除合计
  'net_pay'          // 实发工资
];

// 实际数据样本（从数据库查询结果）
const sampleData = {
  "payroll_id": "2a62a62b-6fe6-4b0f-a6b0-0a95e0ef671f",
  "pay_date": "2025-01-31",
  "pay_period_start": "2025-01-01", 
  "pay_period_end": "2025-01-31",
  "employee_id": "0e70168a-9705-4a30-82f4-5509fa9f3508",
  "employee_name": "杨洋",
  "department_name": null,  // 🔴 问题：部门数据为空
  "gross_pay": "0.00",
  "total_deductions": "0.00",
  "net_pay": "0.00", 
  "status": "draft"
};

console.log('=== 薪资表格字段映射关系检查 ===\n');

// 1. 检查字段完整性
console.log('1. 字段完整性检查:');
actualViewFields.forEach(field => {
  const hasLabel = configuredLabels[field];
  const isVisible = defaultVisibleFields.includes(field);
  const hasData = sampleData[field] !== null && sampleData[field] !== undefined;
  
  console.log(`   ${field}:`);
  console.log(`      标签配置: ${hasLabel ? '✅ ' + configuredLabels[field] : '❌ 缺失'}`);
  console.log(`      默认可见: ${isVisible ? '✅' : '❌'}`);
  console.log(`      有数据: ${hasData ? '✅' : '🔴 空值/缺失'}`);
  console.log('');
});

// 2. 检查缺失字段
console.log('2. 配置但不存在的字段:');
Object.keys(configuredLabels).forEach(field => {
  if (!actualViewFields.includes(field)) {
    console.log(`   🔴 ${field}: ${configuredLabels[field]} (配置了但视图中不存在)`);
  }
});

// 3. 检查数据问题
console.log('3. 数据质量问题:');
const emptyFields = [];
Object.entries(sampleData).forEach(([field, value]) => {
  if (value === null || value === undefined || value === '') {
    emptyFields.push(field);
  }
});

if (emptyFields.length > 0) {
  console.log('   空值字段:');
  emptyFields.forEach(field => {
    if (defaultVisibleFields.includes(field)) {
      console.log(`      🔴 ${field} (${configuredLabels[field]}) - 默认可见但数据为空`);
    } else {
      console.log(`      ⚠️  ${field} (${configuredLabels[field]}) - 数据为空`);
    }
  });
} else {
  console.log('   ✅ 所有字段都有数据');
}

// 4. 建议修复方案
console.log('4. 修复建议:');
console.log('   🔧 department_name 字段为空的原因可能是:');
console.log('      - 员工分配数据缺失 (employee_assignments 表)');
console.log('      - 视图关联查询有问题');
console.log('      - 部门数据本身缺失 (departments 表)');
console.log('');
console.log('   💡 建议检查:');
console.log('      1. employee_assignments 表是否有当前员工的分配记录');
console.log('      2. view_employee_basic_info 视图定义是否正确');
console.log('      3. departments 表是否有对应的部门数据');

console.log('\n=== 检查完成 ===');