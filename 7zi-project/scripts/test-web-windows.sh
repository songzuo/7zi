#!/bin/bash
# test-web-windows.sh - 在 Windows 上远程测试网页并截图
# 用法: ./test-web-windows.sh <host> <user> <password> [url]

WIN_HOST="${1:-192.168.1.100}"
WIN_USER="${2:-Administrator}"
WIN_PASS="$3"
TEST_URL="${4:-https://7zi.com}"

if [ -z "$WIN_PASS" ]; then
    echo "用法: $0 <Windows_IP> <用户名> <密码> [测试URL]"
    echo "示例: $0 192.168.1.100 Admin password123 https://7zi.com"
    exit 1
fi

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SCP_CMD="sshpass -p '$WIN_PASS' scp $SSH_OPTS"
SSH_CMD="sshpass -p '$WIN_PASS' ssh $SSH_OPTS"

echo "🧪 远程网页测试"
echo "目标主机: $WIN_HOST"
echo "测试网址: $TEST_URL"
echo "---"

# 1. 检查 Windows 上的 Node.js
echo "📋 检查 Node.js..."
$SSH_CMD "$WIN_USER@$WIN_HOST" "node --version" || {
    echo "❌ Windows 上未安装 Node.js"
    echo "请先安装: https://nodejs.org/"
    exit 1
}

# 2. 创建测试脚本
echo "📝 创建测试脚本..."
cat > /tmp/test-web-page.js << 'ENDSCRIPT'
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const testUrl = process.argv[2] || 'https://7zi.com';
    const outputDir = 'C:\\temp\\screenshots';
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('启动浏览器...');
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage({
        viewport: { width: 1920, height: 1080 }
    });
    
    console.log('访问:', testUrl);
    try {
        await page.goto(testUrl, { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
    } catch (e) {
        console.log('警告: 页面加载超时，继续截图...');
    }
    
    // 获取页面信息
    const title = await page.title();
    const url = page.url();
    
    console.log('页面标题:', title);
    console.log('当前URL:', url);
    
    // 截图
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `${outputDir}\\screenshot-${timestamp}.png`;
    
    await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
    });
    
    console.log('截图已保存:', screenshotPath);
    
    // 输出路径供脚本解析
    console.log('SCREENSHOT_PATH:', screenshotPath);
    
    await browser.close();
})();
ENDSCRIPT

# 3. 上传测试脚本
echo "📤 上传测试脚本..."
$SSH_CMD "$WIN_USER@$WIN_HOST" "mkdir -p C:/temp/screenshots" 2>/dev/null
$SCP_CMD /tmp/test-web-page.js "$WIN_USER@$WIN_HOST:C:/temp/"

# 4. 检查 Playwright
echo "📋 检查 Playwright..."
$SSH_CMD "$WIN_USER@$WIN_HOST" "npx playwright --version" 2>/dev/null || {
    echo "⚠️  Playwright 未安装，正在安装..."
    $SSH_CMD "$WIN_USER@$WIN_HOST" "npm install -g playwright && npx playwright install chromium"
}

# 5. 执行测试
echo "🚀 执行网页测试..."
RESULT=$($SSH_CMD "$WIN_USER@$WIN_HOST" "cd C:/temp && node test-web-page.js \"$TEST_URL\"")
echo "$RESULT"

# 6. 提取截图路径并下载
SCREENSHOT_PATH=$(echo "$RESULT" | grep "SCREENSHOT_PATH:" | awk '{print $2}' | tr -d '\r')

if [ -n "$SCREENSHOT_PATH" ]; then
    echo "📥 下载截图..."
    LOCAL_PATH="$HOME/screenshots/$(basename "$SCREENSHOT_PATH")"
    $SCP_CMD "$WIN_USER@$WIN_HOST:$SCREENSHOT_PATH" "$LOCAL_PATH"
    echo "✅ 截图已保存到: $LOCAL_PATH"
else
    echo "⚠️  未能获取截图路径"
fi

echo ""
echo "🎉 测试完成!"
