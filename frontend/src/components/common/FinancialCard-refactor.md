# FinancialCard 组件样式重构文档

## 重构内容

FinancialCard 组件已经使用新的组件样式系统进行了重构：

### 主要改进

1. **移除 cva 依赖**
   - 删除了 class-variance-authority 的使用
   - 使用新的组件样式系统 Hook

2. **使用组件样式 Hook**
   ```typescript
   const { styles, cx } = useComponentStyles('card', {
     variant: variant as any,
     size: size as any,
     bordered,
     elevated,
     interactive: interactive !== 'none',
   }, financialCardMapping);
   ```

3. **自定义财务样式映射**
   - 保留所有财务特定变体（profit, loss, warning, info, success）
   - 新增交互状态系统（subtle, glow, lift, scale）
   - 使用设计令牌实现样式

4. **简化的 Props 接口**
   - 移除 VariantProps 继承
   - 清晰的类型定义
   - 更好的文档注释

### 新功能

1. **交互效果选项**
   ```typescript
   interactive?: 'none' | 'subtle' | 'glow' | 'lift' | 'scale'
   ```
   - `none`: 无交互效果
   - `subtle`: 细微的背景渐变
   - `glow`: 发光效果
   - `lift`: 悬浮效果
   - `scale`: 缩放效果

2. **更灵活的样式控制**
   - 通过 `elevated` 控制阴影
   - 通过 `bordered` 控制边框
   - 保持所有原有功能

### 使用示例

```typescript
// 盈利卡片
<ProfitCard
  title="本月盈利"
  value="¥125,000"
  subtitle="+12.5%"
  description="较上月增长"
  icon="💰"
  interactive="lift"
/>

// 亏损卡片
<LossCard
  title="本月支出"
  value="¥85,000"
  subtitle="-8.2%"
  description="较上月减少"
  icon="📉"
  interactive="glow"
/>

// 自定义卡片
<FinancialCard
  variant="glass"
  size="lg"
  interactive="scale"
  title="总资产"
  value="¥1,250,000"
  elevated={false}
>
  <div>详细内容...</div>
</FinancialCard>
```

## 样式对照

| 旧系统 | 新系统 | 说明 |
|--------|--------|------|
| cva variants | 自定义样式映射 | 更灵活的样式定义 |
| elevation prop | interactive prop | 更丰富的交互选项 |
| 硬编码颜色 | 设计令牌 | 统一的颜色系统 |
| 固定样式 | 动态组合 | 更好的可扩展性 |

## 迁移指南

1. 组件导入保持不变
2. Props 基本兼容，只需调整 `elevation` 为 `interactive`
3. 所有预定义组件（ProfitCard, LossCard 等）保持不变
4. 样式现在完全基于设计令牌系统