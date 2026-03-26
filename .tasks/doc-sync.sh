#!/bin/bash
# 任务：API 文档同步

WORKSPACE="/root/.openclaw/workspace"
cd "$WORKSPACE"

echo "=== 1. 分析现有 API.md 结构 ==="
echo "API.md 行数: $(wc -l < API.md)"
echo "主要章节数: $(grep -c '^## ' API.md)"

echo ""
echo "=== 2. 扫描实际 API 路由 ==="
find src/app/api -type f -name "route.ts" -o -name "route.js" 2>/dev/null | sort > /tmp/actual_routes.txt
echo "实际路由数量: $(wc -l < /tmp/actual_routes.txt)"
echo "路由列表:"
cat /tmp/actual_routes.txt

echo ""
echo "=== 3. 提取 API.md 中的端点 ==="
grep -E "^\*\*Endpoint\*\*|POST|GET|PUT|DELETE|PATCH" API.md | head -50

echo ""
echo "=== 4. 检查是否有新增的 API 需要文档化 ==="
# 检查未文档化的 API（如 backup, ws 相关）
grep -l "backup\|ws\|stream" /tmp/actual_routes.txt 2>/dev/null
