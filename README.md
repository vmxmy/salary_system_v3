# 薪资管理系统 v3

[![CI/CD Pipeline](https://github.com/your-username/your-repo/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/your-username/your-repo/actions)
[![Deploy Status](https://img.shields.io/badge/Deploy-Ready-brightgreen.svg)](https://github.com/your-username/your-repo)

基于 **React 19 + Supabase + DaisyUI 5 + TailwindCSS 4** 的现代化薪资管理系统，采用 Serverless 架构设计。

## 🚀 快速开始

### 本地开发
```bash
# 前端开发
cd frontend
npm install
npm run dev

# Supabase 本地开发
cd supabase
supabase start
```

### 🔧 部署配置

本项目已配置完整的 CI/CD 管道，支持以下部署方式：

- **GitHub Pages** - 免费静态托管
- **Vercel** - 推荐方案，最适合 React 应用
- **Netlify** - 功能丰富的替代方案

### 📋 部署前检查
- [ ] 配置 GitHub Secrets (Supabase 密钥)
- [ ] 选择部署平台
- [ ] 推送代码到 main 分支

## 🏗️ 技术架构

### 前端技术栈
- **React 19** - 最新的 React 版本
- **TypeScript 5.8** - 严格类型检查
- **Vite 7** - 极速构建工具
- **DaisyUI 5** - 基于 TailwindCSS 的组件库
- **TailwindCSS 4** - 实用优先的 CSS 框架

### 后端技术栈
- **Supabase** - 完整的后端即服务 (BaaS)
- **PostgreSQL** - 数据库
- **Edge Functions** - Serverless 函数
- **Row Level Security** - 数据安全

### 开发工具
- **GitHub Actions** - CI/CD 自动化
- **ESLint + TypeScript** - 代码质量保证
- **i18next** - 国际化支持

## 📦 项目结构

```
v3/
├── frontend/                   # React 前端应用
│   ├── src/
│   │   ├── components/         # 可复用组件
│   │   ├── pages/             # 页面组件
│   │   ├── hooks/             # 自定义 hooks
│   │   └── types/             # TypeScript 类型
├── supabase/                   # Supabase 配置
│   ├── functions/             # Edge Functions
│   └── migrations/            # 数据库迁移
├── .github/                    # CI/CD 配置
│   └── workflows/             # GitHub Actions
├── vercel.json                 # Vercel 配置
└── netlify.toml               # Netlify 配置
```

## 🔄 CI/CD 工作流程

### 自动化流程
1. **代码推送** → GitHub 仓库
2. **质量检查** → ESLint + TypeScript 检查
3. **应用构建** → 生成优化后的生产版本
4. **自动部署** → 部署到配置的平台
5. **数据库同步** → 应用 Supabase 迁移

### 分支策略
- `main` - 生产环境，自动部署
- `develop` - 开发环境，仅构建测试
- `feature/*` - 功能分支，PR 检查

## 🛡️ 安全特性

- **Row Level Security** - 数据库级别的安全控制
- **JWT 认证** - 无状态身份验证
- **环境变量管理** - 敏感信息安全存储
- **HTTPS 强制** - 所有通信加密
- **CSP 头部** - 内容安全策略

## 📈 性能优化

- **代码分割** - 按需加载减少初始包大小
- **构建优化** - Vite 的极速构建
- **CDN 缓存** - 静态资源全球加速
- **图片优化** - 响应式图片加载
- **数据预取** - React Query 智能缓存

## 🌐 部署选项

### 推荐方案: Vercel
```bash
# 一键部署到 Vercel
npx vercel --prod
```

### GitHub Pages
- 推送到 `main` 分支自动部署
- 访问: `https://your-username.github.io/your-repo`

### Netlify
- 连接 GitHub 仓库自动部署
- 支持表单处理和函数

## 📚 文档链接

- [快速部署指南](.github/QUICK_DEPLOYMENT_GUIDE.md)
- [详细配置说明](.github/DEPLOYMENT_SETUP.md)
- [Supabase 文档](https://supabase.com/docs)
- [DaisyUI 组件](https://daisyui.com/components/)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 开源协议

本项目基于 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

🎯 **准备就绪！** 推送代码到 GitHub 即可开始自动部署。