#!/bin/bash
# ============================================
# Gitea Secrets 和 SSH 配置脚本
# 用于配置 CI/CD 所需的 Secrets 和 SSH 密钥
# ============================================

set -e

GITEA_URL="http://165.232.43.117:3000"
REPO_NAME="7zi"
SSH_KEY_DIR="$HOME/.ssh/gitea_actions"

echo "============================================"
echo "  Gitea Secrets 和 SSH 配置脚本"
echo "============================================"

# 生成 SSH 密钥对
echo "🔑 生成 SSH 密钥对..."
ssh-keygen -t rsa -b 4096 -C "gitea-actions@7zi" -f ${SSH_KEY_DIR} -N ""

echo "✅ SSH 密钥生成完成"
echo "  私钥：${SSH_KEY_DIR}"
echo "  公钥：${SSH_KEY_DIR}.pub"

# 显示公钥（需要添加到部署服务器的 authorized_keys）
echo ""
echo "📋 公钥内容（请添加到部署服务器的 ~/.ssh/authorized_keys）:"
echo "============================================"
cat ${SSH_KEY_DIR}.pub
echo "============================================"

# 显示私钥（需要添加到 Gitea Secrets）
echo ""
echo "🔒 私钥内容（请添加到 Gitea Secrets → SSH_PRIVATE_KEY）:"
echo "============================================"
cat ${SSH_KEY_DIR}
echo "============================================"

# 配置 Docker 信任私有注册表
echo ""
echo "🐳 配置 Docker 信任 Gitea 容器注册表..."

cat > /etc/docker/daemon.json << EOF
{
  "insecure-registries": ["165.232.43.117:3000"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
EOF

# 重启 Docker
systemctl restart docker

echo "✅ Docker 配置完成"

# 验证配置
echo "📊 验证 Docker 配置..."
docker info | grep -A 5 "Insecure Registries" || echo "⚠️ 无法验证 Docker 配置"

# 创建 Secrets 配置说明
echo ""
echo "============================================"
echo "  📝 Gitea Secrets 配置清单"
echo "============================================"
echo ""
echo "请在 Gitea 仓库 Settings → Secrets → Actions 中添加以下 Secrets:"
echo ""
echo "┌─────────────────────────┬──────────────────────────────────────────┐"
echo "│ Name                    │ Value                                    │"
echo "├─────────────────────────┼──────────────────────────────────────────┤"
echo "│ GITEA_REGISTRY          │ 165.232.43.117:3000                      │"
echo "│ GITEA_USERNAME          │ <你的 Gitea 用户名>                       │"
echo "│ GITEA_TOKEN             │ <在 Settings → Applications 生成的 Token> │"
echo "│ SERVER_HOST             │ 165.232.43.117                           │"
echo "│ SERVER_USER             │ root                                     │"
echo "│ SSH_PRIVATE_KEY         │ <上面显示的私钥完整内容>                  │"
echo "│ SSH_PORT                │ 22                                       │"
echo "└─────────────────────────┴──────────────────────────────────────────┘"
echo ""

# 创建部署目录
echo "📁 创建部署目录..."
mkdir -p /opt/7zi-frontend/{nginx/ssl,nginx/logs,nginx/conf.d}

echo "✅ 部署目录创建完成：/opt/7zi-frontend"

# 复制 docker-compose 文件
if [ -f "/root/.openclaw/workspace/docker-compose.gitea.yml" ]; then
  cp /root/.openclaw/workspace/docker-compose.gitea.yml /opt/7zi-frontend/docker-compose.gitea.yml
  echo "✅ docker-compose.gitea.yml 已复制"
fi

# 创建环境文件
echo "📝 创建环境文件..."
cat > /opt/7zi-frontend/.env.production << EOF
# Node.js 配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 性能优化
NEXT_TELEMETRY_DISABLED=1

# Gitea 容器注册表
GITEA_REGISTRY=165.232.43.117:3000
EOF

echo "✅ 环境文件创建完成"

echo ""
echo "============================================"
echo "  ✅ 配置完成！"
echo "============================================"
echo ""
echo "📌 下一步操作："
echo "1. 将 SSH 公钥添加到部署服务器的 ~/.ssh/authorized_keys"
echo "2. 在 Gitea 界面配置 Secrets（见上方清单）"
echo "3. 在 Gitea 创建 7zi 仓库"
echo "4. 推送代码到 Gitea 仓库"
echo "5. 手动触发 Actions 测试"
echo ""
