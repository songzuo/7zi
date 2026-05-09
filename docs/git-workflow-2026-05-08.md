# Git 工作流分析

**项目**: 7zi-frontend  
**时间**: 2026-05-08  
**分析者**: 📚 咨询师子代理

---

## .gitignore 检查

### ⚠️ 严重问题：缺少 .gitignore 文件

项目根目录不存在 `.gitignore` 文件，这会导致以下问题：

**应被忽略但已被跟踪的文件：**
- `node_modules/` — 依赖目录（通常不应提交）
- `.next/` — Next.js 构建产物
- `dist/` — 构建产物
- `coverage/` — 测试覆盖率报告
- `*.log` — 日志文件
- `.env.local` / `.env.production` — 环境变量（可能含敏感信息）
- `.DS_Store` / `Thumbs.db` — 系统文件
- Playwright 报告：`playwright-report/` / `test-results/`
- Storybook 构建：`storybook-static/`

### 建议

创建标准 Next.js 项目的 `.gitignore`：

```gitignore
# Dependencies
node_modules/

# Next.js
.next/
out/
build/

# Testing
coverage/
playwright-report/
test-results/

# Storybook
storybook-static/

# Environment
.env*.local
.env

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo

# Misc
*.pid
*.seed
```

---

## Commit 历史规范

### 观察到的问题

1. **高频小提交**：大量 `docs: 更新记忆文件` 提交，说明记忆更新频繁但可能粒度过细
2. **中文描述不规范**：`docs: 更新记忆文件` 缺乏具体内容描述
3. **存在 checkpoint 提交**：`chore: checkpoint - 2026-05-07` — 缺乏语义
4. **好消息**：最近开始使用 `chore:` / `docs:` / `fix:` 等前缀，格式逐渐规范

### Commit Message 示例分析

| Commit | 问题 |
|--------|------|
| `docs: 更新记忆文件` | 描述模糊，应说明更新了什么记忆 |
| `chore: checkpoint - 2026-05-07` | Checkpoint 不是有效的工作流概念 |
| `docs: 更新记忆文件` (重复) | 批量更新记忆导致大量相似 commit |
| `🔧 代码优化: 清理冗余 vitest 配置 + 文档更新` | 使用 emoji 前缀，风格不统一 |

### 建议采用 Conventional Commits 规范

```
<type>(<scope>): <description>

类型: feat | fix | docs | style | refactor | test | chore | perf | ci
```

示例：
```
docs: 更新今日开发记忆 - 部署问题修复
fix(auth): 修复登录状态丢失问题
refactor(api): 重构用户数据获取逻辑
```

---

## 分支策略

### 当前状态

**本地分支**:
- `main` (当前活跃)
- `backup-before-rewrite`
- `cleanup/dead-code-2026-03-22`
- `release/2026.03.20`
- `temp-fix-secret`

**远程分支** (混乱):
- `remotes/7zi/main`
- `remotes/7zi/master` ⚠️ **master 和 main 并存**
- `remotes/origin/main`
- `remotes/origin/master` ⚠️
- `remotes/botmem/main`
- 大量 `dependabot/*` 分支

### 问题

1. **master 和 main 同时存在** — GitHub 默认已从 master 迁移到 main，需统一
2. **Dependabot 分支过多** — 30+ 个 `dependabot/*` 分支堆积
3. **临时分支未清理** — `temp-fix-secret`, `backup-before-rewrite` 等长期存在
4. **无 develop 分支** — 缺少开发/测试分支的概念
5. **本地与远程分支不同步** — remotes 指向多个仓库（7zi, origin, botmem）

### 建议分支策略

```
main          — 生产就绪代码，只接受 PR merge
develop       — 开发分支，所有功能合并到这里
feature/*     — 功能分支
bugfix/*      — 修复分支
dependabot/*  — 自动更新（定期合并后删除）
release/*     — 发布分支
hotfix/*      — 紧急修复
```

清理命令：
```bash
# 删除过期 Dependabot 分支
git branch -d dependabot/docker/docker-base-cddebfc9ff
# 或批量删除已合并的分支
git fetch --prune

# 删除远程 master（如果已迁移到 main）
git push origin --delete master
```

---

## 改进建议

### 1. 立即执行

- [ ] **创建 .gitignore** — 防止敏感文件和构建产物进入仓库
- [ ] **配置 gitignore 检查** — 在 CI 中添加检查

### 2. 短期（1周内）

- [ ] **统一分支命名** — 确定使用 `main` 而非 `master`，清理 `remotes` 中的多余引用
- [ ] **清理过期分支** — 删除已完成使命的临时分支和旧的 Dependabot 分支
- [ ] **建立 commit 规范** — 强制使用 Conventional Commits

### 3. 中期（1个月内）

- [ ] **配置 Commitlint** — 在 pre-commit 或 CI 中检查 commit 格式
- [ ] **建立分支策略文档** — 写入 `CONTRIBUTING.md` 或 `docs/git-workflow.md`
- [ ] **考虑 squash merge** — 避免大量细小 commit 进入 main
- [ ] **设置分支保护规则** — main 分支禁止直接推送，需要 PR review

### 4. package.json 脚本评估

现有脚本较为完善：
- ✅ `lint` — ESLint 检查
- ✅ `typecheck` — TypeScript 类型检查
- ✅ `test` / `test:coverage` — Vitest 测试
- ✅ `test:e2e` — Playwright E2E 测试
- ✅ `test:ci` — CI 环境测试（JUnit + JSON 输出）

**建议补充**：
```json
{
  "prepare": "husky install",
  "commit": "cz",
  "git:check": "git status && npm run lint && npm run typecheck"
}
```

### 5. 推荐引入工具

| 工具 | 用途 |
|------|------|
| `commitlint` | 强制 commit 格式规范 |
| `husky` | Git hooks（pre-commit） |
| `lint-staged` | 只检查暂存区文件 |
| `cz-cli` | 交互式 commit 生成 |
| `standard-version` | 自动生成 CHANGELOG |

---

## 总结

| 维度 | 评分 | 主要问题 |
|------|------|---------|
| .gitignore | ❌ 缺失 | 完全没有 .gitignore |
| Commit 规范 | ⚠️ 混乱 | 格式不统一，描述模糊 |
| 分支策略 | ⚠️ 混乱 | master/main 并存，过多临时分支 |
| CI/CD | ✅ 良好 | 测试脚本齐全 |

**最高优先级**：创建 `.gitignore` 文件，统一分支命名并清理过期分支。

---

*报告生成时间: 2026-05-08*
