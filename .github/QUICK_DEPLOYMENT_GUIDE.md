# 🚀 CI/CD 快速部署指南

## ✅ 构建验证完成
您的项目构建测试已通过！项目已准备好进行 CI/CD 部署。

## 📋 部署前检查清单

### 1. GitHub 仓库设置
- [ ] 代码已推送到 GitHub 仓库
- [ ] 确保仓库可见性设置正确（私有/公有）

### 2. 必需的 GitHub Secrets 配置

在 **GitHub 仓库 → Settings → Secrets and variables → Actions** 中添加：

#### Supabase 配置 (必需)
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_PROJECT_REF=your-project-ref
```

#### Vercel 配置 (推荐)
```
VERCEL_TOKEN=your-vercel-token
ORG_ID=your-org-id
PROJECT_ID=your-project-id
```

## 🎯 推荐的部署方案

### 方案 1: Vercel (推荐) 
**最适合 React + Supabase 架构**

1. **准备工作**:
   ```bash
   # 安装 Vercel CLI (可选)
   npm i -g vercel
   ```

2. **配置步骤**:
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 导入您的 GitHub 仓库
   - 设置构建配置:
     - Framework Preset: **Vite**
     - Build Command: `cd frontend && npm run build`
     - Output Directory: `frontend/dist`
     - Root Directory: 留空

3. **环境变量**:
   在 Vercel 项目设置中添加:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **自动部署**:
   - 推送到 `main` 分支将自动触发部署
   - GitHub Actions 也会同时部署到 Vercel

### 方案 2: GitHub Pages (免费)
**适合演示和测试环境**

1. **启用 GitHub Pages**:
   - 仓库 Settings → Pages
   - Source 选择 "GitHub Actions"

2. **自动部署**:
   - 推送到 `main` 分支自动部署
   - 访问: `https://your-username.github.io/your-repo-name`

### 方案 3: Netlify (备选)
**功能丰富的替代方案**

1. **连接仓库**:
   - 访问 [Netlify](https://netlify.com)
   - 连接 GitHub 仓库

2. **构建设置**:
   - Base Directory: `frontend`
   - Build Command: `npm run build`
   - Publish Directory: `dist`

## 🔄 工作流程说明

### 自动化流程
1. **代码推送** → GitHub 仓库
2. **触发 CI/CD** → GitHub Actions 开始执行
3. **质量检查** → ESLint, TypeScript 检查
4. **构建应用** → 生成生产版本
5. **自动部署** → 部署到配置的平台
6. **数据库同步** → 应用 Supabase 迁移

### 分支策略
- `main` → 生产环境 (自动部署)
- `develop` → 开发环境 (仅构建测试)
- `feature/*` → 功能分支 (PR 检查)

## ⚡ 立即开始部署

### Step 1: 推送代码到 GitHub
```bash
# 如果还未创建 Git 仓库
git init
git add .
git commit -m "feat: 配置 CI/CD 部署管道"

# 添加远程仓库 (替换为您的仓库地址)
git remote add origin https://github.com/your-username/your-repo-name.git
git push -u origin main
```

### Step 2: 配置 GitHub Secrets
1. 访问仓库 Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 逐个添加上述必需的 secrets

### Step 3: 触发部署
```bash
# 推送代码将自动触发部署
git push origin main
```

### Step 4: 监控部署
- 在 GitHub 仓库的 "Actions" 标签查看部署进度
- 部署成功后，您的应用将在配置的平台上线

## 🛡️ 安全最佳实践

### 环境变量安全
- ✅ 所有敏感信息存储在 GitHub Secrets
- ✅ 前端环境变量使用 `VITE_` 前缀
- ✅ 定期轮换 API 密钥和访问令牌

### 分支保护
建议设置分支保护规则:
1. 仓库 Settings → Branches
2. 添加保护规则到 `main` 分支:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date

## 🐛 常见问题解决

### 构建失败
```bash
# 本地测试构建
cd frontend && npm run build

# 检查 TypeScript 错误
npx tsc --noEmit

# 检查 ESLint 问题
npm run lint
```

### 环境变量问题
- 确保 Supabase 项目状态为 "Active"
- 验证 API 密钥是否有效
- 检查环境变量名称拼写

### 部署平台问题
- **Vercel**: 检查项目设置和构建日志
- **GitHub Pages**: 确保启用了 Pages 功能
- **Netlify**: 验证构建命令和发布目录

## 📊 部署成功验证

部署完成后，验证以下功能:
- [ ] 应用正常加载
- [ ] 用户认证功能正常
- [ ] 数据库连接正常
- [ ] 页面路由工作正常
- [ ] 响应式设计正常

## 🎉 恭喜！

您的 CI/CD 管道已配置完成！现在每次推送代码到 `main` 分支都会自动:
- ✅ 运行代码质量检查
- ✅ 构建生产版本
- ✅ 部署到生产环境
- ✅ 同步数据库变更

---

**需要帮助?** 检查 `.github/DEPLOYMENT_SETUP.md` 获取详细配置说明。