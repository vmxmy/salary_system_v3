# FinancialBadge 组件样式重构文档

## 重构内容

FinancialBadge 组件已经使用新的组件样式系统进行了重构：

### 主要改进

1. **移除 cva 依赖**
   - 删除了 class-variance-authority 的使用
   - 使用新的组件样式系统 Hook

2. **使用组件样式 Hook**
   ```typescript
   const { styles, cx } = useComponentStyles('badge', {
     variant: variant as any,
     size: size as any,
     bordered,
     interactive: clickable,
   }, financialBadgeMapping);
   ```

3. **完整的财务样式映射**
   - 保留所有财务状态变体（profit, loss, pending, approved, rejected）
   - 保留所有员工状态变体（active, inactive, probation, leave）
   - 保留所有优先级变体（critical, high, medium, low）
   - 新增标准变体（primary, secondary, accent, neutral, ghost）

4. **增强的配置选项**
   - 形状选项：rounded, pill, square
   - 效果选项：none, glow, pulse, bounce
   - 边框控制：bordered prop

### 新功能

1. **形状系统**
   ```typescript
   shape?: 'rounded' | 'pill' | 'square'
   ```

2. **效果系统**
   ```typescript
   effect?: 'none' | 'glow' | 'pulse' | 'bounce'
   ```

3. **更好的类型安全**
   - 移除 VariantProps 依赖
   - 清晰的类型定义

### 使用示例

```typescript
// 财务状态徽章
<ProfitBadge size="sm">+12.5%</ProfitBadge>
<LossBadge size="sm">-8.2%</LossBadge>

// 员工状态徽章
<EmployeeStatusBadge 
  status="active" 
  size="sm"
/>

// 薪资状态徽章
<SalaryStatusBadge
  status="approved"
  amount={125000}
  size="md"
/>

// 优先级徽章
<PriorityBadge
  priority="critical"
  size="xs"
/>

// 自定义徽章
<FinancialBadge
  variant="glass"
  shape="pill"
  effect="glow"
  showIcon
  clickable
  onClick={handleClick}
>
  自定义内容
</FinancialBadge>
```

## 样式对照

| 旧系统 | 新系统 | 说明 |
|--------|--------|------|
| cva variants | 自定义样式映射 | 更灵活的样式定义 |
| 硬编码效果 | effect prop | 可配置的视觉效果 |
| 固定形状 | shape prop | 可选择的形状样式 |
| 硬编码颜色 | 设计令牌 | 统一的颜色系统 |

## 迁移指南

1. 组件导入保持不变
2. 所有预定义组件（ProfitBadge, LossBadge 等）保持不变
3. Props 完全兼容，无需修改现有代码
4. 新增的 shape 和 effect props 是可选的
5. 样式现在完全基于设计令牌系统

## 特性保留

- ✅ 所有原有变体
- ✅ 图标系统
- ✅ 可点击功能
- ✅ 动画效果
- ✅ 专用组件（EmployeeStatusBadge, SalaryStatusBadge, PriorityBadge）