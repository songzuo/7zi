#!/bin/bash
# connect-windows-rdp.sh - RDP 连接到 Windows
# 用法: ./connect-windows-rdp.sh <host> <user> <password>

WIN_HOST="${1:-192.168.1.100}"
WIN_USER="${2:-Administrator}"
WIN_PASS="$3"

if [ -z "$WIN_PASS" ]; then
    echo "用法: $0 <Windows_IP> <用户名> <密码>"
    echo "示例: $0 192.168.1.100 Admin password123"
    exit 1
fi

# 检查 FreeRDP 是否安装
if ! command -v xfreerdp &> /dev/null; then
    echo "❌ xfreerdp 未安装"
    echo "安装: sudo apt install freerdp2-x11"
    exit 1
fi

echo "🖥️  RDP 连接到 Windows: $WIN_HOST"
echo "用户: $WIN_USER"
echo "分辨率: 1920x1080"
echo "---"

xfreerdp /v:"$WIN_HOST" /u:"$WIN_USER" /p:"$WIN_PASS" \
    /w:1920 /h:1080 \
    +clipboard \
    +fonts \
    /cert:ignore
