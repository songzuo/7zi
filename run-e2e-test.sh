#!/bin/bash

# E2E 测试运行脚本
# 用于快速运行 Playwright 测试并生成报告

cd /root/.openclaw/workspace

echo "======================================"
echo "开始运行 E2E 测试"
echo "时间：$(date)"
echo "======================================"

# 运行测试（仅 Chromium，快速模式）
npx playwright test \
  --project=chromium \
  --reporter=list \
  --timeout=60000 \
  --workers=2 \
  e2e/home.spec.ts \
  e2e/critical-path.spec.ts \
  e2e/user-flows.spec.ts \
  2>&1 | tee /tmp/e2e-test-output.log

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "======================================"
echo "测试完成"
echo "退出码：$EXIT_CODE"
echo "时间：$(date)"
echo "======================================"

# 生成 HTML 报告
if [ -d "playwright-report" ]; then
  echo "HTML 报告已生成：playwright-report/index.html"
fi

exit $EXIT_CODE
