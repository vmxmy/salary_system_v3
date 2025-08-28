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
    local warnings=0
    
    # 检查内存（推荐至少 2GB，最低 1GB）
    local memory_mb=$(free -m | awk '/^Mem:/ {print $2}')
    local memory_gb=$((memory_mb / 1024))
    
    if [[ $memory_mb -lt 1024 ]]; then
        log_error "内存严重不足：${memory_gb}GB < 1GB (最低要求)"
        requirements_met=false
    elif [[ $memory_mb -lt 2048 ]]; then
        log_warning "内存不足：${memory_gb}GB < 2GB (推荐)，但可以继续"
        log_info "建议为轻量级部署优化内存使用"
        ((warnings++))
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
    
    # 检查网络连接（尝试多个地址，适配国内环境）
    log_info "检查网络连接..."
    local network_ok=false
    
    # 尝试连接国内外常见地址
    local test_hosts=(
        "baidu.com"
        "aliyun.com" 
        "163.com"
        "google.com"
        "github.com"
    )
    
    for host in "${test_hosts[@]}"; do
        if ping -c 1 -W 3 "$host" > /dev/null 2>&1; then
            log_success "网络连接正常 (测试主机: $host)"
            network_ok=true
            break
        fi
    done
    
    if [[ "$network_ok" != "true" ]]; then
        log_warning "网络连接测试失败，但可能是防火墙限制"
        log_info "尝试检查DNS解析..."
        if nslookup aliyun.com > /dev/null 2>&1; then
            log_success "DNS解析正常"
        else
            log_error "DNS解析失败"
            requirements_met=false
        fi
        ((warnings++))
    fi
    
    # 检查基本命令可用性
    local required_commands=("curl" "systemctl" "which")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "必需命令不可用: $cmd"
            requirements_met=false
        fi
    done
    
    # 显示总结
    if [[ "$requirements_met" != "true" ]]; then
        log_error "系统要求检查失败"
        return 1
    elif [[ $warnings -gt 0 ]]; then
        log_warning "系统要求检查通过，但有 $warnings 个警告"
        log_info "建议使用轻量级配置继续"
        return 0
    else
        log_success "系统要求检查通过"
        return 0
    fi
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
        local docker_version=$(docker --version 2>/dev/null || echo "未知版本")
        log_info "Docker 已安装，版本: $docker_version"
        
        # 检查 Docker 服务状态
        if systemctl is-active docker &>/dev/null; then
            log_success "Docker 服务运行正常"
        else
            log_info "启动 Docker 服务..."
            sudo systemctl start docker
            sudo systemctl enable docker
        fi
        return 0
    fi
    
    # 检测操作系统类型
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        local os_id=$ID
        local os_version=$VERSION_ID
        log_info "检测到操作系统: $PRETTY_NAME"
    else
        log_error "无法检测操作系统类型"
        return 1
    fi
    
    case "$os_id" in
        "ubuntu"|"debian")
            install_docker_ubuntu_debian
            ;;
        "centos"|"rhel"|"fedora"|"anolis")
            install_docker_centos_rhel
            ;;
        *)
            log_warning "未识别的操作系统，尝试通用安装方法"
            install_docker_generic
            ;;
    esac
    
    # 启动并启用 Docker 服务
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 将当前用户添加到 docker 组
    sudo usermod -aG docker $USER
    
    # 验证安装
    if command -v docker &> /dev/null; then
        log_success "Docker 安装完成，版本: $(docker --version)"
        log_warning "请注销并重新登录以使用 Docker 命令"
    else
        log_error "Docker 安装失败"
        return 1
    fi
}

# Ubuntu/Debian Docker 安装
install_docker_ubuntu_debian() {
    log_info "使用 Ubuntu/Debian 方式安装 Docker..."
    
    # 安装必需的包
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # 添加 Docker 官方 GPG 密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 添加 Docker 仓库
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装 Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
}

# CentOS/RHEL/阿里云Linux Docker 安装
install_docker_centos_rhel() {
    log_info "使用 CentOS/RHEL 方式安装 Docker..."
    
    # 安装必需的包
    sudo yum install -y yum-utils
    
    # 添加 Docker 仓库
    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    
    # 对于阿里云 Linux，可能需要使用兼容模式
    if grep -qi "anolis\|alibaba" /etc/os-release 2>/dev/null; then
        log_info "检测到阿里云 Linux，使用兼容模式..."
        # 使用 CentOS 8 兼容源
        sudo sed -i 's/\$releasever/8/g' /etc/yum.repos.d/docker-ce.repo
    fi
    
    # 安装 Docker
    sudo yum install -y docker-ce docker-ce-cli containerd.io
}

# 通用 Docker 安装
install_docker_generic() {
    log_info "使用通用方式安装 Docker..."
    
    # 使用 Docker 官方安装脚本
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm -f get-docker.sh
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
    
    # 检查内存大小，为低内存系统优化配置
    local memory_mb=$(free -m | awk '/^Mem:/ {print $2}')
    local is_low_memory=false
    
    if [[ $memory_mb -lt 2048 ]]; then
        is_low_memory=true
        log_info "检测到低内存系统 (${memory_mb}MB)，使用优化配置"
    fi
    
    # 创建系统配置目录
    sudo mkdir -p /etc/systemd/system.conf.d
    
    if [[ "$is_low_memory" == "true" ]]; then
        # 低内存系统配置
        sudo tee -a /etc/security/limits.conf > /dev/null << EOF

# Salary System limits (Low Memory Optimized)
$USER soft nofile 16384
$USER hard nofile 32768
$USER soft nproc 8192
$USER hard nproc 16384
EOF
        
        sudo tee /etc/systemd/system.conf.d/salary-system.conf > /dev/null << EOF
[Manager]
DefaultLimitNOFILE=16384
DefaultLimitNPROC=8192
EOF
        
        # Docker 低内存配置
        if command -v docker &> /dev/null; then
            sudo mkdir -p /etc/docker
            sudo tee /etc/docker/daemon.json > /dev/null << EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 16384,
            "Soft": 8192
        },
        "nproc": {
            "Name": "nproc",
            "Hard": 4096,
            "Soft": 2048
        }
    }
}
EOF
            log_info "已配置 Docker 低内存优化"
        fi
    else
        # 标准配置
        sudo tee -a /etc/security/limits.conf > /dev/null << EOF

# Salary System limits
$USER soft nofile 65535
$USER hard nofile 65535
$USER soft nproc 32768
$USER hard nproc 32768
EOF
        
        sudo tee /etc/systemd/system.conf.d/salary-system.conf > /dev/null << EOF
[Manager]
DefaultLimitNOFILE=65535
DefaultLimitNPROC=32768
EOF
    fi

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
    --low-memory            低内存模式 (适用于 <2GB 内存的服务器)
    -y, --yes               自动确认所有操作

示例:
    $0                      # 完整安装
    $0 -u deploy            # 创建 deploy 用户并完整安装
    $0 --skip-nginx -y      # 跳过 Nginx 安装并自动确认
    $0 --low-memory -y      # 低内存模式自动配置
    
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
    local low_memory_mode=false
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
            --low-memory)
                low_memory_mode=true
                skip_nginx=true
                skip_monitoring=true
                log_info "启用低内存模式，自动跳过 Nginx 和监控工具"
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