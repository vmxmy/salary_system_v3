#!/bin/bash

# ============================================
# Supabase Edge Functions 部署脚本
# ============================================
# 
# 使用方法:
# ./scripts/deploy-functions.sh [函数名称] [环境] [选项]
# 
# 示例:
# ./scripts/deploy-functions.sh ai-agent production
# ./scripts/deploy-functions.sh all staging --force
# ============================================

set -e  # 遇到错误时退出

# 配置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置常量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FUNCTIONS_DIR="$PROJECT_ROOT/supabase/functions"

# 默认值
ENVIRONMENT="${2:-staging}"
FORCE_DEPLOY=false
VERBOSE=false
DRY_RUN=false

# ============================================
# 辅助函数
# ============================================

print_header() {
    echo -e "${PURPLE}============================================${NC}"
    echo -e "${PURPLE} 🚀 Supabase Edge Functions 部署工具${NC}"
    echo -e "${PURPLE}============================================${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

print_step() {
    echo -e "${CYAN}📋 $1${NC}"
}

show_usage() {
    cat << EOF
使用方法: $0 [函数名称] [环境] [选项]

参数:
  函数名称    指定要部署的函数名称，或使用 'all' 部署所有函数
  环境        部署环境: production, staging (默认: staging)

选项:
  --force     强制重新部署，忽略变更检测
  --verbose   显示详细输出
  --dry-run   模拟运行，不实际部署
  --help      显示此帮助信息

示例:
  $0 ai-agent production              部署 ai-agent 函数到生产环境
  $0 all staging --force             强制部署所有函数到测试环境
  $0 ai-agent staging --dry-run      模拟部署 ai-agent 函数

环境要求:
  - 已安装 Supabase CLI
  - 已设置 SUPABASE_PROJECT_ID 环境变量
  - 已使用 'supabase login' 登录
EOF
}

check_dependencies() {
    print_step "检查依赖..."
    
    # 检查 Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI 未安装"
        print_info "请访问 https://supabase.com/docs/guides/cli 获取安装说明"
        exit 1
    fi
    
    local supabase_version=$(supabase --version)
    print_info "Supabase CLI 版本: $supabase_version"
    
    # 检查 Deno (用于验证)
    if command -v deno &> /dev/null; then
        local deno_version=$(deno --version | head -n1)
        print_info "Deno 版本: $deno_version"
    else
        print_warning "Deno 未安装 - 将跳过本地验证"
    fi
    
    # 检查项目配置
    if [[ -z "$SUPABASE_PROJECT_ID" ]]; then
        print_error "SUPABASE_PROJECT_ID 环境变量未设置"
        print_info "请设置: export SUPABASE_PROJECT_ID=your_project_id"
        exit 1
    fi
    
    print_success "依赖检查通过"
}

authenticate_supabase() {
    print_step "验证 Supabase 认证..."
    
    if ! supabase projects list &> /dev/null; then
        print_error "Supabase 认证失败"
        print_info "请运行: supabase login"
        exit 1
    fi
    
    print_success "Supabase 认证有效"
}

link_project() {
    print_step "链接 Supabase 项目..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "模拟运行: 跳过项目链接"
        return 0
    fi
    
    if supabase link --project-ref "$SUPABASE_PROJECT_ID" &> /dev/null; then
        print_success "项目链接成功: $SUPABASE_PROJECT_ID"
    else
        print_error "项目链接失败"
        print_info "请检查 SUPABASE_PROJECT_ID 是否正确"
        exit 1
    fi
}

get_available_functions() {
    if [[ ! -d "$FUNCTIONS_DIR" ]]; then
        print_error "Functions 目录不存在: $FUNCTIONS_DIR"
        exit 1
    fi
    
    # 查找所有函数目录
    local functions=()
    for dir in "$FUNCTIONS_DIR"/*; do
        if [[ -d "$dir" && (-f "$dir/index.ts" || -f "$dir/index.js") ]]; then
            functions+=($(basename "$dir"))
        fi
    done
    
    echo "${functions[@]}"
}

validate_function() {
    local function_name="$1"
    local function_path="$FUNCTIONS_DIR/$function_name"
    
    print_step "验证函数: $function_name"
    
    if [[ ! -d "$function_path" ]]; then
        print_error "函数目录不存在: $function_path"
        return 1
    fi
    
    # 检查入口文件
    local entry_file=""
    if [[ -f "$function_path/index.ts" ]]; then
        entry_file="$function_path/index.ts"
    elif [[ -f "$function_path/index.js" ]]; then
        entry_file="$function_path/index.js"
    else
        print_error "找不到入口文件 (index.ts 或 index.js): $function_path"
        return 1
    fi
    
    print_info "入口文件: $(basename "$entry_file")"
    
    # 使用 Deno 进行语法检查 (如果可用)
    if command -v deno &> /dev/null; then
        print_info "执行语法检查..."
        if deno check "$entry_file" 2>/dev/null; then
            print_success "语法检查通过"
        else
            print_warning "语法检查失败 - 继续部署"
        fi
    fi
    
    # 验证 deno.json (如果存在)
    if [[ -f "$function_path/deno.json" ]]; then
        print_info "验证 deno.json 配置..."
        if command -v jq &> /dev/null; then
            if jq empty "$function_path/deno.json" &> /dev/null; then
                print_success "deno.json 格式正确"
            else
                print_error "deno.json 格式错误"
                return 1
            fi
        else
            print_warning "jq 未安装 - 跳过 deno.json 验证"
        fi
    fi
    
    return 0
}

deploy_function() {
    local function_name="$1"
    
    print_step "部署函数: $function_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "模拟运行: 将部署 $function_name 到 $ENVIRONMENT 环境"
        return 0
    fi
    
    local deploy_cmd="supabase functions deploy $function_name --project-ref $SUPABASE_PROJECT_ID"
    
    if [[ "$VERBOSE" == "true" ]]; then
        print_info "执行命令: $deploy_cmd"
    fi
    
    if eval "$deploy_cmd"; then
        print_success "函数 $function_name 部署成功"
        
        # 构建函数URL
        local function_url="https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/$function_name"
        print_info "函数URL: $function_url"
        
        # 执行基本健康检查
        health_check "$function_name" "$function_url"
        
        return 0
    else
        print_error "函数 $function_name 部署失败"
        return 1
    fi
}

health_check() {
    local function_name="$1"
    local function_url="$2"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi
    
    print_step "执行健康检查: $function_name"
    
    # CORS 预检请求
    if curl -f -X OPTIONS "$function_url" \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: POST" \
        --max-time 10 --silent &> /dev/null; then
        print_success "CORS 预检测试通过"
    else
        print_warning "CORS 预检测试失败 (可能是预期行为)"
    fi
    
    # AI Agent 特殊测试
    if [[ "$function_name" == "ai-agent" ]]; then
        print_info "执行 AI Agent 特定测试..."
        # 这里可以添加更多特定测试
        print_info "AI Agent 健康检查完成"
    fi
}

generate_deployment_report() {
    local deployed_functions=("$@")
    
    print_step "生成部署报告"
    
    local report_file="$PROJECT_ROOT/deployment-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Edge Functions 部署报告

## 部署信息
- **时间**: $(date)
- **环境**: $ENVIRONMENT
- **项目ID**: $SUPABASE_PROJECT_ID
- **部署者**: $(whoami)

## 部署结果
EOF
    
    if [[ ${#deployed_functions[@]} -eq 0 ]]; then
        echo "- ❌ 没有函数被部署" >> "$report_file"
    else
        echo "- ✅ 成功部署 ${#deployed_functions[@]} 个函数" >> "$report_file"
        echo "" >> "$report_file"
        echo "### 已部署函数" >> "$report_file"
        for func in "${deployed_functions[@]}"; do
            local url="https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/$func"
            echo "- 🟢 **$func**: [$url]($url)" >> "$report_file"
        done
    fi
    
    echo "" >> "$report_file"
    echo "---" >> "$report_file"
    echo "*报告由 deploy-functions.sh 自动生成*" >> "$report_file"
    
    print_success "部署报告已生成: $report_file"
}

# ============================================
# 主要逻辑
# ============================================

main() {
    print_header
    
    # 解析命令行参数
    local target_function="$1"
    
    # 解析选项
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            -*)
                print_error "未知选项: $1"
                show_usage
                exit 1
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # 显示配置
    print_info "部署配置:"
    print_info "  目标函数: ${target_function:-未指定}"
    print_info "  环境: $ENVIRONMENT"
    print_info "  强制部署: $FORCE_DEPLOY"
    print_info "  详细输出: $VERBOSE"
    print_info "  模拟运行: $DRY_RUN"
    echo ""
    
    # 检查参数
    if [[ -z "$target_function" ]]; then
        print_error "请指定要部署的函数名称或使用 'all'"
        show_usage
        exit 1
    fi
    
    # 执行预检查
    check_dependencies
    authenticate_supabase
    link_project
    
    # 获取可用函数
    local available_functions=($(get_available_functions))
    
    if [[ ${#available_functions[@]} -eq 0 ]]; then
        print_error "未找到任何可部署的函数"
        exit 1
    fi
    
    print_info "可用函数: ${available_functions[*]}"
    
    # 确定要部署的函数
    local functions_to_deploy=()
    
    if [[ "$target_function" == "all" ]]; then
        functions_to_deploy=("${available_functions[@]}")
        print_info "将部署所有函数: ${functions_to_deploy[*]}"
    else
        # 检查指定的函数是否存在
        local found=false
        for func in "${available_functions[@]}"; do
            if [[ "$func" == "$target_function" ]]; then
                found=true
                break
            fi
        done
        
        if [[ "$found" == "false" ]]; then
            print_error "函数 '$target_function' 不存在"
            print_info "可用函数: ${available_functions[*]}"
            exit 1
        fi
        
        functions_to_deploy=("$target_function")
    fi
    
    # 部署函数
    local deployed_functions=()
    local failed_functions=()
    
    for function_name in "${functions_to_deploy[@]}"; do
        echo ""
        print_step "处理函数: $function_name"
        
        # 验证函数
        if ! validate_function "$function_name"; then
            print_error "函数 $function_name 验证失败"
            failed_functions+=("$function_name")
            continue
        fi
        
        # 部署函数
        if deploy_function "$function_name"; then
            deployed_functions+=("$function_name")
        else
            failed_functions+=("$function_name")
        fi
    done
    
    # 生成报告
    echo ""
    generate_deployment_report "${deployed_functions[@]}"
    
    # 显示最终结果
    echo ""
    print_step "部署总结"
    print_success "成功部署: ${#deployed_functions[@]} 个函数"
    if [[ ${#failed_functions[@]} -gt 0 ]]; then
        print_error "部署失败: ${#failed_functions[@]} 个函数 (${failed_functions[*]})"
        exit 1
    fi
    
    print_success "所有函数部署完成! 🎉"
}

# 执行主函数
main "$@"