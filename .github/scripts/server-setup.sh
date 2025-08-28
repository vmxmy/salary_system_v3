#!/bin/bash

# ============================================
# 私有服务器环境准备脚本
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

# 系统信息检查
check_system_info() {
    log_info "检查系统信息..."
    
    echo "============================================"
    echo "系统信息:"
    echo "- 操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "- 内核版本: $(uname -r)"
    echo "- 架构: $(uname -m)"
    echo "- 内存: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "- 磁盘: $(df -h / | awk 'NR==2 {print $2 " (可用:" $4 ")"}')"
    echo "- CPU: $(nproc) 核"
    echo "============================================"
    
    log_success "系统信息检查完成"
}

# 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."
    
    local requirements_met=true
    
    # 检查内存（至少 2GB）
    local memory_gb=$(free -g | awk '/^Mem:/ {print $2}')
    if [[ $memory_gb -lt 2 ]]; then
        log_error "内存不足：${memory_gb}GB < 2GB (推荐)"
        requirements_met=false
    else
        log_success "内存充足：${memory_gb}GB"
    fi
    
    # 检查磁盘空间（至少 10GB 可用）
    local disk_gb=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $disk_gb -lt 10 ]]; then
        log_error "磁盘空间不足：${disk_gb}GB < 10GB (推荐)"
        requirements_met=false
    else
        log_success "磁盘空间充足：${disk_gb}GB"
    fi
    
    # 检查网络连接
    if ping -c 1 google.com > /dev/null 2>&1; then
        log_success "网络连接正常"
    else
        log_error "网络连接异常"
        requirements_met=false
    fi
    
    if [[ "$requirements_met" != "true" ]]; then
        log_error "系统要求检查失败"
        return 1
    fi
    
    log_success "系统要求检查通过"
    return 0
}

# 更新系统包
update_system_packages() {
    log_info "更新系统包..."
    
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get upgrade -y
        log_success "APT 包更新完成"
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum update -y
        log_success "YUM 包更新完成"
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf update -y
        log_success "DNF 包更新完成"
    else
        log_warning "未识别的包管理器，跳过系统更新"
    fi
}

# 安装基本工具
install_basic_tools() {
    log_info "安装基本工具..."
    
    local tools=(
        "curl"
        "wget"
        "git"
        "unzip"
        "vim"
        "htop"
        "tree"
        "jq"
        "nc"
        "telnet"
    )
    
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        for tool in "${tools[@]}"; do
            if ! command -v "$tool" &> /dev/null; then
                log_info "安装 $tool..."
                sudo apt-get install -y "$tool"
            else
                log_info "$tool 已安装"
            fi
        done
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        for tool in "${tools[@]}"; do
            if ! command -v "$tool" &> /dev/null; then
                log_info "安装 $tool..."
                sudo yum install -y "$tool"
            else
                log_info "$tool 已安装"
            fi
        done
    else
        log_warning "未识别的包管理器，跳过工具安装"
        return 0
    fi
    
    log_success "基本工具安装完成"
}

# 安装 Docker
install_docker() {
    log_info "安装 Docker..."
    
    if command -v docker &> /dev/null; then
        log_info "Docker 已安装，版本: $(docker --version)"
        return 0
    fi
    
    # 安装 Docker 官方仓库密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 添加 Docker 仓库
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 更新包列表并安装 Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # 启动并启用 Docker 服务
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 将当前用户添加到 docker 组
    sudo usermod -aG docker $USER
    
    log_success "Docker 安装完成"
    log_warning "请注销并重新登录以使用 Docker 命令"
}

# 安装 Docker Compose
install_docker_compose() {
    log_info "安装 Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        log_info "Docker Compose 已安装，版本: $(docker-compose --version)"
        return 0
    fi
    
    # 下载并安装 Docker Compose
    local compose_version="v2.24.1"
    sudo curl -L "https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 添加执行权限
    sudo chmod +x /usr/local/bin/docker-compose
    
    # 创建符号链接
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose 安装完成，版本: $(docker-compose --version)"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu UFW
        sudo ufw --force enable
        
        # 允许 SSH
        sudo ufw allow ssh
        
        # 允许 HTTP 和 HTTPS
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # 允许应用端口（如果需要）
        sudo ufw allow 8080/tcp
        sudo ufw allow 8081/tcp
        sudo ufw allow 8082/tcp
        sudo ufw allow 8083/tcp
        
        log_success "UFW 防火墙配置完成"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL FirewallD
        sudo systemctl start firewalld
        sudo systemctl enable firewalld
        
        # 允许服务
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        
        # 允许端口
        sudo firewall-cmd --permanent --add-port=8080/tcp
        sudo firewall-cmd --permanent --add-port=8081/tcp
        sudo firewall-cmd --permanent --add-port=8082/tcp
        sudo firewall-cmd --permanent --add-port=8083/tcp
        
        sudo firewall-cmd --reload
        
        log_success "FirewallD 防火墙配置完成"
    else
        log_warning "未识别的防火墙管理器，请手动配置防火墙"
    fi
}

# 创建应用目录结构
create_app_directories() {
    log_info "创建应用目录结构..."
    
    local app_dirs=(
        "/opt/salary-system"
        "/opt/salary-system/releases"
        "/opt/salary-system/shared"
        "/opt/salary-system/scripts"
        "/opt/salary-system/backups"
        "/opt/salary-system/logs"
    )
    
    for dir in "${app_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            sudo mkdir -p "$dir"
            sudo chown -R $USER:$USER "$dir"
            log_info "创建目录: $dir"
        else
            log_info "目录已存在: $dir"
        fi
    done
    
    log_success "应用目录结构创建完成"
}

# 配置系统限制
configure_system_limits() {
    log_info "配置系统限制..."
    
    # 配置文件描述符限制
    sudo tee -a /etc/security/limits.conf > /dev/null << EOF

# Salary System limits
$USER soft nofile 65535
$USER hard nofile 65535
$USER soft nproc 32768
$USER hard nproc 32768
EOF

    # 配置系统级别的限制
    sudo tee /etc/systemd/system.conf.d/salary-system.conf > /dev/null << EOF
[Manager]
DefaultLimitNOFILE=65535
DefaultLimitNPROC=32768
EOF

    log_success "系统限制配置完成"
}

# 安装 Nginx（可选）
install_nginx() {
    log_info "安装 Nginx（作为反向代理）..."
    
    if command -v nginx &> /dev/null; then
        log_info "Nginx 已安装，版本: $(nginx -v 2>&1)"
        return 0
    fi
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y nginx
    else
        log_warning "未识别的包管理器，跳过 Nginx 安装"
        return 0
    fi
    
    # 启动并启用 Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    log_success "Nginx 安装完成"
}

# 配置日志轮转
setup_log_rotation() {
    log_info "配置日志轮转..."
    
    sudo tee /etc/logrotate.d/salary-system > /dev/null << EOF
/opt/salary-system/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 $USER $USER
    postrotate
        /usr/bin/docker kill --signal="USR1" salary-system-web 2>/dev/null || true
    endscript
}
EOF
    
    log_success "日志轮转配置完成"
}

# 安装监控工具（可选）
install_monitoring_tools() {
    log_info "安装监控工具..."
    
    # 安装 htop, iotop, nethogs 等监控工具
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y htop iotop nethogs sysstat
    elif command -v yum &> /dev/null; then
        sudo yum install -y htop iotop nethogs sysstat
    fi
    
    log_success "监控工具安装完成"
}

# 设置 SSH 安全配置
configure_ssh_security() {
    log_info "配置 SSH 安全设置..."
    
    # 备份原配置
    sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # 修改 SSH 配置
    sudo tee -a /etc/ssh/sshd_config > /dev/null << EOF

# Salary System SSH Security Settings
PasswordAuthentication no
PermitRootLogin no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
    
    # 重启 SSH 服务
    sudo systemctl restart sshd
    
    log_success "SSH 安全配置完成"
}

# 创建部署用户（如果需要）
create_deploy_user() {
    local deploy_user="${1:-deploy}"
    
    log_info "创建部署用户: $deploy_user"
    
    if id "$deploy_user" &>/dev/null; then
        log_info "用户 $deploy_user 已存在"
        return 0
    fi
    
    # 创建用户
    sudo useradd -m -s /bin/bash "$deploy_user"
    
    # 将用户添加到 docker 组
    sudo usermod -aG docker "$deploy_user"
    
    # 创建 .ssh 目录
    sudo -u "$deploy_user" mkdir -p /home/$deploy_user/.ssh
    sudo -u "$deploy_user" chmod 700 /home/$deploy_user/.ssh
    
    # 设置目录权限
    sudo chown -R "$deploy_user":"$deploy_user" /opt/salary-system
    
    log_success "部署用户 $deploy_user 创建完成"
}

# 创建系统服务（可选）
create_systemd_service() {
    log_info "创建 systemd 服务..."
    
    sudo tee /etc/systemd/system/salary-system.service > /dev/null << EOF
[Unit]
Description=Salary Management System v3
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/salary-system
ExecStart=/usr/local/bin/docker-compose -f shared/docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f shared/docker-compose.prod.yml down
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF
    
    # 重新加载 systemd
    sudo systemctl daemon-reload
    
    log_success "systemd 服务创建完成"
}

# 显示设置总结
show_setup_summary() {
    log_info "服务器设置总结"
    
    echo "============================================"
    echo "🎉 服务器环境准备完成！"
    echo "============================================"
    echo "系统信息:"
    echo "- 操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "- Docker: $(docker --version 2>/dev/null || echo '未安装')"
    echo "- Docker Compose: $(docker-compose --version 2>/dev/null || echo '未安装')"
    echo "- Nginx: $(nginx -v 2>&1 || echo '未安装')"
    echo ""
    echo "目录结构:"
    echo "- 应用目录: /opt/salary-system"
    echo "- 发布目录: /opt/salary-system/releases"
    echo "- 共享目录: /opt/salary-system/shared"
    echo "- 脚本目录: /opt/salary-system/scripts"
    echo ""
    echo "网络端口:"
    echo "- HTTP: 80"
    echo "- HTTPS: 443 (如果配置了SSL)"
    echo "- 应用端口: 8080-8083"
    echo ""
    echo "下一步操作:"
    echo "1. 配置 GitHub Actions Secrets："
    echo "   - SSH_PRIVATE_KEY: 私钥内容"
    echo "   - SSH_USER: $USER"
    echo "   - SSH_HOST: $(curl -s ifconfig.me || echo '服务器IP')"
    echo "   - SSH_KNOWN_HOSTS: $(ssh-keyscan -H $(hostname) 2>/dev/null || echo '服务器指纹')"
    echo ""
    echo "2. 在 GitHub 仓库中触发部署工作流"
    echo ""
    echo "3. 监控应用状态："
    echo "   - docker ps"
    echo "   - docker logs salary-system-web"
    echo "   - curl http://localhost/health"
    echo "============================================"
}

# 显示帮助信息
show_help() {
    cat << EOF
私有服务器环境准备脚本

用法:
    $0 [选项]

选项:
    -h, --help              显示此帮助信息
    -u, --user USER         创建部署用户 (默认: 不创建)
    --skip-docker           跳过 Docker 安装
    --skip-nginx            跳过 Nginx 安装
    --skip-firewall         跳过防火墙配置
    --skip-monitoring       跳过监控工具安装
    -y, --yes               自动确认所有操作

示例:
    $0                      # 完整安装
    $0 -u deploy            # 创建 deploy 用户并完整安装
    $0 --skip-nginx -y      # 跳过 Nginx 安装并自动确认
    
注意:
    - 此脚本需要 sudo 权限
    - 建议在全新的服务器上运行
    - 某些操作可能需要重启服务器才能生效
EOF
}

# 主函数
main() {
    local create_user=""
    local skip_docker=false
    local skip_nginx=false
    local skip_firewall=false
    local skip_monitoring=false
    local auto_yes=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -u|--user)
                create_user="$2"
                shift 2
                ;;
            --skip-docker)
                skip_docker=true
                shift
                ;;
            --skip-nginx)
                skip_nginx=true
                shift
                ;;
            --skip-firewall)
                skip_firewall=true
                shift
                ;;
            --skip-monitoring)
                skip_monitoring=true
                shift
                ;;
            -y|--yes)
                auto_yes=true
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    log_info "开始私有服务器环境准备"
    log_info "准备时间: $(date)"
    
    # 确认操作
    if [[ "$auto_yes" != "true" ]]; then
        read -p "是否继续进行服务器环境准备？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            exit 0
        fi
    fi
    
    # 执行准备步骤
    check_system_info
    check_system_requirements
    update_system_packages
    install_basic_tools
    
    if [[ "$skip_docker" != "true" ]]; then
        install_docker
        install_docker_compose
    fi
    
    if [[ "$skip_nginx" != "true" ]]; then
        install_nginx
    fi
    
    if [[ "$skip_firewall" != "true" ]]; then
        configure_firewall
    fi
    
    create_app_directories
    configure_system_limits
    setup_log_rotation
    
    if [[ "$skip_monitoring" != "true" ]]; then
        install_monitoring_tools
    fi
    
    configure_ssh_security
    
    if [[ -n "$create_user" ]]; then
        create_deploy_user "$create_user"
    fi
    
    create_systemd_service
    
    show_setup_summary
    
    log_success "🎉 服务器环境准备完成！"
}

# 错误处理
trap 'log_error "服务器准备过程中发生错误，退出码: $?"' ERR

# 运行主函数
main "$@"