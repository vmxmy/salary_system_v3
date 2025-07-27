#!/bin/bash

# Supabase 备份工具快速启动脚本
# Quick Start Script for Supabase Backup Tool

set -e

echo "🚀 Supabase 数据库备份工具 - 快速启动"
echo "========================================="

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 Python 版本
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装，请先安装 Python 3.7+"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python 版本: $PYTHON_VERSION"

# 检查 PostgreSQL 17
if [ ! -d "/opt/homebrew/opt/postgresql@17" ]; then
    echo "📦 安装 PostgreSQL 17..."
    brew install postgresql@17
fi

# 创建虚拟环境
if [ ! -d "backup_env" ]; then
    echo "🐍 创建虚拟环境..."
    python3 -m venv backup_env
fi

echo "📦 安装 Python 依赖..."
source backup_env/bin/activate
pip install -r requirements.txt

# 从现有 .env 文件生成配置
if [ ! -f "production_config.json" ]; then
    echo "⚙️  从 .env 文件生成配置..."
    python3 generate_config.py
else
    echo "✅ 配置文件已存在: production_config.json"
fi

# 测试配置
echo "🔍 测试数据库连接..."
./run_backup.sh info

echo ""
echo "🎉 安装和配置完成!"
echo ""
echo "📋 可用命令:"
echo "  ./run_backup.sh info           # 查看数据库信息"
echo "  ./run_backup.sh backup         # 创建完整备份"
echo "  ./run_backup.sh list           # 列出所有备份"
echo "  ./run_backup.sh schedule       # 启动定时备份"
echo "  ./run_backup.sh help           # 查看完整帮助"
echo ""
echo "📈 数据库统计:"
./run_backup.sh info | grep -E "(Tables|Total Rows|Database Size)"