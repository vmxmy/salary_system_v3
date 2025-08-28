#!/bin/bash

# ============================================
# Docker容器健康检查脚本
# ============================================

set -euo pipefail

# 配置变量
HEALTH_CHECK_URL="http://localhost:80/health"
MAIN_APP_URL="http://localhost:80/"
TIMEOUT=10
MAX_RETRIES=3

# 颜色输出（如果支持）
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# 日志函数
log_info() {
    echo -e "${BLUE}[HEALTH]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[HEALTHY]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[UNHEALTHY]${NC} $1" >&2
}

# 检查必要的命令是否可用
check_dependencies() {
    local missing_deps=()
    
    for cmd in curl; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "缺少必要的命令: ${missing_deps[*]}"
        return 1
    fi
    
    return 0
}

# HTTP健康检查
http_health_check() {
    local url="$1"
    local description="$2"
    
    log_info "检查 $description: $url"
    
    if curl -f -s --max-time "$TIMEOUT" "$url" > /dev/null 2>&1; then
        log_success "$description 响应正常"
        return 0
    else
        log_error "$description 响应异常"
        return 1
    fi
}

# 检查Nginx进程
check_nginx_process() {
    log_info "检查Nginx进程状态..."
    
    if pgrep nginx > /dev/null 2>&1; then
        log_success "Nginx进程运行正常"
        return 0
    else
        log_error "Nginx进程未运行"
        return 1
    fi
}

# 检查端口监听状态
check_port_listening() {
    local port="$1"
    
    log_info "检查端口 $port 监听状态..."
    
    if netstat -tlnp 2>/dev/null | grep ":$port " > /dev/null 2>&1; then
        log_success "端口 $port 监听正常"
        return 0
    elif ss -tlnp 2>/dev/null | grep ":$port " > /dev/null 2>&1; then
        log_success "端口 $port 监听正常"
        return 0
    else
        log_error "端口 $port 未监听"
        return 1
    fi
}

# 检查磁盘空间
check_disk_space() {
    local threshold=90
    
    log_info "检查磁盘空间使用情况..."
    
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $usage -lt $threshold ]]; then
        log_success "磁盘空间使用率: ${usage}% (正常)"
        return 0
    else
        log_warning "磁盘空间使用率: ${usage}% (超过阈值 ${threshold}%)"
        return 1
    fi
}

# 检查内存使用情况
check_memory_usage() {
    local threshold=90
    
    log_info "检查内存使用情况..."
    
    if command -v free &> /dev/null; then
        local memory_usage=$(free | awk '/^Mem:/ {printf "%.0f", ($3/$2)*100}')
        
        if [[ $memory_usage -lt $threshold ]]; then
            log_success "内存使用率: ${memory_usage}% (正常)"
            return 0
        else
            log_warning "内存使用率: ${memory_usage}% (超过阈值 ${threshold}%)"
            return 1
        fi
    else
        log_warning "无法检查内存使用情况 (free命令不可用)"
        return 0
    fi
}

# 详细健康检查
detailed_health_check() {
    log_info "执行详细健康检查..."
    
    local checks_passed=0
    local total_checks=0
    
    # HTTP端点检查
    ((total_checks++))
    if http_health_check "$HEALTH_CHECK_URL" "健康检查端点"; then
        ((checks_passed++))
    fi
    
    ((total_checks++))
    if http_health_check "$MAIN_APP_URL" "主应用端点"; then
        ((checks_passed++))
    fi
    
    # 进程检查
    ((total_checks++))
    if check_nginx_process; then
        ((checks_passed++))
    fi
    
    # 端口检查
    ((total_checks++))
    if check_port_listening "80"; then
        ((checks_passed++))
    fi
    
    # 系统资源检查
    ((total_checks++))
    if check_disk_space; then
        ((checks_passed++))
    fi
    
    ((total_checks++))
    if check_memory_usage; then
        ((checks_passed++))
    fi
    
    log_info "健康检查结果: $checks_passed/$total_checks 项通过"
    
    # 如果关键检查（前4项）全部通过，认为健康
    if [[ $checks_passed -ge 4 ]] && http_health_check "$HEALTH_CHECK_URL" "健康检查端点" && check_nginx_process; then
        return 0
    else
        return 1
    fi
}

# 快速健康检查
quick_health_check() {
    log_info "执行快速健康检查..."
    
    # 只检查最关键的端点
    if http_health_check "$HEALTH_CHECK_URL" "健康检查端点"; then
        return 0
    else
        return 1
    fi
}

# 重试机制的健康检查
health_check_with_retry() {
    local check_type="${1:-quick}"
    local retry_count=0
    
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if [[ $retry_count -gt 0 ]]; then
            log_info "重试健康检查 ($((retry_count + 1))/$MAX_RETRIES)..."
            sleep 2
        fi
        
        if [[ "$check_type" == "detailed" ]]; then
            if detailed_health_check; then
                log_success "健康检查通过 (尝试 $((retry_count + 1))/$MAX_RETRIES)"
                return 0
            fi
        else
            if quick_health_check; then
                log_success "健康检查通过 (尝试 $((retry_count + 1))/$MAX_RETRIES)"
                return 0
            fi
        fi
        
        ((retry_count++))
    done
    
    log_error "健康检查失败 (已重试 $MAX_RETRIES 次)"
    return 1
}

# 显示帮助信息
show_help() {
    cat << EOF
Docker容器健康检查脚本

用法:
    $0 [选项]

选项:
    -h, --help          显示此帮助信息
    -q, --quick         执行快速健康检查 (仅检查关键端点)
    -d, --detailed      执行详细健康检查 (检查所有项目)
    -t, --timeout SEC   设置HTTP请求超时时间 (默认: $TIMEOUT 秒)
    -r, --retries NUM   设置最大重试次数 (默认: $MAX_RETRIES 次)

退出码:
    0 - 健康检查通过
    1 - 健康检查失败
    2 - 参数错误

示例:
    $0                  # 快速健康检查
    $0 --quick          # 快速健康检查
    $0 --detailed       # 详细健康检查
    $0 -t 30 -r 5       # 自定义超时和重试次数

注意:
    - 此脚本设计用于Docker容器健康检查
    - 支持在有限的容器环境中运行
    - 日志输出到stderr，避免干扰健康检查结果
EOF
}

# 主函数
main() {
    local check_type="quick"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -q|--quick)
                check_type="quick"
                shift
                ;;
            -d|--detailed)
                check_type="detailed"
                shift
                ;;
            -t|--timeout)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
                    TIMEOUT="$2"
                    shift 2
                else
                    log_error "无效的超时时间: ${2:-}"
                    exit 2
                fi
                ;;
            -r|--retries)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
                    MAX_RETRIES="$2"
                    shift 2
                else
                    log_error "无效的重试次数: ${2:-}"
                    exit 2
                fi
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 2
                ;;
        esac
    done
    
    # 检查依赖
    if ! check_dependencies; then
        log_error "依赖检查失败"
        exit 1
    fi
    
    # 执行健康检查
    log_info "开始健康检查 (类型: $check_type, 超时: ${TIMEOUT}s, 重试: $MAX_RETRIES)"
    
    if health_check_with_retry "$check_type"; then
        log_success "🎉 容器健康状态良好"
        exit 0
    else
        log_error "❌ 容器健康状态异常"
        exit 1
    fi
}

# 运行主函数
main "$@"