#!/bin/bash
# setup-windows-remote.sh - 在 Windows 上配置远程管理环境
# 用法: ./setup-windows-remote.sh <host> <user> <password>

WIN_HOST="${1:-192.168.1.100}"
WIN_USER="${2:-Administrator}"
WIN_PASS="$3"

if [ -z "$WIN_PASS" ]; then
    echo "用法: $0 <Windows_IP> <用户名> <密码>"
    echo "示例: $0 192.168.1.100 Admin password123"
    exit 1
fi

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SSH_CMD="sshpass -p '$WIN_PASS' ssh $SSH_OPTS"

echo "⚙️  Windows 远程管理环境配置"
echo "目标主机: $WIN_HOST"
echo "---"

# 1. 检查 SSH 连接
echo "1️⃣ 测试 SSH 连接..."
$SSH_CMD "$WIN_USER@$WIN_HOST" "echo 'SSH 连接成功'" || {
    echo "❌ SSH 连接失败"
    echo "请确认 Windows 已启用 OpenSSH Server"
    exit 1
}

# 2. 检查 OpenSSH 服务状态
echo ""
echo "2️⃣ 检查 OpenSSH 服务..."
$SSH_CMD "$WIN_USER@$WIN_HOST" "powershell -Command \"Get-Service sshd | Select-Object Name,Status,StartType\""

# 3. 检查 Node.js
echo ""
echo "3️⃣ 检查 Node.js..."
NODE_VER=$($SSH_CMD "$WIN_USER@$WIN_HOST" "node --version" 2>/dev/null)
if [ -n "$NODE_VER" ]; then
    echo "✅ Node.js 已安装: $NODE_VER"
else
    echo "❌ Node.js 未安装"
    echo "请手动安装: https://nodejs.org/"
    echo "或使用 Chocolatey: choco install nodejs"
fi

# 4. 检查 Playwright
echo ""
echo "4️⃣ 检查 Playwright..."
PLAYWRIGHT_VER=$($SSH_CMD "$WIN_USER@$WIN_HOST" "npx playwright --version" 2>/dev/null)
if [ -n "$PLAYWRIGHT_VER" ]; then
    echo "✅ Playwright 已安装: $PLAYWRIGHT_VER"
else
    echo "❌ Playwright 未安装"
    echo "安装命令: npm install -g playwright && npx playwright install"
fi

# 5. 检查 RDP 状态
echo ""
echo "5️⃣ 检查 RDP 状态..."
$SSH_CMD "$WIN_USER@$WIN_HOST" "powershell -Command \"Get-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name 'fDenyTSConnections' | Select-Object fDenyTSConnections\""

# 6. 创建工作目录
echo ""
echo "6️⃣ 创建工作目录..."
$SSH_CMD "$WIN_USER@$WIN_HOST" "mkdir -p C:/temp/screenshots" 2>/dev/null
echo "✅ 工作目录: C:/temp"

# 7. 显示系统信息
echo ""
echo "7️⃣ 系统信息..."
$SSH_CMD "$WIN_USER@$WIN_HOST" "powershell -Command \"Get-ComputerInfo | Select-Object WindowsProductName,WindowsVersion,OsArchitecture\""

echo ""
echo "🎉 配置检查完成!"
echo ""
echo "下一步:"
echo "  - 测试 SSH:  ./scripts/connect-windows-ssh.sh $WIN_HOST $WIN_USER <password>"
echo "  - 测试 RDP:  ./scripts/connect-windows-rdp.sh $WIN_HOST $WIN_USER <password>"
echo "  - 测试网页:  ./scripts/test-web-windows.sh $WIN_HOST $WIN_USER <password> https://7zi.com"
