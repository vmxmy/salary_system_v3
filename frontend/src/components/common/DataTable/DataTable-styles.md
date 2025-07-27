# DataTable 组件样式重构文档

## 重构内容

DataTable 组件已经使用新的组件样式系统进行了重构：

### 主要改进

1. **移除硬编码样式**
   - 删除了所有内联的 Tailwind 类名
   - 使用设计令牌系统的统一样式

2. **使用组件样式 Hook**
   ```typescript
   const { styles: tableStyles, cx } = useComponentStyles('table', {
     size: compact ? 'sm' : 'md',
     variant: 'neutral',
     state: loading ? 'loading' : 'default',
     density: compact ? 'compact' : 'normal',
   });
   ```

3. **简化的样式结构**
   - 表格容器使用卡片样式
   - 表格本身使用表格样式系统
   - 移除了复杂的渐变和阴影效果

4. **更好的可维护性**
   - 样式集中管理
   - 易于主题切换
   - 减少样式冲突

### 使用示例

```typescript
// 标准表格
<DataTable
  columns={columns}
  data={data}
  striped
  hover
/>

// 紧凑表格
<DataTable
  columns={columns}
  data={data}
  compact
  striped={false}
/>

// 自定义样式
<DataTable
  columns={columns}
  data={data}
  className="my-custom-table"
/>
```

## 样式类对照

| 旧样式 | 新样式 | 说明 |
|--------|--------|------|
| `table table-zebra` | `table-striped` | 斑马纹表格 |
| `table-hover` | `table-hoverable` | 悬停效果 |
| `table-compact` | 通过 `compact` prop 控制 | 紧凑模式 |
| 硬编码颜色 | 设计令牌颜色 | 统一的颜色系统 |
| 自定义阴影 | 预设阴影系统 | 标准化的阴影效果 |