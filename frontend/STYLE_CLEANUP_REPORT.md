# 旧样式系统清理报告

## 🚨 发现的问题

通过全面检查，发现还有 **30+ 个组件** 仍在使用旧的样式系统，需要进一步清理。

## 📊 需要清理的文件分类

### 1. 部门管理相关组件 (9个)
- `/pages/department/DepartmentManagementPage.tsx`
- `/components/department/DepartmentCard.tsx`
- `/components/department/DepartmentViewToggle.tsx`
- `/components/department/DepartmentSearchPanel.tsx`
- `/components/department/DepartmentTree.tsx`
- `/components/department/DepartmentSalaryChart.tsx`
- `/components/department/DepartmentDetailModal.tsx`
- `/components/department/DepartmentTreeNode.tsx`
- `/components/department/DepartmentCardGrid.tsx`

### 2. 薪资管理相关组件 (10个)
- `/pages/payroll/PayrollListPage.tsx`
- `/pages/payroll/CreateBatchPayrollPage.tsx`
- `/pages/payroll/PayrollDetailPage.tsx`
- `/components/payroll/PayrollBatchActions.tsx`
- `/components/payroll/PayrollList.tsx`
- `/components/payroll/PayrollDetailModal.tsx`
- `/components/payroll/PayrollSummaryCard.tsx`
- `/components/payroll/PayrollDetailView.tsx`
- `/components/payroll/PayrollAmountDisplay.tsx`

### 3. 公共组件 (7个)
- `/components/common/LoadingScreen.tsx`
- `/components/common/AccordionSection.tsx`
- `/components/common/ModernButton.tsx` ⚠️ 重要
- `/components/common/DetailField.tsx`
- `/components/common/DataTable/DataTablePagination.tsx`
- `/components/common/DataTable/DataTableColumnHeader.tsx`
- `/components/common/DataTable/DataTableToolbar.tsx`

### 4. 页面组件 (4个)
- `/pages/dashboard/DashboardPage.tsx`
- `/pages/auth/LoginPage.tsx`
- `/pages/MonthPickerDemoPage.tsx`
- `/pages/TypographyShowcasePage.tsx`
- `/pages/DesignSystemShowcase.tsx`

### 5. 旧样式系统文件 (需要删除)
- `/styles/modern-effects.ts` ⚠️ 核心旧文件
- `/styles/typography.ts` ⚠️ 核心旧文件

## 🎯 清理优先级

### 高优先级 (立即处理)
1. **ModernButton** - 这是最重要的公共组件，被广泛使用
2. **DataTable 子组件** - 影响表格功能
3. **LoadingScreen** - 影响加载体验

### 中优先级 (批量处理)
1. **部门管理模块** - 完整功能模块
2. **薪资管理模块** - 完整功能模块

### 低优先级 (最后处理)
1. **演示页面** - 非核心功能
2. **旧样式文件删除** - 确保无引用后删除

## 🔧 清理策略

### 1. 组件级重构
对每个组件执行以下步骤：
```typescript
// 旧导入
import { buttonEffects, iconContainer } from '@/styles/modern-effects';
import { typography } from '@/styles/typography';

// 新导入
import { useComponentStyles } from '@/components/common/styles';
```

### 2. 样式映射转换
```typescript
// 旧方式
className={cn(buttonEffects.modern, typography.body.sm)}

// 新方式
const { styles, cx } = useComponentStyles('button', config);
className={cx(styles.className, 'text-sm')}
```

### 3. 颜色令牌替换
```typescript
// 旧颜色
'text-base-content/70'
'bg-base-100'
'border-base-200/60'

// 新颜色令牌
'text-text-secondary'
'bg-background-primary'  
'border-border-subtle'
```

## 📈 预估工作量

| 组件类别 | 文件数量 | 预估时间 |
|---------|---------|----------|
| 公共组件 | 7个 | 2-3小时 |
| 部门组件 | 9个 | 3-4小时 |
| 薪资组件 | 10个 | 4-5小时 |
| 页面组件 | 5个 | 2-3小时 |
| 清理旧文件 | 2个 | 1小时 |
| **总计** | **33个** | **12-16小时** |

## ⚠️ 风险评估

### 高风险
- **ModernButton** - 被其他组件广泛使用，需要仔细测试
- **DataTable** 子组件 - 可能影响表格功能

### 中风险  
- 功能模块组件 - 需要确保业务逻辑不受影响

### 低风险
- 演示页面 - 影响范围有限

## 🎯 清理计划

### 阶段1: 关键公共组件 (立即执行)
1. ModernButton
2. LoadingScreen  
3. DataTable 子组件

### 阶段2: 功能模块 (按模块执行)
1. 部门管理模块
2. 薪资管理模块

### 阶段3: 页面和清理 (最后执行)
1. 各种页面组件
2. 删除旧样式文件
3. 清理package.json依赖

## 🧪 测试计划

每个阶段完成后需要测试：
1. **功能测试**: 确保所有功能正常
2. **视觉测试**: 确保样式正确显示
3. **响应式测试**: 确保移动端正常
4. **主题切换测试**: 确保深浅色主题正常

## 🎉 清理完成标准

- [ ] 所有组件都使用新的组件样式系统
- [ ] 没有任何旧样式系统的导入引用
- [ ] 旧样式文件已安全删除
- [ ] 所有功能测试通过
- [ ] 视觉效果保持一致
- [ ] 性能没有退化

---

**下一步行动**: 开始执行阶段1的关键公共组件清理工作