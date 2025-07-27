# 组件样式架构重构 - 实施计划

## 模块概述
将现有组件迁移到新的设计令牌系统，建立统一的组件样式架构。

## 当前问题
1. 组件样式分散在各个文件中
2. 大量内联样式和硬编码值
3. 缺乏组件变体系统
4. 响应式设计不一致
5. 样式复用性差

## 实施目标
1. ✅ 所有组件使用设计令牌
2. ✅ 建立组件变体系统
3. ✅ 消除硬编码样式值
4. ✅ 统一响应式设计模式
5. ✅ 提高样式复用性

## 重构范围

### 1. 通用组件 (components/common/)
- DataTable - 数据表格组件
- MonthPicker - 月份选择器
- FinancialCard - 财务卡片
- FinancialBadge - 财务徽章
- ThemeToggle - 主题切换

### 2. 业务组件 (components/employee/)
- EmployeeForm - 员工表单
- EmployeeCard - 员工卡片
- EmployeeFilters - 员工筛选器
- EmployeeStats - 员工统计

### 3. 布局组件 (components/layout/)
- Header - 页头
- Sidebar - 侧边栏
- MainLayout - 主布局

## 重构策略

### 第一阶段：基础组件重构 (2天)
1. **DataTable组件**
   - 移除所有硬编码颜色和间距
   - 使用设计令牌系统
   - 建立表格变体（紧凑、标准、宽松）

2. **MonthPicker组件**
   - 已修复z-index问题
   - 统一使用设计令牌
   - 优化响应式行为

3. **FinancialCard & FinancialBadge**
   - 使用财务专用色彩令牌
   - 建立尺寸变体系统

### 第二阶段：业务组件重构 (2天)
1. **员工相关组件**
   - 统一表单样式
   - 使用语义化间距
   - 建立一致的交互反馈

2. **筛选和统计组件**
   - 响应式布局优化
   - 统一图表颜色系统

### 第三阶段：布局组件重构 (1天)
1. **整体布局系统**
   - 使用布局级别的间距令牌
   - 统一导航样式
   - 优化移动端适配

## 组件变体系统设计

### 尺寸变体
```typescript
type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// 示例：按钮尺寸
const sizeClasses = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-2.5 text-lg',
  xl: 'px-6 py-3 text-xl'
};
```

### 颜色变体
```typescript
type ComponentVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// 使用语义化颜色
const variantClasses = {
  primary: 'bg-primary text-primary-content',
  secondary: 'bg-secondary text-secondary-content',
  success: 'bg-success text-success-content',
  // ...
};
```

### 状态变体
```typescript
type ComponentState = 'default' | 'hover' | 'active' | 'disabled' | 'loading';

// 状态样式
const stateClasses = {
  hover: 'hover:shadow-md hover:scale-105',
  active: 'ring-2 ring-primary',
  disabled: 'opacity-50 cursor-not-allowed',
  loading: 'animate-pulse'
};
```

## 具体任务清单

### 任务1：创建组件样式基础设施
- [ ] 创建 `components/common/styles/` 目录
- [ ] 实现 `useComponentStyles` Hook
- [ ] 创建组件变体生成器
- [ ] 建立组件样式测试工具

### 任务2：重构DataTable组件
- [ ] 分析现有样式问题
- [ ] 创建表格样式配置
- [ ] 实现变体系统
- [ ] 更新文档和示例

### 任务3：重构表单组件
- [ ] 统一输入框样式
- [ ] 优化表单布局
- [ ] 添加验证状态样式
- [ ] 实现响应式表单

### 任务4：重构布局组件
- [ ] 更新Header组件
- [ ] 优化Sidebar响应式
- [ ] 统一页面容器样式

### 任务5：创建组件样式指南
- [ ] 编写组件样式最佳实践
- [ ] 创建组件展示页面
- [ ] 提供迁移示例

## 成功标准
1. 所有组件100%使用设计令牌
2. 零硬编码颜色和间距值
3. 组件支持完整的变体系统
4. 响应式设计一致性提升
5. 样式代码减少30%以上

## 风险和缓解
1. **风险**：破坏现有功能
   - **缓解**：逐个组件重构，充分测试

2. **风险**：样式不一致
   - **缓解**：严格遵循设计令牌系统

3. **风险**：性能下降
   - **缓解**：优化类名生成，避免运行时计算

## 时间估算
- 总计：5个工作日
- 每日产出：2-3个组件完成重构
- 测试和文档：1个工作日

## 下一步行动
1. 开始创建组件样式基础设施
2. 选择DataTable作为第一个重构目标
3. 建立组件样式审查流程