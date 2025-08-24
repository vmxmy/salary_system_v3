# Card边框样式统一指南

## 概述
基于DaisyUI v5和TailwindCSS v4的统一card边框管理系统，确保整个应用的视觉一致性。

## 设计原则

### 1. 统一性原则
- 所有card组件使用统一的边框颜色和样式
- 基于DaisyUI v5的CSS变量系统，确保主题切换时的一致性
- 避免内联样式，优先使用预定义的设计效果

### 2. 语义化原则
- 不同类型的内容使用对应语义的边框样式
- 状态相关的内容使用对应的状态颜色边框
- 层次清晰，重要性区分明显

### 3. 可访问性原则
- 高对比度模式下自动增强边框可见性
- 深色主题下自动调整边框透明度
- 支持无障碍访问标准

## 使用指南

### 基础用法

```typescript
import { cardEffects } from '@/styles/design-effects';

// 推荐：使用预定义的效果
<div className={cardEffects.default}>
  <!-- 内容 -->
</div>

// 不推荐：直接使用内联样式
<div className="card bg-base-100 shadow-sm border border-base-200">
  <!-- 内容 -->
</div>
```

### 样式选择指南

#### 日常使用场景

- **default**: 默认选择，适用于大多数内容卡片
- **standard**: 需要更明显边框分隔的卡片
- **elevated**: 重要内容，需要视觉层次
- **hover**: 可交互的卡片

#### 状态反馈场景

- **success**: 成功状态、完成任务、正向反馈
- **warning**: 警告信息、需要注意的内容
- **error**: 错误状态、失败反馈
- **info**: 信息提示、帮助说明

#### 主题强调场景

- **primary**: 主要功能、核心内容
- **secondary**: 次要功能、辅助信息
- **accent**: 特色内容、突出展示

#### 特殊效果场景

- **glass**: 毛玻璃效果，现代化界面
- **dashed**: 虚线边框，草稿状态或临时内容
- **interactive**: 完整的交互效果，包含悬停动画

## 迁移指南

### 常见替换模式

```typescript
// 旧的不一致样式 -> 新的统一样式

// 基础卡片
"card bg-base-100 shadow-sm border border-base-200"
↓
cardEffects.default

// 强调卡片
"card bg-base-100 shadow-lg border border-base-300"
↓
cardEffects.elevated

// 交互卡片
"card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
↓
cardEffects.hover

// 无边框卡片
"card bg-base-100 shadow-xl"
↓
cardEffects.floating
```

### 逐步迁移步骤

1. **识别现有样式**: 找出项目中所有直接使用内联card样式的地方
2. **选择合适效果**: 根据内容类型和使用场景选择对应的cardEffects
3. **替换和测试**: 逐个替换并测试在不同主题下的效果
4. **验证一致性**: 确保替换后的样式在所有页面上保持一致

## 主题适配

### 自动适配特性

系统会自动根据当前主题调整边框样式：

- **浅色主题**: 使用较浅的边框颜色
- **深色主题**: 自动增强边框对比度
- **高对比度模式**: 自动加粗边框并提高对比度

### CSS变量系统

利用DaisyUI的CSS变量：
- `--bc`: base-content颜色
- `--b3`: base-300颜色
- `--p`: primary颜色
- `--s`: secondary颜色

## 最佳实践

### ✅ 推荐做法

1. 优先使用cardEffects中的预定义样式
2. 根据内容语义选择合适的变体
3. 保持同类内容样式的一致性
4. 测试多个主题下的效果

### ❌ 避免做法

1. 混合使用不同的边框颜色（如border-base-200和border-base-300）
2. 在同一页面使用过多不同的卡片样式
3. 忽略主题切换时的视觉效果
4. 直接使用内联样式而不是预定义效果

## 故障排查

### 常见问题

**问题1**: 边框在深色主题下不可见
**解决**: 使用cardEffects中的预定义样式，它们已包含主题适配

**问题2**: 高对比度模式下边框太细
**解决**: 系统会自动在高对比度模式下加粗边框

**问题3**: 多个主题下边框颜色不一致
**解决**: 检查是否使用了固定颜色值，应使用基于CSS变量的边框

## 更新日志

- **v1.0.0**: 初始版本，基于DaisyUI v5设计
- 统一边框颜色系统
- 主题自动适配
- 高对比度模式支持