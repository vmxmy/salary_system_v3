#!/bin/bash
# Docker 构建脚本
# 用于构建包含正确环境变量的 Salary System V3 Frontend 容器

set -e

echo "🚀 Building Salary System V3 Frontend Docker Image..."

# 检查环境变量文件
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please copy .env.local.example to .env.local and configure your Supabase credentials."
    exit 1
fi

# 从 .env.local 加载环境变量
export $(cat .env.local | grep -E '^VITE_' | xargs)

# 验证必需的环境变量
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Missing required Supabase environment variables!"
    echo "Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local"
    exit 1
fi

echo "✅ Environment variables loaded successfully"
echo "   VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}"
echo "   VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."

# 构建 Docker 镜像
echo "🔨 Building Docker image..."
docker build \
    --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
    --build-arg VITE_APP_URL="${VITE_APP_URL:-http://localhost:3000}" \
    --build-arg VITE_DISABLE_PROXY="${VITE_DISABLE_PROXY:-true}" \
    --build-arg VITE_SHOW_DEBUG_INFO="${VITE_SHOW_DEBUG_INFO:-false}" \
    -t salary-system-v3-frontend:latest \
    .

echo "✅ Docker image built successfully: salary-system-v3-frontend:latest"

# 可选：运行容器测试
echo ""
echo "💡 To run the container:"
echo "   docker run -p 3000:3000 --name salary-frontend salary-system-v3-frontend:latest"
echo ""
echo "💡 To run with Docker Compose:"
echo "   docker-compose --env-file .env.docker up"