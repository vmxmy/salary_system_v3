#!/bin/bash

# VPS 低内存环境编译脚本
# 适用于内存受限的远程服务器环境

echo "🚀 开始VPS低内存环境编译..."

# 设置 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=1024 --max-heap-size=1024"

# 清理之前的构建缓存
echo "🧹 清理构建缓存..."
rm -rf dist
rm -rf node_modules/.cache
rm -rf node_modules/.tmp
rm -f .tsbuildinfo

# 创建必要的目录
mkdir -p node_modules/.tmp

echo "📝 TypeScript 增量编译..."
# 分步编译，减少内存压力
if npx tsc -b --verbose --incremental; then
    echo "✅ TypeScript 编译成功"
else
    echo "❌ TypeScript 编译失败，尝试清理后重新编译..."
    rm -rf node_modules/.tmp/*
    npx tsc -b --force --incremental || exit 1
fi

echo "📦 Vite 生产构建..."
# Vite 构建，设置较小的内存限制
if NODE_OPTIONS="--max-old-space-size=1024" npx vite build; then
    echo "✅ 构建完成！"
    echo "📊 构建产物统计:"
    ls -lah dist/
else
    echo "❌ Vite 构建失败"
    exit 1
fi

echo "🎉 VPS 编译成功完成!"