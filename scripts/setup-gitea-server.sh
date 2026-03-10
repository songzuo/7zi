#!/bin/bash
# ============================================
# Gitea 服务器安装脚本
# 用于在 165.232.43.117 上快速部署 Gitea + Actions Runner
# ============================================

set -e

# 配置变量
GITEA_DOMAIN="165.232.43.117"
GITEA_PORT="3000"
GITEA_DATA_DIR="/opt/gitea/data"
GITEA_CONFIG_DIR="/opt/gitea/config"
GITEA_RUNNER_DIR="/opt/gitea/runner-data"

echo "============================================"
echo "  Gitea 服务器安装脚本"
echo "  目标服务器：${GITEA_DOMAIN}"
echo "============================================"

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请以 root 用户运行此脚本"
  exit 1
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
  echo "❌ Docker 未安装，请先安装 Docker"
  exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose 未安装，请先安装"
  exit 1
fi

echo "✅ Docker 和 Docker Compose 已安装"

# 创建目录
echo "📁 创建 Gitea 目录..."
mkdir -p ${GITEA_DATA_DIR}
mkdir -p ${GITEA_CONFIG_DIR}
mkdir -p ${GITEA_RUNNER_DIR}

# 创建 docker-compose.yml
echo "📝 创建 docker-compose.yml..."
cat > /opt/gitea/docker-compose.yml << EOF
version: "3.8"

services:
  gitea:
    image: gitea/gitea:latest
    container_name: gitea
    restart: always
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__server__DOMAIN=${GITEA_DOMAIN}
      - GITEA__server__HTTP_PORT=${GITEA_PORT}
      - GITEA__server__ROOT_URL=http://${GITEA_DOMAIN}:${GITEA_PORT}
      - GITEA__server__SSH_DOMAIN=${GITEA_DOMAIN}
      - GITEA__server__SSH_PORT=2222
      - GITEA__server__START_SSH_SERVER=true
      - GITEA__actions__ENABLED=true
      - GITEA__actions__DEFAULT_ACTIONS_URL=github
    ports:
      - "${GITEA_PORT}:3000"
      - "2222:22"
    volumes:
      - ${GITEA_DATA_DIR}:/data
      - ${GITEA_CONFIG_DIR}:/etc/gitea
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    networks:
      - gitea-network

  runner:
    image: gitea/act_runner:latest
    container_name: gitea-runner
    restart: always
    environment:
      - GITEA_INSTANCE_URL=http://gitea:3000
      - GITEA_RUNNER_LABELS=ubuntu-latest
      - GITEA_RUNNER_NAME=gitea-runner-1
    volumes:
      - ${GITEA_RUNNER_DIR}:/data
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - gitea-network
    depends_on:
      - gitea

networks:
  gitea-network:
    driver: bridge
EOF

# 启动 Gitea
echo "🚀 启动 Gitea..."
cd /opt/gitea
docker-compose up -d

# 等待 Gitea 启动
echo "⏳ 等待 Gitea 启动..."
sleep 30

# 检查 Gitea 状态
echo "📊 检查 Gitea 状态..."
docker-compose ps

# 查看日志
echo "📋 Gitea 日志（最后 20 行）:"
docker-compose logs --tail=20 gitea

echo ""
echo "============================================"
echo "  ✅ Gitea 安装完成！"
echo "============================================"
echo ""
echo "📌 下一步操作："
echo "1. 访问 http://${GITEA_DOMAIN}:${GITEA_PORT}"
echo "2. 初始化 Gitea（选择 SQLite3 数据库）"
echo "3. 创建管理员账户"
echo "4. 在 Settings → Actions → Runners 获取注册 Token"
echo "5. 使用 Token 注册 Runner（如未自动注册）"
echo ""
echo "📋 有用命令："
echo "  查看状态：cd /opt/gitea && docker-compose ps"
echo "  查看日志：cd /opt/gitea && docker-compose logs -f"
echo "  重启服务：cd /opt/gitea && docker-compose restart"
echo ""
