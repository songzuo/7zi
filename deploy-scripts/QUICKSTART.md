# 快速开始指南

## 选择部署方案

根据你的需求选择合适的部署方案：

| 方案 | 适合场景 | 难度 | 自动化 |
|------|----------|------|--------|
| **Nginx** | 静态网站、前端项目 | ⭐ | 手动 |
| **Docker** | 容器化应用、多环境 | ⭐⭐ | 半自动 |
| **rsync** | 快速同步、增量更新 | ⭐ | 手动 |
| **Git Hook** | CI/CD、自动部署 | ⭐⭐⭐ | 全自动 |

---

## 快速部署流程

### 方案 1: Nginx 部署（最简单）

```bash
# 1. 设置环境变量
export DEPLOY_HOST="your.server.ip"
export APP_NAME="myapp"

# 2. 构建项目
npm run build

# 3. 执行部署
./deploy-nginx.sh ./dist

# 4. 在服务器上配置 Nginx
ssh root@$DEPLOY_HOST
cat > /etc/nginx/sites-available/myapp << 'EOF'
# 复制 nginx.conf.template 内容
EOF
ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
systemctl reload nginx
```

### 方案 2: Docker 部署

```bash
# 1. 设置环境变量
export DEPLOY_HOST="your.server.ip"
export APP_NAME="myapp"

# 2. 创建 Dockerfile（参考 Dockerfile.templates）

# 3. 执行部署
./deploy-docker.sh

# 4. 访问应用
open http://$DEPLOY_HOST
```

### 方案 3: rsync 部署

```bash
# 1. 设置环境变量
export DEPLOY_HOST="your.server.ip"
export APP_NAME="myapp"

# 2. 执行部署
./deploy-rsync.sh ./dist

# 3. 验证
curl http://$DEPLOY_HOST
```

### 方案 4: Git Hook 自动部署（推荐用于团队）

```bash
# 1. 在服务器上运行设置脚本
scp setup-git-hook-server.sh root@your.server.ip:
ssh root@your.server.ip
chmod +x setup-git-hook-server.sh
export APP_NAME="myapp"
./setup-git-hook-server.sh

# 2. 在本地添加远程仓库
git remote add production git@your.server.ip:/home/git/repos/myapp.git

# 3. 推送代码（自动部署）
git push production main
```

---

## 环境变量配置

创建 `.env` 文件或导出环境变量：

```bash
# 服务器配置
export DEPLOY_USER="root"
export DEPLOY_HOST="your.server.ip"
export DEPLOY_PORT="22"
export SSH_KEY="~/.ssh/id_ed25519"

# 应用配置
export APP_NAME="myapp"
export APP_DIR="/var/www/myapp"

# Docker 配置
export CONTAINER_PORT="3000"
export HOST_PORT="80"
```

---

## SSH 密钥配置

```bash
# 1. 生成密钥（如果没有）
ssh-keygen -t ed25519 -C "deploy@myapp"

# 2. 复制公钥到服务器
ssh-copy-id root@your.server.ip

# 3. 测试连接
ssh root@your.server.ip "echo 连接成功"
```

---

## 服务器准备

### Ubuntu/Debian

```bash
# 更新系统
apt update && apt upgrade -y

# 安装必要工具
apt install -y nginx git rsync docker.io docker-compose curl wget

# 启动服务
systemctl enable nginx
systemctl start nginx

# 配置防火墙
ufw allow 'Nginx Full'
ufw allow SSH
ufw enable
```

### CentOS/RHEL

```bash
# 安装 EPEL
yum install -y epel-release

# 安装必要工具
yum install -y nginx git rsync docker docker-compose curl wget

# 启动服务
systemctl enable nginx
systemctl start nginx

# 配置防火墙
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload
```

---

## 故障排查

### 常见问题

1. **权限错误**
   ```bash
   ssh root@$DEPLOY_HOST "chown -R www-data:www-data /var/www/$APP_NAME"
   ```

2. **连接失败**
   ```bash
   # 检查防火墙
   ssh root@$DEPLOY_HOST "ufw status"
   
   # 检查端口
   ssh root@$DEPLOY_HOST "netstat -tlnp | grep :80"
   ```

3. **Nginx 不工作**
   ```bash
   ssh root@$DEPLOY_HOST "nginx -t && systemctl reload nginx"
   ```

4. **Docker 容器无法启动**
   ```bash
   ssh root@$DEPLOY_HOST "docker logs $APP_NAME"
   ```

### 查看日志

```bash
# Nginx 日志
ssh root@$DEPLOY_HOST "tail -f /var/log/nginx/error.log"

# 应用日志
ssh root@$DEPLOY_HOST "tail -f /var/log/deploy-$APP_NAME.log"

# Docker 日志
ssh root@$DEPLOY_HOST "docker logs -f $APP_NAME"
```

---

## 回滚部署

### rsync/Git Hook 方案

```bash
# 查看备份
ssh root@$DEPLOY_HOST "ls -lt /var/backups/$APP_NAME/"

# 回滚到指定备份
ssh root@$DEPLOY_HOST "cp -r /var/backups/$APP_NAME/backup_YYYYMMDD_HHMMSS /var/www/$APP_NAME"
```

### Docker 方案

```bash
# 查看历史镜像
ssh root@$DEPLOY_HOST "docker images $APP_NAME"

# 回滚到旧版本
ssh root@$DEPLOY_HOST "docker stop $APP_NAME && docker rm $APP_NAME"
ssh root@$DEPLOY_HOST "docker run -d --name $APP_NAME -p 80:3000 myapp:previous-tag"
```

---

## 安全建议

1. ✅ 使用 SSH 密钥认证，禁用密码登录
2. ✅ 配置防火墙，只开放必要端口
3. ✅ 定期更新系统和软件
4. ✅ 使用非 root 用户运行应用
5. ✅ 启用 HTTPS（Let's Encrypt）
6. ✅ 定期备份数据和配置
7. ✅ 监控服务器资源使用
8. ✅ 配置日志轮转

---

## 监控和维护

### 资源监控

```bash
# CPU 和内存
ssh root@$DEPLOY_HOST "htop"

# 磁盘使用
ssh root@$DEPLOY_HOST "df -h"

# 网络流量
ssh root@$DEPLOY_HOST "iftop"
```

### 自动更新

```bash
# 配置自动安全更新（Ubuntu）
apt install -y unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

### 备份脚本

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d)
ssh root@$DEPLOY_HOST "tar -czf /backups/myapp-$DATE.tar.gz /var/www/$APP_NAME"
scp root@$DEPLOY_HOST:/backups/myapp-$DATE.tar.gz ./backups/
```

---

## 联系和支持

如有问题，请检查：
1. 日志文件
2. 服务器资源
3. 网络连接
4. 配置文件语法

祝部署顺利！🚀
