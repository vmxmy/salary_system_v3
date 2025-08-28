# Docker 容器化部署指南

## 概述

这个指南介绍如何使用 Docker 容器将 Salary System V3 前端部署到私有服务器。与静态文件部署相比，容器化部署提供了更好的隔离性、可移植性和扩展性。

## 系统架构

### 容器化架构优势
- **隔离性**: 应用运行在独立的容器环境中，不影响主机系统
- **可移植性**: 容器可以在任何支持 Docker 的环境中运行
- **版本控制**: 每个部署都是一个明确版本的镜像
- **快速回滚**: 通过切换镜像版本实现秒级回滚
- **资源管控**: 可以限制容器的 CPU 和内存使用
- **健康检查**: 内置健康检查机制，自动重启故障容器

### 技术栈
- **基础镜像**: Node.js 20 Alpine (构建) + Nginx Alpine (运行)
- **Web 服务器**: Nginx (优化配置，支持 SPA 路由)
- **容器引擎**: Docker Engine
- **镜像仓库**: 阿里云容器镜像服务 / Docker Hub
- **部署策略**: 滚动部署 / 蓝绿部署

## 配置步骤

### 1. 服务器环境准备

#### 安装 Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker-compose --version
```

#### 配置防火墙
```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # 容器端口

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 2. GitHub Secrets 配置

在 GitHub 仓库中配置以下 Secrets：

#### SSH 连接配置
```
SSH_PRIVATE_KEY     = SSH 私钥内容
SSH_USER           = SSH 用户名
SSH_HOST           = 服务器 IP/域名
SSH_KNOWN_HOSTS    = SSH 服务器指纹
```

#### 镜像仓库配置 (二选一)

**阿里云容器镜像服务 (推荐):**
```
ALIYUN_REGISTRY_USERNAME = 阿里云用户名
ALIYUN_REGISTRY_PASSWORD = 阿里云密码/访问令牌
```

**Docker Hub:**
```
DOCKERHUB_USERNAME = Docker Hub 用户名
DOCKERHUB_TOKEN   = Docker Hub 访问令牌
```

#### 应用配置
```
VITE_SUPABASE_URL      = Supabase 项目 URL
VITE_SUPABASE_ANON_KEY = Supabase 匿名访问密钥
```

### 3. GitHub Variables 配置 (可选)

```
ALIYUN_REGISTRY = registry.cn-beijing.aliyuncs.com  # 阿里云地域
ENABLE_DOCKER_DEPLOY = true                        # 启用 Docker 部署
```

## 部署策略

### 滚动部署 (默认)
- **优点**: 简单快速，资源占用少
- **缺点**: 短暂的服务中断 (通常 < 30 秒)
- **适用场景**: 开发和测试环境，小规模生产环境

**流程:**
1. 停止当前容器
2. 拉取新镜像
3. 启动新容器
4. 健康检查

### 蓝绿部署
- **优点**: 零停机时间，可快速回滚
- **缺点**: 需要双倍资源 (CPU、内存、存储)
- **适用场景**: 生产环境，对可用性要求高

**流程:**
1. 启动新容器 (绿色环境)
2. 健康检查通过
3. 切换流量到新容器
4. 停止旧容器 (蓝色环境)

## 使用指南

### 触发部署

#### 自动触发
- 推送到 `main` 或 `production` 分支
- 创建新的发布版本

#### 手动触发
1. 进入 GitHub Actions 页面
2. 选择 "Deploy Docker Container to Private Server" 工作流
3. 点击 "Run workflow"
4. 选择部署参数：
   - **部署类型**: rolling (滚动) / blue_green (蓝绿)
   - **镜像仓库**: aliyun (阿里云) / dockerhub (Docker Hub)

### 监控和管理

#### 检查容器状态
```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs salary-system-v3 -f

# 查看容器资源使用
docker stats salary-system-v3

# 进入容器调试
docker exec -it salary-system-v3 sh
```

#### 健康检查
```bash
# HTTP 健康检查
curl -f http://localhost:3000/health

# 容器健康状态
docker inspect salary-system-v3 | grep Health -A 10
```

#### 手动操作
```bash
# 重启容器
docker restart salary-system-v3

# 停止容器
docker stop salary-system-v3

# 删除容器
docker rm salary-system-v3

# 清理未使用镜像
docker image prune -f

# 查看镜像历史
docker images | grep salary-system
```

### 回滚操作

#### 快速回滚到上一个版本
```bash
# 查看可用镜像版本
docker images | grep salary-system-v3

# 回滚到指定版本
docker stop salary-system-v3
docker rm salary-system-v3
docker run -d \
  --name salary-system-v3 \
  --restart unless-stopped \
  -p 80:3000 \
  registry.cn-beijing.aliyuncs.com/salary-system/salary-system-v3:previous-tag
```

#### 通过 GitHub Actions 回滚
1. 进入 Actions 页面
2. 找到要回滚的成功部署
3. 点击 "Re-run all jobs"

## 高级配置

### 反向代理配置

#### Nginx 反向代理
```nginx
upstream salary_app {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://salary_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### SSL/TLS 配置
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://salary_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### Docker Compose 部署 (可选)

创建 `docker-compose.yml`:
```yaml
version: '3.8'

services:
  salary-frontend:
    image: registry.cn-beijing.aliyuncs.com/salary-system/salary-system-v3:latest
    container_name: salary-system-v3
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "com.example.app=salary-system"
      - "com.example.version=3.0"
      
  # 可选：添加监控服务
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 30 --cleanup
```

### 容器资源限制

#### 在部署脚本中添加资源限制
```bash
docker run -d \
  --name salary-system-v3 \
  --restart unless-stopped \
  -p 80:3000 \
  --memory="256m" \
  --memory-swap="512m" \
  --cpus="0.5" \
  --oom-kill-disable=false \
  registry.cn-beijing.aliyuncs.com/salary-system/salary-system-v3:latest
```

### 日志管理

#### 配置日志轮转
```bash
# 创建 Docker daemon 配置
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl reload docker
```

## 故障排除

### 常见问题

#### 1. 容器启动失败
```bash
# 检查容器日志
docker logs salary-system-v3

# 检查镜像是否存在
docker images | grep salary-system

# 检查端口占用
netstat -tulpn | grep :3000
```

#### 2. 健康检查失败
```bash
# 手动测试健康检查
curl -f http://localhost:3000/health

# 检查 Nginx 配置
docker exec salary-system-v3 nginx -t

# 查看 Nginx 错误日志
docker exec salary-system-v3 cat /var/log/nginx/error.log
```

#### 3. 镜像拉取失败
```bash
# 手动登录镜像仓库
docker login registry.cn-beijing.aliyuncs.com

# 检查网络连接
ping registry.cn-beijing.aliyuncs.com

# 检查镜像标签
docker search salary-system-v3
```

#### 4. 部署权限问题
```bash
# 检查 Docker 用户组
groups $USER

# 检查 Docker 服务状态
sudo systemctl status docker

# 重启 Docker 服务
sudo systemctl restart docker
```

### 调试命令

#### 容器调试
```bash
# 进入容器
docker exec -it salary-system-v3 /bin/sh

# 查看容器内文件
docker exec salary-system-v3 ls -la /usr/share/nginx/html/

# 测试容器内网络
docker exec salary-system-v3 curl -f http://localhost:3000/
```

#### 系统调试
```bash
# 查看 Docker 系统信息
docker system info
docker system df

# 清理 Docker 资源
docker system prune -af

# 查看 Docker 事件
docker events --since '1h'
```

## 监控和告警

### 基础监控脚本
```bash
#!/bin/bash
# container-monitor.sh

CONTAINER_NAME="salary-system-v3"

# 检查容器是否运行
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ 容器未运行，尝试重启..."
    docker start $CONTAINER_NAME
fi

# 检查健康状态
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null)
if [ "$HEALTH" != "healthy" ]; then
    echo "⚠️ 容器健康检查异常: $HEALTH"
fi

# 检查资源使用
docker stats --no-stream $CONTAINER_NAME | tail -n 1
```

### 自动化监控 (Cron)
```bash
# 添加到 crontab
# */5 * * * * /path/to/container-monitor.sh >> /var/log/container-monitor.log 2>&1
```

## 安全最佳实践

### 1. 镜像安全
- 使用官方基础镜像
- 定期更新基础镜像
- 扫描镜像漏洞
- 使用多阶段构建减少攻击面

### 2. 容器运行时安全
- 以非 root 用户运行
- 限制容器权限
- 使用只读文件系统 (适用时)
- 定期更新容器

### 3. 网络安全
- 使用自定义网络
- 限制容器间通信
- 实施网络分割
- 配置防火墙规则

### 4. 密钥管理
- 使用 Docker Secrets
- 定期轮换密钥
- 避免在镜像中硬编码密钥
- 使用专用的密钥管理服务

## 性能优化

### 1. 镜像优化
- 使用多阶段构建
- 最小化镜像层数
- 优化 .dockerignore
- 使用镜像缓存

### 2. 运行时优化
- 适当的资源限制
- 启用 gzip 压缩
- 配置缓存策略
- 使用 CDN (适用时)

### 3. 部署优化
- 预拉取镜像
- 并行部署
- 优化健康检查间隔
- 使用本地镜像仓库 (可选)

这个 Docker 容器化部署方案提供了企业级的可靠性、扩展性和可维护性，同时保持了简单易用的特点。通过合理的配置和监控，可以实现高可用的生产环境部署。