# Nginx 直接部署方案

## 概述

将静态文件直接上传到服务器，通过 Nginx 提供 Web 服务。

## 适用场景

- 静态网站（HTML/CSS/JS）
- 前端构建产物（React/Vue/Angular build）
- 简单的文件服务

---

## 部署脚本

### deploy-nginx.sh

```bash
#!/bin/bash
set -e

# 配置
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:?请设置 DEPLOY_HOST}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
APP_NAME="${APP_NAME:-myapp}"
APP_DIR="/var/www/${APP_NAME}"
LOCAL_BUILD_DIR="${1:-./dist}"

echo "🚀 开始 Nginx 部署..."
echo "📦 本地目录：${LOCAL_BUILD_DIR}"
echo "🖥️  服务器：${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PORT}"
echo "📁 部署目录：${APP_DIR}"

# 1. 检查本地构建目录
if [ ! -d "${LOCAL_BUILD_DIR}" ]; then
    echo "❌ 错误：本地构建目录不存在：${LOCAL_BUILD_DIR}"
    exit 1
fi

# 2. 在服务器创建目录
echo "📁 创建远程目录..."
ssh -p "${DEPLOY_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "mkdir -p ${APP_DIR}"

# 3. 同步文件
echo "📤 上传文件..."
rsync -avz -e "ssh -p ${DEPLOY_PORT}" \
    --delete \
    "${LOCAL_BUILD_DIR}/" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}/"

# 4. 设置权限
echo "🔐 设置权限..."
ssh -p "${DEPLOY_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "chown -R www-data:www-data ${APP_DIR} && chmod -R 755 ${APP_DIR}"

echo "✅ 文件部署完成！"
```

---

## Nginx 配置

### 基础配置 (/etc/nginx/sites-available/myapp)

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP
    
    root /var/www/myapp;
    index index.html index.htm;
    
    # 日志
    access_log /var/log/nginx/myapp-access.log;
    error_log /var/log/nginx/myapp-error.log;
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA 路由支持（React/Vue 等）
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json image/svg+xml;
}
```

### HTTPS 配置（使用 Let's Encrypt）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL 优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    root /var/www/myapp;
    index index.html;
    
    # ... 其他配置同上
}
```

---

## 使用步骤

### 1. 准备服务器

```bash
# SSH 登录服务器
ssh root@your.server.ip

# 安装 Nginx
apt update && apt install -y nginx

# 创建部署用户（可选，更安全）
adduser deploy
usermod -aG www-data deploy

# 创建部署目录
mkdir -p /var/www/myapp
chown -R www-data:www-data /var/www/myapp
```

### 2. 配置 Nginx

```bash
# 在服务器上创建配置文件
cat > /etc/nginx/sites-available/myapp << 'EOF'
# 粘贴上面的 Nginx 配置
EOF

# 启用站点
ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

### 3. 本地部署

```bash
# 设置环境变量
export DEPLOY_HOST="your.server.ip"
export APP_NAME="myapp"

# 构建项目（如果是前端项目）
npm run build

# 执行部署脚本
./deploy-nginx.sh ./dist
```

---

## 自动化脚本（一键部署）

### deploy-full.sh

```bash
#!/bin/bash
set -e

APP_NAME="${APP_NAME:-myapp}"
DEPLOY_HOST="${DEPLOY_HOST:?请设置 DEPLOY_HOST}"

echo "🔧 开始完整部署流程..."

# 1. 安装依赖并构建
echo "📦 安装依赖并构建..."
npm ci
npm run build

# 2. 部署到服务器
echo "🚀 部署到服务器..."
./deploy-nginx.sh ./dist

# 3. 验证部署
echo "🔍 验证部署..."
curl -I "http://${DEPLOY_HOST}" || echo "⚠️  验证失败，请手动检查"

echo "✅ 部署完成！"
```

---

## 故障排查

### 常见问题

1. **权限错误**
   ```bash
   ssh root@server "chown -R www-data:www-data /var/www/myapp"
   ```

2. **Nginx 不生效**
   ```bash
   ssh root@server "nginx -t && systemctl reload nginx"
   ```

3. **SELinux 阻止访问**（CentOS/RHEL）
   ```bash
   ssh root@server "setsebool -P httpd_can_network_connect 1"
   ```

4. **防火墙阻止**
   ```bash
   ssh root@server "ufw allow 'Nginx Full'"
   ```

---

## 安全建议

1. 使用非 root 用户部署
2. 配置 SSH 密钥认证，禁用密码登录
3. 启用防火墙（ufw/firewalld）
4. 定期更新系统和 Nginx
5. 使用 HTTPS（Let's Encrypt）
6. 配置 fail2ban 防止暴力破解
