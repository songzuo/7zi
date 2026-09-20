#!/bin/bash

# 磁盘空间自动清理脚本
# 定期执行以释放磁盘空间

echo "🧹 开始清理磁盘空间..."

# 1. 清理 Docker 未使用的资源
echo "📦 清理 Docker 资源..."
docker image prune -a -f --filter "until=24h" 2>/dev/null
docker container prune -f 2>/dev/null
docker volume prune -f 2>/dev/null

# 2. 清理 npm/pnpm 缓存
echo "📦 清理 npm/pnpm 缓存..."
pnpm store prune 2>/dev/null
npm cache clean --force 2>/dev/null
pnpm store path | xargs rm -rf 2>/dev/null || true

# 3. 清理系统日志
echo "📝 清理系统日志..."
journalctl --vacuum-size=500M 2>/dev/null

# 4. 清理临时文件 (保留最近7天的)
echo "🗑️  清理临时文件..."
find /tmp -name "*.tar.gz" -mtime +7 -delete 2>/dev/null

# 5. 清理包管理器缓存
echo "📦 清理包管理器缓存..."
if command -v apt-get &> /dev/null; then
    apt-get autoremove -y 2>/dev/null
    apt-get clean 2>/dev/null
fi

# 6. 显示清理结果
echo ""
echo "✅ 清理完成！当前磁盘状态："
df -h / | awk 'NR==2 {printf "使用率: %s, 剩余: %s\n", $5, $4}'

echo ""
echo "Docker 空间状态："
docker system df 2>/dev/null || echo "Docker 未运行或无数据"
