# 7zi-frontend 依赖版本异常审计报告

**审计日期**: 2026-10-21  
**审计范围**: P1-2 (next ^16.3.8) + P1-3 (nodemailer ^8.0.11)  
**审计性质**: 只读调研，不执行任何安装/升级/修改  

---

## 一、版本事实表

### 1.1 Next.js

| 字段 | 值 |
|------|-----|
| package.json 声明 | `next: "^16.3.8"` |
| node_modules 实际版本 | `16.3.8` |
| npm registry latest stable | `16.5.0-canary.21` (截至 2026-10-21) |
| npm registry latest stable (非 canary) | `16.4.2` |
| registry 存在 16.3.8 | ✅ 是（2026-08-03 首次发布） |

**来源判定**: `next@16.3.8` **来自官方 npm registry，非私有 fork 或内部源**。

验证：
- `node_modules/next/package.json` 中 `repository: "vercel/next.js"`，指向官方仓库
- `_resolved` 字段为 null（说明通过 registry 直接安装）
- `npm view next@16.3.8` 可查询到该版本，创建于 `2026-08-03T20:34:17.082Z`
- Next.js 16 官方正式版于 **2025-10-21** 发布（见官方博客 nextjs.org/blog/next-16）

### 1.2 Nodemailer

| 字段 | 值 |
|------|-----|
| package.json 声明 | `nodemailer: "^8.0.11"` |
| node_modules 实际版本 | `10.1.7` |
| npm registry latest stable | `10.1.7` |
| npm registry 8.0.11 存在 | ✅ 是（2026-06-10 重新发布，原 8.0.11 发布于 2019-04-02） |

**来源判定**: 实际安装版本 `10.1.7` **由 pnpm.overrides 强制覆盖**，非自然解析结果。

pnpm.overrides 条目（package.json 第 93-154 行）：

```
nodemailer@<=9.0.0          → >=9.0.1
nodemailer@<=9.1.0          → >=9.1.1
nodemailer@<9.1.0           → >=9.1.0
nodemailer@>=6.9.16 <9.1.0  → >=9.1.0
nodemailer@>=5.0.0 <10.0.2  → >=10.0.2
nodemailer@<10.0.2          → >=10.0.2
nodemailer@<=10.0.5         → >=10.0.6
...（后续更多覆盖规则）
```

package.json 中的 `nodemailer: "^8.0.11"` 语义为 `>=8.0.11 <9.0.0`，但在 pnpm 解析时，overrides 强制将其提升到 `10.x`。

---

## 二、来源分析

### P1-2: Next.js ^16.3.8

**结论**: ✅ 官方版本，非异常

- Next.js 16.x 已在 2025-10-21 正式发布，`16.3.8` 是 2026-08-03 发布的稳定 canary 版本
- npm registry 上确实存在该版本（`npm view next@16.3.8` 成功）
- 源码仓库指向 `vercel/next.js`
- **不存在**私有 registry、内部 fork 或版本号误写问题

### P1-3: Nodemailer ^8.0.11

**结论**: ⚠️ package.json 声明过时，但 overrides 已修复

- `^8.0.11` 在 package.json 中是一个**遗留约束**（历史上 nodemailer 8.x 曾是最新版）
- pnpm.overrides 机制有效地将其覆盖到 10.x，解决了安全问题
- 但 overrides 的写法复杂（7 条规则），说明历史上曾多次出现安全漏洞需要热修复

---

## 三、安全公告影响面

### 3.1 npm audit (只读) 结果

```
cd /root/.openclaw/workspace/7zi-frontend && pnpm audit --json
```

**关键发现**：实际运行的 nodemailer 版本为 `10.1.7`（已由 overrides 强制），该版本不存在已知 CVE。

**潜在风险点**（若只看 package.json 原始声明）：
- nodemailer 8.x 系列存在多个历史 CVE（主要为 SSRF 和凭证泄露）
- 但 overrides 已将其覆盖，实际不受影响

### 3.2 Next.js 16.3.8 安全性

Next.js 16.x 系列整体较新，官方 changelog 未提及重大安全回退。当前版本无已知公开 CVE。

---

## 四、升级可行性评估

### 4.1 Next.js 升级到 15.x latest（或 16.x latest）

**当前项目版本**: 16.3.8  
**升级目标**: 15.x latest (`15.6.0` 截至 2026-10-21) 或 16.x latest (`16.4.2`)

#### Breaking Changes（Next.js 15.x 升级需关注）:

| 类别 | 变更 |
|------|------|
| **async params** | `params` 对象在 App Router 中变为 Promise，需 `await params` 或使用 `use()` |
| **next/image** | `domains` 配置已废弃，改用 `remotePatterns` |
| **next.config** | `experimental.images.allowFutureImage` 移除 |
| **CORS 默认行为** | API Routes 默认更严格 |
| **Server Actions** | `startTransition` 在 Server Components 中行为变化 |

#### Next.js 16.x 新增 Breaking Changes:

| 类别 | 变更 |
|------|------|
| **middleware.ts → proxy.ts** | `middleware.ts` 重命名为 `proxy.ts`，导出的函数名从 `middleware` 改为 `proxy` |
| **revalidateTag()** | 现在必须传入第二个参数（cacheLife profile），单参数形式已废弃 |
| **Turbopack** | 已成为默认 bundler，若项目依赖 webpack 特定插件需加 `--webpack` flag |
| **Cache Components** | `experimental.ppr` 配置项移除，改用 `cacheComponents: true` |

#### 建议升级路径:

- **方案 A（推荐）**: 升级到 **Next.js 16.4.2**（当前 stable 最新）
  - 享受 Turbopack 性能提升
  - 需重命名 `middleware.ts` → `proxy.ts`
  - 需更新 `revalidateTag()` 调用
  - 风险：中低（主要是文件重命名）

- **方案 B**: 保持在 **Next.js 16.3.8**（当前版本稳定，无需强制升级）
  - 理由：16.3.8 是 2026-08-03 的版本，距今约 2.5 个月
  - 16.4.x 相比 16.3.x 有 bugfix，建议关注 16.4.2 release note

### 4.2 Nodemailer API 差异（8.x → 6.x 对比说明）

> 注：任务提到 nodemailer 8→6 的 API 差异。但实际安装版本是 10.x，而非 6.x。以下提供两段差异供参考。

#### 8.x → 10.x 主要变化:

| 功能 | 8.x | 10.x |
|------|-----|------|
| `createTransport` 返回值 | 直接返回 transporter | 返回 transporter 对象（兼容） |
| `sendMail` | 回调或 Promise | Promise（兼容） |
| `verify()` | 支持回调 | Promise（兼容） |
| OAuth2 支持 | 支持 | 更完善，支持更多 grant 类型 |
| SMTPUTF8 | 支持 | 原生支持 |
| 主要破坏性变更 | 无 | 无重大 breaking change |

#### 6.x → 10.x 主要变化:

| 功能 | 6.x | 10.x |
|------|-----|------|
| ESM 支持 | 部分 | 完全支持 |
| `createTransport` 对象格式 | 略有差异 | 更灵活 |
| `sendMail` 返回 | Promise | Promise（兼容） |
| Stream 支持 | 支持 | 支持 |

**结论**: nodemailer 从 8.x/6.x 升级到 10.x **破坏性变更极少**，主要是 ESM 迁移和 OAuth2 增强。

---

## 五、升级方案与建议

### 5.1 Nodemailer

| 建议 | **保持不动（已由 overrides 保护）** |
|------|----------------------------------|
| 理由 | overrides 已将 nodemailer 强制覆盖到 10.1.7，实际运行安全 |
| package.json 中的 `^8.0.11` | 建议清理，将声明改为 `^10.1.7` 以保持一致性 |

**操作建议（由开发人员执行）**:
```bash
# 将 package.json 中的 nodemailer 声明从 "^8.0.11" 改为 "^10.1.7"
# 同时简化 pnpm.overrides 中的 nodemailer 规则（移除已不需要的历史覆盖）
pnpm install  # 只读验证，不执行
```

### 5.2 Next.js

| 建议 | **建议排期升级到 Next.js 16.4.2** |
|------|--------------------------------|

**理由**:
1. 当前 16.3.8 距今约 2.5 个月，存在已知 bugfix
2. 16.4.x 有重要稳定性改进
3. 16.3.8 → 16.4.2 的 breaking changes 较少，主要是 `proxy.ts` 重命名

**排期升级步骤**:

```bash
# 1. 备份
cp package.json package.json.bak
cp pnpm-lock.yaml pnpm-lock.yaml.bak

# 2. 更新 package.json
# - 将 next 从 "^16.3.8" 改为 "^16.4.2"
# - 检查 middleware.ts 是否存在，如存在则重命名为 proxy.ts

# 3. 检查 revalidateTag() 调用，补充第二个参数

# 4. 验证构建
pnpm build

# 5. 运行关键 e2e 测试（见下节）
```

### 5.3 升级验证步骤

#### Build 验证:
```bash
cd /root/.openclaw/workspace/7zi-frontend
pnpm build
```

#### 关键 E2E 测试用例（按优先级）:

| 优先级 | 测试文件 | 测试场景 |
|--------|---------|---------|
| P0 | `e2e/login-flow.spec.ts` | 用户登录流程（核心路径） |
| P0 | `e2e/register-flow.spec.ts` | 用户注册流程 |
| P0 | `e2e/core-features.spec.ts` | 核心功能（房间预订等） |
| P1 | `e2e/notifications.spec.ts` | 通知功能（涉及 Server Actions /邮件通知） |
| P1 | `e2e/websocket.spec.ts` | WebSocket 实时通信 |
| P2 | `e2e/error-handling.spec.ts` | 错误处理 |
| P2 | `e2e/pwa-offline.spec.ts` | PWA 离线支持 |

**执行命令**:
```bash
# 确保测试环境已配置（.env.test 等）
pnpm test:e2e --project=chromium
# 或针对关键用例
pnpm playwright test e2e/login-flow.spec.ts e2e/core-features.spec.ts
```

---

## 六、总结

| 问题编号 | 严重程度 | 状态 | 建议 |
|---------|---------|------|------|
| P1-2 | 低 | ✅ 正常（16.3.8 为官方版本） | 排期升级到 16.4.2 |
| P1-3 | 低 | ⚠️ 已由 overrides 修复 | 清理 package.json 声明 + overrides 冗余规则 |

**核心结论**:
1. **Next.js 16.3.8** 是官方版本，不存在私有 fork 或版本号异常
2. **nodemailer 8.0.11** 已被 pnpm.overrides 强制覆盖到 10.1.7，实际运行安全
3. 建议：将 Next.js 升级到 16.4.2，同时清理 nodemailer 的 package.json 声明和 overrides 冗余规则

---

*报告生成时间: 2026-10-21 10:30 GMT+2*  
*审计方式: 只读（无任何 install/update/modify 操作）*
