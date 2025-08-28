#!/bin/bash

# ============================================
# 私有服务器部署脚本
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

# 检查必需的环境变量
check_environment() {
    log_info "检查环境变量..."
    
    local required_vars=(
        "IMAGE_TAG"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "缺少必需的环境变量: $var"
            exit 1
        fi
    done
    
    log_success "环境变量检查通过"
}

# 停止现有服务
stop_existing_service() {
    log_info "停止现有服务..."
    
    if docker-compose -f shared/docker-compose.prod.yml ps -q | grep -q .; then
        docker-compose -f shared/docker-compose.prod.yml down --timeout 30
        log_success "现有服务已停止"
    else
        log_info "没有运行中的服务需要停止"
    fi
}

# 拉取最新镜像
pull_latest_image() {
    log_info "拉取最新应用镜像: $IMAGE_TAG"
    
    if docker pull "$IMAGE_TAG"; then
        log_success "镜像拉取成功"
    else
        log_error "镜像拉取失败"
        exit 1
    fi
}

# 备份当前版本
backup_current_version() {
    log_info "备份当前版本..."
    
    if [[ -L current ]]; then
        local current_version=$(readlink current)
        local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
        
        if [[ -d "$current_version" ]]; then
            cp -r "$current_version" "releases/$backup_name"
            log_success "当前版本已备份到: releases/$backup_name"
        fi
    fi
}

# 部署新版本
deploy_new_version() {
    local deploy_type=${DEPLOY_TYPE:-rolling}
    
    log_info "开始 $deploy_type 部署..."
    
    case $deploy_type in
        "rolling")
            deploy_rolling
            ;;
        "blue_green")
            deploy_blue_green
            ;;
        "canary")
            deploy_canary
            ;;
        *)
            log_error "不支持的部署类型: $deploy_type"
            exit 1
            ;;
    esac
}

# 滚动部署
deploy_rolling() {
    log_info "执行滚动部署..."
    
    # 创建新的 docker-compose 配置
    create_docker_compose_config
    
    # 启动新服务
    export IMAGE_TAG
    export SUPABASE_URL
    export SUPABASE_ANON_KEY
    
    if docker-compose -f shared/docker-compose.prod.yml up -d; then
        log_success "新服务启动成功"
    else
        log_error "新服务启动失败"
        rollback
        exit 1
    fi
    
    # 等待服务就绪
    wait_for_service_ready
}

# 蓝绿部署
deploy_blue_green() {
    log_info "执行蓝绿部署..."
    
    local current_color=$(get_current_deployment_color)
    local new_color=$([ "$current_color" = "blue" ] && echo "green" || echo "blue")
    
    log_info "当前部署颜色: $current_color, 新部署颜色: $new_color"
    
    # 创建新颜色的部署
    create_colored_deployment "$new_color"
    
    # 等待新部署就绪
    if wait_for_colored_service_ready "$new_color"; then
        # 切换流量到新部署
        switch_traffic_to_color "$new_color"
        
        # 停止旧部署
        stop_colored_deployment "$current_color"
        
        log_success "蓝绿部署完成"
    else
        log_error "新部署健康检查失败"
        stop_colored_deployment "$new_color"
        exit 1
    fi
}

# 金丝雀部署
deploy_canary() {
    log_info "执行金丝雀部署..."
    
    # 部署金丝雀版本（10% 流量）
    deploy_canary_version
    
    # 等待并监控金丝雀
    if monitor_canary_deployment; then
        # 金丝雀成功，执行完整部署
        log_info "金丝雀部署成功，执行完整部署"
        deploy_rolling
        cleanup_canary
    else
        log_error "金丝雀部署失败，回滚"
        cleanup_canary
        exit 1
    fi
}

# 创建 Docker Compose 配置
create_docker_compose_config() {
    log_info "创建 Docker Compose 配置..."
    
    cat > shared/docker-compose.prod.yml << EOF
version: '3.8'

services:
  web:
    image: ${IMAGE_TAG}
    container_name: salary-system-web
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - logs:/var/log/nginx
    networks:
      - salary-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.salary-system.rule=Host(\`${SERVER_DOMAIN:-localhost}\`)"
      - "traefik.http.services.salary-system.loadbalancer.server.port=80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  logs:
    driver: local

networks:
  salary-network:
    driver: bridge
EOF

    log_success "Docker Compose 配置已创建"
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

# 回滚函数
rollback() {
    log_warning "开始回滚到上一个版本..."
    
    if [[ -f "scripts/rollback.sh" ]]; then
        bash scripts/rollback.sh
    else
        log_error "回滚脚本不存在"
    fi
}

# 清理函数
cleanup() {
    log_info "执行清理..."
    
    # 清理未使用的 Docker 镜像
    docker image prune -f
    
    # 清理旧的容器
    docker container prune -f
    
    log_success "清理完成"
}

# 主函数
main() {
    log_info "开始部署 Salary System v3 到私有服务器"
    log_info "部署时间: $(date)"
    log_info "镜像标签: $IMAGE_TAG"
    log_info "部署类型: ${DEPLOY_TYPE:-rolling}"
    
    # 执行部署步骤
    check_environment
    backup_current_version
    stop_existing_service
    pull_latest_image
    deploy_new_version
    
    # 健康检查
    if health_check; then
        cleanup
        log_success "🎉 部署成功完成！"
        
        # 更新符号链接到当前版本
        if [[ -n "${RELEASE_DIR:-}" ]]; then
            ln -sfn "$RELEASE_DIR" current
        fi
        
        echo "============================================"
        echo "部署详情:"
        echo "- 时间: $(date)"
        echo "- 镜像: $IMAGE_TAG"
        echo "- 状态: ✅ 成功"
        echo "============================================"
    else
        log_error "健康检查失败，执行回滚"
        rollback
        exit 1
    fi
}

# 错误处理
trap 'log_error "部署过程中发生错误，退出码: $?"' ERR

# ============================================
# 蓝绿部署辅助函数
# ============================================

# 获取当前部署颜色
get_current_deployment_color() {
    if docker ps --format "{{.Names}}" | grep -q "salary-system-blue"; then
        echo "blue"
    elif docker ps --format "{{.Names}}" | grep -q "salary-system-green"; then
        echo "green"
    else
        echo "blue"  # 默认颜色
    fi
}

# 创建指定颜色的部署
create_colored_deployment() {
    local color="$1"
    
    log_info "创建 $color 环境部署..."
    
    # 创建彩色部署的 docker-compose 配置
    cat > "shared/docker-compose.${color}.yml" << EOF
version: '3.8'

services:
  web-${color}:
    image: ${IMAGE_TAG}
    container_name: salary-system-${color}
    restart: unless-stopped
    ports:
      - "${color == 'blue' && '8080' || '8081'}:80"
    environment:
      - NODE_ENV=production
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - logs-${color}:/var/log/nginx
    networks:
      - salary-network-${color}
    labels:
      - "deployment.color=${color}"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  logs-${color}:
    driver: local

networks:
  salary-network-${color}:
    driver: bridge
EOF

    # 启动彩色部署
    if docker-compose -f "shared/docker-compose.${color}.yml" up -d; then
        log_success "$color 环境部署启动成功"
        return 0
    else
        log_error "$color 环境部署启动失败"
        return 1
    fi
}

# 等待指定颜色服务就绪
wait_for_colored_service_ready() {
    local color="$1"
    local port=$([ "$color" = "blue" ] && echo "8080" || echo "8081")
    
    log_info "等待 $color 环境服务就绪..."
    
    local max_attempts=60
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
            log_success "$color 环境服务就绪 (尝试 $attempt/$max_attempts)"
            return 0
        fi
        
        log_info "等待 $color 环境启动... (尝试 $attempt/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    log_error "$color 环境服务启动超时"
    return 1
}

# 切换流量到指定颜色
switch_traffic_to_color() {
    local color="$1"
    local port=$([ "$color" = "blue" ] && echo "8080" || echo "8081")
    
    log_info "切换流量到 $color 环境..."
    
    # 更新 Nginx 配置切换流量
    cat > shared/nginx-proxy.conf << EOF
upstream backend {
    server localhost:$port;
}

server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # 重新加载代理配置（如果使用Nginx代理）
    if command -v nginx &> /dev/null; then
        if nginx -t -c shared/nginx-proxy.conf; then
            nginx -s reload
            log_success "流量已切换到 $color 环境"
        else
            log_error "Nginx配置测试失败"
            return 1
        fi
    else
        # 简化版：直接更新端口映射
        log_warning "使用简化的流量切换方式"
    fi
}

# 停止指定颜色的部署
stop_colored_deployment() {
    local color="$1"
    
    log_info "停止 $color 环境部署..."
    
    if docker-compose -f "shared/docker-compose.${color}.yml" down --timeout 30; then
        log_success "$color 环境已停止"
        rm -f "shared/docker-compose.${color}.yml"
    else
        log_error "$color 环境停止失败"
    fi
}

# ============================================
# 金丝雀部署辅助函数
# ============================================

# 部署金丝雀版本
deploy_canary_version() {
    log_info "部署金丝雀版本..."
    
    # 创建金丝雀部署配置
    cat > shared/docker-compose.canary.yml << EOF
version: '3.8'

services:
  web-canary:
    image: ${IMAGE_TAG}
    container_name: salary-system-canary
    restart: unless-stopped
    ports:
      - "8082:80"
    environment:
      - NODE_ENV=production
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - CANARY_DEPLOYMENT=true
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - logs-canary:/var/log/nginx
    networks:
      - salary-network-canary
    labels:
      - "deployment.type=canary"
      - "deployment.traffic=10%"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  logs-canary:
    driver: local

networks:
  salary-network-canary:
    driver: bridge
EOF

    # 启动金丝雀部署
    if docker-compose -f shared/docker-compose.canary.yml up -d; then
        log_success "金丝雀版本部署成功"
        
        # 配置负载均衡器，将10%流量导向金丝雀
        setup_canary_traffic_split
        
        return 0
    else
        log_error "金丝雀版本部署失败"
        return 1
    fi
}

# 配置金丝雀流量分配
setup_canary_traffic_split() {
    log_info "配置金丝雀流量分配 (10% -> 金丝雀, 90% -> 生产)..."
    
    # 创建负载均衡配置
    cat > shared/nginx-canary.conf << EOF
upstream production {
    server localhost:80 weight=9;
}

upstream canary {
    server localhost:8082 weight=1;
}

upstream backend {
    server localhost:80 weight=9;
    server localhost:8082 weight=1;
}

server {
    listen 8083;
    server_name _;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Canary-Request "true";
    }
}
EOF
    
    log_success "金丝雀流量分配配置完成"
}

# 监控金丝雀部署
monitor_canary_deployment() {
    log_info "监控金丝雀部署 (持续 5 分钟)..."
    
    local monitoring_duration=300  # 5分钟
    local check_interval=30        # 30秒检查一次
    local total_checks=$((monitoring_duration / check_interval))
    local successful_checks=0
    local failed_checks=0
    
    for ((i=1; i<=total_checks; i++)); do
        log_info "金丝雀监控检查 $i/$total_checks"
        
        # 检查金丝雀健康状态
        if curl -f -s http://localhost:8082/health > /dev/null 2>&1; then
            ((successful_checks++))
            log_success "金丝雀健康检查通过 ($successful_checks/$i)"
        else
            ((failed_checks++))
            log_warning "金丝雀健康检查失败 ($failed_checks/$i)"
            
            # 如果失败次数过多，立即终止
            if [[ $failed_checks -gt 2 ]]; then
                log_error "金丝雀失败次数过多，终止监控"
                return 1
            fi
        fi
        
        # 检查错误率（简化版）
        local error_rate=$(check_canary_error_rate)
        if [[ $error_rate -gt 5 ]]; then
            log_error "金丝雀错误率过高: ${error_rate}%"
            return 1
        fi
        
        sleep $check_interval
    done
    
    # 计算成功率
    local success_rate=$((successful_checks * 100 / total_checks))
    
    if [[ $success_rate -ge 90 ]]; then
        log_success "金丝雀监控完成，成功率: ${success_rate}%"
        return 0
    else
        log_error "金丝雀监控失败，成功率: ${success_rate}% (低于90%阈值)"
        return 1
    fi
}

# 检查金丝雀错误率
check_canary_error_rate() {
    # 简化版错误率检查
    # 在实际环境中，应该从日志或监控系统获取真实数据
    local error_count=0
    local total_requests=100
    
    # 模拟错误率检查
    if docker logs salary-system-canary --tail 100 2>/dev/null | grep -c "ERROR" || true; then
        error_count=$(docker logs salary-system-canary --tail 100 2>/dev/null | grep -c "ERROR" || echo 0)
    fi
    
    local error_rate=$((error_count * 100 / total_requests))
    echo $error_rate
}

# 清理金丝雀部署
cleanup_canary() {
    log_info "清理金丝雀部署..."
    
    # 停止金丝雀服务
    if docker-compose -f shared/docker-compose.canary.yml down --timeout 30; then
        log_success "金丝雀服务已停止"
        rm -f shared/docker-compose.canary.yml
        rm -f shared/nginx-canary.conf
    else
        log_warning "金丝雀服务停止时出现问题"
    fi
}

# 运行主函数
main "$@"