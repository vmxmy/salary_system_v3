# Docker Compose 编排指南

基于您的 Docker 运行命令创建的完整容器编排方案，支持多环境部署和扩展配置。

## 🚀 快速启动

### 基础部署（等效于原 Docker 命令）
```bash
# 启动基础服务
docker-compose up -d

# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f salary-system-v3
```

### 带代理的完整部署
```bash
# 启动带 Nginx 代理的完整服务
docker-compose --profile proxy up -d

# 启动所有服务（包括缓存和监控）
docker-compose --profile proxy --profile cache --profile monitoring up -d
```

## 📋 服务配置

### 核心服务
- **salary-system-v3**: 主应用服务（端口：3001→80）
- **nginx-proxy**: 反向代理服务（可选，profile: proxy）
- **redis-cache**: Redis 缓存服务（可选，profile: cache）

### 监控服务（可选）
- **prometheus**: 指标收集（端口：9090，profile: monitoring）
- **loki**: 日志聚合（端口：3100，profile: logging）

## 🔧 配置管理

### 环境变量文件
```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑配置（必须修改密码等敏感信息）
vim .env
```

### 关键配置项
```env
# 应用端口
HOST_PORT=3001

# Redis 密码（如果使用缓存）
REDIS_PASSWORD=your-secure-password

# 域名配置（如果使用代理）
NGINX_HOST=salary.yourdomain.com
```

## 📁 目录结构

```
v3/
├── docker-compose.yml          # 主编排文件
├── .env.docker                 # 环境变量模板
├── .env                        # 实际环境变量（需创建）
├── nginx/                      # Nginx 配置目录
│   ├── nginx.conf
│   ├── sites-enabled/
│   └── ssl/                    # SSL 证书目录
├── monitoring/                 # 监控配置
│   └── prometheus.yml
└── logging/                    # 日志配置
    └── loki-config.yml
```

## 🎯 Profile 使用指南

Docker Compose 使用 profiles 来管理可选服务：

### 基础服务（默认）
```bash
docker-compose up -d
# 仅启动 salary-system-v3
```

### 带代理
```bash
docker-compose --profile proxy up -d
# 启动 salary-system-v3 + nginx-proxy
```

### 性能优化
```bash
docker-compose --profile cache up -d
# 启动 salary-system-v3 + redis-cache
```

### 完整监控
```bash
docker-compose --profile monitoring --profile logging up -d
# 启动所有监控和日志服务
```

### 生产环境全套
```bash
docker-compose --profile proxy --profile cache --profile monitoring up -d
# 启动生产环境推荐的完整服务栈
```

## 🛠️ 常用操作

### 服务管理
```bash
# 启动服务
docker-compose up -d [service-name]

# 停止服务
docker-compose down

# 重启特定服务
docker-compose restart salary-system-v3

# 查看服务状态
docker-compose ps

# 更新服务（拉取最新镜像）
docker-compose pull
docker-compose up -d
```

### 日志管理
```bash
# 查看所有服务日志
docker-compose logs

# 实时跟踪特定服务日志
docker-compose logs -f salary-system-v3

# 查看最近 100 行日志
docker-compose logs --tail=100 salary-system-v3
```

### 健康检查
```bash
# 检查容器健康状态
docker-compose ps

# 手动执行健康检查
docker exec salary-system-v3 /usr/local/bin/healthcheck.sh
```

## 🔒 安全配置

### 容器安全
- 使用非特权用户运行
- 只读文件系统
- 最小权限原则
- 资源限制

### 网络安全
- 隔离网络环境
- 内部服务通信
- 端口最小暴露

### 数据安全
- 敏感数据环境变量化
- 日志轮转和大小限制
- 数据持久化卷管理

## 📊 监控和日志

### Prometheus 指标
访问 `http://localhost:9090` 查看系统指标

### 应用健康状态
```bash
# 检查应用健康状态
curl http://localhost:3001/health

# 检查容器状态
docker-compose exec salary-system-v3 curl -f http://localhost/health
```

### 日志聚合
如果启用了 Loki，可以通过 Grafana 或直接查询日志

## 🔄 更新和维护

### 应用更新
```bash
# 拉取最新镜像
docker-compose pull salary-system-v3

# 重新创建容器（保持数据）
docker-compose up -d --force-recreate salary-system-v3
```

### 备份和恢复
```bash
# 备份应用数据（如果有持久化数据）
docker-compose exec salary-system-v3 /backup-script.sh

# 清理未使用的镜像和容器
docker system prune -f
```

## 🚨 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 修改 .env 文件中的 HOST_PORT
   HOST_PORT=3002
   ```

2. **内存不足**
   ```bash
   # 调整资源限制
   MEMORY_LIMIT=1G
   MEMORY_RESERVATION=256M
   ```

3. **网络连接问题**
   ```bash
   # 重新创建网络
   docker-compose down
   docker network prune -f
   docker-compose up -d
   ```

4. **健康检查失败**
   ```bash
   # 检查容器内部状态
   docker-compose exec salary-system-v3 sh
   curl -f http://localhost/health
   ```

### 调试命令
```bash
# 进入容器调试
docker-compose exec salary-system-v3 sh

# 查看容器详细信息
docker-compose config

# 验证配置语法
docker-compose config --quiet
```

## 📈 性能优化

### 资源配置
根据服务器性能调整 `.env` 文件中的资源限制：

```env
# 高性能服务器
MEMORY_LIMIT=2G
CPU_LIMIT=2.0

# 低配置服务器
MEMORY_LIMIT=256M
CPU_LIMIT=0.25
```

### 缓存优化
启用 Redis 缓存提升性能：

```bash
docker-compose --profile cache up -d
```

### 网络优化
使用专用网络减少延迟：

```env
NETWORK_SUBNET=10.0.0.0/24
```

## 💡 最佳实践

1. **生产环境部署**
   - 使用 `--profile proxy --profile cache`
   - 配置 SSL 证书
   - 启用监控和日志

2. **开发环境**
   - 使用基础配置
   - 映射源代码目录（如需要）
   - 启用调试模式

3. **维护周期**
   - 定期更新镜像
   - 监控资源使用
   - 备份重要数据

4. **安全管理**
   - 定期轮换密码
   - 监控安全日志
   - 保持镜像更新

---

**注意**: 首次使用前请确保复制 `.env.docker` 为 `.env` 并修改相关配置。