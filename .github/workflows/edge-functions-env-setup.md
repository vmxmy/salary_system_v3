# Supabase Edge Functions 环境配置指南

## 🔐 必需的 GitHub Secrets

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加以下密钥：

### 核心配置密钥

```bash
# Supabase 访问令牌
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase 项目 ID
SUPABASE_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxx

# Supabase 数据库密码 (可选，用于高级功能)
SUPABASE_DB_PASSWORD=your_secure_database_password
```

## 📋 获取配置值的方法

### 1. Supabase Access Token
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 点击右上角头像 > Account Settings
3. 进入 "Access Tokens" 标签页
4. 点击 "Generate new token"
5. 为令牌命名（如: "GitHub Actions CI/CD"）
6. 复制生成的令牌（以 `sbp_` 开头）

### 2. Supabase Project ID
1. 在 Supabase Dashboard 中选择你的项目
2. 进入 Settings > General
3. 在 "Project details" 部分找到 "Reference ID"
4. 这就是你的 Project ID

### 3. Database Password
1. 在 Supabase Dashboard 中进入 Settings > Database
2. 找到 "Database password" 部分
3. 如果需要重置密码，点击 "Reset database password"

## 🛠️ 本地开发环境配置

### 设置本地 Supabase CLI

```bash
# 安装 Supabase CLI
npm install supabase -g
# 或者使用其他包管理器
brew install supabase/tap/supabase

# 登录 Supabase
supabase login

# 链接到你的项目
supabase link --project-ref YOUR_PROJECT_ID
```

### 本地测试 Edge Functions

```bash
# 启动本地 Supabase 环境
supabase start

# 本地部署函数
supabase functions serve ai-agent

# 测试函数
curl -i --location --request POST 'http://localhost:54321/functions/v1/ai-agent' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"query": "test message", "sessionId": "test-session"}'
```

## 🔄 环境配置验证

### GitHub Actions 验证脚本

创建以下验证脚本来确保环境配置正确：

```yaml
name: ✅ Validate Supabase Configuration

on:
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: 🔧 Setup Supabase CLI
        uses: supabase/setup-cli@v1
      
      - name: 🔐 Test Authentication
        run: |
          echo "${{ secrets.SUPABASE_ACCESS_TOKEN }}" | supabase login --token
          supabase projects list
        
      - name: ✅ Verify Project Access
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
          echo "✅ Configuration validated successfully!"
```

## 🚨 安全注意事项

### 1. 令牌安全
- ⚠️ 永远不要在代码中硬编码访问令牌
- 🔄 定期轮换访问令牌
- 🔒 使用具有最小权限的令牌

### 2. 项目权限
- 确保 GitHub Actions 只能访问必要的 Supabase 资源
- 考虑为不同环境使用不同的项目

### 3. 审计和监控
- 定期检查 Supabase 审计日志
- 监控异常的函数部署活动

## 🏷️ 环境标签配置

GitHub 仓库设置环境以支持不同的部署阶段：

### Production 环境
```yaml
Environment name: production
Environment protection rules: 
  - Required reviewers: [your-team]
  - Restrict pushes to protected branches: main
```

### Staging 环境
```yaml
Environment name: staging  
Environment protection rules:
  - Restrict pushes to protected branches: develop
```

## 📞 故障排除

### 常见错误和解决方案

#### 1. Authentication Failed
```
错误: Invalid access token
解决: 
1. 检查 SUPABASE_ACCESS_TOKEN 是否正确
2. 确认令牌未过期
3. 重新生成访问令牌
```

#### 2. Project Not Found
```
错误: Project with ref 'xyz' not found
解决:
1. 验证 SUPABASE_PROJECT_ID 是否正确
2. 确认令牌有访问该项目的权限
```

#### 3. Function Deployment Failed
```
错误: Function deployment failed
解决:
1. 检查函数代码语法
2. 验证 deno.json 配置
3. 检查函数依赖是否正确
```

### 调试命令

```bash
# 检查 CLI 版本
supabase --version

# 列出可访问的项目
supabase projects list

# 检查当前项目状态
supabase status

# 查看函数日志
supabase functions logs ai-agent
```

## 🔗 相关链接

- [Supabase CLI 文档](https://supabase.com/docs/reference/cli)
- [Edge Functions 文档](https://supabase.com/docs/guides/functions)
- [GitHub Actions Supabase 集成](https://github.com/supabase/setup-cli)
- [Supabase Dashboard](https://app.supabase.com)