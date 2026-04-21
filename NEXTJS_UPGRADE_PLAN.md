# Next.js 16.x 升级实施计划

**项目**: 7zi-frontend
**计划日期**: 2026-04-18
**制定者**: 架构师子代理
**目标**: 升级到 Next.js 16.2.x 最新补丁版本 + Node.js 20.9+ LTS

---

## 一、升级目标与范围

### 1.1 升级目标

| 组件 | 当前版本 | 目标版本 |
|------|---------|---------|
| **Next.js** | `^16.2.3` | `^16.2.x` 最新补丁版 |
| **React** | `^19.2.5` | 保持（已是最新） |
| **Node.js** | `>=18.0.0`（声明）/ `v22.22.1`（实际） | `>=20.9.0` LTS |
| **TypeScript** | `^5.9.3` | 保持 |

### 1.2 升级范围

- **配置迁移**: `package.json` lint 脚本调整
- **依赖升级**: Next.js 升至最新补丁版本
- **测试验证**: 完整回归测试

### 1.3 非升级范围（已就绪）

- ✅ `proxy.ts` 已完成（替代 middleware.ts）
- ✅ React 19 已就绪
- ✅ TypeScript 5.9 已满足
- ✅ turbopack 配置已在新位置
- ✅ AMP 未使用（无需迁移）

---

## 二、升级步骤清单

### 阶段 1：环境准备（第 1-2 小时）

#### 步骤 1.1：检查当前环境

```bash
# 检查 Node.js 当前版本
node --version
# 预期: v22.22.1（已是新版，但 package.json 声明需更新）

# 检查 npm 版本
npm --version

# 检查 Next.js 版本
npx next --version
# 预期: Next.js v16.2.3

# 检查包管理器
ls -la package-lock.json pnpm-lock.yaml yarn.lock 2>/dev/null || echo "no lock files found"
```

#### 步骤 1.2：创建备份

```bash
# 备份 package.json
cp package.json package.json.backup-$(date +%Y%m%d)

# 备份 node_modules 引用（不备份整个 node_modules，太大）
# 如果需要快速回滚，保留此备份
```

#### 步骤 1.3：检查过时的依赖

```bash
# 检查需要升级的包
npm outdated
# 或使用 pnpm
pnpm outdated

# 检查 Next.js 最新补丁版本
npm view next@16.2 version
npm view next@latest version
```

#### 步骤 1.4：确认 Node.js 版本要求

**服务器要求**：
- 最低要求: **Node.js 20.9.0+ LTS**
- 推荐版本: **Node.js 20.x LTS** 或 **22.x LTS**

```bash
# 验证 Node.js 满足要求
node --version | cut -d'v' -f2 | cut -d'.' -f1
# 如果 < 20，需要升级
```

---

### 阶段 2：配置迁移（第 1-2 小时）

#### 步骤 2.1：更新 package.json 中的 lint 脚本

**问题**: Next.js 16 建议不再使用 `next lint`，应直接使用 ESLint

```json
// 原来
"lint": "next lint"

// 修改为
"lint": "eslint . --ext .ts,.tsx,.js,.jsx"
```

**命令执行**:
```bash
# 方式1：手动编辑
sed -i 's/"lint": "next lint"/"lint": "eslint . --ext .ts,.tsx,.js,.jsx"/' package.json

# 方式2：备份后编辑
cp package.json package.json.lint-fix
# 手动修改 lint 脚本
```

#### 步骤 2.2：验证 next.config.ts 配置

检查以下配置项是否正确：

```typescript
// ✅ 已是正确配置，无需修改
reactCompiler: {
  compilationMode: 'annotation',
}

// ✅ turbopack 配置位置正确（已在顶层）
// 未来如果启用，只需添加：
turbopack: {},
// 而非 experimental.turbopack
```

#### 步骤 2.3：检查 proxy.ts 功能

```bash
# 确认 proxy.ts 存在
ls -la src/proxy.ts

# 检查 proxy.ts 语法
npx tsc --noEmit src/proxy.ts
```

---

### 阶段 3：依赖升级（第 1 小时）

#### 步骤 3.1：升级 Next.js 到最新补丁版本

```bash
# 使用 npm
npm install next@latest

# 或指定版本
npm install next@16.2.x

# 验证安装
npx next --version
# 预期输出: Next.js v16.2.x（比当前 16.2.3 更新）
```

#### 步骤 3.2：升级相关依赖（可选）

```bash
# 检查 React 是否有更新
npm install react@latest react-dom@latest

# 验证 React 版本
npm ls react react-dom
```

#### 步骤 3.3：更新 lock 文件

```bash
# npm
npm install --package-lock-only

# 或 pnpm
pnpm install --lockfile-only
```

---

### 阶段 4：本地测试验证（第 2-4 小时）

#### 步骤 4.1：开发环境测试

```bash
# 启动开发服务器
npm run dev

# 预期结果:
# - 服务器启动无报错
# - Turbopack Fast Refresh 正常工作
# - 页面可正常访问 http://localhost:3000
```

**测试点**:
- [ ] 首页加载正常
- [ ] 导航正常
- [ ] 登录/认证流程正常
- [ ] API 请求正常
- [ ] 无控制台 Error 级别错误

#### 步骤 4.2：类型检查

```bash
# 运行 TypeScript 类型检查
npm run typecheck

# 预期结果: 无类型错误（项目配置了 ignoreBuildErrors: true 构建时忽略）
```

#### 步骤 4.3：构建测试（Webpack 生产构建）

```bash
# 使用 Webpack 构建（项目当前生产构建方式）
npm run build

# 或 Turbopack 构建
npm run build:turbopack
```

**预期结果**:
- ✅ 构建成功，无错误
- ⚠️ Chunk 大小警告可忽略（已有配置）
- ✅ 输出 `standalone` 目录

#### 步骤 4.4：单元测试

```bash
# 运行 vitest
npm run test

# 预期结果: 所有测试通过
```

#### 步骤 4.5：E2E 测试

```bash
# 安装 Playwright 浏览器（首次）
npx playwright install chromium

# 运行 E2E 测试
npm run test:e2e

# 或带 UI 的交互式测试
npm run test:e2e:ui
```

**测试点**:
- [ ] 页面导航
- [ ] 表单提交
- [ ] 关键业务流程

---

### 阶段 5：生产部署准备

#### 步骤 5.1：更新 package.json engines 字段

```json
{
  "engines": {
    "node": ">=20.9.0"
  }
}
```

#### 步骤 5.2：创建部署检查清单

```bash
# 确认生产服务器 Node.js 版本
ssh user@production-server "node --version"

# 如果需要升级 Node.js（使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
```

#### 步骤 5.3：构建产物验证

```bash
# 检查 standalone 输出
ls -la .next/standalone/

# 测试 standalone 启动
cd .next/standalone
node server.js
```

---

## 三、Node.js 版本升级指南

### 3.1 当前状态

- **本地环境**: Node.js v22.22.1 ✅（已满足）
- **生产服务器**: 需要确认 >= 20.9.0

### 3.2 服务器升级方案

#### 方案 A：使用 nvm（推荐）

```bash
# 1. 安装 nvm（如果未安装）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# 2. 重新加载 shell 配置
source ~/.bashrc
# 或
source ~/.zshrc

# 3. 安装 Node.js 20 LTS
nvm install 20

# 4. 使用 Node.js 20
nvm use 20

# 5. 设置默认版本
nvm alias default 20

# 6. 验证
node --version
# 输出: v20.x.x
```

#### 方案 B：使用 apt（Ubuntu/Debian）

```bash
# 1. 添加 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 2. 安装 Node.js
sudo apt-get install -y nodejs

# 3. 验证
node --version
```

#### 方案 C：直接下载二进制

```bash
# 1. 下载
wget https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz

# 2. 解压
sudo tar -xJf node-v20.18.0-linux-x64.tar.xz -C /usr/local --strip-components=1

# 3. 验证
node --version
```

### 3.3 Docker 部署

如果使用 Docker 部署，在 Dockerfile 中指定：

```dockerfile
# 使用 Node.js 20 LTS
FROM node:20-slim

# 或者使用 Alpine
FROM node:20-alpine
```

---

## 四、风险点与缓解措施

### 4.1 风险评估矩阵

| 风险 | 等级 | 影响 | 缓解措施 |
|------|------|------|---------|
| Node.js 版本不满足 | 🔴 高 | 构建失败 | 升级服务器 Node.js 到 20.9+ |
| next lint 命令失效 | 🟡 中 | lint 脚本报错 | 修改为 ESLint 直接调用 |
| proxy.ts 兼容性问题 | 🟢 低 | 部分路由失效 | 充分本地测试 |
| 第三方库兼容 | 🟢 低 | 功能异常 | 完整测试覆盖 |
| 生产构建失败 | 🟡 中 | 部署阻塞 | 本地充分验证后部署 |

### 4.2 回滚方案

#### 立即回滚（升级后立即发现问题）

```bash
# 1. 恢复 package.json
cp package.json.backup-YYYYMMDD package.json

# 2. 清理 node_modules
rm -rf node_modules

# 3. 恢复依赖
npm install

# 4. 验证回滚
npx next --version
```

#### 分步回滚（部分功能异常）

```bash
# 1. 查看 git 历史
git log --oneline -10

# 2. 回滚特定文件
git checkout HEAD~1 -- package.json
git checkout HEAD~1 -- next.config.ts

# 3. 重新安装
rm -rf node_modules .next
npm install
```

---

## 五、测试验证计划

### 5.1 预检查清单

- [ ] Node.js 版本 >= 20.9.0
- [ ] npm/pnpm 版本最新
- [ ] package.json 已备份
- [ ] 无未提交的重要的代码变更

### 5.2 功能测试矩阵

| 模块 | 测试项 | 预期结果 | 优先级 |
|------|--------|---------|--------|
| 首页 | 加载、渲染 | 无错误 | P0 |
| 认证 | 登录、登出 | 正常 | P0 |
| 导航 | 页面跳转 | 正常 | P0 |
| API | 数据请求 | 返回正确 | P0 |
| 构建 | webpack/turbopack | 成功 | P0 |
| 类型 | TypeScript | 无新增错误 | P1 |
| 单元测试 | vitest | 全部通过 | P1 |
| E2E | Playwright | 全部通过 | P1 |

### 5.3 性能基准（可选）

记录升级前后的指标：

```bash
# 构建时间
time npm run build

# 启动时间
time npm run dev

# Bundle 大小
npm run build:analyze
```

---

## 六、升级时间表

| 阶段 | 任务 | 预计时间 | 执行人 |
|------|------|---------|--------|
| 1 | 环境准备 | 1-2 小时 | 自动化/手动 |
| 2 | 配置迁移 | 1-2 小时 | 手动 |
| 3 | 依赖升级 | 1 小时 | 自动化 |
| 4 | 本地测试 | 2-4 小时 | 自动化/手动 |
| 5 | 部署 | 1-2 小时 | 手动 |
| **总计** | | **6-11 小时** | |

---

## 七、升级后检查清单

### 7.1 成功标志

- [ ] `npm run build` 成功
- [ ] `npm run dev` 正常启动
- [ ] `npm run test` 全部通过
- [ ] `npm run lint` 无错误
- [ ] TypeScript 编译无新增错误
- [ ] 生产环境运行正常

### 7.2 部署后验证

```bash
# 1. 检查生产服务器日志
pm2 logs 7zi-frontend
# 或
docker logs 7zi-frontend

# 2. 访问关键页面确认无 500 错误
curl -I https://7zi.com

# 3. 检查错误监控系统（如 Sentry）
```

---

## 八、关键命令速查

```bash
# 检查版本
node --version          # Node.js 版本
npm --version          # npm 版本
npx next --version     # Next.js 版本

# 升级 Next.js
npm install next@latest

# 备份
cp package.json package.json.backup-$(date +%Y%m%d)

# 测试
npm run dev            # 开发环境
npm run build          # 生产构建
npm run test           # 单元测试
npm run test:e2e       # E2E 测试

# 类型检查
npm run typecheck

# lint
npm run lint
```

---

## 九、联系与支持

- **Next.js 官方文档**: https://nextjs.org/docs
- **Next.js GitHub**: https://github.com/vercel/next.js
- **升级问题**: 查阅项目已有的 `REPORT_NEXTJS163_ASSESSMENT_0418.md`

---

*计划制定日期: 2026-04-18*
*下次 Review: 升级完成后*
