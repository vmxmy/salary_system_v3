# 1Panel 环境部署指南

本指南专门针对使用 1Panel 面板和 OpenResty 的服务器环境。

## 环境说明

- **服务器管理**: 1Panel 面板
- **Web 服务器**: OpenResty (已包含在 1Panel 中)
- **容器管理**: Docker (通过 1Panel 管理)
- **反向代理**: OpenResty 配置

## 快速部署

### 1. 服务器准备

由于您已经有 1Panel 和 OpenResty，使用简化的准备脚本：

```bash
# 使用 1Panel 专用模式 - 跳过 Nginx 和防火墙配置
./scripts/server-setup.sh --low-memory --skip-nginx --skip-firewall -y
```

### 2. 部署应用

使用专门的 1Panel 配置文件：

```bash
cd /opt/salary-system

# 使用 1Panel 优化的配置
cp docker-compose.1panel.yml shared/docker-compose.prod.yml

# 设置环境变量
export IMAGE_TAG="your-registry.com/salary-system-v3:latest"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export DOMAIN="yourdomain.com"  # 可选

# 启动服务
docker-compose -f shared/docker-compose.prod.yml up -d
```

## 1Panel 网站配置

### 1. 创建网站

在 1Panel 面板中：

1. **网站 → 创建网站**
2. **网站类型**: 反向代理
3. **域名**: 您的域名 (如 `salary.yourdomain.com`)
4. **代理地址**: `http://127.0.0.1:3001`

### 2. OpenResty 配置

1Panel 会自动生成基础配置，您可以在高级设置中添加以下优化：

```nginx
# 在网站配置的 server 块中添加
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket 支持 (如果需要)
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # 缓存静态文件
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_cache_valid 200 1y;
        expires 1y;
        add_header Cache-Control "public, no-transform, immutable";
    }
}

# 健康检查端点
location /health {
    proxy_pass http://127.0.0.1:3001/health;
    access_log off;
}

# API 接口限速
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    limit_req zone=api burst=20 nodelay;
}
```

### 3. SSL 证书配置

在 1Panel 中：

1. **网站 → SSL → 申请证书**
2. 选择 Let's Encrypt 或上传自有证书
3. 启用 HTTPS 重定向

## Docker 管理

### 通过 1Panel 管理

1. **容器 → 查看 salary-system-web 容器**
2. 可以查看日志、重启、更新镜像等

### 命令行管理

```bash
# 查看容器状态
docker ps | grep salary-system

# 查看日志
docker logs salary-system-web -f

# 重启容器
docker restart salary-system-web

# 更新部署
cd /opt/salary-system
docker-compose -f shared/docker-compose.prod.yml pull
docker-compose -f shared/docker-compose.prod.yml up -d
```

## 监控和维护

### 1Panel 面板监控

- **系统信息**: CPU、内存、磁盘使用情况
- **容器监控**: 容器状态和资源使用
- **日志查看**: 通过面板查看应用日志

### 应用健康检查

```bash
# 检查应用状态
curl http://localhost:3001/health

# 检查通过域名的访问
curl https://yourdomain.com/health
```

### 备份策略

```bash
# 创建定期备份脚本
cat > /opt/salary-system/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# 备份容器配置
cp /opt/salary-system/shared/docker-compose.prod.yml /opt/salary-system/backups/config_$DATE.yml

# 备份应用日志
tar -czf /opt/salary-system/backups/logs_$DATE.tar.gz /opt/salary-system/logs/

# 清理30天前的备份
find /opt/salary-system/backups -name "*.tar.gz" -mtime +30 -delete
find /opt/salary-system/backups -name "*.yml" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/salary-system/backup.sh

# 设置定时任务（通过1Panel或crontab）
# 0 2 * * * /opt/salary-system/backup.sh
```

## 常见问题解决

### 1. 端口冲突

如果 3001 端口被占用：

```bash
# 修改端口
sed -i 's/3001:80/3002:80/g' /opt/salary-system/shared/docker-compose.prod.yml
docker-compose -f shared/docker-compose.prod.yml up -d

# 同时更新1Panel中的代理地址为 http://127.0.0.1:3002
```

### 2. 内存不足

对于 1.8GB 内存的服务器：

```bash
# 检查容器内存使用
docker stats salary-system-web

# 如果内存使用过高，可以调整限制
# 编辑 docker-compose.prod.yml 中的 deploy.resources.limits.memory
```

### 3. 日志文件过大

```bash
# 清理日志
truncate -s 0 /opt/salary-system/logs/*.log

# 配置日志轮转（已包含在配置中）
docker-compose -f shared/docker-compose.prod.yml restart logrotate
```

## GitHub Actions 配置调整

在 `.github/workflows/deploy-private-server.yml` 中的环境变量部分添加：

```yaml
env:
  DEPLOYMENT_TYPE: "1panel"
  USE_NGINX: "false"
  APP_PORT: "3001"
```

## 优势总结

### ✅ 1Panel 环境的优势：

1. **简化管理**: 通过 Web 界面管理所有服务
2. **资源优化**: 避免重复的 Nginx 安装
3. **SSL 自动化**: 1Panel 自动处理证书申请和续期
4. **监控集成**: 内置的系统和应用监控
5. **备份便利**: 通过面板快速备份和恢复

### 🔧 资源使用优化：

- 容器限制内存 512MB，适合 1.8GB 总内存
- 使用轻量级日志轮转
- OpenResty 复用减少资源消耗
- 1Panel 统一管理降低维护成本

现在您可以在 1Panel 环境中高效部署 Salary System v3！