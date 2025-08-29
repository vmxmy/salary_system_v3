#!/bin/bash
# 薪资管理系统 V3 - 服务器部署脚本
# 使用方法: ./deploy-to-server.sh <github下载链接>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DEPLOY_BASE="/opt/1panel/apps/openresty/openresty/www/sites/gz.gaoxin.net.cn"
DEPLOY_TARGET="${DEPLOY_BASE}/index"
BACKUP_DIR="${DEPLOY_BASE}/backups"
DOWNLOAD_PROXY="https://ghfast.top"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ $# -ne 1 ]; then
    log_error "使用方法: $0 <github下载链接>"
    echo
    echo "示例:"
    echo "  $0 https://github.com/vmxmy/salary_system_v3/releases/download/build-20250829-024446/salary-system-v3-build-20250829-024446.zip"
    echo
    echo "说明:"
    echo "  - 脚本会自动使用 ghfast.top 加速下载"
    echo "  - 自动备份现有文件到 ${BACKUP_DIR}"
    echo "  - 解压并部署新版本到 ${DEPLOY_TARGET}"
    exit 1
fi

GITHUB_DOWNLOAD_LINK="$1"

# 验证下载链接格式
if [[ ! "$GITHUB_DOWNLOAD_LINK" =~ ^https://github\.com/.*/releases/download/.* ]]; then
    log_error "无效的 GitHub 下载链接格式"
    log_info "链接应该类似: https://github.com/user/repo/releases/download/tag/file.zip"
    exit 1
fi

# 提取文件名
FILENAME=$(basename "$GITHUB_DOWNLOAD_LINK")
if [[ ! "$FILENAME" =~ \.zip$ ]]; then
    log_error "只支持 ZIP 格式的下载文件"
    exit 1
fi

# 创建临时工作目录
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

log_info "🚀 开始部署薪资管理系统 V3..."
log_info "下载链接: $GITHUB_DOWNLOAD_LINK"
log_info "目标目录: $DEPLOY_TARGET"
log_info "临时目录: $TEMP_DIR"

# 步骤 1: 检查目标目录权限
log_info "📋 检查目标目录和权限..."
if [ ! -d "$DEPLOY_BASE" ]; then
    log_error "部署基础目录不存在: $DEPLOY_BASE"
    exit 1
fi

if [ ! -w "$DEPLOY_BASE" ]; then
    log_error "没有部署目录的写权限: $DEPLOY_BASE"
    log_info "请使用 sudo 运行此脚本或检查目录权限"
    exit 1
fi

# 步骤 2: 下载构建包
log_info "📥 从 GitHub 下载构建包 (使用 ghfast.top 加速)..."
ACCELERATED_LINK="${DOWNLOAD_PROXY}/${GITHUB_DOWNLOAD_LINK}"
cd "$TEMP_DIR"

if ! wget -t 3 -T 30 "$ACCELERATED_LINK" -O "$FILENAME"; then
    log_warning "加速下载失败，尝试直接下载..."
    if ! wget -t 3 -T 30 "$GITHUB_DOWNLOAD_LINK" -O "$FILENAME"; then
        log_error "下载失败，请检查网络连接和下载链接"
        exit 1
    fi
fi

log_success "下载完成: $FILENAME ($(du -h "$FILENAME" | cut -f1))"

# 步骤 3: 验证并解压文件
log_info "📦 解压构建包..."
if ! unzip -q "$FILENAME"; then
    log_error "解压失败，文件可能损坏"
    exit 1
fi

# 查找解压后的目录结构
EXTRACT_DIRS=$(find . -maxdepth 2 -name "salary-system-v3" -type d | head -1)
if [ -z "$EXTRACT_DIRS" ]; then
    log_error "在解压文件中找不到 salary-system-v3 目录"
    log_info "解压内容:"
    ls -la
    exit 1
fi

BUILD_DIR="$TEMP_DIR/$EXTRACT_DIRS"
log_success "找到构建目录: $BUILD_DIR"

# 验证构建目录内容
if [ ! -f "$BUILD_DIR/index.html" ]; then
    log_error "构建目录中缺少 index.html 文件"
    log_info "构建目录内容:"
    ls -la "$BUILD_DIR"
    exit 1
fi

BUILD_FILE_COUNT=$(find "$BUILD_DIR" -type f | wc -l)
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
log_info "构建包统计: $BUILD_FILE_COUNT 个文件, 总大小 $BUILD_SIZE"

# 步骤 4: 备份现有文件
if [ -d "$DEPLOY_TARGET" ]; then
    log_info "💾 备份现有部署文件..."
    
    # 创建备份目录
    mkdir -p "$BACKUP_DIR"
    
    # 生成备份文件名
    BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/backup-${BACKUP_TIMESTAMP}.tar.gz"
    
    # 创建备份
    if tar -czf "$BACKUP_FILE" -C "$DEPLOY_TARGET" . 2>/dev/null; then
        BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
        log_success "备份完成: $BACKUP_FILE ($BACKUP_SIZE)"
        
        # 保留最近5个备份文件
        BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | wc -l)
        if [ "$BACKUP_COUNT" -gt 5 ]; then
            log_info "清理旧备份文件 (保留最近5个)..."
            ls -1t "$BACKUP_DIR"/backup-*.tar.gz | tail -n +6 | xargs rm -f
        fi
    else
        log_warning "备份创建失败，但继续部署"
    fi
else
    log_info "目标目录不存在，跳过备份"
fi

# 步骤 5: 清空目标目录
log_info "🗑️  清空目标部署目录..."
rm -rf "$DEPLOY_TARGET"
mkdir -p "$DEPLOY_TARGET"

# 步骤 6: 复制新文件
log_info "📋 复制新构建文件到目标目录..."
if cp -r "$BUILD_DIR"/* "$DEPLOY_TARGET"/; then
    DEPLOYED_COUNT=$(find "$DEPLOY_TARGET" -type f | wc -l)
    DEPLOYED_SIZE=$(du -sh "$DEPLOY_TARGET" | cut -f1)
    log_success "部署完成: $DEPLOYED_COUNT 个文件, 总大小 $DEPLOYED_SIZE"
else
    log_error "文件复制失败"
    exit 1
fi

# 步骤 7: 设置权限
log_info "🔐 设置文件权限..."
chmod -R 644 "$DEPLOY_TARGET"/*
find "$DEPLOY_TARGET" -type d -exec chmod 755 {} \;

# 步骤 8: 验证部署
log_info "✅ 验证部署结果..."
if [ -f "$DEPLOY_TARGET/index.html" ]; then
    log_success "部署验证通过: index.html 存在"
else
    log_error "部署验证失败: 缺少 index.html"
    exit 1
fi

# 显示部署总结
echo
log_success "🎉 部署完成！"
echo
echo "📊 部署统计:"
echo "  - 下载文件: $FILENAME"
echo "  - 构建文件数: $BUILD_FILE_COUNT 个"
echo "  - 部署大小: $DEPLOYED_SIZE"
echo "  - 部署路径: $DEPLOY_TARGET"
if [ -n "$BACKUP_FILE" ]; then
    echo "  - 备份文件: $BACKUP_FILE"
fi
echo
echo "🌐 访问地址: https://gz.gaoxin.net.cn"
echo
echo "🔧 管理命令:"
echo "  - 查看文件: ls -la $DEPLOY_TARGET"
echo "  - 查看备份: ls -la $BACKUP_DIR"
echo "  - 恢复备份: tar -xzf <备份文件> -C $DEPLOY_TARGET"
echo
log_success "部署脚本执行完成！"