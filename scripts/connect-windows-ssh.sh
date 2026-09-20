#!/bin/bash
# connect-windows-ssh.sh - SSH 连接到 Windows
# 用法: ./connect-windows-ssh.sh <host> <user> <password>

WIN_HOST="${1:-192.168.1.100}"
WIN_USER="${2:-Administrator}"
WIN_PASS="$3"

if [ -z "$WIN_PASS" ]; then
    echo "用法: $0 <Windows_IP> <用户名> <密码>"
    echo "示例: $0 192.168.1.100 Admin password123"
    exit 1
fi

echo "🔗 SSH 连接到 Windows: $WIN_HOST"
echo "用户: $WIN_USER"
echo "---"

# 使用单引号包裹密码（处理特殊字符）
sshpass -p "$WIN_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "$WIN_USER@$WIN_HOST"
