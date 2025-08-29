# 🚀 Supabase Edge Functions 自动部署指南

本指南介绍如何使用自动化工作流来部署和管理 Supabase Edge Functions。

## 📋 目录

- [快速开始](#快速开始)
- [工作流概览](#工作流概览)
- [环境配置](#环境配置)
- [自动部署](#自动部署)
- [本地部署](#本地部署)
- [测试和验证](#测试和验证)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

## 🚀 快速开始

### 1. 配置 GitHub Secrets

在 GitHub 仓库中添加以下必需的密钥：

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxx
SUPABASE_DB_PASSWORD=your_secure_database_password  # 可选
```

### 2. 触发自动部署

#### 方式一：推送代码（推荐）
```bash
# 修改 Edge Function 代码
vim supabase/functions/ai-agent/index.ts

# 提交变更
git add supabase/functions/
git commit -m "feat: update ai-agent function"
git push origin main  # 部署到生产环境
# 或
git push origin develop  # 部署到测试环境
```

#### 方式二：手动触发
1. 进入 GitHub 仓库的 "Actions" 标签页
2. 选择 "🚀 Deploy Supabase Edge Functions" 工作流
3. 点击 "Run workflow"
4. 选择部署选项并执行

### 3. 验证部署结果

部署完成后，检查函数是否正常运行：
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-agent
```

## 🔄 工作流概览

我们的自动部署系统包含以下组件：

### GitHub Actions 工作流
- **文件位置**: `.github/workflows/deploy-edge-functions.yml`
- **触发条件**:
  - Push 到 `main` 或 `develop` 分支且修改了 `supabase/functions/` 目录
  - Pull Request 到 `main` 分支
  - 手动触发 (workflow_dispatch)

### 工作流阶段

1. **🔍 变更检测**: 智能检测哪些 Edge Functions 发生了变更
2. **✅ 代码验证**: TypeScript/JavaScript 语法检查和测试
3. **🚀 自动部署**: 部署到 Supabase 平台
4. **🧪 健康检查**: 验证部署后的函数可用性
5. **📢 结果通知**: 生成部署报告和通知

### 部署策略

- **生产环境** (`main` 分支): 需要代码审查，自动部署到生产项目
- **测试环境** (`develop` 分支): 自动部署，快速迭代

## ⚙️ 环境配置

### GitHub Secrets 配置

详细配置说明请参考 [环境配置指南](.github/workflows/edge-functions-env-setup.md)。

### 本地开发环境

```bash
# 1. 安装 Supabase CLI
npm install -g supabase

# 2. 登录 Supabase
supabase login

# 3. 设置项目环境变量
export SUPABASE_PROJECT_ID=your_project_id

# 4. 链接项目（可选，用于本地开发）
supabase link --project-ref $SUPABASE_PROJECT_ID
```

## 🤖 自动部署

### 触发条件

自动部署会在以下情况下触发：

1. **代码推送**
   ```bash
   # 修改函数后提交
   git add supabase/functions/ai-agent/index.ts
   git commit -m "feat: improve AI agent response handling"
   git push origin main
   ```

2. **Pull Request**
   - 创建 PR 时自动验证和测试
   - 合并到 `main` 分支时自动部署到生产环境

3. **手动触发**
   - 在 GitHub Actions 中手动运行工作流
   - 可指定特定函数或强制部署所有函数

### 部署选项

#### 智能部署（默认）
- 自动检测变更的函数
- 只部署修改过的函数
- 提高部署效率

#### 强制部署
- 部署所有函数，忽略变更检测
- 用于环境同步或故障恢复

#### 指定函数部署
- 只部署特定的函数
- 适用于紧急修复或测试

### 部署环境

| 分支 | 环境 | 描述 |
|------|------|------|
| `main` | Production | 生产环境，需要代码审查 |
| `develop` | Staging | 测试环境，快速迭代 |

## 🛠️ 本地部署

使用我们提供的部署脚本进行本地部署：

### 基本用法

```bash
# 部署单个函数到测试环境
./scripts/deploy-functions.sh ai-agent staging

# 部署所有函数到生产环境
./scripts/deploy-functions.sh all production

# 强制重新部署
./scripts/deploy-functions.sh ai-agent staging --force

# 模拟部署（不实际执行）
./scripts/deploy-functions.sh ai-agent staging --dry-run
```

### 脚本功能

- ✅ **依赖检查**: 验证 Supabase CLI 和环境配置
- 🔐 **认证验证**: 确保 Supabase 认证有效
- 📝 **代码验证**: TypeScript/JavaScript 语法检查
- 🚀 **智能部署**: 支持单个或批量函数部署
- 🧪 **健康检查**: 部署后自动验证函数可用性
- 📊 **报告生成**: 生成详细的部署报告

### 部署报告

每次部署都会生成详细的报告：

```markdown
# Edge Functions 部署报告

## 部署信息
- **时间**: 2024-01-15 14:30:25
- **环境**: production
- **项目ID**: abcdef123456
- **部署者**: developer

## 部署结果
- ✅ 成功部署 1 个函数

### 已部署函数
- 🟢 **ai-agent**: [https://abcdef123456.supabase.co/functions/v1/ai-agent]
```

## 🧪 测试和验证

### 自动化测试

工作流包含以下自动化测试：

1. **语法验证**: 使用 Deno 检查 TypeScript/JavaScript 语法
2. **配置验证**: 验证 `deno.json` 格式
3. **部署测试**: 确保函数成功部署到 Supabase
4. **健康检查**: 验证函数响应 CORS 预检请求

### 手动测试

使用提供的测试脚本：

```bash
# 测试所有函数
./scripts/test-functions.sh

# 测试特定环境
SUPABASE_PROJECT_ID=your_project_id ./scripts/test-functions.sh
```

### API 测试示例

```bash
# AI Agent 函数基本测试
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-agent" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "测试消息",
    "sessionId": "test-session-123"
  }'
```

## 🚨 故障排除

### 常见问题

#### 1. 认证失败
```
错误: Invalid access token
解决方案:
1. 检查 SUPABASE_ACCESS_TOKEN 是否正确
2. 重新生成访问令牌
3. 验证令牌权限
```

#### 2. 项目链接失败
```
错误: Project with ref 'xyz' not found
解决方案:
1. 验证 SUPABASE_PROJECT_ID 是否正确
2. 检查令牌是否有访问该项目的权限
3. 确认项目存在且活跃
```

#### 3. 函数部署失败
```
错误: Function deployment failed
解决方案:
1. 检查函数代码语法错误
2. 验证 deno.json 配置
3. 确认函数入口文件存在 (index.ts/index.js)
4. 查看 Supabase 项目日志
```

#### 4. CORS 错误
```
错误: CORS policy blocks the request
解决方案:
1. 检查函数是否正确设置 CORS 头
2. 验证 Origin 配置
3. 确认预检请求处理逻辑
```

### 调试技巧

1. **启用详细日志**
   ```bash
   ./scripts/deploy-functions.sh ai-agent staging --verbose
   ```

2. **使用模拟部署**
   ```bash
   ./scripts/deploy-functions.sh ai-agent staging --dry-run
   ```

3. **检查 Supabase 日志**
   ```bash
   supabase functions logs ai-agent
   ```

4. **验证环境配置**
   ```bash
   supabase projects list
   supabase link --project-ref $SUPABASE_PROJECT_ID
   ```

## 📚 最佳实践

### 代码组织

1. **函数结构**
   ```
   supabase/functions/
   ├── ai-agent/
   │   ├── index.ts          # 主入口文件
   │   ├── deno.json         # Deno 配置
   │   └── test.ts           # 测试文件（可选）
   └── shared/               # 共享代码
       └── utils.ts
   ```

2. **配置管理**
   - 使用环境变量管理敏感信息
   - 在 `deno.json` 中声明依赖
   - 遵循 Supabase Edge Functions 最佳实践

### 开发流程

1. **功能开发**
   ```bash
   # 1. 创建功能分支
   git checkout -b feature/improve-ai-agent
   
   # 2. 本地开发和测试
   supabase functions serve ai-agent
   
   # 3. 代码提交
   git add supabase/functions/ai-agent/
   git commit -m "feat: improve AI agent response accuracy"
   ```

2. **测试验证**
   ```bash
   # 1. 推送到测试分支
   git push origin feature/improve-ai-agent
   
   # 2. 创建 Pull Request
   # 3. 等待自动化测试通过
   # 4. 代码审查
   ```

3. **生产部署**
   ```bash
   # 1. 合并到 main 分支
   git checkout main
   git merge feature/improve-ai-agent
   git push origin main
   
   # 2. 自动部署到生产环境
   # 3. 验证部署结果
   ```

### 安全考虑

1. **访问控制**
   - 使用最小权限原则配置访问令牌
   - 定期轮换 API 密钥
   - 实施适当的认证和授权

2. **代码安全**
   - 不在代码中硬编码敏感信息
   - 使用环境变量管理配置
   - 定期更新依赖项

3. **监控和审计**
   - 启用 Supabase 审计日志
   - 监控函数调用频率和错误率
   - 设置适当的告警机制

### 性能优化

1. **函数优化**
   - 最小化冷启动时间
   - 优化依赖项加载
   - 使用适当的缓存策略

2. **部署优化**
   - 使用智能变更检测
   - 批量部署相关函数
   - 避免不必要的重复部署

## 📞 支持和反馈

### 获取帮助

1. **查看文档**
   - [Supabase Edge Functions 官方文档](https://supabase.com/docs/guides/functions)
   - [部署脚本帮助](scripts/deploy-functions.sh --help)

2. **检查日志**
   - GitHub Actions 工作流日志
   - Supabase 函数执行日志
   - 本地部署脚本输出

3. **社区支持**
   - Supabase Discord 社区
   - GitHub Issues
   - Stack Overflow

### 贡献指南

欢迎提交改进建议和bug报告：

1. Fork 本仓库
2. 创建功能分支
3. 提交改进
4. 创建 Pull Request

---

**注意**: 本指南基于 Supabase CLI 最新版本编写。如果遇到问题，请确保您使用的是最新版本的 CLI 工具。