#!/bin/bash

# Git历史清理脚本
# 警告：此操作将重写git历史，不可撤销！

set -e

echo "🚨 警告：此操作将重写整个git历史，不可撤销！"
echo "📋 将要从git历史中删除以下类型的文件："
echo "   • 文档目录 (docs/)"
echo "   • 报表文件 (reports/)"
echo "   • 备份文件 (*.bak, *.backup, *_backup*, *_archived*)"
echo "   • Excel临时文件 (~$*.xlsx, ~$*.xls)"
echo "   • 系统文件 (.DS_Store)"
echo "   • 构建产物 (dist/, build/, node_modules/)"
echo "   • 临时文件 (*.tmp, *.temp)"
echo ""

read -p "❓ 确认要继续吗？输入 'YES' 确认: " confirm
if [ "$confirm" != "YES" ]; then
    echo "❌ 操作已取消"
    exit 1
fi

echo "📦 创建备份..."
cd /Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3
git remote -v > git-remotes-backup.txt
git branch -a > git-branches-backup.txt

echo "🧹 开始清理git历史..."

# 创建路径过滤文件
cat > cleanup-paths.txt << 'EOF'
docs/
reports/
exports/
工资数据/
backup_tool/backups/
backup_moved/
archived_files_moved/
archived_hooks/
archived_old_services/
archived_pages_moved/
archived_services/
wizard_archived/
node_modules/
dist/
build/
coverage/
.vite/
.nyc_output/
temp/
tmp/
.tmp/
EOF

# 创建文件模式过滤文件  
cat > cleanup-patterns.txt << 'EOF'
*.bak
*.backup
*_backup*
*_archived*
*_archive*
*.tmp
*.temp
*.orig
*.rej
*.autosave
*.save
*~
#*#
.#*
.DS_Store
~$*.xlsx
~$*.xls
~$*.csv
*.log
debug.log
*.tar.gz
*.zip
*.rar
.claude/settings.local.json
local_config.json
config.local.json
settings.local.json
EOF

echo "🔄 执行路径清理..."
git filter-repo --invert-paths --paths-from-file cleanup-paths.txt --force

echo "🔄 执行文件模式清理..."
# 使用多个单独的命令来处理不同的模式
git filter-repo --path-glob '*.bak' --invert-paths --force
git filter-repo --path-glob '*.backup' --invert-paths --force  
git filter-repo --path-glob '*_backup*' --invert-paths --force
git filter-repo --path-glob '*_archived*' --invert-paths --force
git filter-repo --path-glob '*.tmp' --invert-paths --force
git filter-repo --path-glob '*.temp' --invert-paths --force
git filter-repo --path-glob '*.log' --invert-paths --force
git filter-repo --path-glob '.DS_Store' --invert-paths --force
git filter-repo --path-glob '~$*.xlsx' --invert-paths --force
git filter-repo --path-glob '~$*.xls' --invert-paths --force
git filter-repo --path-glob '*.tar.gz' --invert-paths --force

echo "🧹 清理refs和垃圾回收..."
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "📊 清理前后对比："
echo "清理前提交数: $(git rev-list --all --count)"

echo "✅ Git历史清理完成！"
echo ""
echo "⚠️  注意事项："
echo "   • 远程仓库需要强制推送: git push --force-with-lease --all"
echo "   • 团队成员需要重新克隆仓库"
echo "   • 备份文件已保存为 git-remotes-backup.txt 和 git-branches-backup.txt"
echo ""
echo "📝 推荐后续操作："
echo "   1. 检查清理结果: git log --oneline | head -10"
echo "   2. 验证重要文件未丢失: ls -la src/"
echo "   3. 测试构建: npm run build"
echo "   4. 强制推送: git push --force-with-lease --all"

# 清理临时文件
rm -f cleanup-paths.txt cleanup-patterns.txt