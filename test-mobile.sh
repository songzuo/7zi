#!/bin/bash

# 移动端响应式测试运行脚本
# 用于在不同设备和屏幕尺寸上测试响应式布局

set -e

echo "📱 Starting Mobile Responsive Tests..."
echo "===================================="

# 检查是否安装了 Playwright
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js."
    exit 1
fi

# 检查 Playwright 是否安装
if ! npx playwright --version &> /dev/null; then
    echo "📦 Installing Playwright..."
    npx playwright install --with-deps
fi

# 运行测试
echo "🚀 Running mobile responsive tests..."
echo ""

# 运行所有移动端测试
npx playwright test --config=playwright.mobile.config.ts "$@"

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    echo "📊 Opening test report..."
    npx playwright show-report
else
    echo ""
    echo "❌ Some tests failed!"
    echo ""
    echo "📊 Opening test report..."
    npx playwright show-report
    exit 1
fi
