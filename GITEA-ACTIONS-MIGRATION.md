# Gitea Actions CI/CD 实施方案

## 📋 概述

将 7zi 项目的 CI/CD 流水线从 GitHub Actions 迁移到 Gitea Actions，解决 GitHub Actions 额度不足（剩余 10%）的问题。

### 背景
- **问题**: GitHub Actions 额度即将耗尽（剩余 10%）
- **解决方案**: 使用 Gitea Actions 作为自托管 CI/CD 方案
- **目标服务器**: 165.232.43.117
- **优势**:
  - ✅ 无限制的构建时间
  - ✅ 无限的构建次数
  - ✅ 完全自主控制
  - ✅ 降低长期成本
  - ✅ 更好的数据隐私保护

---

## 🏗️ 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                         开发者                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gitea 服务器                              │
│  165.232.43.117:3000                                        │
│                                                             │
│  ┌──────────────┐     ┌──────────────┐                     │
│  │   Gitea      │────▶│ Gitea Actions│                     │
│  │  (Git 仓库)  │     │   (Runner)   │                     │
│  └──────────────┘     └──────────────┘                     │
│                              │                               │
│                              ▼                               │
│                     ┌──────────────┐                        │
│                     │  容器注册表   │                        │
│                     │  (Registry)  │                        │
│                     └──────────────┘                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  部署目标服务器                               │
│  165.232.43.117                                            │
│                                                             │
│  ┌──────────────┐     ┌──────────────┐                     │
│  │ Docker Compose│────▶│  7zi-frontend│                    │
│  │   (编排)     │     │   (容器)     │                     │
│  └──────────────┘     └──────────────┘                     │
│                              │                               │
│                              ▼                               │
│                     ┌──────────────┐                        │
│                     │    Nginx     │                        │
│                     │  (反向代理)   │                        │
│                     └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### 工作流程

```
1. 开发者提交代码
   ↓
2. Gitea 触发 Actions
   ↓
3. Runner 执行 CI 任务
   ├─ 代码质量检查
   ├─ 类型检查
   ├─ 单元测试
   ├─ 构建 Next.js
   └─ Docker 镜像构建
   ↓
4. 推送到 Gitea 容器注册表
   ↓
5. SSH 连接部署服务器
   ↓
6. Docker Compose 拉取镜像
   ↓
7. 滚动更新容器
   ↓
8. 健康检查验证
   ↓
9. 部署完成
```

---

## 📦 需要的组件

### 1. Gitea 实例
- **端口**: 3000
- **功能**: Git 仓库管理、代码审查、Issues
- **Actions**: 内置 CI/CD 功能

### 2. Gitea Actions Runner
- **位置**: 与 Gitea 同服务器或独立
- **功能**: 执行 CI/CD 任务
- **类型**: Docker 模式

### 3. Gitea 容器注册表
- **地址**: 165.232.43.117:3000
- **功能**: 存储 Docker 镜像
- **格式**: `165.232.43.117:3000/owner/repository:tag`

### 4. 部署服务器
- **地址**: 165.232.43.117
- **容器**: Docker + Docker Compose
- **反向代理**: Nginx

---

## 🔧 安装步骤

### 步骤 1: 安装 Gitea

#### 1.1 创建 docker-compose.yml

```bash
mkdir -p /opt/gitea
cd /opt/gitea
```

创建 `docker-compose.yml`:

```yaml
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
      - GITEA__repository__ENABLE_PUSH_CREATE_USER=true
      - GITEA__repository__ENABLE_PUSH_CREATE_ORG=true
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

  # 可选: Gitea Actions Runner
  runner:
    image: gitea/act_runner:latest
    container_name: gitea-runner
    restart: always
    environment:
      - GITEA_INSTANCE_URL=http://gitea:3000
      - GITEA_RUNNER_REGISTRATION_TOKEN=${RUNNER_TOKEN}
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
```

#### 1.2 启动 Gitea

```bash
docker-compose up -d
```

#### 1.3 初始化配置

1. 访问 `http://165.232.43.117:3000`
2. 创建管理员账户
3. 配置容器注册表（Gitea 内置，无需额外配置）

---

### 步骤 2: 配置 Gitea Actions Runner

#### 2.1 获取注册 Token

1. 登录 Gitea
2. 进入 `Settings` → `Actions` → `Runners`
3. 点击 `New Runner` 获取 Token

#### 2.2 启动 Runner

```bash
# 如果使用 docker-compose，设置环境变量
export RUNNER_TOKEN=your_token_here
docker-compose up -d runner

# 或手动注册
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/runner-data:/data \
  -e GITEA_INSTANCE_URL=http://165.232.43.117:3000 \
  -e GITEA_RUNNER_REGISTRATION_TOKEN=your_token \
  gitea/act_runner:latest register
```

#### 2.3 验证 Runner 状态

在 Gitea 界面查看 Runner 状态，应为 `Active`

---

### 步骤 3: 创建项目仓库

1. 在 Gitea 中创建新仓库 `7zi`
2. 推送代码

```bash
# 添加 Gitea remote
git remote add gitea http://165.232.43.117:3000/owner/7zi.git

# 推送所有分支
git push gitea --all

# 推送 tags
git push gitea --tags
```

---

### 步骤 4: 配置 Secrets

在 Gitea 仓库中设置以下 Secrets:

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `GITEA_REGISTRY` | Gitea 容器注册表地址 | `165.232.43.117:3000` |
| `GITEA_USERNAME` | Gitea 用户名 | `owner` |
| `GITEA_TOKEN` | Gitea 访问 Token | `REDACTED` |
| `SERVER_HOST` | 部署服务器地址 | `165.232.43.117` |
| `SERVER_USER` | SSH 用户名 | `root` 或 `deploy` |
| `SSH_PRIVATE_KEY` | SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SSH_PORT` | SSH 端口（可选） | `22` |

#### 获取 Gitea Token

1. 登录 Gitea
2. `Settings` → `Applications` → `Generate Token`
3. 选择权限: `read:package`, `write:package`

#### 生成 SSH 密钥

```bash
# 在本地生成
ssh-keygen -t rsa -b 4096 -C "gitea-actions" -f ~/.ssh/gitea_actions

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/gitea_actions.pub root@165.232.43.117

# 将私钥复制到 Gitea Secrets
cat ~/.ssh/gitea_actions
```

---

### 步骤 5: 配置部署服务器

#### 5.1 安装 Docker 和 Docker Compose

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

#### 5.2 配置信任 Gitea 容器注册表

```bash
# 配置 Docker 信任私有注册表
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "insecure-registries": ["165.232.43.117:3000"],
  "registry-mirrors": []
}
EOF

# 重启 Docker
systemctl restart docker
```

#### 5.3 登录到 Gitea 容器注册表

```bash
docker login 165.232.43.117:3000
# 输入 Gitea 用户名和密码
```

#### 5.4 部署应用

```bash
# 创建部署目录
mkdir -p /opt/7zi-frontend
cd /opt/7zi-frontend

# 复制配置文件
# - docker-compose.gitea.yml
# - .env.production
# - nginx/nginx.conf

# 创建环境文件
cat > .env.production << EOF
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
GITEA_REGISTRY=165.232.43.117:3000
EOF

# 启动服务
docker-compose -f docker-compose.gitea.yml up -d
```

---

## 🚀 迁移流程

### 阶段 1: 准备（1-2 小时）

- [ ] 安装 Gitea
- [ ] 配置 Gitea Actions Runner
- [ ] 创建仓库并推送代码
- [ ] 配置 Secrets
- [ ] 配置部署服务器

### 阶段 2: 测试（2-3 小时）

- [ ] 手动触发 Actions 测试
- [ ] 验证构建流程
- [ ] 测试 Docker 镜像推送
- [ ] 测试部署流程
- [ ] 验证健康检查

### 阶段 3: 切换（1 小时）

- [ ] 停用 GitHub Actions
- [ ] 更新开发文档
- [ ] 通知团队成员
- [ ] 监控首次自动部署

### 阶段 4: 优化（持续）

- [ ] 优化构建缓存
- [ ] 调整 Runner 配置
- [ ] 监控性能指标
- [ ] 优化部署流程

---

## 📝 配置文件说明

### 1. `.gitea/workflows/ci-cd.yml`

Gitea Actions 工作流配置文件，定义完整的 CI/CD 流程。

**关键修改点（对比 GitHub Actions）**:
- ✅ 容器注册表地址改为 Gitea
- ✅ 登录方式使用 Gitea Token
- ✅ 保持所有原有的检查和测试逻辑

### 2. `docker-compose.gitea.yml`

Docker Compose 配置文件，用于部署服务器。

**特性**:
- ✅ 使用 Gitea 容器注册表
- ✅ 包含健康检查
- ✅ 资源限制优化
- ✅ 日志配置
- ✅ 安全增强
- ✅ 可选的 Watchtower 自动更新

---

## 🔍 验证清单

### 构建验证

- [ ] 代码质量检查通过
- [ ] 类型检查通过
- [ ] 单元测试通过
- [ ] Next.js 构建成功
- [ ] Docker 镜像构建成功
- [ ] Docker 镜像推送成功

### 部署验证

- [ ] SSH 连接成功
- [ ] Docker Compose 拉取镜像成功
- [ ] 容器启动成功
- [ ] 健康检查通过
- [ ] Nginx 反向代理正常
- [ ] 网站可访问

### 功能验证

- [ ] 所有页面可访问
- [ ] API 端点正常
- [ ] 静态资源加载正常
- [ ] 控制台无错误
- [ ] 日志正常输出

---

## 📊 性能优化

### 构建优化

1. **启用缓存**
   - npm 缓存
   - Next.js 构建缓存
   - Docker 层缓存

2. **并行执行**
   - lint、typecheck、test 并行运行
   - 测试分片（4 个 shard）

3. **依赖优化**
   - 使用 `npm ci` 代替 `npm install`
   - 仅下载必要依赖

### 部署优化

1. **滚动更新**
   - 零停机部署
   - 优雅关闭旧容器

2. **健康检查**
   - 启动前验证
   - 自动回滚机制

3. **资源限制**
   - 防止资源耗尽
   - 优化资源利用率

---

## 🛡️ 安全配置

### Gitea 安全

- [ ] 启用 HTTPS
- [ ] 配置防火墙规则
- [ ] 限制 SSH 访问
- [ ] 定期备份

### Runner 安全

- [ ] 使用 Docker 模式
- [ ] 限制 Runner 权限
- [ ] 定期更新镜像

### 部署安全

- [ ] 使用 SSH 密钥认证
- [ ] 最小化用户权限
- [ ] 容器只读文件系统
- [ ] 安全选项配置

---

## 📈 监控和日志

### 日志查看

```bash
# Gitea 日志
docker logs -f gitea

# Runner 日志
docker logs -f gitea-runner

# 应用日志
docker-compose -f docker-compose.gitea.yml logs -f 7zi-frontend

# Nginx 日志
docker-compose -f docker-compose.gitea.yml logs -f nginx
```

### 监控指标

- 构建时间
- 部署成功率
- 容器资源使用
- 网站响应时间
- 错误率

---

## 🔄 回滚方案

### 快速回滚

```bash
# 回滚到上一个版本
cd /opt/7zi-frontend
docker-compose -f docker-compose.gitea.yml down
docker-compose -f docker-compose.gitea.yml pull
docker-compose -f docker-compose.gitea.yml up -d
```

### 手动回滚

```bash
# 使用备份版本
BACKUP_DIR="/opt/backups/7zi-frontend-20260308-120000"
cd $BACKUP_DIR
docker-compose -f docker-compose.gitea.yml up -d
```

### 自动回滚

部署脚本中已包含自动回滚逻辑：
- 健康检查失败自动回滚
- 保留最近 5 个备份

---

## 📚 参考资源

- [Gitea 官方文档](https://docs.gitea.io/)
- [Gitea Actions 文档](https://docs.gitea.io/usage/actions/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)

---

## ✅ 迁移完成标准

迁移完成后，应达到以下标准：

- [ ] Gitea Actions 正常运行
- [ ] 所有 CI 检查通过
- [ ] Docker 镜像成功推送
- [ ] 部署流程自动化
- [ ] 网站正常运行
- [ ] 文档更新完成
- [ ] 团队培训完成

---

## 🆘 常见问题

### Q1: Gitea Runner 无法连接

**解决方案**:
1. 检查 GITEA_INSTANCE_URL 是否正确
2. 验证 Token 是否有效
3. 检查网络连接
4. 查看 Runner 日志

### Q2: Docker 推送失败

**解决方案**:
1. 验证 Registry 地址
2. 检查登录凭证
3. 确认 Registry 正常运行
4. 检查防火墙规则

### Q3: 部署健康检查失败

**解决方案**:
1. 检查容器日志
2. 验证环境变量
3. 检查端口占用
4. 增加健康检查超时时间

### Q4: 构建时间过长

**解决方案**:
1. 启用缓存
2. 优化依赖
3. 使用并行执行
4. 增加 Runner 资源

---

## 📞 联系支持

如遇到问题，请联系：

- **技术支持**: dev@7zi.com
- **文档**: `/root/.openclaw/workspace/`
- **日志**: 检查相关容器日志

---

**最后更新**: 2026-03-08
**版本**: 1.0.0
**维护者**: DevOps Team