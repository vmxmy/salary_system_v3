#!/bin/bash

# ============================================
# Supabase Edge Functions 测试脚本
# ============================================

set -e

# 配置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置常量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_header() {
    echo -e "${PURPLE}============================================${NC}"
    echo -e "${PURPLE} 🧪 Edge Functions 测试工具${NC}"
    echo -e "${PURPLE}============================================${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

print_step() {
    echo -e "${CYAN}📋 $1${NC}"
}

test_ai_agent_function() {
    local base_url="$1"
    local function_url="$base_url/functions/v1/ai-agent"
    
    print_step "测试 AI Agent 函数"
    
    # 测试 CORS 预检
    print_info "测试 CORS 预检请求..."
    if curl -f -X OPTIONS "$function_url" \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: POST" \
        --max-time 10 --silent; then
        print_success "CORS 预检测试通过"
    else
        print_error "CORS 预检测试失败"
        return 1
    fi
    
    # 测试无认证请求
    print_info "测试无认证请求..."
    local response=$(curl -s -X POST "$function_url" \
        -H "Content-Type: application/json" \
        -d '{"query":"test","sessionId":"test"}' \
        --max-time 10)
    
    if [[ "$response" == *"Authorization header required"* ]]; then
        print_success "认证验证正常工作"
    else
        print_error "认证验证可能存在问题"
        print_info "响应: $response"
    fi
    
    print_success "AI Agent 函数测试完成"
}

test_function_availability() {
    local base_url="$1"
    local function_name="$2"
    local function_url="$base_url/functions/v1/$function_name"
    
    print_step "测试函数可用性: $function_name"
    
    # 基本连接测试
    print_info "测试函数连接性..."
    if curl -f -s --head "$function_url" --max-time 10 > /dev/null; then
        print_success "函数 $function_name 可访问"
        return 0
    else
        print_error "函数 $function_name 无法访问"
        return 1
    fi
}

main() {
    print_header
    
    local project_id="${SUPABASE_PROJECT_ID}"
    local base_url="${1:-https://$project_id.supabase.co}"
    
    if [[ -z "$project_id" ]]; then
        print_error "请设置 SUPABASE_PROJECT_ID 环境变量"
        exit 1
    fi
    
    print_info "测试基础URL: $base_url"
    echo ""
    
    # 测试 AI Agent 函数
    test_ai_agent_function "$base_url"
    echo ""
    
    # 测试其他函数的可用性
    local functions_dir="$PROJECT_ROOT/supabase/functions"
    if [[ -d "$functions_dir" ]]; then
        for dir in "$functions_dir"/*; do
            if [[ -d "$dir" ]]; then
                local func_name=$(basename "$dir")
                if [[ "$func_name" != "ai-agent" ]]; then
                    test_function_availability "$base_url" "$func_name"
                    echo ""
                fi
            fi
        done
    fi
    
    print_success "所有测试完成! 🎉"
}

main "$@"