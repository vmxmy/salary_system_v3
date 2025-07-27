#!/bin/bash

# Supabase 备份工具运行脚本
# 自动设置正确的 PostgreSQL 路径和虚拟环境

set -e

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 设置 PostgreSQL 17 路径
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# 激活虚拟环境
if [ ! -d "backup_env" ]; then
    echo "❌ 虚拟环境不存在，请先运行 ./quick_start.sh"
    exit 1
fi

source backup_env/bin/activate

# 设置默认配置文件
CONFIG_FILE="${CONFIG_FILE:-production_config.json}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 配置文件不存在: $CONFIG_FILE"
    echo "请先运行: python3 generate_config.py"
    exit 1
fi

# 根据第一个参数执行不同操作
case "${1:-backup}" in
    "info")
        echo "📊 查看数据库信息..."
        python3 supabase_backup.py --config "$CONFIG_FILE" --info
        ;;
    "backup")
        echo "💾 创建完整备份..."
        python3 supabase_backup.py --config "$CONFIG_FILE" --backup full
        ;;
    "data")
        echo "📄 创建数据备份..."
        python3 supabase_backup.py --config "$CONFIG_FILE" --backup data_only
        ;;
    "schema")
        echo "🏗️  创建Schema备份..."
        python3 supabase_backup.py --config "$CONFIG_FILE" --backup schema_only
        ;;
    "list")
        echo "📋 列出所有备份..."
        python3 supabase_backup.py --config "$CONFIG_FILE" --list
        ;;
    "validate")
        if [ -z "$2" ]; then
            echo "❌ 请指定要验证的备份文件名"
            echo "用法: $0 validate backup_filename.json.gz"
            exit 1
        fi
        echo "✅ 验证备份: $2"
        python3 supabase_backup.py --config "$CONFIG_FILE" --validate "$2"
        ;;
    "schedule")
        echo "⏰ 启动定时备份调度器..."
        python3 backup_scheduler.py --config "$CONFIG_FILE" --start
        ;;
    "schedule-status")
        echo "📊 查看调度器状态..."
        python3 backup_scheduler.py --config "$CONFIG_FILE" --status
        ;;
    "schedule-now")
        echo "⚡ 立即执行备份..."
        python3 backup_scheduler.py --config "$CONFIG_FILE" --backup-now full
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "❌ 请指定要恢复的备份文件名"
            echo "用法: $0 restore backup_filename.json.gz"
            exit 1
        fi
        echo "🔄 恢复备份: $2"
        python3 backup_restore.py --config "$CONFIG_FILE" --restore "$2"
        ;;
    "restore-list")
        if [ -z "$2" ]; then
            echo "❌ 请指定要查看的备份文件名"
            echo "用法: $0 restore-list backup_filename.json.gz"
            exit 1
        fi
        echo "📋 查看备份内容: $2"
        python3 backup_restore.py --config "$CONFIG_FILE" --list-contents "$2"
        ;;
    "help"|"-h"|"--help")
        echo "Supabase 数据库备份工具"
        echo ""
        echo "用法: $0 [命令] [参数]"
        echo ""
        echo "命令:"
        echo "  info           - 查看数据库信息"
        echo "  backup         - 创建完整备份 (默认)"
        echo "  data           - 创建数据备份"
        echo "  schema         - 创建Schema备份"
        echo "  list           - 列出所有备份"
        echo "  validate FILE  - 验证备份文件"
        echo "  schedule       - 启动定时备份调度器"
        echo "  schedule-status- 查看调度器状态"
        echo "  schedule-now   - 立即执行备份"
        echo "  restore FILE   - 恢复备份"
        echo "  restore-list FILE - 查看备份内容"
        echo "  help           - 显示此帮助"
        echo ""
        echo "环境变量:"
        echo "  CONFIG_FILE    - 配置文件路径 (默认: production_config.json)"
        echo ""
        echo "示例:"
        echo "  $0 info                                    # 查看数据库信息"
        echo "  $0 backup                                  # 创建完整备份"
        echo "  $0 validate backup_20250726_073031.json.gz # 验证备份"
        echo "  CONFIG_FILE=test_config.json $0 backup     # 使用自定义配置"
        ;;
    *)
        echo "❌ 未知命令: $1"
        echo "运行 '$0 help' 查看帮助"
        exit 1
        ;;
esac