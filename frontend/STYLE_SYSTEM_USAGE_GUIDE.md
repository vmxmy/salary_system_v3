# 🎨 新样式管理系统使用指南

## 📝 概述

本指南详细介绍了新的组件样式管理系统的使用方法，帮助开发者快速上手和正确使用新的样式架构。

## 🏗️ 架构概览

### 设计系统层次结构
```
设计系统架构
├── 基础层 (Foundation)
│   ├── 颜色语义化令牌 (Color Tokens)
│   ├── 字体和间距 (Typography & Spacing)
│   └── 组件令牌 (Component Tokens)
├── 语义层 (Semantic)
│   ├── 背景色系统 (Background Colors)
│   ├── 文本色系统 (Text Colors)
│   └── 边框色系统 (Border Colors)
└── 组件层 (Component)
    ├── useComponentStyles Hook
    ├── 组件样式映射 (Style Mappings)
    └── 样式组合工具 (Style Utilities)
```

## 🎯 核心概念

### 1. 设计令牌 (Design Tokens)
所有样式都基于语义化的设计令牌，确保一致性和可维护性。

```typescript
// 颜色令牌示例
'bg-background-primary'    // 主要背景色
'bg-background-secondary'  // 次要背景色
'text-text-primary'        // 主要文本色
'text-text-secondary'      // 次要文本色
'border-border-subtle'     // 微妙边框色
```

### 2. 组件样式系统
基于 `useComponentStyles` Hook 的统一样式管理。

```typescript
const { styles, cx } = useComponentStyles('button', {
  variant: 'primary',
  size: 'md',
  disabled: false,
});
```

## 🚀 快速开始

### 步骤 1: 导入必要的工具
```typescript
import { useComponentStyles } from '@/components/common/styles';
import { cn } from '@/lib/utils';
```

### 步骤 2: 使用组件样式 Hook
```typescript
function MyComponent() {
  const { styles, cx } = useComponentStyles('button', {
    variant: 'primary',
    size: 'md',
  });

  return (
    <button className={cx(styles.className, 'additional-class')}>
      点击我
    </button>
  );
}
```

### 步骤 3: 应用设计令牌
```typescript
<div className="bg-background-primary text-text-primary border border-border-subtle">
  使用设计令牌的内容
</div>
```

## 📚 详细使用指南

### 1. 按钮组件样式

#### 基础用法
```typescript
import { useComponentStyles } from '@/components/common/styles';

function MyButton() {
  const { styles, cx } = useComponentStyles('button', {
    variant: 'primary',    // primary | secondary | ghost | danger
    size: 'md',           // sm | md | lg
    disabled: false,
    fullWidth: false,
  });

  return (
    <button className={cx(styles.className, 'my-custom-class')}>
      按钮文本
    </button>
  );
}
```

#### 可用的变体
- `primary`: 主要按钮，用于主要操作
- `secondary`: 次要按钮，用于次要操作
- `ghost`: 透明按钮，用于轻量级操作
- `danger`: 危险按钮，用于删除等危险操作

### 2. 卡片组件样式

#### 基础用法
```typescript
function MyCard() {
  const { styles, cx } = useComponentStyles('card', {
    variant: 'neutral',   // neutral | primary | secondary
    size: 'md',          // sm | md | lg
    elevated: true,      // 是否有阴影
    bordered: true,      // 是否有边框
    interactive: false,  // 是否可交互
  });

  return (
    <div className={cx(styles.className, 'p-4')}>
      卡片内容
    </div>
  );
}
```

### 3. 徽章组件样式

#### 基础用法
```typescript
function MyBadge() {
  const { styles, cx } = useComponentStyles('badge', {
    variant: 'primary',   // primary | secondary | success | warning | error
    size: 'md',          // sm | md | lg
    bordered: false,     // 是否有边框
    interactive: false,  // 是否可点击
  });

  return (
    <span className={cx(styles.className)}>
      徽章文本
    </span>
  );
}
```

### 4. 输入框组件样式

#### 基础用法
```typescript
function MyInput() {
  const { styles, cx } = useComponentStyles('input', {
    variant: 'default',  // default | error | success
    size: 'md',         // sm | md | lg
    disabled: false,
    focused: false,
  });

  return (
    <input 
      className={cx(styles.className)} 
      placeholder="请输入内容"
    />
  );
}
```

## 🎨 设计令牌参考

### 背景色系统
```typescript
// 主要背景
'bg-background-primary'      // 主背景色
'bg-background-secondary'    // 次要背景色
'bg-background-tertiary'     // 第三层背景色

// 状态背景
'bg-success'                 // 成功状态
'bg-warning'                 // 警告状态
'bg-error'                   // 错误状态
'bg-info'                    // 信息状态
```

### 文本色系统
```typescript
// 文本层级
'text-text-primary'          // 主要文本
'text-text-secondary'        // 次要文本
'text-text-tertiary'         // 第三级文本
'text-text-disabled'         // 禁用文本

// 状态文本
'text-success'               // 成功文本
'text-warning'               // 警告文本
'text-error'                 // 错误文本
'text-info'                  // 信息文本
```

### 边框色系统
```typescript
'border-border-subtle'       // 微妙边框
'border-border-default'      // 默认边框
'border-border-strong'       // 强调边框
'border-border-focus'        // 焦点边框
```

## 💡 最佳实践

### 1. 组件设计模式

#### ✅ 推荐做法
```typescript
// 使用语义化的配置
const { styles, cx } = useComponentStyles('button', {
  variant: 'primary',
  size: 'md',
  disabled: isLoading,
});

// 使用设计令牌
className={cx(
  styles.className,
  'bg-background-primary text-text-primary',
  'transition-all duration-200'
)}
```

#### ❌ 避免做法
```typescript
// 避免硬编码颜色
className="bg-blue-500 text-white"

// 避免直接使用旧样式
import { buttonEffects } from '@/styles/modern-effects';
```

### 2. 样式组合

#### 条件样式
```typescript
const { styles, cx } = useComponentStyles('card', {
  variant: isActive ? 'primary' : 'neutral',
  elevated: hasElevation,
});

className={cx(
  styles.className,
  isActive && 'ring-2 ring-primary/20',
  'transition-all duration-200'
)}
```

#### 响应式样式
```typescript
className={cx(
  styles.className,
  'w-full md:w-auto',           // 响应式宽度
  'text-sm md:text-base',       // 响应式字体
  'p-2 md:p-4'                  // 响应式间距
)}
```

### 3. 主题支持

所有设计令牌都支持深浅色主题切换：

```typescript
// 这些类会自动适配当前主题
'bg-background-primary'       // 在浅色主题中是白色，在深色主题中是深色
'text-text-primary'          // 在浅色主题中是深色，在深色主题中是浅色
```

## 🔧 高级用法

### 1. 自定义样式映射

对于特殊需求，可以创建自定义样式映射：

```typescript
const customButtonMapping = {
  primary: {
    base: 'bg-gradient-to-r from-blue-500 to-purple-600',
    hover: 'from-blue-600 to-purple-700',
  },
  secondary: {
    base: 'bg-gray-100 text-gray-800',
    hover: 'bg-gray-200',
  },
};

const { styles, cx } = useComponentStyles('button', config, customButtonMapping);
```

### 2. 动态样式配置

```typescript
function DynamicButton({ status, priority }) {
  const getVariant = () => {
    if (status === 'error') return 'danger';
    if (priority === 'high') return 'primary';
    return 'secondary';
  };

  const { styles, cx } = useComponentStyles('button', {
    variant: getVariant(),
    size: priority === 'high' ? 'lg' : 'md',
  });

  return <button className={styles.className}>动态按钮</button>;
}
```

### 3. 样式继承和扩展

```typescript
// 基础卡片样式
const { styles: baseStyles } = useComponentStyles('card', {
  variant: 'neutral',
  elevated: true,
});

// 扩展样式
const enhancedClassName = cx(
  baseStyles.className,
  'transform hover:scale-105',  // 添加悬停效果
  'cursor-pointer',             // 添加指针
  'overflow-hidden'             // 添加溢出隐藏
);
```

## 🧪 测试和调试

### 1. 样式调试

使用浏览器开发者工具检查生成的类名：

```typescript
// 调试模式下可以打印样式信息
console.log('Generated styles:', styles);
console.log('Final className:', cx(styles.className, 'debug-class'));
```

### 2. 样式一致性检查

```typescript
// 确保所有组件都使用设计令牌
const checkDesignTokens = (className) => {
  const hasOldTokens = /bg-base-|text-base-|border-base-/.test(className);
  if (hasOldTokens) {
    console.warn('发现旧的设计令牌:', className);
  }
};
```

## 📋 迁移检查清单

### 从旧系统迁移时，确保完成以下步骤：

#### 1. 导入更新 ✅
- [ ] 删除旧的样式导入
- [ ] 添加新的 `useComponentStyles` 导入

#### 2. 样式替换 ✅
- [ ] 替换旧的样式类使用
- [ ] 更新颜色令牌
- [ ] 更新字体和间距

#### 3. 功能验证 ✅
- [ ] 验证所有交互功能正常
- [ ] 验证响应式布局正确
- [ ] 验证主题切换正常

#### 4. 性能检查 ✅
- [ ] 验证样式加载性能
- [ ] 检查CSS捆绑包大小
- [ ] 确认无样式冲突

## 🆘 常见问题解答

### Q: 如何处理复杂的样式组合？
A: 使用 `cx` 函数组合多个类名，按照基础样式 → 状态样式 → 自定义样式的顺序：

```typescript
className={cx(
  styles.className,           // 基础样式
  isActive && 'ring-2',      // 状态样式
  'my-custom-class'          // 自定义样式
)}
```

### Q: 如何确保样式在不同主题下正确显示？
A: 始终使用语义化的设计令牌，避免硬编码颜色值：

```typescript
// ✅ 正确
'bg-background-primary text-text-primary'

// ❌ 错误
'bg-white text-black'
```

### Q: 如何处理旧组件的样式迁移？
A: 按照迁移检查清单逐步进行：
1. 更新导入
2. 替换样式类
3. 验证功能
4. 测试主题兼容性

### Q: 新样式系统的性能如何？
A: 新系统通过以下方式优化性能：
- 编译时样式生成
- 减少运行时计算
- 优化的CSS类名复用
- 更小的捆绑包体积

## 🔗 相关资源

- [REFACTOR_CHECKLIST.md](./REFACTOR_CHECKLIST.md) - 重构进度追踪
- [TailwindCSS 文档](https://tailwindcss.com/docs) - 底层样式框架
- [DaisyUI 文档](https://daisyui.com/) - 组件库文档

---

**📞 支持和反馈**

如果在使用过程中遇到问题，请：
1. 检查本指南的相关章节
2. 查看组件样式系统的源码
3. 提交 Issue 或联系开发团队

**🎯 下一步**: 开始使用新的样式系统重构你的组件吧！