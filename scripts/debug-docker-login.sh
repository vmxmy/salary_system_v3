#!/bin/bash

# Docker Hub 登录调试脚本
# 用于本地测试 Docker Hub 连接和认证

set -e

echo "🔍 Docker Hub 登录调试工具"
echo "=============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
check_docker() {
    echo -e "${BLUE}检查 Docker 安装...${NC}"
    if command -v docker >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker 已安装${NC}"
        docker --version
    else
        echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
        exit 1
    fi
}

# 检查 Docker 服务状态
check_docker_service() {
    echo -e "${BLUE}检查 Docker 服务状态...${NC}"
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker 服务运行正常${NC}"
    else
        echo -e "${RED}❌ Docker 服务未运行，请启动 Docker 服务${NC}"
        exit 1
    fi
}

# 测试网络连接
test_network() {
    echo -e "${BLUE}测试 Docker Hub 网络连接...${NC}"
    
    # 测试 DNS 解析
    if nslookup hub.docker.com >/dev/null 2>&1; then
        echo -e "${GREEN}✅ DNS 解析正常${NC}"
    else
        echo -e "${YELLOW}⚠️ DNS 解析可能有问题${NC}"
    fi
    
    # 测试 HTTP 连接
    if curl -f -s --connect-timeout 10 https://hub.docker.com/v2/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker Hub API 连接正常${NC}"
    else
        echo -e "${RED}❌ Docker Hub API 连接失败${NC}"
        echo "请检查网络连接和防火墙设置"
    fi
}

# 交互式登录测试
test_login_interactive() {
    echo -e "${BLUE}交互式登录测试...${NC}"
    echo "请输入你的 Docker Hub 凭据："
    
    read -p "用户名: " username
    read -s -p "访问令牌（不是密码）: " password
    echo
    
    if [ -z "$username" ] || [ -z "$password" ]; then
        echo -e "${RED}❌ 用户名或令牌不能为空${NC}"
        return 1
    fi
    
    echo "尝试登录到 Docker Hub..."
    if echo "$password" | docker login --username "$username" --password-stdin 2>/dev/null; then
        echo -e "${GREEN}✅ 登录成功！${NC}"
        
        # 测试推送权限
        echo "测试推送权限..."
        docker pull hello-world:latest >/dev/null 2>&1
        docker tag hello-world:latest "$username/test-login:latest"
        
        if docker push "$username/test-login:latest" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ 推送权限正常${NC}"
            
            # 清理测试镜像
            docker rmi "$username/test-login:latest" >/dev/null 2>&1 || true
            
            # 在 Docker Hub 中删除测试仓库（需要手动）
            echo -e "${YELLOW}请手动删除 Docker Hub 中的测试仓库: $username/test-login${NC}"
        else
            echo -e "${RED}❌ 推送权限异常${NC}"
            echo "请检查访问令牌权限设置"
        fi
        
        # 登出
        docker logout >/dev/null 2>&1
        
    else
        echo -e "${RED}❌ 登录失败${NC}"
        echo
        echo -e "${YELLOW}常见问题解决方案：${NC}"
        echo "1. 确认用户名正确"
        echo "2. 确认使用的是访问令牌而不是密码"
        echo "3. 检查访问令牌是否有效和足够权限"
        echo "4. 检查 Docker Hub 账户状态"
        return 1
    fi
}

# 测试环境变量登录
test_login_env() {
    echo -e "${BLUE}环境变量登录测试...${NC}"
    
    if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
        echo "检测到环境变量 DOCKER_USERNAME 和 DOCKER_PASSWORD"
        echo "尝试使用环境变量登录..."
        
        if echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin 2>/dev/null; then
            echo -e "${GREEN}✅ 环境变量登录成功！${NC}"
            docker logout >/dev/null 2>&1
        else
            echo -e "${RED}❌ 环境变量登录失败${NC}"
        fi
    else
        echo -e "${YELLOW}未设置 DOCKER_USERNAME 或 DOCKER_PASSWORD 环境变量${NC}"
        echo "可以通过以下方式设置："
        echo "export DOCKER_USERNAME='your_username'"
        echo "export DOCKER_PASSWORD='your_access_token'"
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}Docker Hub 访问令牌创建步骤：${NC}"
    echo "1. 访问 https://hub.docker.com/"
    echo "2. 登录账户后点击头像 > Account Settings"
    echo "3. 选择 Security 标签页"
    echo "4. 点击 New Access Token"
    echo "5. 设置描述和权限（建议选择 Public Repo Read & Write）"
    echo "6. 复制生成的访问令牌"
    echo
    echo -e "${BLUE}GitHub Secrets 配置：${NC}"
    echo "1. 进入 GitHub 仓库 Settings > Secrets and variables > Actions"
    echo "2. 添加 DOCKER_USERNAME（你的 Docker Hub 用户名）"
    echo "3. 添加 DOCKER_PASSWORD（访问令牌，不是密码）"
}

# 主函数
main() {
    echo -e "${YELLOW}开始调试 Docker Hub 连接...${NC}"
    echo
    
    check_docker
    echo
    
    check_docker_service
    echo
    
    test_network
    echo
    
    test_login_env
    echo
    
    echo -e "${BLUE}选择测试方式：${NC}"
    echo "1. 交互式登录测试"
    echo "2. 显示帮助信息"
    echo "3. 退出"
    
    read -p "请选择 (1-3): " choice
    
    case $choice in
        1)
            echo
            test_login_interactive
            ;;
        2)
            echo
            show_help
            ;;
        3)
            echo "调试结束"
            exit 0
            ;;
        *)
            echo "无效选择"
            exit 1
            ;;
    esac
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi