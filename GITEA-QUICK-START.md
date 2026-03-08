# ============================================
# Gitea Actions 快速实施步骤
# 目标: 2 小时内完成迁移
# ============================================

## 🎯 目标服务器
- **Gitea**: 165.232.43.117:3000
- **部署目标**: 165.232.43.117

---

## ⚡ 5 分钟检查清单

### ✅ 前置条件
- [ ] 服务器访问权限 (root 或 sudo)
- [ ] 域名已解析（如使用域名）
- [ ] SSH 密钥已配置
- [ ] Docker 已安装
- [ ] 端口 3000, 80, 443 已开放

---

## 📋 第一步: 安装 Gitea (20 分钟)

### 1.1 创建目录并配置

```bash
# SSH 连接到服务器
ssh root@165.232.43.117

# 创建 Gitea 目录
mkdir -p /opt/gitea/{data,config,runner-data}
cd /opt/gitea

# 创建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: "3.8"

services:
  gitea:
    image: gitea/gitea:latest
    container_name: gitea
    restart: always
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__server__DOMAIN=165.232.43.117
      - GITEA__server__HTTP_PORT=3000
      - GITEA__server__ROOT_URL=http://165.232.43.117:3000
      - GITEA__server__SSH_DOMAIN=165.232.43.117
      - GITEA__actions__ENABLED=true
    ports:
      - "3000:3000"
      - "2222:22"
    volumes:
      - ./data:/data
      - ./config:/etc/gitea
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
    volumes:
      - ./runner-data:/data
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
docker-compose up -d

# 等待 Gitea 启动
sleep 30

# 查看日志
docker-compose logs -f gitea
```

### 1.2 初始化 Gitea

1. 访问 `http://165.232.43.117:3000`
2. 选择数据库类型: SQLite3（推荐，简单）
3. 配置管理员账户:
   - 用户名: `admin`
   - 密码: `设置强密码`
   - Email: `admin@7zi.com`
4. 完成
5. 登录 Gitea

---

## 🔧 第二步: 配置 Actions Runner (15 分钟)

### 2.1 获取注册 Token

1. 登录 Gitea
2. 点击右上角头像 → `Settings` → `Actions` → `Runners`
3. 点击 `New Runner` 按钮
4. 复制 Registration Token

### 2.2 注册 Runner

```bash
# 在服务器上执行
cd /opt/gitea

# 停止 runner 容器
docker-compose stop runner

# 获取 Token
# 从 Gitea 界面复制

# 手动注册 runner
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/runner-data:/data \
  -e GITEA_INSTANCE_URL=http://165.232.43.117:3000 \
  -e GITEA_RUNNER_REGISTRATION_TOKEN=your_token_here \
  gitea/act_runner:latest register

# 启动 runner
docker-compose start runner

# 查看状态
docker-compose logs -f runner
```

### 2.3 验证 Runner

在 Gitea 界面的 `Runners` 页面，Runner 状态应为 `Active`

---

## 📦 第三步: 创建项目仓库 (10 分钟)

### 3.1 在 Gitea 创建仓库

1. 点击 `+` → `New Repository`
2. 填写信息:
   - Repository Name: `7zi`
   - Visibility: `Private`
3. 点击 `Create Repository`

### 3.2 推送代码

```bash
# 在本地工作目录执行
cd /root/.openclaw/workspace

# 添加 Gitea remote
git remote add gitea http://165.232.43.117:3000/owner/7zi.git

# 推送代码
git push gitea --all
git push gitea --tags
```

---

## 🔐 第四步: 配置 Secrets (15 分钟)

### 4.1 生成 Gitea Token

1. 登录 Gitea
2. 右上角头像 → `Settings` → `Applications`
3. 点击 `Generate New Token`
4. 配置:
   - Token Name: `actions-token`
   - Select scopes: ✅ `read:package`, ✅ `write:package`
5. 点击 `Generate Token`
6. **复制并保存 Token**（只显示一次）

### 4.2 生成 SSH 密钥

```bash
# 在服务器上生成
ssh-keygen -t rsa -b 4096 -C "gitea-actions" -f ~/.ssh/gitea_actions -N ""

# 显示公钥
cat ~/.ssh/gitea_actions.pub

# 显示私钥（将复制到 Gitea Secrets）
cat ~/.ssh/gitea_actions
```

### 4.3 配置 Secrets

在 Gitea 仓库页面:
1. `Settings` → `Secrets` → `Actions`
2. 添加以下 Secrets:

| Name | Value |
|------|-------|
| `GITEA_REGISTRY` | `165.232.43.117:3000` |
| `GITEA_USERNAME` | `owner`（你的 Gitea 用户名） |
| `GITEA_TOKEN` | `ghp_xxxxxxxxxxxxx`（刚才生成的 Token） |
| `SERVER_HOST` | `165.232.43.117` |
| `SERVER_USER` | `root`（或部署用户） |
| `SSH_PRIVATE_KEY` | `-----BEGIN RSA PRIVATE KEY-----...`（私钥完整内容） |
| `SSH_PORT` | `22` |

---

## 🚀 第五步: 配置部署服务器 (20 分钟)

### 5.1 配置 Docker 信任

```bash
# 配置 Docker 信任私有注册表
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null << EOF
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
sudo systemctl restart docker

# 验证配置
sudo docker info | grep -A 5 "Insecure Registries"
```

### 5.2 登录到容器注册表

```bash
# 登录
docker login 165.232.43.117:3000

# 输入用户名和密码（Gitea 账号）
```

### 5.3 准备部署目录

```bash
# 创建目录
mkdir -p /opt/7zi-frontend/{nginx/ssl,nginx/logs,nginx/conf.d}
cd /opt/7zi-frontend

# 复制 docker-compose.gitea.yml
#（从工作目录复制到服务器）
# scp docker-compose.gitea.yml root@165.232.43.117:/opt/7zi-frontend/
```

### 5.4 创建环境文件

```bash
# 创建 .env.production
cat > .env.production << EOF
# Node.js 配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 性能优化
NEXT_TELEMETRY_DISABLED=1

# Gitea 容器注册表
GITEA_REGISTRY=165.232.43.117:3000

# 可选: 其他环境变量
# NEXT_PUBLIC_SITE_URL=https://7zi.com
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
EOF

# 验证文件
cat .env.production
```

### 5.5 配置 Nginx

```bash
# 创建 nginx.conf
cat > nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;

    upstream backend {
        server 7zi-frontend:3000;
    }

    server {
        listen 80;
        server_name 7zi.com www.7zi.com 165.232.43.117;

        # 重定向到 HTTPS（如果有证书）
        # return 301 https://$server_name$request_uri;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # 健康检查端点
        location /health {
            proxy_pass http://backend/health;
            access_log off;
        }
    }
}
EOF

# 验证配置
cat nginx/nginx.conf
```

---

## 🎯 第六步: 测试 Actions (15 分钟)

### 6.1 手动触发 Actions

1. 在 Gitea 仓库页面，点击 `Actions` 标签
2. 点击 `New Workflow`
3. 检查工作流文件（应自动识别 `.gitea/workflows/ci-cd.yml`）
4. 点击右上角的 `Run workflow` 按钮

### 6.2 监控执行

1. 点击最新运行的 workflow
2. 查看每个 Job 的日志
3. 检查是否有错误

### 6.3 验证构建

如果构建成功，应该看到:
- ✅ Lint & Format Check
- ✅ Type Check
- ✅ Test (shard 1-4)
- ✅ Build
- ✅ Docker Build & Push
- ✅ Pre-deployment Checks
- ✅ Deploy to Server

---

## ✅ 第七步: 验证部署 (15 分钟)

### 7.1 检查容器状态

```bash
# 在服务器上执行
cd /opt/7zi-frontend

# 查看容器状态
docker-compose -f docker-compose.gitea.yml ps

# 应该看到:
# 7zi-frontend    Up (healthy)
# nginx           Up (healthy)
# watchtower      Up
```

### 7.2 查看日志

```bash
# 查看应用日志
docker-compose -f docker-compose.gitea.yml logs -f 7zi-frontend

# 查看 Nginx 日志
docker-compose -f docker-compose.gitea.yml logs -f nginx
```

### 7.3 健康检查

```bash
# 本地健康检查
curl http://localhost:3000/

# 外部访问测试
curl http://165.232.43.117/

# 或在浏览器访问
# http://165.232.43.117/
```

### 7.4 功能测试

- [ ] 首页加载正常
- [ ] 静态资源加载正常
- [ ] API 路由正常
- [ ] 控制台无错误
- [ ] 响应速度正常

---

## 🔄 第八步: 停用 GitHub Actions (5 分钟)

### 8.1 备份 GitHub Actions

```bash
# 在本地工作目录
cd /root/.openclaw/workspace

# 重命名 GitHub Actions 目录
mv .github/workflows .github/workflows.backup

# 或删除
rm -rf .github/workflows

# 提交更改
git add .
git commit -m "Migrate CI/CD from GitHub Actions to Gitea Actions"
git push gitea main
```

### 8.2 更新文档

更新以下文档:
- README.md - 更新 CI/CD 徽章
- DEPLOYMENT-CHECKLIST.md - 添加 Gitea Actions 说明

---

## 📊 验证清单

### 构建验证
- [ ] Gitea Actions 触发成功
- [ ] Lint 通过
- [ ] Type Check 通过
- [ ] 测试通过
- [ ] 构建成功
- [ ] Docker 镜像推送成功

### 部署验证
- [ ] 容器启动成功
- [ ] 健康检查通过
- [ ] 网站可访问
- [ ] 功能正常

### 文档验证
- [ ] 迁移文档完整
- [ ] 配置文件已更新
- [ ] Secrets 已配置
- [ ] 团队已通知

---

## 🆘 常见问题快速修复

### Q: Runner 无法连接
```bash
# 重启 runner
cd /opt/gitea
docker-compose restart runner

# 查看日志
docker-compose logs -f runner
```

### Q: Docker 推送失败
```bash
# 重新登录
docker logout 165.232.43.117:3000
docker login 165.232.43.117:3000

# 检查网络
curl http://165.232.43.117:3000/v2/
```

### Q: 容器启动失败
```bash
# 查看日志
cd /opt/7zi-frontend
docker-compose -f docker-compose.gitea.yml logs 7zi-frontend

# 检查配置
docker-compose -f docker-compose.gitea.yml config
```

### Q: 网站无法访问
```bash
# 检查端口
netstat -tlnp | grep 3000
netstat -tlnp | grep 80

# 检查防火墙
ufw status
ufw allow 3000
ufw allow 80
ufw allow 443
```

---

## 📚 后续优化

### 性能优化
- [ ] 启用 CDN
- [ ] 配置 HTTP/2
- [ ] 优化 Nginx 缓存
- [ ] 启用 Brotli 压缩

### 安全加固
- [ ] 配置 HTTPS (Let's Encrypt)
- [ ] 启用防火墙
- [ ] 配置 Fail2ban
- [ ] 定期备份

### 监控告警
- [ ] 配置日志聚合
- [ ] 设置性能监控
- [ ] 配置告警通知
- [ ] 定期健康检查

---

## 📞 联系支持

如有问题，请联系:
- **技术支持**: dev@7zi.com
- **文档**: `/root/.openclaw/workspace/GITEA-ACTIONS-MIGRATION.md`

---

**预计总时间**: 2 小时
**难度**: 中等
**风险评估**: 低

**最后更新**: 2026-03-08