# CI/CD 快速实施指南

**基于**: CI_CD_PIPELINE_OPTIMIZATION.md
**版本**: 1.0
**目标**: 30 分钟内完成基础自动化部署

---

## 🚀 5 分钟快速开始

### 步骤 1: 配置 GitHub Secrets (3 分钟)

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

```yaml
# 必需
PRODUCTION_HOST: 7zi.com
PRODUCTION_USER: root
SSH_PRIVATE_KEY: <你的 SSH 私钥内容>
SSH_PORT: 22

# 可选（用于通知）
SLACK_WEBHOOK: <Slack Webhook URL>
```

**获取 SSH 私钥**:
```bash
# 在本地执行
cat ~/.ssh/id_ed25519
# 复制输出内容（包括 BEGIN 和 END 行）
```

### 步骤 2: 创建 GitHub Actions 工作流 (2 分钟)

创建 `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    name: 自动部署
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && success()
    steps:
      - name: 部署到服务器
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            set -e
            cd /opt/7zi-frontend
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker system prune -f

      - name: 健康检查
        run: |
          for i in {1..30}; do
            if curl -sf https://7zi.com/health > /dev/null 2>&1; then
              echo "✅ 健康检查通过"
              exit 0
            fi
            sleep 2
          done
          echo "❌ 健康检查失败"
          exit 1
```

### 步骤 3: 测试部署 (30 秒)

```bash
# 推送代码到 main 分支
git add .
git commit -m "test: 测试自动部署"
git push origin main

# 在 GitHub Actions 中查看部署进度
```

---

## 📋 完整检查清单

### 部署前检查

- [ ] GitHub Secrets 已配置
- [ ] 服务器已安装 Docker 和 Docker Compose
- [ ] SSH 密钥已添加到服务器 `~/.ssh/authorized_keys`
- [ ] 服务器防火墙允许 SSH 连接
- [ ] `docker-compose.prod.yml` 存在于服务器 `/opt/7zi-frontend/`

### 服务器准备

```bash
# SSH 登录服务器
ssh root@7zi.com

# 创建部署目录
mkdir -p /opt/7zi-frontend
cd /opt/7zi-frontend

# 复制必要的文件（从本地）
# 方法 1: 使用 rsync
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  /root/.openclaw/workspace/7zi-project/docker-compose.prod.yml \
  root@7zi.com:/opt/7zi-frontend/

# 方法 2: 使用 scp
scp -i ~/.ssh/id_ed25519 \
  /root/.openclaw/workspace/7zi-project/docker-compose.prod.yml \
  root@7zi.com:/opt/7zi-frontend/

# 方法 3: 直接在服务器上创建
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  7zi-frontend:
    image: ghcr.io/7zi/7zi-frontend:latest
    container_name: 7zi-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
EOF
```

### 本地部署脚本

创建 `deploy.sh`:

```bash
#!/bin/bash
set -e

SERVER="7zi.com"
USER="root"
DEPLOY_PATH="/opt/7zi-frontend"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}[INFO]${NC} 部署到 $SERVER..."

# 同步代码
rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  -e "ssh -i ~/.ssh/id_ed25519" \
  "$(pwd)/" "$USER@$SERVER:$DEPLOY_PATH/"

# 重启服务
ssh -i ~/.ssh/id_ed25519 "$USER@$SERVER" \
  "cd $DEPLOY_PATH && docker-compose restart"

# 健康检查
for i in {1..30}; do
  if ssh -i ~/.ssh/id_ed25519 "$USER@$SERVER" \
    "curl -sf http://localhost:3000/health > /dev/null 2>&1"; then
    echo -e "${GREEN}[INFO]${NC} ✅ 部署成功"
    exit 0
  fi
  sleep 2
done

echo -e "${RED}[ERROR]${NC} ❌ 健康检查失败"
exit 1
```

使用：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🎯 三个级别的优化

### Level 1: 基础自动化 (30 分钟)

**目标**: Push 到 main 分支后自动部署

**已完成**:
- ✅ GitHub Actions 部署 Job
- ✅ 健康检查
- ✅ 基础通知（可选）

**效果**:
- 部署时间: 15-30 分钟 → 5-8 分钟
- 人工步骤: 5-10 步 → 0 步

---

### Level 2: 性能优化 (1-2 小时)

**目标**: 提高 Docker 缓存效率

**需要添加**:

1. 优化 `.dockerignore`:
```bash
# .dockerignore
node_modules
.next
.git
coverage
*.log
.env.*
!env.production.example
*.md
docs/
.github/
```

2. 使用优化的 Dockerfile（参考主文档）

3. 启用 BuildKit:
```bash
export DOCKER_BUILDKIT=1
docker build -t test -f Dockerfile.production .
```

**效果**:
- 缓存命中率: 60% → 85%+
- 构建时间: 5-8 分钟 → 2-3 分钟

---

### Level 3: 高级功能 (2-4 小时)

**目标**: 零停机部署、监控告警

**需要添加**:

1. 蓝绿部署配置
2. 自动回滚机制
3. 监控告警集成
4. 性能基准测试

**效果**:
- 停机时间: 30-60 秒 → 0 秒
- 回滚时间: 30+ 分钟 → < 5 分钟
- 问题发现: 数小时 → < 5 分钟

---

## 🔧 故障排查

### 问题 1: SSH 连接失败

**症状**: GitHub Actions 报错 "SSH connection failed"

**解决**:
```bash
# 1. 测试 SSH 连接
ssh -i ~/.ssh/id_ed25519 root@7zi.com

# 2. 检查密钥权限
chmod 600 ~/.ssh/id_ed25519

# 3. 添加密钥到服务器
cat ~/.ssh/id_ed25519.pub | ssh root@7zi.com 'cat >> ~/.ssh/authorized_keys'

# 4. 验证 GitHub Secret
# 确保复制了完整的私钥（包括 BEGIN 和 END 行）
```

### 问题 2: Docker 构建失败

**症状**: 部署失败，日志显示 Docker 构建错误

**解决**:
```bash
# 1. 检查 Docker 版本
ssh root@7zi.com "docker --version"

# 2. 手动构建测试
ssh root@7zi.com "cd /opt/7zi-frontend && docker-compose build"

# 3. 清理 Docker 缓存
ssh root@7zi.com "docker system prune -a -f"

# 4. 检查磁盘空间
ssh root@7zi.com "df -h /var/lib/docker"
```

### 问题 3: 健康检查失败

**症状**: 部署成功但健康检查失败

**解决**:
```bash
# 1. 手动测试健康端点
curl -v https://7zi.com/health

# 2. 检查容器日志
ssh root@7zi.com "docker logs 7zi-frontend --tail 100"

# 3. 检查容器状态
ssh root@7zi.com "docker ps | grep 7zi-frontend"

# 4. 增加健康检查重试次数
# 修改 .github/workflows/ci-cd.yml 中的重试次数
```

### 问题 4: 权限问题

**症状**: "Permission denied" 错误

**解决**:
```bash
# 1. 检查目录权限
ssh root@7zi.com "ls -la /opt/7zi-frontend"

# 2. 修复权限
ssh root@7zi.com "chown -R root:root /opt/7zi-frontend"

# 3. 检查 Docker socket 权限
ssh root@7zi.com "ls -la /var/run/docker.sock"

# 4. 如果使用非 root 用户，添加到 docker 组
ssh root@7zi.com "usermod -aG docker <username>"
```

---

## 📊 进度追踪

### 第一周任务

- [ ] Day 1: 配置 GitHub Secrets
- [ ] Day 1: 创建基础 CI/CD 工作流
- [ ] Day 2: 测试自动部署
- [ ] Day 3: 添加健康检查
- [ ] Day 4: 添加通知（可选）
- [ ] Day 5: 文档和复盘

### 第二周任务

- [ ] Day 1: 优化 Dockerfile
- [ ] Day 2: 优化 docker-compose
- [ ] Day 3: 测试缓存效果
- [ ] Day 4: 配置 Registry 缓存
- [ ] Day 5: 创建缓存预热任务

### 第三周任务

- [ ] Day 1: 配置健康检查端点
- [ ] Day 2: 集成通知系统
- [ ] Day 3: 添加性能监控
- [ ] Day 4: 配置日志监控
- [ ] Day 5: 测试告警流程

---

## 💡 最佳实践

### 1. 使用分支策略

```
main (生产环境)
  ↑
develop (开发环境)
  ↑
feature/* (功能分支)
```

**推荐工作流**:
1. 在 `feature/*` 分支开发
2. 创建 PR 到 `develop`
3. 合并后自动触发 CI 测试
4. 定期从 `develop` 创建 PR 到 `main`
5. 合并到 `main` 后自动部署

### 2. 环境变量管理

```bash
# .env.example（提交到 Git）
NODE_ENV=production
PORT=3000
# API_KEY=your_api_key_here

# .env.production（不提交到 Git）
NODE_ENV=production
PORT=3000
API_KEY=actual_api_key
```

### 3. 版本标签

```bash
# 标记版本
git tag v1.0.0
git push origin v1.0.0

# 在 CI/CD 中使用
docker build -t ghcr.io/7zi/7zi-frontend:${GITHUB_REF_NAME} .
```

### 4. 回滚策略

```bash
# 快速回滚到上一个镜像
ssh root@7zi.com << 'EOF'
cd /opt/7zi-frontend
docker-compose down
PREV=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep 7zi | grep -v latest | head -1)
docker tag $PREV 7zi-frontend:latest
docker-compose up -d
EOF
```

---

## 📚 参考资源

### 官方文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker 文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)

### 有用工具

- [appleboy/ssh-action](https://github.com/appleboy/ssh-action) - SSH 部署
- [docker/build-push-action](https://github.com/docker/build-push-action) - Docker 构建和推送
- [codecov/codecov-action](https://github.com/codecov/codecov-action) - 代码覆盖率
- [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action) - Lighthouse CI

### 本地文档

- [CI_CD_PIPELINE_OPTIMIZATION.md](./CI_CD_PIPELINE_OPTIMIZATION.md) - 完整优化方案
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南
- [DOCKER_OPTIMIZATION_IMPLEMENTATION.md](./DOCKER_OPTIMIZATION_IMPLEMENTATION.md) - Docker 优化

---

## ✅ 验收标准

### Level 1 基础自动化

- [ ] 推送到 main 分支后自动部署
- [ ] 部署时间 < 10 分钟
- [ ] 部署后自动健康检查
- [ ] 健康检查失败时通知

### Level 2 性能优化

- [ ] Docker 缓存命中率 > 80%
- [ ] 增量构建时间 < 5 分钟
- [ ] 镜像大小 < 200MB

### Level 3 高级功能

- [ ] 停机时间 = 0 秒
- [ ] 自动回滚成功率 > 90%
- [ ] 问题发现时间 < 5 分钟
- [ ] 性能退化自动检测

---

## 🆘 获取帮助

### 查看日志

```bash
# GitHub Actions 日志
# 在 GitHub 仓库 → Actions → 选择工作流 → 查看日志

# 服务器日志
ssh root@7zi.com "docker logs 7zi-frontend --tail 100 -f"

# 使用部署脚本
./deploy.sh logs 7zi-frontend 200
```

### 手动部署

如果自动部署失败，可以手动部署：

```bash
# 使用部署脚本
./deploy.sh deploy

# 或手动执行
ssh root@7zi.com << 'EOF'
cd /opt/7zi-frontend
docker-compose pull
docker-compose up -d
EOF
```

### 紧急回滚

```bash
# 使用部署脚本
./deploy.sh rollback

# 或手动执行
ssh root@7zi.com << 'EOF'
cd /opt/7zi-frontend
docker-compose down
# 从备份恢复或使用旧镜像
docker-compose up -d
EOF
```

---

**文档版本**: 1.0
**创建日期**: 2026-03-22
**基于**: CI_CD_PIPELINE_OPTIMIZATION.md
**适用项目**: 7zi-frontend
