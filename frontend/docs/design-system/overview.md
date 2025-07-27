# 设计系统概述

## 设计哲学

我们的设计系统基于"孔雀屏"设计模式，强调信息的分层展示和渐进式披露。通过优雅的视觉层次和流畅的交互动画，为用户提供直观、高效的操作体验。

## 核心原则

### 1. 视觉层次 📊
- **主要信息**: 使用更大的字体、更高的对比度
- **次要信息**: 适中的字体大小和对比度
- **辅助信息**: 较小的字体、较低的对比度
- **背景信息**: 最小的字体、最低的对比度

### 2. 一致性 🎯
- **组件复用**: 相同功能使用相同组件
- **交互模式**: 统一的交互行为和反馈
- **视觉语言**: 一致的颜色、字体、间距使用
- **命名规范**: 统一的命名约定

### 3. 可访问性 ♿
- **颜色对比**: 符合 WCAG 2.1 AA标准
- **键盘导航**: 完整的键盘操作支持
- **屏幕阅读器**: 语义化的HTML结构
- **动画控制**: 支持减少动效偏好设置

### 4. 性能优化 ⚡
- **硬件加速**: 使用GPU加速的动画
- **懒加载**: 按需加载组件和资源
- **缓存策略**: 智能的数据缓存
- **渲染优化**: 虚拟化大数据集

## 设计令牌系统

我们使用设计令牌来确保设计的一致性和可维护性：

### 颜色系统
```css
/* 主要颜色 */
--color-primary: rgb(59 130 246);
--color-primary-hover: rgb(37 99 235);
--color-primary-active: rgb(29 78 216);

/* 语义颜色 */
--color-success: rgb(34 197 94);
--color-warning: rgb(251 191 36);
--color-error: rgb(239 68 68);
--color-info: rgb(59 130 246);
```

### 字体系统
```css
/* 中文显示字体 */
--font-family-display-zh: "PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;

/* 中文正文字体 */
--font-family-serif-zh: "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif;

/* 英文无衬线字体 */
--font-family-sans: system-ui, -apple-system, sans-serif;

/* 等宽字体 */
--font-family-mono: "SF Mono", "Monaco", "Cascadia Code", monospace;
```

### 间距系统
```css
/* 间距令牌 */
--spacing-xs: 0.25rem;    /* 4px */
--spacing-sm: 0.5rem;     /* 8px */
--spacing-md: 1rem;       /* 16px */
--spacing-lg: 1.5rem;     /* 24px */
--spacing-xl: 2rem;       /* 32px */
--spacing-2xl: 3rem;      /* 48px */
```

## 组件架构

### 组件分层
```
src/components/
├── common/          # 通用基础组件
│   ├── ModernButton/
│   ├── DataTable/
│   ├── LoadingScreen/
│   └── ...
├── employee/        # 员工管理组件
├── payroll/         # 薪资管理组件
└── layouts/         # 布局组件
```

### 组件设计原则
1. **单一职责**: 每个组件只负责一个功能
2. **可复用性**: 通过props支持不同变体
3. **可组合性**: 支持组件嵌套和组合
4. **类型安全**: 完整的TypeScript类型定义

## 交互模式

### 状态反馈
- **加载状态**: 骨架屏、加载指示器
- **成功状态**: 绿色提示、成功动画
- **错误状态**: 红色警告、错误说明
- **空状态**: 友好的插图和引导

### 动画系统
- **进入动画**: fade-in、slide-in、scale-in
- **退出动画**: fade-out、slide-out、scale-out
- **状态变化**: 平滑的颜色和大小过渡
- **微交互**: 按钮点击、悬停效果

### 响应式设计
- **断点系统**: xs(0px), sm(640px), md(768px), lg(1024px), xl(1280px)
- **流式布局**: 基于百分比和fr单位
- **自适应组件**: 根据屏幕大小调整行为
- **触摸优化**: 44px最小触摸区域

## 主题系统

### 明暗主题
- **浅色主题**: 默认主题，适合日间使用
- **深色主题**: 护眼主题，适合夜间使用
- **自动切换**: 根据系统偏好自动切换
- **手动控制**: 用户可手动选择主题

### 主题定制
```css
/* 主题变量 */
[data-theme="light"] {
  --color-base-100: rgb(255 255 255);
  --color-base-200: rgb(248 250 252);
  --color-base-300: rgb(226 232 240);
  --color-base-content: rgb(15 23 42);
}

[data-theme="dark"] {
  --color-base-100: rgb(15 23 42);
  --color-base-200: rgb(30 41 59);
  --color-base-300: rgb(51 65 85);
  --color-base-content: rgb(248 250 252);
}
```

## 国际化支持

### 多语言
- **中文**: 默认语言，针对中文用户优化
- **英文**: 支持英文界面
- **动态切换**: 运行时语言切换
- **RTL支持**: 为阿拉伯语等RTL语言预留

### 本地化
- **日期格式**: 根据地区显示日期
- **数字格式**: 千分位分隔符
- **货币格式**: 支持不同货币符号
- **时区处理**: 自动时区转换

## 工具链

### 开发工具
- **Vite**: 快速的构建工具
- **TypeScript**: 类型安全
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化

### 设计工具
- **Figma**: 设计稿和组件库
- **Storybook**: 组件展示和文档
- **Chromatic**: 视觉测试
- **Design Tokens**: 设计令牌同步

## 质量保证

### 测试策略
- **单元测试**: Jest + React Testing Library
- **集成测试**: 端到端场景测试
- **视觉测试**: 回归测试
- **性能测试**: 渲染性能监控

### 代码质量
- **TypeScript严格模式**: 类型安全
- **ESLint规则**: 代码规范
- **Prettier配置**: 代码格式
- **Husky钩子**: 提交前检查