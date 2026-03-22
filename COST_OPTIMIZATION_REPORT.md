# 7zi-Project 成本优化报告

**报告日期:** 2026-03-22
**项目版本:** 1.0.8
**分析人:** 💰 财务 (AI Subagent)
**项目路径:** /root/.openclaw/workspace/7zi-project

---

## 📊 执行摘要

### 关键发现

| 指标 | 当前状态 | 优化潜力 | 优先级 |
|------|---------|---------|--------|
| node_modules 大小 | **2.6GB** | 可减少 ~30-40% | 🔴 高 |
| Docker 生产镜像 | 243MB | 可优化至 <200MB | 🟡 中 |
| Docker 测试镜像 | 1.03GB | 可优化至 <500MB | 🟡 中 |
| 不必要的生产依赖 | 4个 | 可移至 devDependencies | 🔴 高 |
| 未使用的依赖 | 5个 | 可完全移除 | 🟢 低 |
| 服务器磁盘使用 | 71% (62GB/88GB) | 剩余 26GB | 🟡 中 |

### 预估节省

- **开发环境:** 减少 ~800MB-1GB node_modules 空间
- **生产镜像:** 减少 40-50MB (16-20%)
- **构建时间:** 减少 15-20%
- **网络传输:** 减少 20-30%

---

## 1. 🔍 依赖分析

### 1.1 依赖大小概览

```
总计: 2.6GB
├── @next + next: ~300MB (11.5%)
├── @swc: 62MB (2.4%)
├── @sentry/nextjs: 51MB (2.0%)
├── lucide-react: 46MB (1.8%)
├── three: 38MB (1.5%)
├── three-stdlib: 30MB (1.2%)
├── stats-gl: 30MB (1.2%)
├── typescript: 23MB (0.9%)
├── @opentelemetry: 25MB (1.0%)
├── @mediapipe: 20MB (0.8%)
├── better-sqlite3: 12MB (0.5%)
└── 其他: ~1.9GB (73%)
```

### 1.2 重型依赖分析

#### ✅ 合理的重型依赖（必须保留）

| 依赖 | 大小 | 用途 | 使用场景 | 状态 |
|------|------|------|---------|------|
| `next` + `@next` | ~300MB | 核心框架 | 全局使用 | ✅ 保留 |
| `three` + 生态 | ~98MB | 3D 渲染 | knowledge-lattice 页面 | ✅ 保留（已懒加载） |
| `@sentry/nextjs` | 51MB | 错误监控 | 全局监控 | ✅ 保留 |
| `better-sqlite3` | 12MB | 本地数据库 | 服务端数据持久化 | ✅ 保留 |
| `recharts` | - | 图表库 | 性能分析、仪表板 | ✅ 保留 |
| `sharp` | - | 图片处理 | Next.js 图片优化 | ✅ 保留 |

#### ⚠️ 需要优化的依赖

| 依赖 | 问题 | 影响 | 建议 |
|------|------|------|------|
| **`@jest/globals`** | 生产依赖，仅用于测试 | 打包体积增大 | 移至 devDependencies |
| **`@testing-library/jest-dom`** | 生产依赖，仅用于测试 | 打包体积增大 | 移至 devDependencies |
| **`glob`** | 生产依赖，仅 Jest 间接使用 | 打包体积增大 | 移至 devDependencies |
| **`@modelcontextprotocol/sdk`** | 1.27.1 (~1.5MB) | 未确定是否必需 | 评估使用必要性 |

#### ❌ 未使用的依赖（extraneous）

| 依赖 | 大小 | 原因 | 建议 |
|------|------|------|------|
| `@emnapi/core` | - | WASM 运行时，未直接使用 | 移除 |
| `@emnapi/runtime` | - | WASM 运行时，未直接使用 | 移除 |
| `@emnapi/wasi-threads` | - | WASM 运行时，未直接使用 | 移除 |
| `@napi-rs/wasm-runtime` | - | WASM 运行时，未直接使用 | 移除 |
| `@tybys/wasm-util` | - | WASM 工具，未直接使用 | 移除 |

### 1.3 使用频率分析

#### Three.js 生态系统
- **使用位置:** 仅 `src/components/knowledge-lattice/KnowledgeLatticeScene.tsx`
- **页面:** `/knowledge-lattice` 单个页面
- **当前优化:** 已使用 `LazyKnowledgeLatticeScene` 懒加载
- **评估:** 合理，无优化需求

#### xlsx (Excel 导出)
- **使用位置:** `src/app/api/analytics/export/route.ts`
- **场景:** API 路由中的数据导出
- **当前优化:** 仅服务端使用
- **评估:** 合理，可考虑更轻量替代方案（如 `exceljs`）

#### better-sqlite3
- **使用位置:** 8+ 数据库相关文件
- **场景:** 本地数据持久化
- **评估:** 必需，无替代方案

---

## 2. 🐳 Docker 镜像优化

### 2.1 当前状态

| 镜像 | 大小 | 用途 | 状态 |
|------|------|------|------|
| `7zi-frontend-full` | 243MB | 生产部署 | ✅ 已优化 |
| `7zi-frontend-test-build` | 1.03GB | 测试构建 | ⚠️ 过大 |

### 2.2 Dockerfile 评估

#### ✅ 已实现的优化
1. ✅ **多阶段构建** - deps → builder → runner 三阶段
2. ✅ **Alpine 基础镜像** - `node:22-alpine`
3. ✅ **仅生产依赖** - `npm ci --only=production`
4. ✅ **Standalone 模式** - Next.js 自包含输出
5. ✅ **非 root 用户** - 安全性提升
6. ✅ **健康检查** - 容器监控

#### 🔧 进一步优化建议

**优化 1: 减少构建阶段依赖**
```dockerfile
# 当前: builder 阶段安装所有依赖
RUN npm ci --legacy-peer-deps

# 优化: 仅安装必要的 devDependencies
RUN npm ci --legacy-peer-deps --production=false \
  && npm install --no-save @next/bundle-analyzer
```

**优化 2: 使用 .dockerignore**
```
# 创建 .dockerignore 文件
node_modules
.next
.git
*.test.ts
*.test.tsx
__tests__
coverage
*.log
.env
```

**优化 3: 测试镜像优化**
- 使用相同的 Alpine 基础镜像
- 分离测试依赖
- 使用 BuildKit 缓存挂载

**预期效果:**
- 生产镜像: 243MB → **<200MB** (节省 17%+)
- 测试镜像: 1.03GB → **<500MB** (节省 50%+)

---

## 3. 🖥️ 服务器资源分析

### 3.1 7zi.com 服务器状态

```
内存: 7.8GB 总量
├── 已用: 3.8GB (48.7%)
├── 空闲: 2.0GB (25.6%)
└── 缓存: 2.0GB (25.6%)

磁盘: 88GB 总量
├── 已用: 62GB (70.5%) ⚠️ 偏高
└── 空闲: 26GB (29.5%)

容器: 无运行容器 🤔
```

### 3.2 资源使用评估

#### ✅ 内存使用 - 健康
- 使用率: 48.7%
- 状态: 正常
- 建议: 无需优化

#### ⚠️ 磁盘使用 - 需关注
- 使用率: 70.5%
- 状态: 偏高（警戒线 80%）
- 建议: 制定清理计划

#### 🤔 容器状态 - 需确认
- 运行容器: 0
- 状态: 可能未使用 Docker 部署
- 建议: 确认部署方式

### 3.3 磁盘清理建议

```bash
# 1. 清理 Docker 未使用资源（如果使用 Docker）
docker system prune -af --volumes

# 2. 清理 npm 缓存
npm cache clean --force

# 3. 清理日志文件
journalctl --vacuum-time=7d

# 4. 清理旧版本包（如存在）
rm -rf /root/.openclaw/workspace/7zi-project/node_modules
npm install
```

**预期节省:** ~3-5GB 磁盘空间

---

## 4. 🎯 优化建议（按优先级）

### 🔴 高优先级（立即执行）

#### 1. 清理生产依赖中的测试工具

**问题:** `@jest/globals`、`@testing-library/jest-dom`、`glob` 在生产依赖中

**操作:**
```json
// package.json
{
  "dependencies": {
    // 保留以下依赖
    // ...
  },
  "devDependencies": {
    // 添加以下依赖
    "@jest/globals": "^30.3.0",
    "@testing-library/jest-dom": "^6.9.1",
    "glob": "^13.0.6"
  }
}
```

**预期效果:**
- node_modules 减少 ~50-100MB
- 生产镜像减少 ~10-15MB

**执行步骤:**
```bash
cd /root/.openclaw/workspace/7zi-project
npm install --save-dev @jest/globals @testing-library/jest-dom glob
npm uninstall @jest/globals @testing-library/jest-dom glob
```

---

#### 2. 清理未使用的 WASM 依赖

**问题:** 5 个 extraneous WASM 相关依赖

**操作:**
```bash
cd /root/.openclaw/workspace/7zi-project
npm uninstall @emnapi/core @emnapi/runtime @emnapi/wasi-threads @napi-rs/wasm-runtime @tybys/wasm-util
```

**预期效果:**
- 减少 ~20-30MB
- 清理依赖树混乱

---

#### 3. 创建 .dockerignore 文件

**问题:** 构建时包含不必要文件

**操作:**
```bash
cd /root/.openclaw/workspace/7zi-project
cat > .dockerignore << 'EOF'
node_modules
.next
.git
.gitignore
*.test.ts
*.test.tsx
__tests__
coverage
*.log
.env
.env.*
.nyc_output
dist
.vscode
.idea
EOF
```

**预期效果:**
- 构建速度提升 10-15%
- 构建缓存命中率提升

---

### 🟡 中优先级（本周执行）

#### 4. 评估 MCP SDK 必要性

**问题:** `@modelcontextprotocol/sdk` 使用情况不明确

**调查:**
- 使用位置: `src/lib/mcp/server.ts`
- 功能: MCP 服务器实现
- 使用场景: 未确定

**建议:**
- **如果正在使用:** 保留，评估是否可以懒加载
- **如果未使用:** 移至 devDependencies 或完全移除

**执行:**
```bash
# 检查是否在路由中使用
grep -r "mcp/server" src/app/ --include="*.ts" --include="*.tsx"

# 如果未使用，移至 devDependencies
npm uninstall @modelcontextprotocol/sdk
npm install --save-dev @modelcontextprotocol/sdk
```

---

#### 5. 优化 Docker 测试镜像

**问题:** 测试镜像 1.03GB 过大

**操作:**
1. 创建 `Dockerfile.test`，使用 Alpine + 独立测试依赖
2. 使用 BuildKit 缓存挂载
3. 分离测试依赖安装

**预期效果:**
- 测试镜像: 1.03GB → <500MB
- 测试构建速度提升 20-30%

---

#### 6. 磁盘清理计划

**问题:** 磁盘使用率 70.5% 偏高

**操作:**
```bash
# 清理 Docker（如果使用）
docker system prune -af --volumes

# 清理 npm 缓存
npm cache clean --force

# 清理系统日志
journalctl --vacuum-time=7d

# 清理构建产物
rm -rf .next
npm run build
```

**预期效果:**
- 磁盘节省: 3-5GB
- 使用率降至: 65% 以下

---

### 🟢 低优先级（有时间时执行）

#### 7. 评估 xlsx 替代方案

**问题:** `xlsx` 较大，考虑更轻量替代

**选项:**
- `exceljs` - 更现代，API 更好
- `sheetjs` - 同一项目不同名称
- 保留 xlsx - 当前已优化

**建议:** 保留当前方案，除非有性能问题

---

#### 8. 优化 Lucide React 导入

**问题:** `lucide-react` 46MB，包含所有图标

**当前状态:** 可能已优化（使用 `optimizePackageImports`）

**验证:**
```bash
# 检查实际使用的图标
grep -rh "from 'lucide-react'" src/ | sort | uniq
```

**优化:** 如果使用了较多图标，当前方案合理

---

#### 9. 配置依赖分析工具

**问题:** 缺少依赖监控工具

**建议:**
```bash
# 安装依赖分析工具
npm install -g npm-check-updates depcheck

# 检查未使用依赖
npx depcheck

# 检查可更新的依赖
ncu
```

---

## 5. 📋 优化检查清单

### 立即执行（今天）

- [ ] 1.1 移动 `@jest/globals` 到 devDependencies
- [ ] 1.2 移动 `@testing-library/jest-dom` 到 devDependencies
- [ ] 1.3 移动 `glob` 到 devDependencies
- [ ] 1.4 清理 extraneous WASM 依赖（5个）
- [ ] 1.5 创建 `.dockerignore` 文件

### 本周执行

- [ ] 2.1 评估 `@modelcontextprotocol/sdk` 使用情况
- [ ] 2.2 优化 Docker 测试镜像
- [ ] 2.3 执行磁盘清理计划
- [ ] 2.4 验证优化效果（重新构建、测量大小）

### 持续维护

- [ ] 3.1 定期检查未使用依赖（每月）
- [ ] 3.2 监控 Docker 镜像大小
- [ ] 3.3 监控磁盘使用率（保持 <80%）
- [ ] 3.4 定期清理缓存和日志

---

## 6. 📈 预期效果总结

### 优化前后对比

| 指标 | 当前 | 优化后 | 改善 |
|------|------|--------|------|
| node_modules | 2.6GB | **1.8GB** | -30% |
| 生产镜像 | 243MB | **<200MB** | -17% |
| 测试镜像 | 1.03GB | **<500MB** | -51% |
| 不必要依赖 | 9个 | **0个** | -100% |
| 构建时间 | 基准 | **-15%** | 更快 |
| 磁盘使用 | 71% | **<65%** | -6% |

### 成本节省（估算）

**开发环境:**
- 磁盘空间: ~800MB
- 构建时间: ~15%
- 开发体验: 显著提升

**生产环境:**
- 镜像大小: 40-50MB
- 部署时间: ~10%
- 网络传输: ~20%

**服务器成本:**
- 当前配置: 7.8GB 内存, 88GB 磁盘
- 优化后: 无需升级
- 预计节省: $0（无需扩容）

---

## 7. 🔧 实施脚本

### 自动化优化脚本

```bash
#!/bin/bash
# optimize-dependencies.sh
# 7zi-Project 依赖优化脚本

set -e

echo "🚀 开始 7zi-Project 依赖优化..."

# 1. 清理未使用的 WASM 依赖
echo "📦 清理 extraneous 依赖..."
npm uninstall @emnapi/core @emnapi/runtime @emnapi/wasi-threads @napi-rs/wasm-runtime @tybys/wasm-util || true

# 2. 移动测试工具到 devDependencies
echo "📦 移动测试工具到 devDependencies..."
npm uninstall @jest/globals @testing-library/jest-dom glob || true
npm install --save-dev @jest/globals @testing-library/jest-dom glob

# 3. 创建 .dockerignore
echo "📝 创建 .dockerignore..."
cat > .dockerignore << 'EOF'
node_modules
.next
.git
*.test.ts
*.test.tsx
__tests__
coverage
*.log
.env
EOF

# 4. 清理缓存
echo "🧹 清理 npm 缓存..."
npm cache clean --force

# 5. 重新安装依赖
echo "📦 重新安装依赖..."
rm -rf node_modules package-lock.json
npm install

# 6. 验证 extraneous 依赖
echo "🔍 检查 extraneous 依赖..."
npm ls 2>&1 | grep extraneous || echo "✅ 无 extraneous 依赖"

# 7. 显示优化结果
echo "📊 优化结果:"
du -sh node_modules

echo "✅ 依赖优化完成！"
```

### 使用方法

```bash
cd /root/.openclaw/workspace/7zi-project
chmod +x optimize-dependencies.sh
./optimize-dependencies.sh
```

---

## 8. ⚠️ 风险评估

### 高风险操作

| 操作 | 风险 | 缓解措施 |
|------|------|---------|
| 移除依赖 | 可能影响功能 | 充分测试后再执行 |
| 清理磁盘 | 可能删除有用数据 | 备份重要数据 |
| 修改 Dockerfile | 可能影响部署 | 先在测试环境验证 |

### 测试建议

1. **功能测试:** 运行所有测试套件
2. **构建测试:** 确保构建成功
3. **部署测试:** 在测试环境验证
4. **性能测试:** 对比优化前后性能

```bash
# 完整测试流程
npm run test:run
npm run build
npm run start
npm run test:e2e
```

---

## 9. 📞 后续支持

### 问题反馈

如遇到问题，请提供：
- 错误信息
- 执行步骤
- 环境信息

### 持续优化建议

1. **定期审查:** 每月审查一次依赖
2. **依赖监控:** 使用 `npm outdated` 检查更新
3. **性能监控:** 使用 `npm run build:analyze` 分析打包体积
4. **安全审计:** 定期运行 `npm audit`

---

## 10. ✅ 结论

### 核心发现

1. **依赖管理良好:** 大部分依赖合理，少数需要调整
2. **Docker 已优化:** 生产镜像 243MB 已经过优化
3. **服务器资源充足:** 内存使用健康，磁盘需关注
4. **优化空间有限:** 预期总体改善 20-30%

### 主要建议

1. **立即执行:** 清理 9 个不必要/未使用依赖
2. **本周执行:** 优化测试镜像和磁盘清理
3. **持续维护:** 定期审查和监控

### 预期收益

- ✅ 减少 ~30% node_modules 大小
- ✅ 减少 ~17% 生产镜像大小
- ✅ 减少 ~51% 测试镜像大小
- ✅ 提升 15% 构建速度
- ✅ 无需服务器扩容，节省成本

---

**报告完成时间:** 2026-03-22 13:15 GMT+1
**下次审查时间:** 2026-04-22

---

*本报告由 💰 财务 (AI Subagent) 自动生成*
*如有疑问或需要进一步分析，请联系主管*
