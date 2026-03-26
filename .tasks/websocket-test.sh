#!/bin/bash
# 任务：WebSocket 测试覆盖检查与增强

WORKSPACE="/root/.openclaw/workspace"
cd "$WORKSPACE"

echo "=== 1. WebSocket 实现文件 ==="
find src -name "*.ts" -exec grep -l "WebSocket\|ws\|socket" {} \; 2>/dev/null | grep -v test | grep -v node_modules

echo ""
echo "=== 2. 现有 WebSocket 测试 ==="
ls -la e2e/websocket*.spec.ts tests/**/websocket* 2>/dev/null
wc -l e2e/websocket-realtime.spec.ts 2>/dev/null

echo ""
echo "=== 3. WebSocket API 路由 ==="
cat src/app/api/ws/route.ts 2>/dev/null | head -50
echo "---"
cat src/app/api/ws/rooms/\[roomId\]/route.ts 2>/dev/null | head -50

echo ""
echo "=== 4. 检查测试覆盖率 ==="
grep -c "@test\|it(" e2e/websocket-realtime.spec.ts 2>/dev/null || echo "无法统计"
