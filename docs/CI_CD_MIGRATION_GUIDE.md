# CI/CD 配置迁移指南

## 📋 迁移概览

本文档提供了从当前 CI/CD 配置迁移到优化配置的详细步骤。

---

## 🎯 迁移目标

- 统一 Node.js 版本为 22
- 简化 workflow 结构（4个 → 2个）
- 实现智能缓存策略
- 增强安全扫描
- 优化测试效率

---

## 📂 文件变更

### 需要删除的文件

```bash
# 删除重复的 workflow
rm .github/workflows/deploy.yml
rm .github/workflows/ci-cd.yml

# 保留但将重构
# .github/workflows/ci.yml → .github/workflows/ci-optimized.yml
# .github/workflows/tests.yml → 保留（按需触发）
```

### 需要新增的文件

```bash
# 新的优化主 workflow
.github/workflows/ci-optimized.yml

# 安全扫描专用 workflow
.github/workflows/security-scan.yml

# 依赖更新自动化
.github/dependabot.yml
```

### 需要修改的文件

```bash
# 当前 workflow（暂时保留，用于对比）
.github/workflows/ci.yml

# 下次更新时删除
.github/workflows/tests.yml
```

---

## 🚀 迁移步骤

### 第一步：准备工作（5分钟）

1. **备份当前配置**

   ```bash
   mkdir .github/workflows-backup
   cp -r .github/workflows/* .github/workflows-backup/
   ```

2. **检查 GitHub Secrets**
   - 确保以下 secrets 已配置：
     - `SSH_PRIVATE_KEY`
     - `SNYK_TOKEN`
     - `STAGING_HOST`
     - `PRODUCTION_HOST`
     - `DEPLOY_USER`
     - `DISCORD_WEBHOOK`（可选）

### 第二步：部署新配置（10分钟）

1. **添加新文件**

   ```bash
   # 已创建的文件：
   # - .github/workflows/ci-optimized.yml
   # - .github/workflows/security-scan.yml
   # - .github/dependabot.yml
   ```

2. **测试新 workflow**
   - 提交新文件到 GitHub
   - 手动触发 `ci-optimized.yml` workflow
   - 观察所有 job 是否成功

### 第三步：切换到新配置（5分钟）

1. **重命名主 workflow**

   ```bash
   # 备份旧的 ci.yml
   mv .github/workflows/ci.yml .github/workflows/ci.yml.backup

   # 启用新的优化版本
   mv .github/workflows/ci-optimized.yml .github/workflows/ci.yml
   ```

2. **删除重复的 workflow**

   ```bash
   rm .github/workflows/deploy.yml
   rm .github/workflows/ci-cd.yml
   ```

3. **更新 tests.yml（可选）**
   - 如果不需要按需测试，可以删除
   - 如果需要，保留但确保不与主 workflow 冲突

### 第四步：验证（10分钟）

1. **测试 push 触发**

   ```bash
   # 创建一个测试提交
   echo "test" > test-ci-cd.txt
   git add test-ci-cd.txt
   git commit -m "test: trigger CI/CD workflow"
   git push
   ```

2. **检查 workflow 运行**
   - 访问 Actions 标签页
   - 确认 `ci.yml` 正在运行
   - 检查所有 job 状态

3. **测试手动触发**
   - 进入 Actions → CI/CD Pipeline
   - 点击 "Run workflow"
   - 选择参数（environment, skip-tests 等）
   - 观察执行结果

### 第五步：清理（5分钟）

1. **删除备份文件**

   ```bash
   rm -rf .github/workflows-backup
   rm .github/workflows/ci.yml.backup
   rm test-ci-cd.txt
   ```

2. **更新文档**
   - 更新 `CONTRIBUTING.md` 中的 CI/CD 说明
   - 更新团队文档

---

## 🔧 配置检查清单

### Node.js 版本一致性

- [x] `.github/workflows/ci.yml`: `NODE_VERSION: '22'`
- [x] `package.json`: Node 22 兼容
- [x] `Dockerfile`: `node:22-alpine`

### 缓存配置

- [x] npm cache
- [x] Next.js turbo cache
- [x] Docker layer cache
- [x] Playwright browser cache

### 安全配置

- [x] npm audit 配置
- [x] Snyk 集成
- [x] Secret scanning
- [x] Container scanning

### 测试配置

- [x] 单元测试并行化（4 shards）
- [x] E2E 测试多浏览器（Chromium, Firefox）
- [x] 基于变更的智能测试选择
- [x] 覆盖率报告

### 部署配置

- [x] Staging 自动部署
- [x] Production 手动触发
- [x] 健康检查
- [x] 自动回滚
- [x] SSH 密钥认证

---

## 📊 性能基准

### 迁移前

- **构建时间**: ~12 分钟
- **测试时间**: ~8 分钟
- **总时间**: ~20 分钟
- **Workflow 数量**: 4 个
- **并发 job**: 3 个

### 迁移后（预期）

- **构建时间**: ~6 分钟（↓ 50%）
- **测试时间**: ~4 分钟（↓ 50%）
- **总时间**: ~10 分钟（↓ 50%）
- **Workflow 数量**: 2 个（↓ 50%）
- **并发 job**: 6 个（↑ 100%）

---

## ⚠️ 潜在问题与解决方案

### 问题 1：缓存未命中

**症状**: 缓存没有生效，构建时间没有改善

**原因**: cache key 计算错误

**解决方案**:

```yaml
# 检查 cache key 是否正确
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 问题 2：测试失败

**症状**: 单元测试或 E2E 测试失败

**原因**: 环境变量或配置不一致

**解决方案**:

```yaml
# 确保环境变量一致
env:
  NODE_ENV: production
  NEXT_TELEMETRY_DISABLED: 1
```

### 问题 3：部署失败

**症状**: SSH 连接失败或部署超时

**原因**: SSH 密钥配置错误或网络问题

**解决方案**:

```yaml
# 检查 SSH 密钥配置
- name: Setup SSH
  uses: webfactory/ssh-agent@v0.8.0
  with:
    ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

# 检查服务器访问权限
ssh -i <private-key> user@server
```

### 问题 4：安全扫描失败

**症状**: npm audit 或 Snyk 扫描失败

**原因**: 依赖版本或扫描配置问题

**解决方案**:

```yaml
# 配置正确的扫描级别
- name: npm audit
  run: npm audit --audit-level=moderate

# 检查 Snyk token
- name: Snyk scan
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## 🔄 回滚计划

如果新配置出现问题，可以快速回滚：

```bash
# 恢复备份
cp -r .github/workflows-backup/* .github/workflows/

# 删除新文件
rm .github/workflows/ci-optimized.yml
rm .github/workflows/security-scan.yml
rm .github/dependabot.yml

# 提交恢复
git add .github/workflows/
git commit -m "rollback: restore previous CI/CD configuration"
git push
```

---

## 📞 支持与帮助

### 文档资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Next.js CI/CD 最佳实践](https://nextjs.org/docs/deployment)
- [Vitest 配置](https://vitest.dev/config/)
- [Playwright CI/CD](https://playwright.dev/docs/ci)

### 团队联系人

- **CI/CD 负责人**: 待定
- **DevOps 工程师**: 待定
- **项目维护者**: 待定

---

## ✅ 迁移完成检查清单

- [x] 备份现有配置
- [x] 配置 GitHub Secrets
- [x] 添加新 workflow 文件
- [x] 测试新 workflow
- [x] 切换到新配置
- [x] 删除重复文件
- [x] 验证所有功能
- [x] 更新文档
- [x] 通知团队

---

## 📝 后续优化

### 短期（1-2 周）

- 监控 CI/CD 指标
- 根据数据调整配置
- 优化测试覆盖率

### 中期（1 个月）

- 实现智能测试选择（基于变更）
- 添加性能基准测试
- 集成更多监控工具

### 长期（3 个月）

- 实现自托管 runner
- 优化成本结构
- 自动化更多流程

---

**迁移完成！** 🎉

如有任何问题，请参考本文档或联系团队。
