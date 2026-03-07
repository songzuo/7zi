#!/bin/bash
# 7zi.com 部署脚本

set -e

echo "=== 7zi.com 部署开始 ==="

# 1. 构建
echo "1. 构建项目..."
cd ~/7zi-project/7zi-frontend
npm run build

# 2. SSH 连接测试
echo "2. 测试 SSH 连接..."
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no root@7zi.com "echo 'Connected'" || {
    echo "❌ SSH 连接失败！请配置 SSH 密钥"
    exit 1
}

# 3. 创建目录
echo "3. 创建目录..."
ssh -i ~/.ssh/id_ed25519 root@7zi.com "mkdir -p /var/www/7zi"

# 4. 清空旧文件
echo "4. 清空旧文件..."
ssh -i ~/.ssh/id_ed25519 root@7zi.com "rm -rf /var/www/7zi/*"

# 5. 部署
echo "5. 部署文件..."
scp -i ~/.ssh/id_ed25519 -r ~/7zi-project/7zi-frontend/out/* root@7zi.com:/var/www/7zi/

# 6. 验证
echo "6. 验证部署..."
ssh -i ~/.ssh/id_ed25519 root@7zi.com "ls -la /var/www/7zi/"

echo "=== ✅ 部署完成 ==="
