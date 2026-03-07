#!/bin/bash
set -e

# ==========================================
# Docker 部署脚本
# ==========================================

# 配置
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:?❌ 请设置 DEPLOY_HOST 环境变量}"
APP_NAME="${APP_NAME:-myapp}"
IMAGE_NAME="${IMAGE_NAME:-myapp}"
TAG="${TAG:-latest}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
HOST_PORT="${HOST_PORT:-80}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"

echo "=========================================="
echo "🐳 Docker 部署"
echo "=========================================="
echo "📦 镜像：${IMAGE_NAME}:${TAG}"
echo "🖥️  服务器：${DEPLOY_HOST}"
echo "🔌 端口：${HOST_PORT} -> ${CONTAINER_PORT}"
echo ""

# 1. 构建镜像
echo "📦 构建 Docker 镜像..."
docker build -t "${IMAGE_NAME}:${TAG}" -f "${DOCKERFILE}" .

# 2. 导出镜像
echo "📤 导出镜像..."
docker save "${IMAGE_NAME}:${TAG}" | gzip > /tmp/${APP_NAME}.tar.gz
IMAGE_SIZE=$(du -h /tmp/${APP_NAME}.tar.gz | cut -f1)
echo "   镜像大小：${IMAGE_SIZE}"

# 3. 传输到服务器
echo "🚀 传输到服务器..."
scp -o StrictHostKeyChecking=no \
    /tmp/${APP_NAME}.tar.gz \
    "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/"

# 4. 在服务器上部署
echo "🏃 在服务器上部署..."
ssh -o StrictHostKeyChecking=no "${DEPLOY_USER}@${DEPLOY_HOST}" << ENDSSH
#!/bin/bash
set -e

echo "📥 加载镜像..."
gunzip -c /tmp/${APP_NAME}.tar.gz | docker load

echo "🛑 停止旧容器..."
docker stop ${APP_NAME} 2>/dev/null || true
docker rm ${APP_NAME} 2>/dev/null || true

echo "🏃 启动新容器..."
docker run -d \\
    --name ${APP_NAME} \\
    --restart unless-stopped \\
    -p ${HOST_PORT}:${CONTAINER_PORT} \\
    -e NODE_ENV=production \\
    --log-opt max-size=10m \\
    --log-opt max-file=3 \\
    ${IMAGE_NAME}:${TAG}

echo "🧹 清理..."
rm /tmp/${APP_NAME}.tar.gz

echo ""
echo "📊 容器状态:"
docker ps --filter "name=${APP_NAME}"
ENDSSH

# 5. 清理本地
rm -f /tmp/${APP_NAME}.tar.gz

echo ""
echo "=========================================="
echo "✅ Docker 部署完成！"
echo "=========================================="
echo "🌐 访问地址：http://${DEPLOY_HOST}:${HOST_PORT}"
echo ""
echo "💡 管理命令:"
echo "   查看日志：ssh ${DEPLOY_HOST} 'docker logs -f ${APP_NAME}'"
echo "   停止容器：ssh ${DEPLOY_HOST} 'docker stop ${APP_NAME}'"
echo "   重启容器：ssh ${DEPLOY_HOST} 'docker restart ${APP_NAME}'"
