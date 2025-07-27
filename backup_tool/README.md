# Supabase 数据库备份工具

专为 Supabase Free Plan 项目设计的自动化数据库备份解决方案。由于 Free Plan 不支持自动备份功能，此工具提供了完整的备份、调度和恢复功能。

## 功能特性

### 🔄 备份功能
- **完整备份**: Schema + 数据完整备份
- **Schema备份**: 仅备份数据库结构
- **数据备份**: 仅备份表数据
- **压缩存储**: Gzip 压缩减少存储空间
- **版本管理**: 自动保留指定数量的历史备份
- **校验和验证**: SHA256 校验确保备份完整性

### ⏰ 调度功能
- **定时备份**: 支持每日/每周/每月自动备份
- **失败重试**: 备份失败自动重试机制
- **健康监控**: 备份状态监控和日志记录
- **邮件通知**: 备份成功/失败邮件提醒
- **Systemd 集成**: 支持作为系统服务运行

### 🔧 恢复功能
- **完整恢复**: 从备份完全恢复数据库
- **选择性恢复**: 恢复指定表或Schema
- **恢复点创建**: 恢复前自动创建还原点
- **数据验证**: 恢复后验证数据完整性

## 安装配置

### 1. 安装依赖

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 安装 PostgreSQL 客户端工具 (用于 pg_dump)
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql
```

### 2. 配置文件

复制并编辑配置文件：

```bash
cp backup_config.json my_backup_config.json
```

编辑 `my_backup_config.json`：

```json
{
  "supabase_url": "https://your-project.supabase.co",
  "supabase_service_key": "your-service-key-here",
  "database_url": "postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres",
  "backup_dir": "./backups",
  "max_backups": 30,
  "compress": true,
  "include_data": true,
  "include_schema": true,
  "email_notifications": true,
  "email_smtp_server": "smtp.gmail.com",
  "email_smtp_port": 587,
  "email_from": "backup@yourcompany.com",
  "email_to": ["admin@yourcompany.com"],
  "email_password": "your-app-password",
  "schedule_enabled": true,
  "schedule_time": "02:00"
}
```

### 3. 获取 Supabase 连接信息

在 Supabase 项目设置中找到：
- **API URL**: Project Settings → API → Project URL
- **Service Key**: Project Settings → API → service_role key
- **Database URL**: Project Settings → Database → Connection string (URI)

## 使用方法

### 手动备份

```bash
# 完整备份（默认）
python supabase_backup.py --config my_backup_config.json

# 仅备份 Schema
python supabase_backup.py --config my_backup_config.json --backup schema_only

# 仅备份数据
python supabase_backup.py --config my_backup_config.json --backup data_only

# 查看数据库信息
python supabase_backup.py --config my_backup_config.json --info

# 列出所有备份
python supabase_backup.py --config my_backup_config.json --list

# 验证备份完整性
python supabase_backup.py --config my_backup_config.json --validate backup_20250725_143022.json.gz
```

### 备份调度

```bash
# 启动调度器（阻塞运行）
python backup_scheduler.py --config my_backup_config.json --start

# 查看调度器状态
python backup_scheduler.py --config my_backup_config.json --status

# 立即执行备份
python backup_scheduler.py --config my_backup_config.json --backup-now full

# 验证近期备份
python backup_scheduler.py --config my_backup_config.json --verify

# 生成 systemd 服务配置
python backup_scheduler.py --config my_backup_config.json --create-service
```

### 数据恢复

```bash
# 查看备份内容
python backup_restore.py --config my_backup_config.json --list-contents backup_20250725_143022.json.gz

# 完整恢复（自动创建恢复点）
python backup_restore.py --config my_backup_config.json --restore backup_20250725_143022.json.gz

# 仅恢复 Schema
python backup_restore.py --config my_backup_config.json --restore backup_20250725_143022.json.gz --type schema_only

# 恢复指定表
python backup_restore.py --config my_backup_config.json --restore backup_20250725_143022.json.gz --type data_only --tables public.employees public.departments

# 验证恢复结果
python backup_restore.py --config my_backup_config.json --verify backup_20250725_143022.json.gz
```

## 作为系统服务运行

### 1. 创建服务配置

```bash
python backup_scheduler.py --config /path/to/my_backup_config.json --create-service
```

### 2. 安装服务

```bash
# 创建备份用户
sudo useradd -r -s /bin/false backup

# 设置权限
sudo chown -R backup:backup /path/to/backup_tool

# 安装服务
sudo cp supabase-backup.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable supabase-backup
sudo systemctl start supabase-backup

# 检查状态
sudo systemctl status supabase-backup
```

## 备份策略建议

### 小型项目 (< 1GB)
- **每日完整备份**: 凌晨 2:00
- **保留 30 天备份**
- **每周验证**: 周日验证最新备份

### 中型项目 (1-5GB)
- **每日数据备份**: 凌晨 2:00
- **每周完整备份**: 周日凌晨 1:00
- **保留 14 天完整备份，30 天数据备份**

### 大型项目 (> 5GB)
- **每日增量策略**: 工作日数据备份，周末完整备份
- **压缩存储**: 启用 Gzip 压缩
- **外部存储**: 定期迁移到云存储

## 监控和告警

### 日志文件
- `backups/backup.log`: 备份操作日志
- `backups/scheduler.log`: 调度器日志
- `backups/restore.log`: 恢复操作日志

### 状态文件
- `backups/scheduler_status.json`: 调度器运行状态
- `backups/backup_YYYYMMDD_HHMMSS.info`: 备份元数据

### 邮件通知
配置 SMTP 设置后，系统会在以下情况发送邮件：
- ✅ 备份成功完成
- ❌ 备份失败
- ⚠️ 备份验证失败

## 故障排除

### 常见问题

**1. 连接数据库失败**
```
检查 database_url 配置
确认网络连接
验证用户名密码
```

**2. pg_dump 命令不存在**
```bash
# 安装 PostgreSQL 客户端
brew install postgresql  # macOS
sudo apt install postgresql-client  # Ubuntu
```

**3. 权限不足**
```
使用 service_role key 而不是 anon key
确认用户有数据库访问权限
```

**4. 备份文件过大**
```
启用压缩: "compress": true
使用数据分批备份
清理旧的备份文件
```

### 调试模式

启用详细日志：

```python
import logging
logging.getLogger().setLevel(logging.DEBUG)
```

### 性能优化

- **大表处理**: 对于大表考虑分批处理
- **网络优化**: 在服务器端运行减少网络传输
- **并行备份**: 多个小表可以并行备份
- **存储优化**: 使用压缩和版本管理

## 安全注意事项

1. **配置文件安全**: 配置文件包含敏感信息，设置适当权限
2. **备份加密**: 考虑对备份文件进行加密
3. **网络安全**: 使用 SSL 连接数据库
4. **访问控制**: 限制备份文件访问权限
5. **密钥管理**: 定期轮换数据库密码和 API 密钥

## 扩展功能

### 自定义备份策略
修改 `backup_scheduler.py` 中的调度逻辑以实现：
- 增量备份
- 多环境备份
- 跨云存储同步

### 监控集成
集成监控系统：
- Prometheus metrics
- Grafana 仪表板
- Slack/Discord 通知

### 云存储集成
扩展备份存储到：
- AWS S3
- Google Cloud Storage
- Azure Blob Storage

---

**维护者**: 高新区财政局信息管理系统  
**版本**: 1.0.0  
**更新日期**: 2025-07-25