# 部署指南

## 🚀 容器化部署 (推荐)

### 问题解决: "Missing Supabase environment variables"

#### 原始问题
容器访问时出现错误：`Uncaught Error: Missing Supabase environment variables`

#### 根本原因与解决方案
- **问题**: Docker 构建过程中没有注入 Vite 环境变量，导致 `import.meta.env.VITE_SUPABASE_URL` 为 undefined
- **解决**: 修改 Dockerfile 在容器内构建应用，并通过 GitHub Environment secrets 注入环境变量

#### 部署方法

##### 方法 1: GitHub Actions 自动构建 (推荐)
使用 GitHub Environment secrets，自动构建并推送 Docker 镜像：

**所需的 Environment Secrets**:
- `VITE_SUPABASE_URL`: https://rjlymghylrshudywrzec.supabase.co  
- `VITE_SUPABASE_ANON_KEY`: [从 Supabase Dashboard 获取]
- `DOCKERHUB_TOKEN` / `DOCKER_USERNAME`: Docker Hub 凭据

##### 方法 2: 本地 Docker 构建
```bash
# 确保环境变量配置
cp .env.local.example .env.local
# 编辑 .env.local 设置实际的 Supabase 配置

# 使用构建脚本
./build-docker.sh

# 或手动构建
docker build \
  --build-arg VITE_SUPABASE_URL="https://rjlymghylrshudywrzec.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="your-anon-key" \
  -t salary-system-v3-frontend:latest .

# 运行容器
docker run -p 3000:3000 --name salary-frontend salary-system-v3-frontend:latest
```

##### 方法 3: Docker Compose
```bash
# 使用预配置的环境变量文件
docker-compose --env-file .env.docker up --build

# 后台运行
docker-compose up -d --build
```

#### 容器部署验证
✅ 部署成功后应该：
- 不出现 "Missing Supabase environment variables" 错误  
- 能够正常连接 Supabase 服务
- 认证功能正常工作

---

## 📁 静态文件部署

### 自动化部署脚本

### 使用方法

```bash
# 1. 将脚本上传到服务器
scp deploy-to-server.sh user@server:/path/to/script/

# 2. 在服务器上执行部署
sudo ./deploy-to-server.sh <github下载链接>
```

### 示例命令

```bash
# 使用从 GitHub Release 获取的下载链接
sudo ./deploy-to-server.sh https://github.com/vmxmy/salary_system_v3/releases/download/build-20250829-024446/salary-system-v3-build-20250829-024446.zip
```

### 脚本功能

1. **自动下载**: 使用 ghfast.top 加速下载 GitHub Release 文件
2. **智能备份**: 自动备份现有文件，保留最近5个备份
3. **安全部署**: 验证文件完整性后再进行部署
4. **权限设置**: 自动设置正确的文件权限
5. **部署验证**: 验证部署结果确保成功

### 部署路径

- **目标目录**: `/opt/1panel/apps/openresty/openresty/www/sites/gz.gaoxin.net.cn/index`
- **备份目录**: `/opt/1panel/apps/openresty/openresty/www/sites/gz.gaoxin.net.cn/backups`

### 安全特性

- ✅ 自动备份现有文件
- ✅ 文件完整性验证
- ✅ 权限安全设置
- ✅ 错误处理和回滚提示
- ✅ 详细的部署日志

### 故障恢复

如果部署出现问题，可以从备份恢复：

```bash
# 查看备份文件
ls -la /opt/1panel/apps/openresty/openresty/www/sites/gz.gaoxin.net.cn/backups

# 恢复到指定备份
cd /opt/1panel/apps/openresty/openresty/www/sites/gz.gaoxin.net.cn/index
sudo tar -xzf ../backups/backup-20250829-123456.tar.gz
```

### 系统要求

- **操作系统**: Linux (已测试 CentOS/Ubuntu)
- **权限**: 需要 sudo 权限访问部署目录
- **工具依赖**: wget, unzip, tar (通常系统自带)
- **网络**: 能够访问 GitHub 和 ghfast.top

### 部署流程图

```
下载构建包 → 验证文件 → 备份现有文件 → 清空目标目录 → 复制新文件 → 设置权限 → 验证部署
```

### 注意事项

1. **权限要求**: 脚本需要 sudo 权限来操作 `/opt/1panel` 目录
2. **备份策略**: 自动保留最近5个备份文件，定期清理
3. **网络优化**: 优先使用 ghfast.top 加速，失败时回退到直连
4. **安全验证**: 部署前验证文件完整性和目录结构

### 获取下载链接

1. 访问 GitHub Releases 页面
2. 找到最新的构建版本
3. 右键复制 ZIP 文件下载链接
4. 使用该链接作为脚本参数