# 私有服务器部署指南

本指南将帮助您在私有服务器上部署 Salary System v3 应用。

## 目录

- [前置要求](#前置要求)
- [服务器准备](#服务器准备)
- [GitHub Actions 配置](#github-actions-配置)
- [部署流程](#部署流程)
- [部署策略](#部署策略)
- [监控和维护](#监控和维护)
- [故障排除](#故障排除)

## 前置要求

### 系统要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **内存**: 最少 2GB RAM (推荐 4GB+)
- **存储**: 最少 10GB 可用空间 (推荐 20GB+)
- **网络**: 稳定的互联网连接
- **权限**: sudo 访问权限

### 必需软件

- Docker 20.10+
- Docker Compose 2.0+
- Git 2.0+
- SSH 服务器

## 服务器准备

### 1. 自动化准备脚本

使用提供的自动化脚本快速设置服务器环境：

```bash
# 下载准备脚本
wget https://raw.githubusercontent.com/your-org/salary-system/main/webapp/v3/.github/scripts/server-setup.sh

# 添加执行权限
chmod +x server-setup.sh

# 执行完整安装
sudo ./server-setup.sh -y

# 或者创建专门的部署用户
sudo ./server-setup.sh -u deploy -y
```

### 2. 手动准备步骤

如果您选择手动配置，请按以下步骤操作：

#### 更新系统
```bash
sudo apt update && sudo apt upgrade -y
```

#### 安装 Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### 安装 Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 创建应用目录
```bash
sudo mkdir -p /opt/salary-system/{releases,shared,scripts,backups,logs}
sudo chown -R $USER:$USER /opt/salary-system
```

## GitHub Actions 配置

### 1. 配置 Secrets

在您的 GitHub 仓库中，添加以下 Secrets (`Settings > Secrets and variables > Actions`):

| Secret 名称 | 描述 | 示例值 |
|-------------|------|--------|
| `SSH_PRIVATE_KEY` | SSH 私钥内容 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_USER` | SSH 用户名 | `ubuntu` 或 `deploy` |
| `SSH_HOST` | 服务器 IP 地址 | `192.168.1.100` |
| `SSH_KNOWN_HOSTS` | SSH 已知主机指纹 | 运行 `ssh-keyscan -H your-server-ip` |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `DOCKER_USERNAME` | Docker 镜像仓库用户名 | `your-username` |
| `DOCKER_PASSWORD` | Docker 镜像仓库密码/令牌 | `your-token` |
| `SERVER_DOMAIN` | 服务器域名 (可选) | `salary.yourdomain.com` |

### 2. SSH 密钥生成和配置

在您的本地机器上生成 SSH 密钥对：

```bash
# 生成新的 SSH 密钥对
ssh-keygen -t ed25519 -C "deploy@salary-system" -f ~/.ssh/salary_deploy

# 将公钥复制到服务器
ssh-copy-id -i ~/.ssh/salary_deploy.pub user@your-server-ip

# 获取私钥内容 (复制到 SSH_PRIVATE_KEY Secret)
cat ~/.ssh/salary_deploy

# 获取服务器指纹 (复制到 SSH_KNOWN_HOSTS Secret)
ssh-keyscan -H your-server-ip
```

## 部署流程

### 1. 触发部署

部署可以通过以下方式触发：

#### 自动触发
- 推送代码到 `main` 或 `production` 分支

```bash
git push origin main
```

#### 手动触发
- 在 GitHub Actions 页面手动运行 "Deploy to Private Server" 工作流
- 选择部署环境 (production/staging) 和部署类型 (rolling/blue_green/canary)

### 2. 部署过程监控

1. 访问 GitHub Actions 页面查看部署进度
2. 监控构建和部署日志
3. 等待健康检查完成

### 3. 验证部署

部署完成后，验证应用是否正常运行：

```bash
# 检查应用健康状态
curl http://your-server-ip/health

# 检查容器状态
docker ps

# 查看应用日志
docker logs salary-system-web
```

## 部署策略

### 1. 滚动部署 (Rolling Deployment) - 默认

- **特点**: 停止现有服务，启动新版本
- **停机时间**: 有短暂停机
- **回滚速度**: 快速
- **资源需求**: 低

```yaml
deploy_type: rolling
```

### 2. 蓝绿部署 (Blue-Green Deployment)

- **特点**: 在新环境中部署，验证后切换流量
- **停机时间**: 无停机
- **回滚速度**: 即时
- **资源需求**: 双倍

```yaml
deploy_type: blue_green
```

### 3. 金丝雀部署 (Canary Deployment)

- **特点**: 将少量流量 (10%) 导向新版本，监控后完整部署
- **停机时间**: 无停机
- **回滚速度**: 即时
- **资源需求**: 高

```yaml
deploy_type: canary
```

## 监控和维护

### 1. 应用监控

#### 健康检查
```bash
# 应用健康状态
curl http://localhost/health

# 详细健康检查
docker exec salary-system-web /usr/local/bin/healthcheck.sh --detailed
```

#### 日志查看
```bash
# 应用日志
docker logs salary-system-web --tail 100 -f

# Nginx 访问日志
docker exec salary-system-web tail -f /var/log/nginx/access.log

# Nginx 错误日志
docker exec salary-system-web tail -f /var/log/nginx/error.log
```

### 2. 系统监控

#### 资源使用情况
```bash
# CPU 和内存
htop

# 磁盘使用
df -h

# 网络连接
netstat -tlnp
```

#### Docker 监控
```bash
# 容器状态
docker ps -a

# 资源使用
docker stats

# 镜像管理
docker images
docker system df
```

### 3. 日常维护

#### 清理旧版本
```bash
cd /opt/salary-system
# 手动清理旧发布版本 (保留最近 5 个)
ls -t releases/ | tail -n +6 | xargs rm -rf
```

#### 清理 Docker 资源
```bash
# 清理未使用的镜像
docker image prune -f

# 清理未使用的容器
docker container prune -f

# 清理未使用的网络
docker network prune -f
```

#### 备份配置
```bash
# 备份重要配置文件
tar -czf /opt/salary-system/backups/config-$(date +%Y%m%d).tar.gz \
    /opt/salary-system/shared/*.yml \
    /opt/salary-system/shared/*.conf
```

## 故障排除

### 1. 常见问题

#### 部署失败

**问题**: GitHub Actions 部署失败

**解决方案**:
1. 检查 Secrets 配置是否正确
2. 验证 SSH 连接是否正常
3. 确认服务器磁盘空间充足
4. 检查 Docker 服务是否运行

```bash
# 验证 SSH 连接
ssh -i ~/.ssh/salary_deploy user@your-server-ip

# 检查 Docker 服务
sudo systemctl status docker

# 检查磁盘空间
df -h
```

#### 应用无法访问

**问题**: 部署成功但无法访问应用

**解决方案**:
1. 检查容器是否运行
2. 验证端口映射
3. 检查防火墙设置
4. 查看应用日志

```bash
# 检查容器状态
docker ps

# 检查端口监听
netstat -tlnp | grep :80

# 测试本地访问
curl http://localhost/health

# 检查防火墙
sudo ufw status
```

#### 健康检查失败

**问题**: 健康检查持续失败

**解决方案**:
1. 查看详细健康检查日志
2. 验证应用配置
3. 检查依赖服务 (Supabase)

```bash
# 详细健康检查
docker exec salary-system-web /usr/local/bin/healthcheck.sh --detailed

# 检查环境变量
docker exec salary-system-web env | grep VITE

# 测试 Supabase 连接
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" $VITE_SUPABASE_URL/rest/v1/
```

### 2. 回滚操作

如果部署出现问题，可以快速回滚到上一个版本：

#### 自动回滚
```bash
cd /opt/salary-system
./scripts/rollback.sh --auto
```

#### 回滚到指定版本
```bash
# 查看可用版本
./scripts/rollback.sh --list

# 回滚到指定版本
./scripts/rollback.sh --version 20240101_120000
```

### 3. 紧急恢复

#### 完全重新部署
```bash
cd /opt/salary-system

# 停止所有容器
docker-compose -f shared/docker-compose.prod.yml down

# 清理旧容器和镜像
docker system prune -af

# 重新拉取最新镜像
docker pull your-registry.com/salary-system-v3:latest

# 重新启动服务
docker-compose -f shared/docker-compose.prod.yml up -d
```

#### 从备份恢复
```bash
# 恢复配置文件
tar -xzf /opt/salary-system/backups/config-20240101.tar.gz -C /

# 重启服务
docker-compose -f shared/docker-compose.prod.yml restart
```

## 高级配置

### 1. SSL/HTTPS 配置

#### 使用 Let's Encrypt
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 负载均衡配置

如果需要多实例部署，可以配置 Nginx 负载均衡：

```nginx
upstream salary_backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://salary_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 数据库备份

虽然使用 Supabase 托管数据库，但建议定期备份重要数据：

```bash
# 使用 Supabase CLI 备份
supabase db dump --file backup-$(date +%Y%m%d).sql

# 自动化备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d)
supabase db dump --file /opt/salary-system/backups/db-$DATE.sql
# 删除 30 天前的备份
find /opt/salary-system/backups -name "db-*.sql" -mtime +30 -delete
```

## 支持和维护

### 获取帮助

- **文档**: 查看项目 README 和代码注释
- **日志**: 查看应用和系统日志定位问题
- **监控**: 设置监控告警及时发现问题

### 版本更新

1. 查看发布说明了解更新内容
2. 在测试环境验证新版本
3. 计划维护窗口进行更新
4. 准备回滚方案

### 性能优化

- 监控应用性能指标
- 根据负载调整资源配置
- 定期清理日志和临时文件
- 优化 Docker 镜像大小

---

**注意**: 本指南提供的是生产环境部署的基本配置。根据您的具体需求，可能需要进行额外的安全配置、性能优化和监控设置。