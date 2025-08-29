# 服务器部署指南

## 自动化部署脚本

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