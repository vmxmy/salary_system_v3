#!/bin/bash

# ============================================
# 私有服务器回滚脚本
# ============================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 获取当前部署版本
get_current_version() {
    if [[ -L current ]]; then
        readlink current
    else
        echo ""
    fi
}

# 获取上一个可用版本
get_previous_version() {
    local current_version=$(get_current_version)
    
    # 获取所有发布版本，按时间倒序
    local versions=($(ls -t releases/ 2>/dev/null || true))
    
    for version in "${versions[@]}"; do
        if [[ "$version" != "$(basename "$current_version")" ]] && [[ -d "releases/$version" ]]; then
            echo "releases/$version"
            return 0
        fi
    done
    
    echo ""
}

# 检查版本是否可用
check_version_availability() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        log_error "没有找到可回滚的版本"
        return 1
    fi
    
    if [[ ! -d "$version" ]]; then
        log_error "版本目录不存在: $version"
        return 1
    fi
    
    if [[ ! -f "$version/docker-compose.prod.yml" ]]; then
        log_error "版本配置文件不存在: $version/docker-compose.prod.yml"
        return 1
    fi
    
    return 0
}

# 停止当前服务
stop_current_service() {
    log_info "停止当前运行的服务..."
    
    if docker-compose -f shared/docker-compose.prod.yml ps -q | grep -q .; then
        docker-compose -f shared/docker-compose.prod.yml down --timeout 30
        log_success "当前服务已停止"
    else
        log_info "没有运行中的服务需要停止"
    fi
}

# 启动指定版本的服务
start_version_service() {
    local version="$1"
    
    log_info "启动版本服务: $version"
    
    # 复制配置文件到共享目录
    if [[ -f "$version/docker-compose.prod.yml" ]]; then
        cp "$version/docker-compose.prod.yml" shared/
    fi
    
    if [[ -f "$version/nginx.conf" ]]; then
        cp "$version/nginx.conf" shared/
    fi
    
    # 从版本目录中获取镜像标签
    if [[ -f "$version/.image_tag" ]]; then
        export IMAGE_TAG=$(cat "$version/.image_tag")
        log_info "使用镜像标签: $IMAGE_TAG"
    else
        log_warning "未找到镜像标签文件，使用默认配置"
    fi
    
    # 启动服务
    if docker-compose -f shared/docker-compose.prod.yml up -d; then
        log_success "版本服务启动成功"
        return 0
    else
        log_error "版本服务启动失败"
        return 1
    fi
}

# 等待服务就绪
wait_for_service_ready() {
    log_info "等待服务就绪..."
    
    local max_attempts=60
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost/health > /dev/null 2>&1; then
            log_success "服务就绪 (尝试 $attempt/$max_attempts)"
            return 0
        fi
        
        log_info "等待服务启动... (尝试 $attempt/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    log_error "服务启动超时"
    return 1
}

# 健康检查
health_check() {
    log_info "执行应用健康检查..."
    
    local endpoints=(
        "http://localhost/health"
        "http://localhost/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null 2>&1; then
            log_success "健康检查通过: $endpoint"
        else
            log_error "健康检查失败: $endpoint"
            return 1
        fi
    done
    
    return 0
}

# 更新当前版本符号链接
update_current_symlink() {
    local version="$1"
    
    log_info "更新当前版本符号链接..."
    
    if ln -sfn "$version" current; then
        log_success "符号链接已更新到: $version"
    else
        log_error "符号链接更新失败"
        return 1
    fi
}

# 记录回滚日志
log_rollback() {
    local from_version="$1"
    local to_version="$2"
    local status="$3"
    
    local log_file="rollback.log"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] 回滚操作: $from_version -> $to_version | 状态: $status" >> "$log_file"
}

# 自动回滚到上一个版本
auto_rollback() {
    log_warning "开始自动回滚..."
    
    local current_version=$(get_current_version)
    local previous_version=$(get_previous_version)
    
    log_info "当前版本: ${current_version:-"未知"}"
    log_info "目标版本: ${previous_version:-"未知"}"
    
    # 检查目标版本可用性
    if ! check_version_availability "$previous_version"; then
        log_error "自动回滚失败：目标版本不可用"
        log_rollback "$current_version" "$previous_version" "失败"
        exit 1
    fi
    
    # 执行回滚
    stop_current_service
    
    if start_version_service "$previous_version"; then
        if wait_for_service_ready && health_check; then
            update_current_symlink "$previous_version"
            log_success "🎉 自动回滚成功完成！"
            log_rollback "$current_version" "$previous_version" "成功"
            
            echo "============================================"
            echo "回滚详情:"
            echo "- 时间: $(date)"
            echo "- 从版本: ${current_version:-"未知"}"
            echo "- 到版本: $previous_version"
            echo "- 状态: ✅ 成功"
            echo "============================================"
        else
            log_error "回滚后健康检查失败"
            log_rollback "$current_version" "$previous_version" "健康检查失败"
            exit 1
        fi
    else
        log_error "回滚失败：无法启动目标版本服务"
        log_rollback "$current_version" "$previous_version" "启动失败"
        exit 1
    fi
}

# 回滚到指定版本
rollback_to_version() {
    local target_version="$1"
    
    log_warning "开始回滚到指定版本: $target_version"
    
    local current_version=$(get_current_version)
    
    # 验证目标版本
    if [[ ! -d "releases/$target_version" ]]; then
        log_error "目标版本不存在: $target_version"
        exit 1
    fi
    
    local full_target_path="releases/$target_version"
    
    if ! check_version_availability "$full_target_path"; then
        log_error "目标版本不可用: $target_version"
        exit 1
    fi
    
    # 执行回滚
    stop_current_service
    
    if start_version_service "$full_target_path"; then
        if wait_for_service_ready && health_check; then
            update_current_symlink "$full_target_path"
            log_success "🎉 指定版本回滚成功完成！"
            log_rollback "$current_version" "$full_target_path" "成功"
            
            echo "============================================"
            echo "回滚详情:"
            echo "- 时间: $(date)"
            echo "- 从版本: ${current_version:-"未知"}"
            echo "- 到版本: $full_target_path"
            echo "- 状态: ✅ 成功"
            echo "============================================"
        else
            log_error "回滚后健康检查失败"
            log_rollback "$current_version" "$full_target_path" "健康检查失败"
            exit 1
        fi
    else
        log_error "回滚失败：无法启动目标版本服务"
        log_rollback "$current_version" "$full_target_path" "启动失败"
        exit 1
    fi
}

# 列出可用版本
list_available_versions() {
    log_info "可用的部署版本:"
    
    local current_version=$(get_current_version)
    local versions=($(ls -t releases/ 2>/dev/null || true))
    
    if [[ ${#versions[@]} -eq 0 ]]; then
        log_warning "没有找到可用的版本"
        return 1
    fi
    
    echo "============================================"
    printf "%-20s %-10s %-15s\n" "版本" "状态" "创建时间"
    echo "--------------------------------------------"
    
    for version in "${versions[@]}"; do
        local status="可用"
        local version_path="releases/$version"
        
        if [[ "$version_path" == "$current_version" ]]; then
            status="当前"
        fi
        
        if [[ -d "$version_path" ]]; then
            local create_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$version_path" 2>/dev/null || echo "未知")
            printf "%-20s %-10s %-15s\n" "$version" "$status" "$create_time"
        fi
    done
    echo "============================================"
}

# 显示帮助信息
show_help() {
    cat << EOF
私有服务器回滚脚本

用法:
    $0 [选项] [版本]

选项:
    -h, --help          显示此帮助信息
    -l, --list          列出所有可用版本
    -a, --auto          自动回滚到上一个版本 (默认)
    -v, --version VER   回滚到指定版本

示例:
    $0                          # 自动回滚到上一个版本
    $0 --auto                   # 自动回滚到上一个版本
    $0 --list                   # 列出所有可用版本
    $0 --version 20240101_120000 # 回滚到指定版本

注意:
    - 回滚会停止当前服务并启动目标版本
    - 回滚过程包含健康检查验证
    - 所有操作都会记录到 rollback.log
EOF
}

# 错误处理
trap 'log_error "回滚过程中发生错误，退出码: $?"' ERR

# 主函数
main() {
    log_info "开始执行回滚操作"
    log_info "回滚时间: $(date)"
    
    # 解析命令行参数
    case "${1:-auto}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -l|--list)
            list_available_versions
            exit 0
            ;;
        -a|--auto|auto)
            auto_rollback
            ;;
        -v|--version)
            if [[ -z "${2:-}" ]]; then
                log_error "请指定版本号"
                show_help
                exit 1
            fi
            rollback_to_version "$2"
            ;;
        *)
            if [[ "$1" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
                # 如果参数看起来像版本号，直接回滚
                rollback_to_version "$1"
            else
                log_error "未知选项: $1"
                show_help
                exit 1
            fi
            ;;
    esac
}

# 运行主函数
main "$@"