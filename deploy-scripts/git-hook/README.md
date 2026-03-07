# Git Hook 自动部署方案

## 概述

在服务器设置 Git bare repository，通过 post-receive hook 实现 push 后自动构建和部署。

## 适用场景

- 持续集成/持续部署（CI/CD）
- 团队协作开发
- 自动化测试和部署
- 多环境自动同步

---

## 架构说明

```
本地开发机              服务器
┌─────────────┐        ┌─────────────────────┐
│  开发者     │        │  Git Bare Repo      │
│  git push   │ ─────► │  /home/git/myapp.git│
│             │        │         │           │
│             │        │         ▼           │
│             │        │  post-receive hook  │
│             │        │         │           │
│             │        │         ▼           │
│             │        │  构建脚本            │
│             │        │         │           │
│             │        │         ▼           │
│             │        │  部署目录            │
│             │        │  /var/www/myapp     │
└─────────────┘        └─────────────────────┘
```

---

## 服务器设置

### 1. 创建 Git 用户（推荐）

```bash
# 创建 git 用户
sudo adduser --system --shell /bin/bash --group git
sudo usermod -aG www-data git

# 切换到 git 用户
sudo su - git
```

### 2. 创建 Bare Repository

```bash
# 创建 bare repo 目录
mkdir -p /home/git/repos/myapp.git
cd /home/git/repos/myapp.git

# 初始化为 bare repository
git init --bare

# 设置权限
chown -R git:git /home/git/repos/myapp.git
```

### 3. 创建 post-receive Hook

```bash
# 创建 hook 文件
cat > /home/git/repos/myapp.git/hooks/post-receive << 'EOF'
#!/bin/bash
set -e

# 配置
APP_NAME="myapp"
GIT_DIR="/home/git/repos/${APP_NAME}.git"
WORK_TREE="/var/www/${APP_NAME}"
BUILD_DIR="/home/git/builds/${APP_NAME}"
NODE_VERSION="20"

echo "🚀 开始自动部署：${APP_NAME}"
echo "📂 工作目录：${WORK_TREE}"

# 1. 创建工作目录
mkdir -p "${BUILD_DIR}"
rm -rf "${BUILD_DIR}"/*

# 2. 检出代码到工作目录
git --work-tree="${BUILD_DIR}" --git-dir="${GIT_DIR}" checkout -f

# 3. 进入工作目录
cd "${BUILD_DIR}"

# 4. 安装依赖并构建（Node.js 项目示例）
echo "📦 安装依赖..."
if [ -f "package.json" ]; then
    # 加载 Node.js
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use ${NODE_VERSION}
    
    # 安装依赖
    npm ci --production
    
    # 构建
    if npm run build --if-present; then
        echo "✅ 构建成功"
    else
        echo "⚠️  无构建步骤或构建失败"
    fi
    
    # 同步到部署目录
    rsync -av --delete ./dist/ "${WORK_TREE}/"
else
    # 非 Node.js 项目，直接同步
    rsync -av --delete --exclude='.git' "${BUILD_DIR}/" "${WORK_TREE}/"
fi

# 5. 设置权限
chown -R www-data:www-data "${WORK_TREE}"
chmod -R 755 "${WORK_TREE}"

# 6. 清理
rm -rf "${BUILD_DIR}"

# 7. 重启服务（如果需要）
# systemctl restart myapp

echo "✅ 部署完成！"
EOF

# 赋予执行权限
chmod +x /home/git/repos/myapp.git/hooks/post-receive

# 设置所有者
chown git:git /home/git/repos/myapp.git/hooks/post-receive
```

### 4. 创建部署目录

```bash
# 创建部署目录
sudo mkdir -p /var/www/myapp
sudo chown -R git:www-data /var/www/myapp
sudo chmod 775 /var/www/myapp

# 创建构建目录
sudo mkdir -p /home/git/builds
sudo chown git:git /home/git/builds
```

---

## 本地配置

### 1. 添加远程仓库

```bash
# 在你的项目目录
cd /path/to/your/project

# 添加远程仓库
git remote add production git@your.server.ip:/home/git/repos/myapp.git

# 或者使用 SSH 端口
git remote add production ssh://git@your.server.ip:22/home/git/repos/myapp.git
```

### 2. 配置 SSH（如果需要）

```bash
# 生成部署密钥
ssh-keygen -t ed25519 -C "deploy@myapp" -f ~/.ssh/id_ed25519_deploy

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_ed25519_deploy git@your.server.ip

# 配置 SSH config
cat >> ~/.ssh/config << EOF

Host myapp-server
    HostName your.server.ip
    User git
    IdentityFile ~/.ssh/id_ed25519_deploy
    Port 22
EOF
```

### 3. 首次推送

```bash
# 推送到生产环境
git push production main

# 或者推送特定分支
git push production main:main
```

---

## 高级 Hook 脚本

### post-receive（完整版）

```bash
#!/bin/bash
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置
APP_NAME="${APP_NAME:-myapp}"
GIT_DIR="/home/git/repos/${APP_NAME}.git"
WORK_TREE="/var/www/${APP_NAME}"
BUILD_DIR="/home/git/builds/${APP_NAME}"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOG_FILE="/var/log/deploy-${APP_NAME}.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 日志函数
log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "${LOG_FILE}"
}

# 开始部署
log_to_file "========== 部署开始 =========="
log_info "开始部署：${APP_NAME}"

# 获取推送信息
while read oldrev newrev refname; do
    log_info "分支：${refname}"
    log_info "旧版本：${oldrev:0:8}"
    log_info "新版本：${newrev:0:8}"
done

# 创建目录
mkdir -p "${BUILD_DIR}" "${BACKUP_DIR}"
rm -rf "${BUILD_DIR}"/*

# 备份当前版本
if [ -d "${WORK_TREE}" ] && [ "$(ls -A ${WORK_TREE})" ]; then
    log_info "备份当前版本..."
    cp -r "${WORK_TREE}" "${BACKUP_DIR}/backup_${TIMESTAMP}"
    
    # 保留最近 5 个备份
    cd "${BACKUP_DIR}"
    ls -dt backup_* 2>/dev/null | tail -n +6 | xargs -r rm -rf
    log_success "备份完成"
fi

# 检出代码
log_info "检出代码..."
git --work-tree="${BUILD_DIR}" --git-dir="${GIT_DIR}" checkout -f

cd "${BUILD_DIR}"

# 检测项目类型并构建
if [ -f "package.json" ]; then
    log_info "检测到 Node.js 项目..."
    
    # 加载 Node.js
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        \. "$NVM_DIR/nvm.sh"
        nvm use 20
    fi
    
    # 安装依赖
    if [ -f "package-lock.json" ]; then
        log_info "安装依赖 (npm ci)..."
        npm ci --production
    else
        log_info "安装依赖 (npm install)..."
        npm install --production
    fi
    
    # 构建
    if grep -q '"build"' package.json; then
        log_info "执行构建..."
        if npm run build; then
            log_success "构建成功"
        else
            log_error "构建失败"
            log_to_file "构建失败"
            exit 1
        fi
    fi
    
    # 同步到部署目录
    if [ -d "dist" ]; then
        log_info "同步 dist 目录..."
        rsync -av --delete ./dist/ "${WORK_TREE}/"
    elif [ -d "build" ]; then
        log_info "同步 build 目录..."
        rsync -av --delete ./build/ "${WORK_TREE}/"
    else
        log_warn "未找到 dist 或 build 目录，同步整个项目"
        rsync -av --delete --exclude='node_modules' --exclude='.git' "${BUILD_DIR}/" "${WORK_TREE}/"
    fi
    
elif [ -f "requirements.txt" ]; then
    log_info "检测到 Python 项目..."
    
    # 创建虚拟环境
    python3 -m venv "${BUILD_DIR}/venv"
    source "${BUILD_DIR}/venv/bin/activate"
    
    # 安装依赖
    pip install -r requirements.txt
    
    # 同步
    rsync -av --delete --exclude='venv' --exclude='__pycache__' --exclude='.git' "${BUILD_DIR}/" "${WORK_TREE}/"
    
elif [ -f "go.mod" ]; then
    log_info "检测到 Go 项目..."
    
    # 构建
    go build -o "${WORK_TREE}/app" .
    
else
    log_info "静态项目，直接同步..."
    rsync -av --delete --exclude='.git' "${BUILD_DIR}/" "${WORK_TREE}/"
fi

# 设置权限
log_info "设置权限..."
chown -R www-data:www-data "${WORK_TREE}"
chmod -R 755 "${WORK_TREE}"
find "${WORK_TREE}" -type f -name "*.sh" -exec chmod +x {} \;

# 清理
rm -rf "${BUILD_DIR}"

# 重载服务（根据实际服务配置）
# systemctl reload nginx
# systemctl restart myapp

log_success "部署完成！"
log_to_file "部署成功完成"
log_to_file "========== 部署结束 =========="

echo ""
echo "=========================================="
echo "✅ 部署成功完成！"
echo "=========================================="
```

---

## 多环境部署

### 目录结构

```
/home/git/repos/
├── myapp-dev.git      # 开发环境
├── myapp-staging.git  # 测试环境
└── myapp-prod.git     # 生产环境
```

### 多环境 Hook 配置

```bash
# /home/git/repos/myapp-dev.git/hooks/post-receive
#!/bin/bash
APP_NAME="myapp-dev"
WORK_TREE="/var/www/myapp-dev"
# ... 其他配置

# /home/git/repos/myapp-prod.git/hooks/post-receive
#!/bin/bash
APP_NAME="myapp-prod"
WORK_TREE="/var/www/myapp-prod"
# ... 其他配置
```

### 本地多环境配置

```bash
# 添加多个远程
git remote add dev git@server:/home/git/repos/myapp-dev.git
git remote add staging git@server:/home/git/repos/myapp-staging.git
git remote add prod git@server:/home/git/repos/myapp-prod.git

# 部署到不同环境
git push dev main      # 开发环境
git push staging main  # 测试环境
git push prod main     # 生产环境（需要保护）
```

---

## 部署保护（生产环境）

### 1. 分支保护 Hook

```bash
# /home/git/repos/myapp-prod.git/hooks/pre-receive
#!/bin/bash

# 只允许 main/master 分支推送到生产环境
while read oldrev newrev refname; do
    branch=$(echo $refname | sed 's|refs/heads/||')
    
    if [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
        echo "❌ 错误：生产环境只接受 main/master 分支"
        echo "   你尝试推送的分支：$branch"
        exit 1
    fi
done

exit 0
```

### 2. 需要确认的 Hook

```bash
# 在 post-receive 开头添加
read -p "⚠️  确认部署到生产环境？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ 部署已取消"
    exit 1
fi
```

---

## 部署通知

### 添加通知到 Hook

```bash
# 部署完成后发送通知
send_notification() {
    local status="$1"
    local message="$2"
    
    # Telegram Bot（可选）
    if [ -n "${TELEGRAM_BOT_TOKEN}" ] && [ -n "${TELEGRAM_CHAT_ID}" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}"
    fi
    
    # 钉钉 webhook（可选）
    if [ -n "${DINGTALK_WEBHOOK}" ]; then
        curl -s -X POST "${DINGTALK_WEBHOOK}" \
            -H "Content-Type: application/json" \
            -d "{
                \"msgtype\": \"text\",
                \"text\": {
                    \"content\": \"${message}\"
                }
            }"
    fi
    
    # 邮件通知（可选）
    if [ -n "${NOTIFY_EMAIL}" ]; then
        echo "${message}" | mail -s "部署通知：${status}" "${NOTIFY_EMAIL}"
    fi
}

# 使用
send_notification "success" "✅ 部署成功：${APP_NAME}"
```

---

## 使用步骤

### 1. 服务器设置

```bash
# SSH 登录服务器
ssh root@your.server.ip

# 创建 git 用户
adduser --system --shell /bin/bash --group git

# 创建 bare repo
mkdir -p /home/git/repos/myapp.git
cd /home/git/repos/myapp.git
git init --bare

# 创建 post-receive hook
# （粘贴上面的 hook 脚本）
chmod +x hooks/post-receive

# 创建部署目录
mkdir -p /var/www/myapp
chown -R git:www-data /var/www/myapp
```

### 2. 本地配置

```bash
# 添加远程仓库
git remote add production git@your.server.ip:/home/git/repos/myapp.git

# 首次推送
git push production main
```

### 3. 后续部署

```bash
# 只需推送代码
git push production main
```

---

## 故障排查

### 查看部署日志

```bash
# 实时查看日志
ssh git@server "tail -f /var/log/deploy-myapp.log"

# 查看最近部署
ssh git@server "cat /var/log/deploy-myapp.log"
```

### 手动触发部署

```bash
# SSH 到服务器
ssh git@server

# 手动执行 hook
/home/git/repos/myapp.git/hooks/post-receive
```

### 常见问题

1. **权限错误**
   ```bash
   sudo chown -R git:www-data /var/www/myapp
   sudo chmod -R 775 /var/www/myapp
   ```

2. **Node.js 未找到**
   ```bash
   # 安装 nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   ```

3. **Git hook 不执行**
   ```bash
   # 检查执行权限
   chmod +x /home/git/repos/myapp.git/hooks/post-receive
   
   # 检查所有者
   chown git:git /home/git/repos/myapp.git/hooks/post-receive
   ```

---

## 安全建议

1. 使用专用的 git 用户，不要用 root
2. 配置 SSH 密钥认证，禁用密码登录
3. 生产环境使用分支保护
4. 限制 hook 的执行权限
5. 定期备份代码和部署
6. 监控部署日志
7. 使用防火墙限制访问
