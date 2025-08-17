# 薪资导出修复测试指南

## 🔧 修复内容

### 1. 立即修复：使用视图中已有的字段
- ✅ 修改了薪资明细导出逻辑，使用 `gross_pay`、`total_deductions`、`net_pay` 字段
- ✅ 避免了不可靠的字符串匹配计算

### 2. 短期优化：利用 component_type 字段正确分类
- ✅ 使用 `component_type` 字段进行薪资项目分类
- ✅ 改进了薪资项目排序逻辑（收入项在前，扣除项在后）

## 🧪 测试步骤

### 测试前准备
1. 确保数据库中有薪资记录和薪资项目明细
2. 数据应包含 `view_payroll_unified` 视图中的完整字段

### 测试用例 1：薪资明细导出
```typescript
// 在薪资管理页面或通过 Hook 直接测试
const { exportToExcel } = usePayrollExport();

const testConfig = {
  includeDetails: true,
  selectedDataGroups: ['earnings'],
  filename: '测试薪资明细导出.xlsx'
};

await exportToExcel(testConfig);
```

### 验证点
1. **应发合计准确性**：
   - 导出的 Excel 中"应发合计"列应与系统显示的 gross_pay 完全一致
   - 不应再出现计算偏差

2. **扣款合计准确性**：
   - "扣款合计"列应与系统的 total_deductions 一致

3. **实发工资准确性**：
   - "实发工资"列应与系统的 net_pay 一致

4. **薪资项目分类**：
   - 收入项目（如基本工资、津贴等）应排在前面
   - 扣除项目（如社保、个税等）应排在后面

## 🔍 问题对比

### 修复前的问题
```typescript
// ❌ 使用不可靠的字符串匹配
const totalIncome = sortedComponents
  .filter(name => !name.includes('扣') && !name.includes('个税'))
  .reduce((sum, name) => sum + (item.components[name] || 0), 0);
```

### 修复后的解决方案
```typescript
// ✅ 直接使用数据库计算的准确值
row['应发合计'] = item.gross_pay;  // 从视图获取
row['扣款合计'] = item.total_deductions;  // 从视图获取
row['实发工资'] = item.net_pay;  // 从视图获取

// ✅ 使用 component_type 正确分类
if (item.component_type === 'earning' || item.component_type === 'income') {
  employeeData.incomeComponents[item.component_name] = item.item_amount || 0;
} else if (item.component_type === 'deduction') {
  employeeData.deductionComponents[item.component_name] = Math.abs(item.item_amount || 0);
}
```

## 📊 预期效果

1. **数据一致性**：导出的金额与系统其他地方显示完全一致
2. **性能提升**：不需要重新计算，直接使用数据库预计算值
3. **可维护性**：不依赖薪资项目的命名规范，使用标准化的类型字段
4. **准确性**：消除因字符串匹配导致的分类错误

## 🚀 后续改进建议

1. **添加验证机制**：可以在开发环境中启用计算验证，确保数据库值与重新计算值一致
2. **缓存优化**：对于大量数据的导出，可以考虑分批处理
3. **错误处理**：增加对缺失字段的处理和用户提示
