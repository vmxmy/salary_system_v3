# CI/CD 部署配置指南

## 🚀 快速开始

这个项目使用 GitHub Actions 进行自动化 CI/CD 部署，支持多种部署方式：
- GitHub Pages（免费静态托管）
- Vercel（推荐，专为前端优化）
- 其他静态托管平台

## 📋 必需的环境变量配置

### 1. Supabase 配置
在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_PROJECT_REF=your-project-ref
```

### 2. Vercel 配置（如果使用 Vercel 部署）
```
VERCEL_TOKEN=your-vercel-token
ORG_ID=your-org-id
PROJECT_ID=your-project-id
```

### 3. 如何获取这些密钥

#### Supabase 密钥获取：
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 Settings → API
4. 复制 Project URL 和 anon public key
5. 在 Settings → Access Tokens 创建访问令牌

#### Vercel 配置获取：
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 在 Settings → Tokens 创建访问令牌
3. 项目设置中找到 Project ID 和 Team ID

## 🔧 部署平台配置

### GitHub Pages 部署
1. 在仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 推送到 main 分支即可自动部署

### Vercel 部署
1. 在 Vercel 导入 GitHub 仓库
2. 设置构建配置：
   - Framework Preset: Vite
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
3. 在环境变量中添加 Supabase 配置

### Netlify 部署
1. 连接 GitHub 仓库
2. 设置构建配置：
   - Base Directory: `frontend`
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. 添加环境变量

## 🚦 工作流程说明

### 主要工作流程

1. **ci-cd.yml** - 主要的 CI/CD 流程
   - 代码质量检查（ESLint, TypeScript）
   - 构建应用
   - 部署到 GitHub Pages 和 Vercel
   - 更新 Supabase 数据库

2. **pr-checks.yml** - Pull Request 检查
   - 安全扫描
   - 依赖检查
   - 构建测试
   - Bundle 大小分析

3. **deploy-production.yml** - 生产环境部署
   - 手动触发或发布时自动触发
   - 支持分阶段部署
   - 包含数据库迁移

### 分支策略
- `main` - 生产环境，自动部署
- `develop` - 开发环境，运行测试但不部署
- `feature/*` - 功能分支，仅运行 PR 检查

## 🔍 监控和调试

### 构建状态监控
在 README.md 中添加状态徽章：
```markdown
![CI/CD Status](https://github.com/your-username/your-repo/workflows/CI/CD%20Pipeline/badge.svg)
```

### 常见问题解决

#### 构建内存不足
```yml
- name: Build with limited memory
  run: NODE_OPTIONS='--max-old-space-size=1400' npm run build
```

#### Supabase 连接失败
检查环境变量是否正确设置，确保 Supabase 项目状态正常。

#### Vercel 部署失败
确保 Vercel 项目配置正确，检查构建日志中的具体错误信息。

## 🔐 安全最佳实践

1. **敏感信息管理**
   - 所有 API 密钥存储在 GitHub Secrets
   - 前端环境变量使用 `VITE_` 前缀
   - 定期轮换访问令牌

2. **分支保护规则**
   - 要求 PR 通过所有检查
   - 要求代码审查
   - 限制 main 分支直接推送

3. **依赖安全**
   - 定期运行 `npm audit`
   - 使用 Trivy 进行容器扫描
   - 启用 Dependabot 自动更新

## 📊 性能优化

### 构建优化
- 使用 `npm ci` 而不是 `npm install`
- 启用构建缓存
- 分离构建和部署步骤

### 部署优化
- 使用 CDN 加速
- 启用 gzip 压缩
- 配置适当的缓存策略

## 📝 部署清单

部署前请确保：

- [ ] 所有环境变量已正确配置
- [ ] Supabase 项目状态正常
- [ ] 代码通过所有测试
- [ ] 数据库迁移文件已准备
- [ ] 生产环境域名已配置
- [ ] SSL 证书已启用
- [ ] 监控和日志系统已设置

## 🆘 支持

如果遇到部署问题：
1. 检查 GitHub Actions 日志
2. 验证环境变量配置
3. 确认 Supabase 项目状态
4. 查看部署平台的错误日志

---

**注意**: 首次设置需要手动配置环境变量，后续部署将全自动化。