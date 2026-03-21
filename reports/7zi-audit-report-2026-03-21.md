# 🔍 7zi 项目重新审计报告

**审计日期**: 2026-03-21
**仓库**: https://github.com/songzuo/7zi
**上次评分**: 4/10
**自评**: 8/10
**实际评分**: **5.5/10**

---

## 📊 总评分表

| 维度 | 上次 | 本次 | 备注 |
|------|------|------|------|
| 代码安全 | 2 | **4** | 有改善但仍有硬编码密钥 |
| 代码质量 | 4 | **7** | TypeScript + Zod 验证 + 错误处理提升明显 |
| 架构设计 | 5 | **6** | 模块化合理，但混入无关项目 |
| 测试覆盖 | 3 | **8** | 400+ 用例、85%+ 覆盖率，这是最大进步 |
| CI/CD | 3 | **7** | 4 个 workflow、Docker 多阶段构建 |
| 文档 | 4 | **7** | API.md + CHANGELOG + DEPLOYMENT 全有 |
| 项目整洁度 | 3 | **3** | 大量无关文件仍然存在 |

---

## ✅ 显著改善（相比上次 4 分）

### 1. 测试系统大幅升级 — 从 3 → 8
- **400+ 测试用例**，覆盖组件、API、Hooks、安全、集成
- 语句覆盖 85%+，分支覆盖 78%+，函数覆盖 82%+
- Vitest 4.1 + Testing Library 16 + Playwright 1.58
- 有专门的 `__tests__`、`boundary` 测试、安全测试（XSS/CSRF/输入验证）
- ✅ 这是项目最大的亮点

### 2. 安全基础设施成型 — 从 2 → 4
- CSRF Token 机制（服务端生成 + httpOnly cookie + 时间安全比较）
- AES-256-CBC 加密 API Key（`crypto` 模块）
- JWT 认证（jose 库，带 issuer/audience 验证）
- 安全 Headers 配置（CSP, HSTS, X-Frame-Options 等）
- API 参数验证（Zod schema）

### 3. CI/CD 成熟 — 从 3 → 7
- 4 个 GitHub Actions workflow（ci, ci-cd, deploy, tests）
- Docker 多阶段构建（Alpine + Distroless 两个目标）
- 非 root 用户运行、HEALTHCHECK 配置
- 支持 Vercel + 自建服务器部署

### 4. 监控体系
- Sentry 集成（client/server/edge 三个配置）
- 健康检查 API（liveness/readiness/detailed）
- Web Vitals 性能监控
- 内存阈值告警

---

## 🚨 仍存在的严重问题

### 1. 🔴 硬编码密钥（最严重）

```
# moltbook-gateway/src/index.js:19
const API_KEY = process.env.MOLTBOOK_API_KEY || 'moltbook_sk_d6oxuCaSrXjf0XgmoAsNFpS-yjptaSrd';

# src/lib/agents/auth-service.ts:32
return process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';

# src/lib/agents/repository.ts:50
const secret = process.env.AGENT_ENCRYPTION_SECRET || 'default-agent-secret-key';

# src/lib/crypto/index.ts:47
'default-agent-secret-key';
```

**4 个位置存在硬编码 fallback 密钥**。即使有环境变量优先，无环境变量时直接使用弱默认值，生产环境等同于裸奔。moltbook-gateway 中的 API Key 更是直接明文提交到公开仓库。

### 2. 🔴 `.env.production` 被提交到 Git

虽然密钥被注释掉，但文件名暗示这是生产配置，且包含 `NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com` 等实际值。`.gitignore` 中有 `.env.production` 但文件已被追踪。需要：
```bash
git rm --cached .env.production
```

### 3. 🟡 WebSocket CORS 设置为 `*`

```typescript
// src/lib/websocket/server.ts
cors: { origin: '*', methods: ['GET', 'POST'], credentials: true }
```

允许任何来源连接 WebSocket，且开启了 credentials，存在 CSRF 风险。

### 4. 🟡 CSP 使用 `unsafe-inline` 和 `unsafe-eval`

```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' ..."
```

这大大削弱了 CSP 的 XSS 防护能力。`unsafe-eval` 尤其危险。

### 5. 🟡 GitHub Webhook 签名验证未实现

```typescript
// architecture/ai-team-dashboard/backend/server.ts:470
// TODO: 验证 GitHub webhook 签名
```

Webhook 端点没有签名验证，任何人都可以伪造请求。

### 6. 🟡 图片代理过于宽松

```typescript
remotePatterns: [{ protocol: 'https', hostname: '**' }]
```

允许优化任何域名的图片，可能被利用为 SSRF 攻击向量。

---

## 🗑️ 项目整洁度问题（严重影响专业感）

仓库根目录包含大量**不应出现在公开项目仓库中的文件**：

| 文件 | 问题 |
|------|------|
| `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md` | OpenClaw 工作区文件，暴露 AI 代理配置 |
| `MEMORY.md`, `memory/` | AI 代理的记忆/日志 |
| `TOOLS.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` | 同上 |
| `promotions/` (15+ 文件) | 营销文案、销售页面、公关稿 |
| `openclaw-kb/` | OpenClaw 知识库配置 |
| `subagents/`, `state/` | AI 代理状态文件 |
| `skills/email/SKILL.md` | 技能定义文件 |
| `server-monitor.json` (18KB) | 服务器监控配置 |
| `moltbook-gateway/` | 完全无关的子项目 |
| `architecture/` | 独立架构文档和代码 |

这些文件让仓库看起来像**个人工作站备份**而非正式开源项目。

---

## 📋 关键修复建议（按优先级）

### P0 — 立即修复
1. **删除所有硬编码密钥**，改为启动时强制检查环境变量，缺失则报错退出
2. **`git rm --cached .env.production`** 并重新生成任何可能泄露的凭据
3. **审查 moltbook-gateway 中的 API Key**，如已暴露则立即轮换

### P1 — 本周修复
4. WebSocket CORS 收紧为实际域名白名单
5. 移除 CSP 中的 `unsafe-eval`，评估 `unsafe-inline` 替代方案（nonce/hash）
6. 实现 GitHub Webhook 签名验证
7. 限制 `images.remotePatterns` 为实际使用的域名

### P2 — 本月清理
8. 从仓库删除所有 OpenClaw 工作区文件（移入 `.gitignore`）
9. 将 `moltbook-gateway`、`architecture/`、`promotions/` 等移出或删除
10. 清理 `tools/` 目录中与项目无关的脚本

---

## 🎯 评分说明：5.5 分

**从 4 → 5.5 的提升**来自：
- 测试体系从近乎空白到 400+ 用例、85%+ 覆盖率（+2 分）
- CI/CD 从基本脚本到成熟的 GitHub Actions + Docker 多阶段构建（+1.5 分）
- API 设计从无序到 Zod 验证 + 错误处理 + 监控（+1 分）

**没能达到 8 分的原因**：
- 硬编码密钥问题从上次到现在**完全没有修复**（-2 分）
- 项目整洁度**没有改善**，反而增加了更多无关文件（-1 分）
- WebSocket CORS、CSP、SSRF 等安全问题仍然存在（-1 分）
- 核心功能（任务管理、AI 团队协作）的实现深度不够，README 描述的功能远超实际代码（-0.5 分）

**总结**：项目在工程化（测试、CI/CD、文档）方面确实进步显著，自评"工程化提升"是合理的。但安全硬伤未解决、项目结构混乱这两大问题不解决，就很难超过 6 分。**把密钥问题和仓库清理搞定，可以到 7 分。**
