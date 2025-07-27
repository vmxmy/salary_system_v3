# 薪资管理系统 - 组件库文档

## 概述

本文档提供了薪资管理系统前端组件库的完整使用指南。我们的组件库基于现代化设计原则，采用 React 19 + TypeScript 5.8 + Tailwind CSS 4 + DaisyUI 5 技术栈构建。

## 核心特性

✨ **现代化设计**: 基于孔雀屏设计模式，提供优雅的用户界面  
🚀 **高性能**: 硬件加速动画，优化的渲染性能  
📱 **响应式**: 移动优先的自适应设计  
🎨 **主题化**: 完整的设计令牌系统  
♿ **可访问性**: 遵循 WCAG 2.1 标准  
🧩 **模块化**: 组件解耦，易于维护和扩展  

## 目录结构

```
docs/
├── README.md                 # 总览文档
├── design-system/           # 设计系统文档
│   ├── overview.md          # 设计系统概述
│   ├── design-tokens.md     # 设计令牌
│   ├── typography.md        # 排版系统
│   ├── colors.md           # 颜色系统
│   └── spacing.md          # 间距系统
├── components/             # 组件文档
│   ├── common/            # 通用组件
│   │   ├── ModernButton.md
│   │   ├── DataTable.md
│   │   ├── LoadingScreen.md
│   │   ├── AccordionSection.md
│   │   ├── FinancialCard.md
│   │   └── MonthPicker.md
│   ├── employee/          # 员工管理组件
│   │   └── EmployeeDetailModal.md
│   └── payroll/           # 薪资管理组件
│       └── PayrollDetailModal.md
├── styles/                # 样式系统文档
│   ├── modern-effects.md  # 现代化效果
│   ├── performance.md     # 性能优化
│   └── responsive.md      # 响应式设计
├── patterns/              # 设计模式文档
│   ├── peacock-screen.md  # 孔雀屏模式
│   ├── modal-patterns.md  # 模态框模式
│   └── data-display.md    # 数据展示模式
└── guides/               # 使用指南
    ├── getting-started.md # 快速开始
    ├── development.md     # 开发指南
    ├── testing.md         # 测试指南
    └── deployment.md      # 部署指南
```

## 技术栈

### 核心技术
- **React 19**: 最新的 React 版本，支持并发特性
- **TypeScript 5.8**: 严格的类型检查和增强的开发体验
- **Vite 7**: 快速的构建工具和热模块替换
- **Tailwind CSS 4**: 实用工具优先的 CSS 框架
- **DaisyUI 5**: 基于 Tailwind CSS 的组件库

### 状态管理
- **TanStack Query**: 服务器状态管理和缓存
- **Zustand**: 客户端状态管理（特定功能）
- **React Context**: 全局状态（认证、主题等）

### 开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Supabase**: 后端即服务平台

## 设计原则

### 1. 孔雀屏设计模式 🦚
我们的核心设计模式，特点包括：
- **分层展示**: 信息按重要性分层显示
- **渐进式披露**: 用户可以逐步深入了解详情
- **视觉层次**: 清晰的视觉引导和信息架构
- **优雅动画**: 流畅的展开收起效果

### 2. 性能优先 ⚡
- **硬件加速**: 使用 GPU 加速的动画和变换
- **虚拟化**: 大数据集的高效渲染
- **懒加载**: 按需加载组件和资源
- **缓存策略**: 智能的数据缓存和更新

### 3. 用户体验 🎯
- **直观导航**: 清晰的信息架构
- **即时反馈**: 实时的状态更新和加载提示
- **错误处理**: 友好的错误提示和恢复机制
- **键盘导航**: 完整的键盘操作支持

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 主要组件概览

### 通用组件
- **ModernButton**: 现代化按钮组件，支持多种变体和状态
- **DataTable**: 高性能数据表格，支持排序、筛选、分页
- **LoadingScreen**: 优雅的加载状态组件
- **AccordionSection**: 手风琴折叠组件
- **FinancialCard**: 金融数据展示卡片
- **MonthPicker**: 月份选择器

### 业务组件
- **EmployeeDetailModal**: 员工详情模态框
- **PayrollDetailModal**: 薪资详情模态框
- **PayrollStatusBadge**: 薪资状态徽章

### 样式系统
- **modern-effects**: 现代化视觉效果
- **performance-animations**: 性能优化的动画
- **typography**: 排版系统
- **design-tokens**: 设计令牌

## 贡献指南

1. **代码规范**: 遵循 ESLint 和 Prettier 配置
2. **组件开发**: 使用 TypeScript 严格模式
3. **文档更新**: 新组件必须包含使用文档
4. **测试覆盖**: 确保组件有相应的测试用例
5. **性能考量**: 使用性能优化的最佳实践

## 更新日志

### v3.0.0 (2025-01-26)
- 🎉 全新的孔雀屏设计系统
- ⚡ 性能优化的动画系统
- 📱 完整的响应式设计
- 🔧 薪资管理模块重构
- 📊 五险一金管理功能

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。

## 联系我们

如有问题或建议，请联系开发团队或提交 Issue。