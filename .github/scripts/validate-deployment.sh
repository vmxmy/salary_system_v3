#!/bin/bash

# ============================================
# 部署配置验证脚本
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

# 检查文件是否存在
check_file_exists() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        log_success "$description 存在: $file"
        return 0
    else
        log_error "$description 不存在: $file"
        return 1
    fi
}

# 检查目录是否存在
check_directory_exists() {
    local dir="$1"
    local description="$2"
    
    if [[ -d "$dir" ]]; then
        log_success "$description 存在: $dir"
        return 0
    else
        log_error "$description 不存在: $dir"
        return 1
    fi
}

# 检查文件是否可执行
check_file_executable() {
    local file="$1"
    local description="$2"
    
    if [[ -x "$file" ]]; then
        log_success "$description 可执行: $file"
        return 0
    else
        log_warning "$description 不可执行: $file"
        return 1
    fi
}

# 验证 YAML 语法
validate_yaml_syntax() {
    local file="$1"
    
    if command -v yamllint &> /dev/null; then
        if yamllint "$file" &> /dev/null; then
            log_success "YAML 语法正确: $file"
            return 0
        else
            log_error "YAML 语法错误: $file"
            return 1
        fi
    else
        log_warning "yamllint 未安装，跳过 YAML 语法检查"
        return 0
    fi
}

# 检查 Dockerfile 语法
validate_dockerfile() {
    local dockerfile="$1"
    
    if command -v hadolint &> /dev/null; then
        if hadolint "$dockerfile" &> /dev/null; then
            log_success "Dockerfile 语法正确: $dockerfile"
            return 0
        else
            log_warning "Dockerfile 存在一些问题，但不影响构建"
            return 0
        fi
    else
        log_warning "hadolint 未安装，跳过 Dockerfile 语法检查"
        return 0
    fi
}

# 主验证函数
main() {
    log_info "开始验证部署配置..."
    
    local base_dir="/Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3"
    local errors=0
    
    echo "============================================"
    echo "验证部署文件结构"
    echo "============================================"
    
    # 检查核心部署文件
    local core_files=(
        "$base_dir/Dockerfile:Docker镜像构建文件"
        "$base_dir/nginx.conf:Nginx主配置文件"
        "$base_dir/nginx-default.conf:Nginx默认站点配置"
        "$base_dir/DEPLOYMENT.md:部署说明文档"
    )
    
    for item in "${core_files[@]}"; do
        local file="${item%:*}"
        local desc="${item#*:}"
        if ! check_file_exists "$file" "$desc"; then
            ((errors++))
        fi
    done
    
    # 检查 GitHub Actions 工作流
    local workflow_files=(
        "$base_dir/.github/workflows/ci-cd.yml:CI/CD工作流"
        "$base_dir/.github/workflows/deploy-private-server.yml:私有服务器部署工作流"
        "$base_dir/.github/workflows/deploy-edge-functions.yml:Edge Functions部署工作流"
    )
    
    echo ""
    echo "============================================"
    echo "验证 GitHub Actions 工作流"
    echo "============================================"
    
    for item in "${workflow_files[@]}"; do
        local file="${item%:*}"
        local desc="${item#*:}"
        if check_file_exists "$file" "$desc"; then
            validate_yaml_syntax "$file"
        else
            ((errors++))
        fi
    done
    
    # 检查部署脚本
    local script_files=(
        "$base_dir/.github/scripts/deploy.sh:主部署脚本"
        "$base_dir/.github/scripts/rollback.sh:回滚脚本"
        "$base_dir/.github/scripts/server-setup.sh:服务器准备脚本"
        "$base_dir/.docker/healthcheck.sh:健康检查脚本"
    )
    
    echo ""
    echo "============================================"
    echo "验证部署脚本"
    echo "============================================"
    
    for item in "${script_files[@]}"; do
        local file="${item%:*}"
        local desc="${item#*:}"
        if check_file_exists "$file" "$desc"; then
            check_file_executable "$file" "$desc"
        else
            ((errors++))
        fi
    done
    
    # 检查目录结构
    local directories=(
        "$base_dir/.github:GitHub配置目录"
        "$base_dir/.github/workflows:工作流目录"
        "$base_dir/.github/scripts:脚本目录"
        "$base_dir/.docker:Docker配置目录"
        "$base_dir/frontend:前端源码目录"
    )
    
    echo ""
    echo "============================================"
    echo "验证目录结构"
    echo "============================================"
    
    for item in "${directories[@]}"; do
        local dir="${item%:*}"
        local desc="${item#*:}"
        if ! check_directory_exists "$dir" "$desc"; then
            ((errors++))
        fi
    done
    
    # 验证 Dockerfile
    echo ""
    echo "============================================"
    echo "验证 Dockerfile"
    echo "============================================"
    
    validate_dockerfile "$base_dir/Dockerfile"
    
    # 检查前端构建配置
    echo ""
    echo "============================================"
    echo "验证前端配置"
    echo "============================================"
    
    if check_file_exists "$base_dir/frontend/package.json" "前端package.json"; then
        log_info "检查 package.json 构建脚本..."
        
        if grep -q '"build"' "$base_dir/frontend/package.json"; then
            log_success "构建脚本存在"
        else
            log_error "构建脚本不存在"
            ((errors++))
        fi
        
        if grep -q '"vite"' "$base_dir/frontend/package.json"; then
            log_success "Vite 构建工具配置存在"
        else
            log_warning "未检测到 Vite 配置"
        fi
    else
        ((errors++))
    fi
    
    # 检查环境配置示例
    echo ""
    echo "============================================"
    echo "验证环境配置"
    echo "============================================"
    
    if check_file_exists "$base_dir/frontend/.env.local.example" "环境配置示例"; then
        log_info "检查环境变量示例..."
        
        local required_vars=(
            "VITE_SUPABASE_URL"
            "VITE_SUPABASE_ANON_KEY"
        )
        
        for var in "${required_vars[@]}"; do
            if grep -q "$var" "$base_dir/frontend/.env.local.example"; then
                log_success "环境变量 $var 示例存在"
            else
                log_warning "环境变量 $var 示例缺失"
            fi
        done
    else
        log_warning "环境配置示例文件不存在"
    fi
    
    # 显示验证结果
    echo ""
    echo "============================================"
    echo "验证结果总结"
    echo "============================================"
    
    if [[ $errors -eq 0 ]]; then
        log_success "🎉 所有部署配置验证通过！"
        echo ""
        echo "可以进行的下一步操作:"
        echo "1. 配置 GitHub Actions Secrets"
        echo "2. 准备服务器环境：./github/scripts/server-setup.sh"
        echo "3. 推送代码触发自动部署"
        echo "4. 或手动触发 GitHub Actions 工作流"
        echo ""
        return 0
    else
        log_error "❌ 发现 $errors 个配置问题，请修复后重新验证"
        echo ""
        echo "常见解决方案:"
        echo "- 确保所有必需文件都存在"
        echo "- 为脚本文件添加执行权限: chmod +x script-file.sh"
        echo "- 验证 YAML 文件语法正确"
        echo "- 检查目录结构完整性"
        echo ""
        return 1
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
部署配置验证脚本

用法:
    $0 [选项]

选项:
    -h, --help          显示此帮助信息

功能:
    - 验证所有部署相关文件存在性
    - 检查脚本文件执行权限
    - 验证 YAML 语法正确性
    - 检查目录结构完整性
    - 验证 Dockerfile 语法
    - 检查前端构建配置

注意:
    - 建议在推送代码前运行此验证
    - 可选安装 yamllint 和 hadolint 获得更详细的验证
    - 安装方法：pip install yamllint && brew install hadolint

EOF
}

# 解析命令行参数
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac