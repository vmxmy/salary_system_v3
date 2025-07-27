# ModernButton 组件

现代化按钮组件，提供统一的按钮样式和交互效果，支持多种变体、尺寸和状态。

## 特性

- 🎨 **多种变体**: primary、secondary、ghost、danger
- 📏 **灵活尺寸**: sm、md、lg 三种尺寸
- ⚡ **硬件加速**: GPU加速的动画效果
- 🔄 **加载状态**: 内置加载指示器
- 🖼️ **图标支持**: 支持左右位置图标
- ♿ **可访问性**: 完整的键盘导航和屏幕阅读器支持

## 基本用法

```tsx
import { ModernButton } from '@/components/common/ModernButton';

function BasicExample() {
  return (
    <div className="space-x-2">
      <ModernButton variant="primary">
        主要按钮
      </ModernButton>
      
      <ModernButton variant="secondary">
        次要按钮
      </ModernButton>
      
      <ModernButton variant="ghost">
        幽灵按钮
      </ModernButton>
      
      <ModernButton variant="danger">
        危险按钮
      </ModernButton>
    </div>
  );
}
```

## 尺寸变体

```tsx
function SizeExample() {
  return (
    <div className="space-x-2 items-center flex">
      <ModernButton size="sm" variant="primary">
        小按钮
      </ModernButton>
      
      <ModernButton size="md" variant="primary">
        中按钮
      </ModernButton>
      
      <ModernButton size="lg" variant="primary">
        大按钮
      </ModernButton>
    </div>
  );
}
```

## 图标按钮

```tsx
import { PlusIcon, DownloadIcon } from 'lucide-react';

function IconExample() {
  return (
    <div className="space-x-2">
      {/* 左侧图标 */}
      <ModernButton 
        variant="primary" 
        icon={<PlusIcon />}
        iconPosition="left"
      >
        新增
      </ModernButton>
      
      {/* 右侧图标 */}
      <ModernButton 
        variant="secondary" 
        icon={<DownloadIcon />}
        iconPosition="right"
      >
        下载
      </ModernButton>
      
      {/* 仅图标 */}
      <ModernButton 
        variant="ghost" 
        icon={<PlusIcon />}
        className="px-2"
      >
        <span className="sr-only">添加</span>
      </ModernButton>
    </div>
  );
}
```

## 状态管理

```tsx
import { useState } from 'react';

function StateExample() {
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <div className="space-x-2">
      <ModernButton 
        variant="primary"
        loading={loading}
        onClick={handleClick}
      >
        {loading ? '提交中...' : '提交'}
      </ModernButton>
      
      <ModernButton 
        variant="secondary"
        disabled={disabled}
        onClick={() => setDisabled(!disabled)}
      >
        {disabled ? '已禁用' : '禁用按钮'}
      </ModernButton>
    </div>
  );
}
```

## 全宽按钮

```tsx
function FullWidthExample() {
  return (
    <div className="max-w-md space-y-3">
      <ModernButton variant="primary" fullWidth>
        全宽主要按钮
      </ModernButton>
      
      <ModernButton variant="secondary" fullWidth>
        全宽次要按钮
      </ModernButton>
    </div>
  );
}
```

## 自定义样式

```tsx
function CustomExample() {
  return (
    <ModernButton 
      variant="primary"
      className="shadow-xl hover:shadow-2xl"
      style={{
        background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      自定义渐变按钮
    </ModernButton>
  );
}
```

## API 参考

### ModernButtonProps

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | 按钮变体 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 按钮尺寸 |
| `loading` | `boolean` | `false` | 加载状态 |
| `icon` | `React.ReactNode` | - | 图标元素 |
| `iconPosition` | `'left' \| 'right'` | `'left'` | 图标位置 |
| `fullWidth` | `boolean` | `false` | 全宽显示 |
| `children` | `React.ReactNode` | - | 按钮内容 |
| `className` | `string` | - | 自定义样式类 |
| `disabled` | `boolean` | `false` | 禁用状态 |
| `onClick` | `(event: MouseEvent) => void` | - | 点击事件处理器 |

继承所有标准 `button` 元素的属性。

## 设计规范

### 颜色使用
- **Primary**: 主要操作，如提交、确认
- **Secondary**: 次要操作，如取消、返回
- **Ghost**: 辅助操作，如编辑、详情
- **Danger**: 危险操作，如删除、重置

### 尺寸指南
- **Small (sm)**: 32px 高度，适用于紧凑布局
- **Medium (md)**: 40px 高度，默认尺寸
- **Large (lg)**: 48px 高度，适用于重要操作

### 间距建议
- 按钮间距：至少 8px
- 触摸区域：至少 44x44px
- 文本边距：左右各 16-24px

## 可访问性

### 键盘导航
- `Tab`: 聚焦到按钮
- `Space` / `Enter`: 激活按钮
- `Esc`: 取消聚焦（在模态框中）

### 屏幕阅读器
- 使用语义化的 `button` 元素
- 提供适当的 `aria-label`
- 加载状态有语音提示

### 颜色对比
所有变体都符合 WCAG 2.1 AA 标准的颜色对比度要求。

## 性能优化

### 硬件加速
- 使用 `will-change-transform` 优化动画性能
- GPU 加速的缩放和阴影效果
- 智能的重绘优化

### 渲染优化
- 避免不必要的重新渲染
- 使用 CSS 容器查询优化
- 懒加载非关键动画

## 最佳实践

### ✅ 推荐做法
- 在表单中使用 `type="submit"`
- 为仅图标按钮提供屏幕阅读器文本
- 使用适当的变体表达操作重要性
- 在异步操作时显示加载状态

### ❌ 避免做法
- 不要在一个界面使用过多的 primary 按钮
- 不要在加载状态时禁用按钮文本提示
- 不要过度使用动画效果
- 不要忽略键盘导航支持

## 相关组件

- [LoadingScreen](./LoadingScreen.md) - 页面级加载状态
- [FinancialCard](./FinancialCard.md) - 包含操作按钮的卡片
- [DataTable](./DataTable.md) - 表格操作按钮