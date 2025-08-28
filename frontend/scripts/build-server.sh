#!/bin/bash

# 分步编译服务器构建脚本
# 使用1024MB内存，通过分离进程避免内存峰值

set -e

echo "🚀 开始分步编译服务器构建..."

# 设置内存限制变量
MEMORY_LIMIT="1024"
NODE_OPTIONS_BASE="--max-old-space-size=${MEMORY_LIMIT} --max-semi-space-size=128"

# 强制垃圾回收的额外选项
GC_OPTIONS="--expose-gc"

echo "📝 使用内存限制: ${MEMORY_LIMIT}MB"

# 清理之前的构建文件
echo "🧹 清理构建目录和缓存..."
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf .vite/
rm -rf node_modules/.cache/

# 检查可用内存
echo "💾 检查系统内存..."
if command -v free >/dev/null 2>&1; then
    free -h || echo "内存信息不可用"
elif command -v vm_stat >/dev/null 2>&1; then
    vm_stat | head -5 || echo "内存信息不可用"
fi

# 阶段1: TypeScript 编译（独立进程）
echo "📦 阶段1: TypeScript 编译..."
export NODE_OPTIONS="${NODE_OPTIONS_BASE} ${GC_OPTIONS}"
echo "   使用选项: $NODE_OPTIONS"

# 在子进程中运行TypeScript编译，完成后自动释放内存
echo "   🔄 启动TypeScript编译进程..."
if npx tsc -b tsconfig.server.json; then
    echo "   ✅ TypeScript编译完成"
else
    echo "❌ TypeScript 编译失败"
    echo "💡 尝试查看编译错误详情..."
    npx tsc -b tsconfig.server.json --verbose 2>&1 | tail -20
    exit 1
fi

# 强制垃圾回收和等待
echo "🗑️  强制垃圾回收..."
sleep 3

# 显示当前内存使用（如果可能）
echo "💾 编译后内存状态..."
if command -v ps >/dev/null 2>&1; then
    ps aux | head -1
    ps aux | grep -E "(node|vite|tsc)" | grep -v grep | head -5 || echo "没有找到相关进程"
fi

# 阶段2: Vite 构建（独立进程）  
echo "⚡ 阶段2: Vite 构建..."
export NODE_OPTIONS="${NODE_OPTIONS_BASE} ${GC_OPTIONS}"

# 在子进程中运行Vite构建
echo "   🔄 启动Vite构建进程..."
if npx vite build --config vite.config.server.ts; then
    echo "   ✅ Vite构建完成"
else
    echo "❌ Vite 构建失败"
    echo "💡 检查Vite配置和依赖..."
    exit 1
fi

echo "✅ 分步编译完成!"

# 显示构建结果
if [ -d "dist" ]; then
    echo ""
    echo "📊 构建结果："
    du -sh dist/ 2>/dev/null || echo "无法获取目录大小"
    
    echo ""
    echo "📁 主要文件："
    if command -v find >/dev/null 2>&1; then
        find dist -name "*.js" -o -name "*.css" 2>/dev/null | head -10 | while read -r file; do
            ls -lh "$file" 2>/dev/null || echo "$file"
        done
    else
        ls -la dist/ | head -10
    fi
    
    echo ""
    echo "🎯 构建统计："
    find dist -name "*.js" 2>/dev/null | wc -l | xargs echo "JS文件数量:"
    find dist -name "*.css" 2>/dev/null | wc -l | xargs echo "CSS文件数量:"
    find dist -name "*.html" 2>/dev/null | wc -l | xargs echo "HTML文件数量:"
    
else
    echo "❌ 构建失败：dist 目录不存在"
    exit 1
fi

echo ""
echo "🎉 服务器构建成功完成！"