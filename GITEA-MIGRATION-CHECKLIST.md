# Gitea Actions 迁移检查清单

**项目**: 7zi-frontend  
**迁移目标**: 从 GitHub Actions 迁移到 Gitea Actions  
**服务器**: 165.232.43.117  
**日期**: 2026-03-10

---

## 📋 迁移步骤

### 阶段 1: 服务器环境准备 (Task 001)

**负责人**: sysadmin  
**预计工时**: 2h  
**状态**: ⚠️ 等待服务器连接

- [ ] **1.1** SSH 连接到服务器 `165.232.43.117`
  ```bash
  ssh root@165.232.43.117
  ```

- [ ] **1.2** 检查 Docker 和 Docker Compose
  ```bash
  docker --version
  docker-compose --version
  ```

- [ ] **1.3** 运行 Gitea 安装脚本
  ```bash
  cd /root/.openclaw/workspace
  ./scripts/setup-gitea-server.sh
  ```

- [ ] **1.4** 验证 Gitea 可访问
  ```bash
  curl http://165.232.43.117:3000
  # 或在浏览器访问 http://165.232.43.117:3000
  ```

- [ ] **1.5** 初始化 Gitea
  - 访问 Gitea 网页
  - 选择数据库类型：SQLite3
  - 配置管理员账户
  - 完成初始化

- [ ] **1.6** 验证 Runner 状态
  - 登录 Gitea
  - 进入 Settings → Actions → Runners
  - 确认 Runner 状态为 **Active**

**验收标准**:
- [ ] Gitea 可访问 (http://165.232.43.117:3000)
- [ ] Runner 状态 Active
- [ ] Docker 容器注册表配置完成

---

### 阶段 2: 配置 Secrets 和 SSH (Task 002)

**负责人**: sysadmin  
**预计工时**: 0.5h  
**状态**: ⏸️ 等待阶段 1 完成

- [ ] **2.1** 运行 Secrets 配置脚本
  ```bash
  ./scripts/configure-gitea-secrets.sh
  ```

- [ ] **2.2** 在 Gitea 生成 Access Token
  - 登录 Gitea
  - 设置 → 应用
  - 生成新 Token（选择 `read:package`, `write:package` 权限）
  - 复制并保存 Token

- [ ] **2.3** 配置 SSH 公钥
  - 将生成的 SSH 公钥添加到部署服务器
  ```bash
  ssh-copy-id -i ~/.ssh/gitea_actions.pub root@165.232.43.117
  ```

- [ ] **2.4** 在 Gitea 仓库配置 Secrets
  - 进入 7zi 仓库 → Settings → Secrets → Actions
  - 添加以下 Secrets：
    - `GITEA_REGISTRY`: `165.232.43.117:3000`
    - `GITEA_USERNAME`: `<你的用户名>`
    - `GITEA_TOKEN`: `<步骤 2.2 生成的 Token>`
    - `SERVER_HOST`: `165.232.43.117`
    - `SERVER_USER`: `root`
    - `SSH_PRIVATE_KEY`: `<私钥完整内容>`
    - `SSH_PORT`: `22`

- [ ] **2.5** 验证 SSH 连接
  ```bash
  ssh -i ~/.ssh/gitea_actions root@165.232.43.117
  ```

**验收标准**:
- [ ] Secrets 配置完成
- [ ] SSH 免密连接正常
- [ ] Docker 信任注册表

---

### 阶段 3: 迁移 CI/CD 工作流 (Task 003)

**负责人**: executor  
**预计工时**: 2h  
**状态**: ✅ 工作流文件已准备

- [ ] **3.1** 在 Gitea 创建 7zi 仓库
  - 登录 Gitea
  - 点击 `+` → `New Repository`
  - 仓库名：`7zi`
  - 可见性：Private
  - 创建仓库

- [ ] **3.2** 添加 Gitea remote
  ```bash
  cd /root/.openclaw/workspace
  git remote add gitea http://165.232.43.117:3000/<username>/7zi.git
  ```

- [ ] **3.3** 提交 Gitea 配置文件
  ```bash
  git add .gitea/ docker-compose.gitea.yml scripts/
  git commit -m "Add Gitea Actions configuration"
  ```

- [ ] **3.4** 推送代码到 Gitea
  ```bash
  git push gitea main
  git push gitea --tags
  ```

- [ ] **3.5** 验证工作流文件
  - 在 Gitea 仓库页面查看 Actions 标签
  - 确认 `ci-cd.yml` 已识别

- [ ] **3.6** 手动触发首次 Actions
  - 进入 Actions 标签
  - 点击 `CI/CD Pipeline`
  - 点击 `Run workflow`
  - 选择 `main` 分支
  - 点击运行

- [ ] **3.7** 监控执行过程
  - 查看每个 Job 的日志
  - 检查是否有错误

- [ ] **3.8** 验证构建结果
  - ✅ Lint & Format Check
  - ✅ Type Check
  - ✅ Test (shard 1-4)
  - ✅ Build
  - ✅ Docker Build & Push

**验收标准**:
- [ ] 在 Gitea 创建 7zi 仓库
- [ ] 代码推送成功
- [ ] CI 流程全部通过 (lint/typecheck/test/build)
- [ ] Docker 镜像构建成功

---

### 阶段 4: 部署流程测试 (Task 004)

**负责人**: sysadmin  
**预计工时**: 2h  
**状态**: ⏸️ 等待前置任务完成

- [ ] **4.1** 验证 Docker 镜像推送
  ```bash
  # 在服务器上执行
  docker login 165.232.43.117:3000
  docker images | grep 7zi-frontend
  ```

- [ ] **4.2** 验证部署目录配置
  ```bash
  ls -la /opt/7zi-frontend/
  cat /opt/7zi-frontend/.env.production
  cat /opt/7zi-frontend/docker-compose.gitea.yml
  ```

- [ ] **4.3** 首次部署
  ```bash
  cd /opt/7zi-frontend
  docker-compose -f docker-compose.gitea.yml up -d
  ```

- [ ] **4.4** 检查容器状态
  ```bash
  docker-compose -f docker-compose.gitea.yml ps
  # 应显示:
  # 7zi-frontend    Up (healthy)
  # nginx           Up (healthy)
  ```

- [ ] **4.5** 健康检查
  ```bash
  curl http://localhost:3000/health
  curl http://165.232.43.117/
  ```

- [ ] **4.6** 功能测试
  - [ ] 首页加载正常
  - [ ] 静态资源加载正常
  - [ ] API 路由正常
  - [ ] 控制台无错误
  - [ ] 响应速度正常

- [ ] **4.7** 测试完整 CI/CD 流程
  - 在本地修改代码
  - 提交并推送到 Gitea
  - 观察 Actions 自动触发
  - 验证自动部署成功

- [ ] **4.8** 测试回滚机制
  - 模拟部署失败场景
  - 验证回滚是否正常工作

**验收标准**:
- [ ] 完整 CI/CD 流程自动化运行成功
- [ ] 健康检查通过
- [ ] 回滚机制验证

---

## 🎯 最终验证

### CI/CD 验证
- [ ] Gitea Actions 完全替代 GitHub Actions
- [ ] 所有 CI 检查通过 (lint, typecheck, test, build)
- [ ] 部署流程自动化验证成功
- [ ] 回滚机制可用

### 文档验证
- [ ] 迁移文档完整
- [ ] 配置文件已更新
- [ ] Secrets 已配置
- [ ] 团队已通知

### 清理工作
- [ ] 备份 GitHub Actions 配置（重命名 `.github/workflows` 为 `.github/workflows.backup`）
- [ ] 更新 README.md 中的 CI/CD 徽章
- [ ] 更新部署文档

---

## 🆘 故障排查

### 问题 1: Runner 无法连接
```bash
cd /opt/gitea
docker-compose restart runner
docker-compose logs -f runner
```

### 问题 2: Docker 推送失败
```bash
docker logout 165.232.43.117:3000
docker login 165.232.43.117:3000
curl http://165.232.43.117:3000/v2/
```

### 问题 3: 容器启动失败
```bash
cd /opt/7zi-frontend
docker-compose -f docker-compose.gitea.yml logs 7zi-frontend
docker-compose -f docker-compose.gitea.yml config
```

### 问题 4: 网站无法访问
```bash
netstat -tlnp | grep 3000
netstat -tlnp | grep 80
ufw status
ufw allow 3000
ufw allow 80
ufw allow 443
```

---

## 📊 进度跟踪

| 阶段 | 任务 | 状态 | 完成时间 | 备注 |
|------|------|------|----------|------|
| 1 | Gitea 服务器环境准备 | ⚠️ 等待中 | - | 服务器连接问题 |
| 2 | 配置 Secrets 和 SSH | ⏸️ 阻塞 | - | 等待阶段 1 |
| 3 | 迁移 CI/CD 工作流 | ✅ 准备完成 | - | 工作流文件已就绪 |
| 4 | 部署流程测试 | ⏸️ 阻塞 | - | 等待前置任务 |

**总体进度**: 25% (1/4 阶段准备完成)

---

## 📞 联系支持

- **技术文档**: `/root/.openclaw/workspace/GITEA-ACTIONS-MIGRATION.md`
- **快速指南**: `/root/.openclaw/workspace/GITEA-QUICK-START.md`
- **状态跟踪**: `/root/.openclaw/workspace/memory/gitea-migration-status.md`

---

**创建时间**: 2026-03-10 08:30 (Europe/Berlin)  
**最后更新**: 2026-03-10 08:30 (Europe/Berlin)
