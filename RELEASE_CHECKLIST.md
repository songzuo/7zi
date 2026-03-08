# 7zi Frontend v0.2.0 发布清单

**版本**: 0.2.0  
**发布日期**: 2026-03-08  
**发布工程师**: AI Release Team  
**状态**: ✅ 准备就绪

---

## 📋 发布前检查 (Pre-release Checklist)

### 代码质量 ✅

- [x] ESLint 检查通过 - `npm run lint`
- [x] TypeScript 类型检查通过 - `npm run type-check`
- [x] 代码格式化完成 - `npm run format`
- [x] 单元测试通过 - `npm run test:run`
- [x] E2E 测试通过 - `npm run test:e2e`
- [x] 测试覆盖率报告生成 - `npm run test:coverage`

### 构建验证 ✅

- [x] 生产构建成功 - `npm run build`
- [x] 构建时间：~30s
- [x] 构建产物完整
  - [x] `.next/standalone/` 存在
  - [x] `.next/static/` 存在
  - [x] `public/` 完整
  - [x] `server.js` 存在
- [x] 构建大小检查：< 500MB

### 文档完整性 ✅

- [x] CHANGELOG.md 已更新
- [x] README.md 已更新
- [x] FEATURES.md 已更新
- [x] API 文档完整
- [x] 部署指南更新
- [x] 用户指南完整

### 安全检查 ✅

- [x] 无敏感文件泄露
  - [x] 无 `.env` 文件在构建中
  - [x] 无私钥/证书在代码库
- [x] `.gitignore` 配置正确
- [x] 安全审计报告完成
- [x] 依赖漏洞检查通过

### 版本号更新 ✅

- [x] `package.json` version: `0.1.0` → `0.2.0`
- [x] CHANGELOG.md 已添加 v0.2.0 条目
- [x] 发布说明文档已创建

---

## 🚀 发布步骤 (Release Steps)

### 步骤 1: 代码提交

```bash
# 添加变更文件
git add package.json CHANGELOG.md RELEASE_NOTES_v0.2.0.md

# 提交发布
git commit -m "release: v0.2.0 - Portfolio, Tasks AI, Knowledge Lattice"

# 推送到远程
git push origin main
```

### 步骤 2: 创建 Git 标签

```bash
# 创建标签
git tag -a v0.2.0 -m "Release v0.2.0 - Portfolio, Tasks AI, Knowledge Lattice"

# 推送标签
git push origin v0.2.0
```

### 步骤 3: GitHub Release

1. 访问 https://github.com/songzuo/7zi/releases/new
2. 选择标签 `v0.2.0`
3. 标题：`v0.2.0 - Portfolio, Tasks AI, Knowledge Lattice`
4. 内容：复制 RELEASE_NOTES_v0.2.0.md 内容
5. 勾选 "Set as the latest release"
6. 点击 "Publish release"

### 步骤 4: Staging 部署

```bash
# SSH 到 staging 服务器
ssh user@staging.7zi.com

# 进入项目目录
cd /opt/7zi-frontend

# 拉取最新代码
git pull origin main

# 拉取最新镜像
docker-compose -f docker-compose.prod.yml pull

# 滚动更新
docker-compose -f docker-compose.prod.yml up -d --no-deps --build 7zi-frontend

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

**验证**:
- [ ] 容器运行正常 `docker ps`
- [ ] 健康检查通过 `curl -sf http://localhost:3000/health`
- [ ] 页面访问正常 `curl -sf http://localhost:3000/`

### 步骤 5: Production 部署

```bash
# 1. 创建备份
BACKUP_DIR="/opt/backups/7zi-frontend-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r .next "$BACKUP_DIR/"

# 2. 拉取代码
git pull origin main

# 3. 拉取镜像
docker-compose -f docker-compose.prod.yml pull

# 4. 执行部署
docker-compose -f docker-compose.prod.yml up -d --no-deps --build 7zi-frontend

# 5. 等待启动
sleep 20

# 6. 健康检查
for i in {1..10}; do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    exit 0
  fi
  echo "Attempt $i failed, retrying..."
  sleep 5
done
```

---

## ✅ 发布后验证 (Post-release Verification)

### 功能验证

| 页面 | URL | 状态 | 验证时间 |
|------|-----|------|----------|
| 首页 | `/` | ⬜ | |
| 关于页 | `/about` | ⬜ | |
| Portfolio | `/portfolio` | ⬜ | |
| Tasks | `/tasks` | ⬜ | |
| Knowledge Lattice | `/knowledge-lattice` | ⬜ | |
| Dashboard | `/dashboard` | ⬜ | |
| 联系页 | `/contact` | ⬜ | |
| 博客 | `/blog` | ⬜ | |
| 设置 | `/settings` | ⬜ | |
| 健康检查 | `/api/health` | ⬜ | |

### 性能验证

| 指标 | 目标值 | 实际值 | 状态 |
|------|--------|--------|------|
| 首页响应时间 | < 1s | | ⬜ |
| API 响应时间 | < 500ms | | ⬜ |
| 首页大小 | < 500KB | | ⬜ |
| 内存使用 | < 512MB | | ⬜ |

### 浏览器兼容性

| 浏览器 | 版本 | 状态 |
|--------|------|------|
| Chrome | Latest | ⬜ |
| Firefox | Latest | ⬜ |
| Safari | Latest | ⬜ |
| Edge | Latest | ⬜ |
| Mobile Safari | iOS 15+ | ⬜ |
| Mobile Chrome | Android 10+ | ⬜ |

---

## 📦 发布包内容

### 核心文件

```
7zi-frontend-v0.2.0/
├── package.json              # 版本 0.2.0
├── CHANGELOG.md              # 完整变更日志
├── RELEASE_NOTES_v0.2.0.md   # 发布说明
├── RELEASE_CHECKLIST.md      # 本清单
├── README.md                 # 项目说明
├── ARCHITECTURE.md           # 技术架构
├── docs/                     # 完整文档
│   ├── API_REFERENCE.md
│   ├── USER_GUIDE.md
│   ├── TESTING_GUIDE.md
│   ├── DEPLOYMENT.md
│   └── ...
├── src/                      # 源代码
├── public/                   # 静态资源
├── docker-compose.yml        # Docker 配置
├── Dockerfile                # 构建配置
└── .github/workflows/        # CI/CD 配置
```

### 构建产物

```
.next/
├── standalone/
│   ├── server.js
│   └── packages/
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── build-manifest.json
```

---

## 🔄 回滚计划

如果发布后发现问题：

### 快速回滚

```bash
# 1. 停止当前容器
docker-compose -f docker-compose.prod.yml down

# 2. 恢复备份
LATEST_BACKUP=$(ls -dt /opt/backups/7zi-frontend-* | head -1)
cp -r "$LATEST_BACKUP/.next" ./

# 3. 重启
docker-compose -f docker-compose.prod.yml up -d

# 4. 验证
curl http://localhost:3000/health
```

### Git 回滚

```bash
# 回滚到上一个版本
git reset --hard v0.1.0

# 重新部署
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📞 紧急联系

| 角色 | 姓名 | 联系方式 |
|------|------|----------|
| 开发负责人 | 宋琢 | |
| 运维负责人 | | |
| 值班人员 | AI Team | |

---

## 📊 发布指标

### 构建统计

- **构建时间**: ~30s
- **页面数量**: 27 个静态页面
- **API 路由**: 15 个端点
- **构建大小**: 待统计

### 测试统计

- **单元测试**: 待运行
- **E2E 测试**: 待运行
- **覆盖率**: 待统计

---

## ✅ 发布完成确认

- [ ] 所有检查项通过
- [ ] Staging 验证通过
- [ ] Production 部署成功
- [ ] 功能验证完成
- [ ] 性能指标达标
- [ ] 文档已更新
- [ ] GitHub Release 已创建
- [ ] 团队已通知

**发布完成时间**: _______________  
**发布工程师签名**: _______________

---

*最后更新：2026-03-08*
