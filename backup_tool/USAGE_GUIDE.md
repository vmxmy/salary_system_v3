# Supabase 数据库备份工具使用指南

## 📖 目录

- [快速开始](#快速开始)
- [基本操作](#基本操作)
- [自动备份设置](#自动备份设置)
- [备份恢复](#备份恢复)
- [监控和维护](#监控和维护)
- [高级配置](#高级配置)
- [常见问题](#常见问题)

---

## 🚀 快速开始

### 首次安装

```bash
# 1. 进入备份工具目录
cd /Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3/backup_tool

# 2. 运行快速安装脚本
./quick_start.sh
```

安装脚本会自动：
- ✅ 检查并安装 PostgreSQL 17
- ✅ 创建 Python 虚拟环境
- ✅ 安装必要依赖
- ✅ 从现有 .env 文件生成配置
- ✅ 测试数据库连接

### 立即使用

```bash
# 查看数据库信息
./run_backup.sh info

# 创建第一个备份
./run_backup.sh backup

# 查看备份列表
./run_backup.sh list
```

---

## 📋 基本操作

### 1. 查看系统信息

```bash
# 查看数据库详细信息
./run_backup.sh info
```

**输出示例**：
```
Database Information:
  Tables: 69
  Total Rows: 6,312
  Database Size: 15 MB
  PostgreSQL Version: PostgreSQL 17.4
```

### 2. 创建备份

#### 完整备份（推荐）
```bash
# 包含 Schema + 数据的完整备份
./run_backup.sh backup
```

#### 分类备份
```bash
# 仅备份数据
./run_backup.sh data

# 仅备份 Schema
./run_backup.sh schema
```

**备份文件说明**：
- `backup_YYYYMMDD_HHMMSS.json.gz` - 压缩的备份数据
- `backup_YYYYMMDD_HHMMSS.info` - 备份元数据
- `schema_YYYYMMDD_HHMMSS.sql` - Schema SQL文件

### 3. 管理备份

#### 列出所有备份
```bash
./run_backup.sh list
```

**输出示例**：
```
Available Backups (1):
--------------------------------------------------------------------------------
  backup_20250726_073031.json.gz
    Timestamp: 20250726_073031
    Size: 255,672 bytes
    Tables: 69, Rows: 6,312
    Type: full, Compressed: True
```

#### 验证备份完整性
```bash
# 验证指定备份文件
./run_backup.sh validate backup_20250726_073031.json.gz
```

**验证内容**：
- ✅ 文件大小检查
- ✅ SHA256 校验和验证
- ✅ JSON 结构完整性
- ✅ 备份元数据一致性

---

## ⏰ 自动备份设置

### 方法1: 内置调度器（推荐）

#### 启动调度器
```bash
# 前台运行（测试用）
./run_backup.sh schedule

# 后台运行
nohup ./run_backup.sh schedule > scheduler.log 2>&1 &
```

#### 调度器管理
```bash
# 查看调度器状态
./run_backup.sh schedule-status

# 立即执行备份
./run_backup.sh schedule-now
```

**默认调度策略**：
- 📅 每日 02:00 完整备份
- 📅 每周日 01:00 Schema备份（用于快速恢复测试）
- 📅 每月验证最新备份完整性

### 方法2: Cron 任务

#### 设置 Crontab
```bash
# 编辑 crontab
crontab -e

# 添加以下行（每日凌晨2点备份）
0 2 * * * /Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3/backup_tool/run_backup.sh backup >> /Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3/backup_tool/cron.log 2>&1
```

#### Cron 任务示例
```bash
# 每日完整备份
0 2 * * * /path/to/run_backup.sh backup

# 每周日Schema备份
0 1 * * 0 /path/to/run_backup.sh schema

# 每月1号验证备份
0 3 1 * * /path/to/run_backup.sh validate $(ls -t backups/backup_*.json.gz | head -1)
```

### 方法3: macOS LaunchAgent

#### 创建 plist 文件
```bash
# 生成 LaunchAgent 配置
cat > ~/Library/LaunchAgents/com.supabase.backup.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.supabase.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3/backup_tool/run_backup.sh</string>
        <string>backup</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>WorkingDirectory</key>
    <string>/Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3/backup_tool</string>
</dict>
</plist>
EOF

# 加载和启动服务
launchctl load ~/Library/LaunchAgents/com.supabase.backup.plist
launchctl start com.supabase.backup
```

---

## 🔄 备份恢复

### 查看备份内容

```bash
# 查看备份文件包含的表和数据
./run_backup.sh restore-list backup_20250726_073031.json.gz
```

**输出示例**：
```
Backup Contents: backup_20250726_073031.json.gz
--------------------------------------------------
Backup Info: {'timestamp': '20250726_073031', 'backup_type': 'full'}
Has Schema: True
Has Data: True

Tables (45):
  public.employees: 81 rows
  public.payrolls: 51 rows
  public.payroll_items: 682 rows
  public.departments: 11 rows
  ...
```

### 执行恢复

> ⚠️ **警告**: 恢复操作会覆盖现有数据，请在生产环境操作前充分测试！

#### 完整恢复
```bash
# 完整恢复（Schema + 数据）
./run_backup.sh restore backup_20250726_073031.json.gz
```

#### 选择性恢复
```bash
# 使用高级恢复工具
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
source backup_env/bin/activate

# 仅恢复Schema
python3 backup_restore.py --config production_config.json \
    --restore backup_20250726_073031.json.gz --type schema_only

# 仅恢复指定表的数据
python3 backup_restore.py --config production_config.json \
    --restore backup_20250726_073031.json.gz --type data_only \
    --tables public.employees public.departments
```

### 恢复验证

```bash
# 验证恢复结果
./run_backup.sh info  # 检查表数量和行数

# 或者使用专用验证工具
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
source backup_env/bin/activate
python3 backup_restore.py --config production_config.json \
    --verify backup_20250726_073031.json.gz
```

---

## 📊 监控和维护

### 日志监控

#### 查看日志文件
```bash
# 备份操作日志
tail -f backups/backup.log

# 调度器日志
tail -f backups/scheduler.log

# 恢复操作日志
tail -f backups/restore.log
```

#### 日志分析
```bash
# 查看最近的备份
grep "Backup completed" backups/backup.log | tail -5

# 查看失败的备份
grep "ERROR" backups/backup.log | tail -10

# 统计备份大小趋势
grep "Size:" backups/backup.log | awk '{print $NF}' | tail -10
```

### 空间管理

#### 检查磁盘使用
```bash
# 备份目录大小
du -sh backups/

# 各备份文件大小
ls -lh backups/backup_*.json.gz
```

#### 清理策略
- 🔄 **自动清理**: 默认保留30个备份文件，旧文件自动删除
- 📅 **手动清理**: 删除 `.json.gz` 和对应的 `.info` 文件
- 💾 **存储优化**: 启用压缩可节省约70-80%存储空间

#### 手动清理示例
```bash
# 仅保留最近10个备份
cd backups/
ls -t backup_*.json.gz | tail -n +11 | xargs rm -f
ls -t backup_*.info | tail -n +11 | xargs rm -f
```

### 性能监控

#### 备份性能统计
```bash
# 分析备份时间
grep "Starting backup\|Backup completed" backups/backup.log | \
    paste - - | \
    awk '{print $1, $2, $NF}' | \
    tail -5
```

#### 数据库增长趋势
```bash
# 创建监控脚本
cat > monitor_growth.sh << 'EOF'
#!/bin/bash
echo "$(date): Tables: $(./run_backup.sh info | grep Tables | awk '{print $2}'), Rows: $(./run_backup.sh info | grep 'Total Rows' | awk '{print $3}'), Size: $(./run_backup.sh info | grep 'Database Size' | awk '{print $3, $4}')" >> growth.log
EOF

chmod +x monitor_growth.sh

# 每周运行一次
# 0 0 * * 0 /path/to/monitor_growth.sh
```

---

## ⚙️ 高级配置

### 配置文件详解

编辑 `production_config.json`：

```json
{
  // 数据库连接
  "supabase_url": "https://your-project.supabase.co",
  "supabase_service_key": "your-service-key",
  "database_url": "postgresql://...",
  
  // 备份设置
  "backup_dir": "./backups",           // 备份目录
  "max_backups": 30,                   // 最大备份数量
  "compress": true,                    // 启用压缩
  "include_data": true,                // 包含数据
  "include_schema": true,              // 包含Schema
  
  // 邮件通知
  "email_notifications": false,       // 启用邮件通知
  "email_smtp_server": "smtp.gmail.com",
  "email_smtp_port": 587,
  "email_from": "backup@company.com",
  "email_to": ["admin@company.com"],
  "email_password": "app-password",
  
  // 调度设置
  "schedule_enabled": true,            // 启用调度
  "schedule_time": "02:00"             // 备份时间
}
```

### 邮件通知设置

#### Gmail 配置
```json
{
  "email_notifications": true,
  "email_smtp_server": "smtp.gmail.com",
  "email_smtp_port": 587,
  "email_from": "your-gmail@gmail.com",
  "email_to": ["admin@company.com"],
  "email_password": "your-app-password"
}
```

**Gmail 应用密码设置**：
1. 登录 Gmail → 设置 → 安全性
2. 启用两步验证
3. 生成应用密码用于 SMTP

#### 企业邮箱配置
```json
{
  "email_notifications": true,
  "email_smtp_server": "smtp.company.com",
  "email_smtp_port": 587,
  "email_from": "backup@company.com",
  "email_to": ["it@company.com", "admin@company.com"],
  "email_password": "your-password"
}
```

### 多环境配置

#### 开发环境配置
```bash
# 创建开发环境配置
cp production_config.json dev_config.json

# 修改开发环境设置
# - 更短的保留时间
# - 不同的备份目录
# - 禁用邮件通知

# 使用开发配置
CONFIG_FILE=dev_config.json ./run_backup.sh backup
```

#### 测试环境配置
```json
{
  "backup_dir": "./test_backups",
  "max_backups": 5,
  "email_notifications": false,
  "schedule_enabled": false
}
```

---

## ❓ 常见问题

### Q1: pg_dump 版本不匹配错误

**问题**：
```
pg_dump: error: server version: 17.4; pg_dump version: 14.17
```

**解决方案**：
```bash
# 安装匹配版本的 PostgreSQL
brew install postgresql@17

# 验证版本
/opt/homebrew/opt/postgresql@17/bin/pg_dump --version
```

### Q2: 虚拟环境激活失败

**问题**：
```
source: backup_env/bin/activate: No such file or directory
```

**解决方案**：
```bash
# 重新创建虚拟环境
rm -rf backup_env
python3 -m venv backup_env
source backup_env/bin/activate
pip install -r requirements.txt
```

### Q3: 数据库连接超时

**问题**：
```
psycopg2.OperationalError: timeout expired
```

**解决方案**：
```bash
# 检查网络连接
ping rjlymghylrshudywrzec.supabase.co

# 检查配置文件中的连接字符串
./run_backup.sh info

# 尝试减少并发连接
# 编辑 supabase_backup.py，添加连接池配置
```

### Q4: 备份文件过大

**问题**：备份文件占用过多磁盘空间

**解决方案**：
```bash
# 1. 启用压缩（已默认启用）
# 2. 减少保留数量
# 编辑 production_config.json: "max_backups": 15

# 3. 分离Schema和数据备份
./run_backup.sh schema  # 轻量级Schema备份
./run_backup.sh data    # 数据备份

# 4. 排除不必要的表
# 修改备份脚本，跳过日志表等大表
```

### Q5: 调度器未按时执行

**问题**：自动备份没有在指定时间运行

**解决方案**：
```bash
# 检查调度器状态
./run_backup.sh schedule-status

# 检查系统时间
date

# 查看调度器日志
tail -f backups/scheduler.log

# 手动测试调度器
./run_backup.sh schedule-now
```

### Q6: 恢复后数据不完整

**问题**：恢复后某些表数据缺失

**解决方案**：
```bash
# 1. 验证备份文件完整性
./run_backup.sh validate backup_file.json.gz

# 2. 检查恢复日志
tail -f backups/restore.log

# 3. 使用验证工具
source backup_env/bin/activate
python3 backup_restore.py --config production_config.json --verify backup_file.json.gz

# 4. 手动检查特定表
# 连接数据库验证行数和内容
```

### Q7: 邮件通知未发送

**问题**：备份完成后没有收到邮件通知

**解决方案**：
```bash
# 1. 检查邮件配置
grep email production_config.json

# 2. 测试SMTP连接
python3 -c "
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
print('SMTP连接成功')
server.quit()
"

# 3. 检查应用密码（Gmail）
# 确保使用应用密码而不是账户密码

# 4. 查看错误日志
grep "notification" backups/backup.log
```

---

## 📚 进阶技巧

### 1. 自定义备份脚本

```bash
#!/bin/bash
# custom_backup.sh - 自定义备份策略

# 工作日仅备份数据
if [ $(date +%u) -le 5 ]; then
    ./run_backup.sh data
else
    # 周末完整备份
    ./run_backup.sh backup
fi

# 每月1号创建存档备份
if [ $(date +%d) -eq 01 ]; then
    cp backups/backup_*.json.gz archive/monthly_$(date +%Y%m).json.gz
fi
```

### 2. 监控仪表板

```bash
#!/bin/bash
# dashboard.sh - 简单的监控仪表板

echo "=== Supabase 备份状态仪表板 ==="
echo "生成时间: $(date)"
echo ""

echo "📊 数据库状态:"
./run_backup.sh info | head -4

echo ""
echo "💾 最近备份:"
./run_backup.sh list | head -10

echo ""
echo "📁 存储使用:"
du -sh backups/

echo ""
echo "📈 增长趋势:"
tail -5 growth.log 2>/dev/null || echo "未找到增长数据"

echo ""
echo "⚠️  最近错误:"
grep ERROR backups/backup.log | tail -3 || echo "无错误记录"
```

### 3. 批量操作

```bash
#!/bin/bash
# batch_operations.sh - 批量备份操作

# 验证所有备份
for backup in backups/backup_*.json.gz; do
    echo "验证: $(basename $backup)"
    ./run_backup.sh validate $(basename $backup) || echo "❌ 验证失败"
done

# 生成备份报告
echo "=== 备份报告 ===" > backup_report.txt
echo "生成时间: $(date)" >> backup_report.txt
./run_backup.sh list >> backup_report.txt

# 发送报告（如果配置了邮件）
if grep '"email_notifications": true' production_config.json > /dev/null; then
    mail -s "Supabase备份报告" admin@company.com < backup_report.txt
fi
```

---

## 🔗 相关资源

- **主文档**: `README.md` - 完整功能说明
- **安装指南**: `INSTALLATION_COMPLETE.md` - 安装完成状态
- **配置模板**: `backup_config.json` - 配置文件模板
- **故障排除**: 本文档的常见问题部分

---

**文档版本**: 1.0.0  
**最后更新**: 2025-07-26  
**适用版本**: Supabase Backup Tool v1.0.0  

如有问题，请查看日志文件或参考故障排除部分。