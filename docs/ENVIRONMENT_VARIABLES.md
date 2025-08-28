# 环境变量配置清单

## 概述

本文档提供了 Salary System V3 项目所需的完整环境变量配置清单。这些变量分为前端本地开发、GitHub Actions 部署和服务器运行三个层面。

## 📋 环境变量分类

### 🔧 GitHub Actions Environment Secrets (github-pages 环境)

这些密钥配置在 GitHub 仓库的 **Environments → github-pages** 中，用于 CI/CD 部署流程。

#### Docker Hub 集成
| 变量名 | 类型 | 必需 | 描述 | 示例值 |
|--------|------|------|------|---------|
| `DOCKERHUB_TOKEN` | Secret | ✅ 是 | Docker Hub 访问令牌 | `dckr_pat_xxx...` |
| `DOCKER_USERNAME` | Secret | ✅ 是 | Docker Hub 用户名 | `myusername` |
| `DOCKER_PASSWORD` | Secret | ❓ 可选 | Docker Hub 密码（可用令牌代替） | `mypassword` |

#### 服务器连接配置
| 变量名 | 类型 | 必需 | 描述 | 示例值 |
|--------|------|------|------|---------|
| `SSH_USER` | Secret | ✅ 是 | SSH 登录用户名 | `root` |
| `SSH_HOST` | Secret | ✅ 是 | 服务器 IP 地址或域名 | `192.168.1.100` |
| `SSH_PRIVATE_KEY` | Secret | ✅ 是 | SSH 私钥内容 | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `SSH_KNOWN_HOSTS` | Secret | ✅ 是 | SSH 服务器指纹 | `192.168.1.100 ssh-rsa AAAA...` |

#### 服务器部署配置
| 变量名 | 类型 | 必需 | 描述 | 示例值 |
|--------|------|------|------|---------|
| `SERVER_DOMAIN` | Secret | ❓ 可选 | 服务器域名（用于健康检查） | `salary.example.com` |
| `SERVER_WEB_ROOT` | Secret | ❓ 可选 | Web 根目录路径（参考用） | `/opt/1panel/apps/openresty/www/sites/gz.gaoxin.net.cn/index` |

#### Supabase 配置
| 变量名 | 类型 | 必需 | 描述 | 示例值 |
|--------|------|------|------|---------|
| `VITE_SUPABASE_URL` | Secret | ✅ 是 | Supabase 项目 URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Secret | ✅ 是 | Supabase 匿名访问密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_ACCESS_TOKEN` | Secret | ❓ 可选 | Supabase 管理访问令牌 | `sbp_xxx...` |
| `SUPABASE_PROJECT_REF` | Secret | ❓ 可选 | Supabase 项目引用 ID | `abcdefghijklmnopqrst` |

### 🌐 前端本地开发环境 (.env.local)

前端开发时在 `frontend/.env.local` 文件中配置：

```bash
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 开发环境配置
NODE_ENV=development
VITE_ENV=development

# 可选：调试配置
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### 🐳 Docker 容器运行时环境

这些环境变量在容器运行时自动设置，无需手动配置：

| 变量名 | 描述 | 默认值 |
|--------|------|---------|
| `NODE_ENV` | Node.js 环境模式 | `production` |
| `PORT` | 容器内部端口 | `3000` |

## 🚀 配置步骤

### 1. GitHub Repository Secrets 配置

1. 进入 GitHub 仓库页面
2. 点击 **Settings** → **Environments**
3. 选择或创建 **github-pages** 环境
4. 添加所有必需的 Environment secrets

### 2. 本地开发环境配置

```bash
# 1. 进入前端目录
cd frontend

# 2. 复制环境变量模板
cp env.local.example .env.local

# 3. 编辑环境变量
nano .env.local

# 4. 填入实际的 Supabase 配置
```

### 3. SSH 密钥配置

#### 生成 SSH 密钥对：
```bash
# 在本地生成密钥对
ssh-keygen -t rsa -b 4096 -C "deployment@salary-system"

# 查看私钥（添加到 SSH_PRIVATE_KEY）
cat ~/.ssh/id_rsa

# 查看公钥（添加到服务器 authorized_keys）
cat ~/.ssh/id_rsa.pub
```

#### 获取服务器指纹：
```bash
# 连接服务器并获取指纹
ssh-keyscan -H your-server-ip
```

### 4. Docker Hub 配置

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 进入 **Account Settings** → **Security** → **Access Tokens**
3. 创建新的访问令牌
4. 将用户名和令牌添加到 GitHub secrets

## 🔍 环境变量验证

### GitHub Actions 验证

工作流会自动验证关键环境变量：

```yaml
# 验证脚本示例
- name: Validate deployment configuration
  run: |
    echo "🔍 验证部署配置..."
    
    if [ -z "${{ secrets.SSH_USER }}" ]; then
      echo "❌ SSH_USER secret 未配置"
      exit 1
    fi
    
    if [ -z "${{ secrets.DOCKER_USERNAME }}" ]; then
      echo "❌ DOCKER_USERNAME secret 未配置"
      exit 1
    fi
    
    echo "✅ 配置验证通过"
```

### 本地验证

在本地开发环境验证配置：

```bash
# 检查环境变量文件
cat frontend/.env.local

# 启动开发服务器测试
cd frontend
npm run dev
```

### 服务器验证

在服务器上验证 Docker 和网络配置：

```bash
# 检查 Docker 状态
docker --version
systemctl status docker

# 测试网络连接
curl -I http://localhost:3001

# 查看容器状态
docker ps | grep salary-system
```

## ⚠️ 安全注意事项

### 1. 密钥安全
- ✅ **绝不** 将敏感信息提交到代码库
- ✅ 使用 GitHub Environment secrets 而不是 Repository secrets
- ✅ 定期轮换 API 密钥和访问令牌
- ✅ 限制 SSH 密钥的访问权限

### 2. 环境隔离
- ✅ 开发、测试、生产环境使用不同的 Supabase 项目
- ✅ 使用不同的 Docker Hub 命名空间或标签
- ✅ 服务器访问权限最小化原则

### 3. 监控和审计
- ✅ 启用 GitHub Actions 日志记录
- ✅ 监控 Docker Hub 镜像拉取次数
- ✅ 定期检查服务器访问日志

## 🔧 故障排除

### 常见问题

#### 1. SSH 连接失败
```bash
# 问题：SSH_PRIVATE_KEY 格式错误
# 解决：确保私钥包含完整的头尾标识
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

#### 2. Docker 登录失败
```bash
# 问题：DOCKERHUB_TOKEN 无效
# 解决：检查令牌是否过期，重新生成
echo $DOCKERHUB_TOKEN | docker login --username $DOCKER_USERNAME --password-stdin
```

#### 3. Supabase 连接错误
```bash
# 问题：VITE_SUPABASE_URL 或密钥错误
# 解决：检查 Supabase 项目设置中的 API 配置
```

#### 4. 容器健康检查失败
```bash
# 问题：应用启动时间过长
# 解决：增加健康检查的 start-period
--health-start-period=60s
```

### 调试命令

```bash
# 查看 GitHub Actions 运行日志
# 进入 GitHub → Actions → 选择工作流 → 查看日志

# 服务器端调试
docker logs salary-system-v3 -f
docker exec -it salary-system-v3 sh
docker inspect salary-system-v3

# 网络调试
curl -I http://your-server:3001
telnet your-server 3001
```

## 📚 相关文档

- [Docker 部署指南](./DOCKER_DEPLOYMENT_GUIDE.md)
- [GitHub Actions 工作流](./.github/workflows/deploy-docker.yml)
- [Supabase 官方文档](https://supabase.com/docs)
- [Docker Hub 官方文档](https://docs.docker.com/docker-hub/)

## 📞 支持

如果在配置环境变量时遇到问题：

1. 查看本文档的故障排除部分
2. 检查 GitHub Actions 运行日志
3. 验证所有必需的环境变量都已正确配置
4. 确认 SSH 连接和 Docker 服务正常运行

---

**🔒 安全提醒**: 请妥善保管所有密钥和令牌，定期更新访问凭据，遵循最佳安全实践。