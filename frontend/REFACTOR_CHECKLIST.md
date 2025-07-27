# 🔄 样式系统重构清单

## 📊 重构进度总览

**总进度**: 15/46 个组件已完成 (32.6%)

| 类别 | 完成 | 总数 | 进度 |
|------|------|------|------|
| 基础设施 | ✅ 1/1 | 1 | 100% |
| 核心组件 | ✅ 6/6 | 6 | 100% |
| 员工组件 | ✅ 2/2 | 2 | 100% |
| 布局组件 | ✅ 5/5 | 5 | 100% |
| 关键公共组件 | ✅ 2/7 | 7 | 29% |
| 部门管理组件 | ⏳ 0/9 | 9 | 0% |
| 薪资管理组件 | ⏳ 0/10 | 10 | 0% |
| 页面组件 | ⏳ 0/5 | 5 | 0% |
| 旧文件清理 | ⏳ 0/2 | 2 | 0% |

---

## ✅ 已完成重构 (15/46)

### 基础设施 (1/1) ✅
- [x] `/src/components/common/styles/` - 组件样式系统

### 核心组件 (6/6) ✅
- [x] `/src/components/common/DataTable/index.tsx`
- [x] `/src/components/common/MonthPicker.tsx`
- [x] `/src/components/common/FinancialCard.tsx`
- [x] `/src/components/common/FinancialBadge.tsx`
- [x] `/src/components/common/ModernButton.tsx`
- [x] `/src/components/common/LoadingScreen.tsx`

### 员工管理组件 (2/2) ✅
- [x] `/src/components/employee/EmployeeDetailModal.tsx`
- [x] `/src/pages/employee/EmployeeListPage.tsx`

### 布局组件 (5/5) ✅
- [x] `/src/components/layout/Header.tsx`
- [x] `/src/components/layout/Sidebar.tsx`
- [x] `/src/components/layout/PageLayout.tsx`
- [x] `/src/components/layout/PageHeader.tsx`
- [x] `/src/components/layout/Footer.tsx`

### 其他关键组件 (2/2) ✅
- [x] `/src/components/common/ModernButton.tsx`
- [x] `/src/components/common/LoadingScreen.tsx`

---

## ⏳ 待重构组件 (31/46)

### 🔴 高优先级 - 部门管理组件 (0/9)

#### 页面组件
- [ ] `/src/pages/department/DepartmentManagementPage.tsx`
  - **旧依赖**: `buttonEffects`, `iconContainer`, `typography`
  - **估时**: 2小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

#### 部门组件
- [ ] `/src/components/department/DepartmentCard.tsx`
  - **旧依赖**: `cardEffects`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/department/DepartmentViewToggle.tsx`
  - **旧依赖**: `buttonEffects`
  - **估时**: 0.5小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/department/DepartmentSearchPanel.tsx`
  - **旧依赖**: `buttonEffects`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/department/DepartmentTree.tsx`
  - **旧依赖**: `iconContainer`, `typography`
  - **估时**: 1.5小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/department/DepartmentSalaryChart.tsx`
  - **旧依赖**: `cardEffects`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/department/DepartmentDetailModal.tsx`
  - **旧依赖**: `cardEffects`, `buttonEffects`, `typography`
  - **估时**: 2小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/department/DepartmentTreeNode.tsx`
  - **旧依赖**: `iconContainer`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/department/DepartmentCardGrid.tsx`
  - **旧依赖**: `cardEffects`
  - **估时**: 0.5小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

**部门模块小计**: 0/9 完成，预估 10.5 小时

---

### 🔴 高优先级 - 薪资管理组件 (0/10)

#### 页面组件
- [ ] `/src/pages/payroll/PayrollListPage.tsx`
  - **旧依赖**: `cardEffects`, `buttonEffects`, `typography`
  - **估时**: 2小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/pages/payroll/CreateBatchPayrollPage.tsx`
  - **旧依赖**: `buttonEffects`, `typography`
  - **估时**: 2小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/pages/payroll/PayrollDetailPage.tsx`
  - **旧依赖**: `cardEffects`, `typography`
  - **估时**: 1.5小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

#### 薪资组件
- [ ] `/src/components/payroll/PayrollBatchActions.tsx`
  - **旧依赖**: `buttonEffects`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/payroll/PayrollList.tsx`
  - **旧依赖**: `cardEffects`, `typography`
  - **估时**: 1.5小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/payroll/PayrollDetailModal.tsx`
  - **旧依赖**: `cardEffects`, `buttonEffects`, `typography`
  - **估时**: 2小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/payroll/PayrollSummaryCard.tsx`
  - **旧依赖**: `cardEffects`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/payroll/PayrollDetailView.tsx`
  - **旧依赖**: `cardEffects`, `typography`
  - **估时**: 1.5小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/payroll/PayrollAmountDisplay.tsx`
  - **旧依赖**: `typography`
  - **估时**: 0.5小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

- [ ] `/src/components/payroll/PayrollStatusBadge.tsx`
  - **旧依赖**: `badgeEffects`
  - **估时**: 0.5小时
  - **负责人**: _待分配_
  - **状态**: 🔴 未开始

**薪资模块小计**: 0/10 完成，预估 13.5 小时

---

### 🟡 中优先级 - 其他公共组件 (0/5)

#### DataTable 子组件
- [ ] `/src/components/common/DataTable/DataTablePagination.tsx`
  - **旧依赖**: `buttonEffects`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🟡 待处理

- [ ] `/src/components/common/DataTable/DataTableColumnHeader.tsx`
  - **旧依赖**: `buttonEffects`, `iconContainer`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🟡 待处理

- [ ] `/src/components/common/DataTable/DataTableToolbar.tsx`
  - **旧依赖**: `buttonEffects`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🟡 待处理

#### 其他公共组件
- [ ] `/src/components/common/AccordionSection.tsx`
  - **旧依赖**: `cardEffects`, `iconContainer`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🟡 待处理

- [ ] `/src/components/common/DetailField.tsx`
  - **旧依赖**: `typography`
  - **估时**: 0.5小时
  - **负责人**: _待分配_
  - **状态**: 🟡 待处理

**公共组件小计**: 0/5 完成，预估 4.5 小时

---

### 🟢 低优先级 - 页面组件 (0/5)

#### 功能页面
- [ ] `/src/pages/dashboard/DashboardPage.tsx`
  - **旧依赖**: `cardEffects`, `iconContainer`, `typography`
  - **估时**: 2小时
  - **负责人**: _待分配_
  - **状态**: 🟢 计划中

- [ ] `/src/pages/auth/LoginPage.tsx`
  - **旧依赖**: `cardEffects`, `buttonEffects`, `typography`
  - **估时**: 1.5小时
  - **负责人**: _待分配_
  - **状态**: 🟢 计划中

#### 演示页面
- [ ] `/src/pages/MonthPickerDemoPage.tsx`
  - **旧依赖**: `cardEffects`, `typography`
  - **估时**: 0.5小时
  - **负责人**: _待分配_
  - **状态**: 🟢 计划中

- [ ] `/src/pages/TypographyShowcasePage.tsx`
  - **旧依赖**: `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🟢 计划中

- [ ] `/src/pages/DesignSystemShowcase.tsx`
  - **旧依赖**: `cardEffects`, `buttonEffects`, `typography`
  - **估时**: 1小时
  - **负责人**: _待分配_
  - **状态**: 🟢 计划中

**页面组件小计**: 0/5 完成，预估 6 小时

---

### 🔴 高优先级 - 旧文件清理 (0/2)

⚠️ **注意**: 只有在所有组件重构完成后才能删除这些文件

- [ ] `/src/styles/modern-effects.ts`
  - **描述**: 旧的现代效果样式系统
  - **引用检查**: 需确认无任何组件引用
  - **备份**: 重命名为 `.backup` 而非直接删除
  - **状态**: 🔴 等待所有组件重构完成

- [ ] `/src/styles/typography.ts`
  - **描述**: 旧的排版样式系统
  - **引用检查**: 需确认无任何组件引用
  - **备份**: 重命名为 `.backup` 而非直接删除
  - **状态**: 🔴 等待所有组件重构完成

---

## 📋 重构检查清单

### 每个组件重构时必须完成:

#### 1. 导入更新 ✅
```typescript
// 删除旧导入
- import { buttonEffects, iconContainer } from '@/styles/modern-effects';
- import { typography } from '@/styles/typography';

// 添加新导入
+ import { useComponentStyles } from '@/components/common/styles';
```

#### 2. 样式 Hook 集成 ✅
```typescript
// 添加组件样式配置
const { styles, cx } = useComponentStyles('button', {
  variant: 'primary',
  size: 'md',
  disabled: false,
});
```

#### 3. 类名替换 ✅
```typescript
// 旧方式
- className={cn(buttonEffects.modern, typography.body.sm)}

// 新方式  
+ className={cx(styles.className, 'additional-classes')}
```

#### 4. 颜色令牌更新 ✅
```typescript
// 旧颜色令牌 → 新设计令牌
- 'text-base-content/70' → 'text-text-secondary'
- 'bg-base-100' → 'bg-background-primary'
- 'border-base-200/60' → 'border-border-subtle'
```

#### 5. 测试验证 ✅
- [ ] 功能测试：所有交互正常
- [ ] 视觉测试：样式显示正确
- [ ] 响应式测试：移动端正常
- [ ] 主题测试：深浅色主题切换正常

#### 6. 文档更新 ✅
- [ ] 创建组件重构文档
- [ ] 更新使用示例
- [ ] 记录破坏性变更（如有）

---

## 🎯 里程碑时间线

### 第一阶段 (已完成) ✅
- **时间**: 已完成
- **内容**: 基础设施 + 核心组件 + 布局组件
- **完成**: 15/46 组件

### 第二阶段 (计划中)
- **时间**: 预估 2-3 天
- **内容**: 部门管理 + 薪资管理模块
- **目标**: 34/46 组件完成 (74%)

### 第三阶段 (计划中)
- **时间**: 预估 1-2 天  
- **内容**: 其他公共组件 + 页面组件
- **目标**: 44/46 组件完成 (96%)

### 第四阶段 (最后清理)
- **时间**: 预估 0.5 天
- **内容**: 旧文件清理 + 最终验证
- **目标**: 46/46 组件完成 (100%)

---

## 📊 工作分配建议

### 并行开发策略
1. **开发者 A**: 部门管理模块 (9个组件，10.5小时)
2. **开发者 B**: 薪资管理模块 (10个组件，13.5小时)  
3. **开发者 C**: 公共组件 + 页面组件 (10个组件，10.5小时)

### 顺序开发策略
1. 先完成部门管理模块 (业务影响最大)
2. 再完成薪资管理模块 (核心功能)
3. 最后完成其他组件 (补充完善)

---

## ✅ 完成标准

### 组件级标准
- [ ] 无旧样式系统导入
- [ ] 使用新组件样式 Hook
- [ ] 所有颜色使用设计令牌
- [ ] 功能完全正常
- [ ] 视觉效果一致

### 项目级标准
- [ ] 所有 46 个组件重构完成
- [ ] 旧样式文件安全删除
- [ ] 全局搜索无旧样式引用
- [ ] 所有功能测试通过
- [ ] 性能无退化

---

**🚀 开始重构**: 建议从部门管理模块开始，这是用户使用最频繁的功能模块!