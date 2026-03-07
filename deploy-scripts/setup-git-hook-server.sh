#!/bin/bash
set -e

# ==========================================
# Git Hook 服务器设置脚本
# 在服务器上运行此脚本
# ==========================================

# 配置
APP_NAME="${APP_NAME:-myapp}"
GIT_USER="${GIT_USER:-git}"
GIT_HOME="/home/${GIT_USER}"
REPO_DIR="${GIT_HOME}/repos/${APP_NAME}.git"
WORK_TREE="/var/www/${APP_NAME}"
BUILD_DIR="${GIT_HOME}/builds/${APP_NAME}"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOG_FILE="/var/log/deploy-${APP_NAME}.log"
NODE_VERSION="${NODE_VERSION:-20}"

echo "=========================================="
echo "🔧 Git Hook 服务器设置"
echo "=========================================="
echo "📦 应用名称：${APP_NAME}"
echo "👤 Git 用户：${GIT_USER}"
echo "📁 仓库目录：${REPO_DIR}"
echo "📁 部署目录：${WORK_TREE}"
echo ""

# 检查是否在服务器上运行
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 root 权限运行此脚本"
    exit 1
fi

# 1. 创建 Git 用户
echo "👤 创建 Git 用户..."
if ! id "${GIT_USER}" &>/dev/null; then
    adduser --system --shell /bin/bash --group ${GIT_USER}
    echo "✅ Git 用户创建成功"
else
    echo "ℹ️  Git 用户已存在"
fi

# 2. 创建目录结构
echo "📁 创建目录结构..."
mkdir -p "${REPO_DIR}" "${WORK_TREE}" "${BUILD_DIR}" "${BACKUP_DIR}"
chown -R ${GIT_USER}:${GIT_USER} "${REPO_DIR}" "${BUILD_DIR}"
chown -R ${GIT_USER}:www-data "${WORK_TREE}"
chmod 775 "${WORK_TREE}"
echo "✅ 目录创建成功"

# 3. 初始化 Bare Repository
echo "📦 初始化 Bare Repository..."
su - ${GIT_USER} -c "git init --bare ${REPO_DIR}"
echo "✅ Repository 初始化成功"

# 4. 创建 post-receive Hook
echo "📝 创建 post-receive Hook..."
cat > "${REPO_DIR}/hooks/post-receive" << 'HOOKEOF'
#!/bin/bash
set -e

# 配置
APP_NAME="myapp"
GIT_DIR="/home/git/repos/${APP_NAME}.git"
WORK_TREE="/var/www/${APP_NAME}"
BUILD_DIR="/home/git/builds/${APP_NAME}"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOG_FILE="/var/log/deploy-${APP_NAME}.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "========== 部署开始 =========="
log "应用：${APP_NAME}"

# 获取推送信息
while read oldrev newrev refname; do
    log "分支：${refname} (${oldrev:0:8} -> ${newrev:0:8})"
done

# 创建目录
mkdir -p "${BUILD_DIR}" "${BACKUP_DIR}"
rm -rf "${BUILD_DIR}"/*

# 备份当前版本
if [ -d "${WORK_TREE}" ] && [ "$(ls -A ${WORK_TREE})" ]; then
    log "备份当前版本..."
    cp -r "${WORK_TREE}" "${BACKUP_DIR}/backup_${TIMESTAMP}"
    cd "${BACKUP_DIR}"
    ls -dt backup_* 2>/dev/null | tail -n +6 | xargs -r rm -rf
    log "备份完成"
fi

# 检出代码
log "检出代码..."
git --work-tree="${BUILD_DIR}" --git-dir="${GIT_DIR}" checkout -f
cd "${BUILD_DIR}"

# 检测项目类型并构建
if [ -f "package.json" ]; then
    log "检测到 Node.js 项目..."
    
    # 加载 Node.js
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 20 || true
    
    # 安装依赖
    if [ -f "package-lock.json" ]; then
        log "安装依赖 (npm ci)..."
        npm ci --production 2>&1 | tee -a "${LOG_FILE}"
    else
        log "安装依赖 (npm install)..."
        npm install --production 2>&1 | tee -a "${LOG_FILE}"
    fi
    
    # 构建
    if grep -q '"build"' package.json; then
        log "执行构建..."
        npm run build 2>&1 | tee -a "${LOG_FILE}"
    fi
    
    # 同步到部署目录
    if [ -d "dist" ]; then
        log "同步 dist 目录..."
        rsync -av --delete ./dist/ "${WORK_TREE}/"
    elif [ -d "build" ]; then
        log "同步 build 目录..."
        rsync -av --delete ./build/ "${WORK_TREE}/"
    else
        log "同步整个项目..."
        rsync -av --delete --exclude='node_modules' --exclude='.git' "${BUILD_DIR}/" "${WORK_TREE}/"
    fi
    
elif [ -f "requirements.txt" ]; then
    log "检测到 Python 项目..."
    rsync -av --delete --exclude='__pycache__' --exclude='.git' "${BUILD_DIR}/" "${WORK_TREE}/"
    
else
    log "静态项目，直接同步..."
    rsync -av --delete --exclude='.git' "${BUILD_DIR}/" "${WORK_TREE}/"
fi

# 设置权限
log "设置权限..."
chown -R www-data:www-data "${WORK_TREE}"
chmod -R 755 "${WORK_TREE}"

# 清理
rm -rf "${BUILD_DIR}"

log "部署完成！"
log "========== 部署结束 =========="

echo ""
echo "=========================================="
echo "✅ 部署成功完成！"
echo "=========================================="
HOOKEOF

chmod +x "${REPO_DIR}/hooks/post-receive"
chown ${GIT_USER}:${GIT_USER} "${REPO_DIR}/hooks/post-receive"
echo "✅ Hook 创建成功"

# 5. 创建日志文件
echo "📝 创建日志文件..."
touch "${LOG_FILE}"
chown ${GIT_USER}:${GIT_USER} "${LOG_FILE}"
chmod 644 "${LOG_FILE}"
echo "✅ 日志文件创建成功"

# 6. 安装 NVM（如果需要）
echo "📦 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "ℹ️  Node.js 未安装，正在安装 NVM..."
    su - ${GIT_USER} -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    su - ${GIT_USER} -c "source ~/.nvm/nvm.sh && nvm install ${NODE_VERSION}"
    echo "✅ Node.js 安装成功"
else
    echo "ℹ️  Node.js 已安装：$(node --version)"
fi

# 7. 显示配置信息
echo ""
echo "=========================================="
echo "✅ Git Hook 设置完成！"
echo "=========================================="
echo ""
echo "📋 配置信息:"
echo "   仓库地址：git@$(hostname):${REPO_DIR}"
echo "   部署目录：${WORK_TREE}"
echo "   日志文件：${LOG_FILE}"
echo ""
echo "💡 本地配置步骤:"
echo "   1. 添加远程仓库:"
echo "      git remote add production git@$(hostname -I | awk '{print $1}'):${REPO_DIR}"
echo ""
echo "   2. 推送代码:"
echo "      git push production main"
echo ""
echo "   3. 查看部署日志:"
echo "      tail -f ${LOG_FILE}"
echo ""
echo "🔐 安全提示:"
echo "   - 配置 SSH 密钥认证"
echo "   - 不要使用密码登录"
echo "   - 定期备份代码和数据"
