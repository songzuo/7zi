# 日志系统审计报告

**审计时间:** 2026-10-20 23:38 GMT+2  
**审计范围:** 7zi 项目全栈日志系统  
**审计员:** 咨询师（Consultant）

---

## 1. 现状概览

### 1.1 日志系统组件

| 组件 | 路径 | 状态 | 说明 |
|------|------|------|------|
| **后端 Logger** | `src/lib/logger/index.ts` | ✅ 已实现 | 结构化日志，支持多级别、分类、Sentry 集成、脱敏 |
| **前端 Logger** | `7zi-frontend/src/shared/lib/logger.ts` | ✅ 已实现 | 传输系统（Console/Memory），支持多级别 |
| **WebSocket Logger** | `7zi-backend/websocket/websocket-server.js` | ⚠️ 简化 | 硬编码 console 对象，无结构化 |
| **工作流引擎** | `7zi-backend/workflow-engine/server.js` | ❌ 无日志 | Express 无结构化日志 |
| **调度器日志** | `logs/bot6_scheduler.log` | ⚠️ 文本轮转 | 自定义文本格式，logrotate 配置存在 |
| **审计日志** | `src/lib/audit-log/` | ✅ 已实现 | 文件存储，支持轮转和导出 |

### 1.2 日志实现方式分布

```
后端 Next.js:  console.log + 结构化 logger (src/lib/logger)
前端 Next.js:  console.log + 结构化 logger (shared/lib/logger)
WebSocket:     console.log (自定义简单 logger 对象)
工作流引擎:    无日志 (仅 res.status 错误返回)
调度器:        console.log 写入文件 + logrotate
审计日志:      文件存储 + 缓冲批量写入
```

---

## 2. 日志级别使用分析

### 2.1 后端结构化 Logger (`src/lib/logger/index.ts`)

| 级别 | 实现 | 用途 |
|------|------|------|
| `debug` | ✅ | 开发环境详细输出 |
| `info` | ✅ | 常规业务事件 |
| `warn` | ✅ | 警告（可恢复错误） |
| `error` | ✅ | 错误（需关注） |
| `fatal` | ✅ | 致命错误（进程可能崩溃） |

**优点:**
- 支持 10 种分类：`app`, `api`, `auth`, `db`, `cache`, `perf`, `user`, `system`, `security`, `business`
- 生产环境自动提升最低级别到 `info`
- 集成 Sentry 错误追踪
- 30+ 敏感字段自动脱敏

**使用情况（已采用 logger 的模块）:**
```
src/lib/db/cache.ts
src/lib/db/nplus1-detector.ts
src/lib/db/index-unified.ts
src/lib/db/connection.ts
src/lib/db/batch-operations.ts
src/lib/services/email.ts
src/lib/services/notification.ts
src/lib/multimodal/bailian-provider.ts
src/lib/audit-log/export-service.ts
... (约 30+ 文件)
```

### 2.2 前端 Logger (`7zi-frontend/src/shared/lib/logger.ts`)

| 级别 | 实现 | 输出方式 |
|------|------|----------|
| `debug` | ✅ | `console.log` (青色) |
| `info` | ✅ | `console.log` (绿色) |
| `warn` | ✅ | `console.warn` (黄色) |
| `error` | ✅ | `console.error` (红色) |
| `fatal` | ✅ | `console.error` (品红) |

**问题:** 前端 logger 依赖 `console.*` 最终输出，不是真正的结构化 JSON 日志，难以对接日志聚合服务。

### 2.3 console.log 散落情况

| 区域 | 数量 | 风险等级 |
|------|------|----------|
| Frontend 组件（业务逻辑） | ~80 处 | 🟡 中等 |
| Frontend 组件（demo/example） | ~30 处 | 🟢 低 |
| Scripts 工具 | ~200+ 处 | 🟢 可接受 |
| Backend lib 内部 | ~30 处 | 🟡 中等 |
| WebSocket server | ~20 处 | 🟡 中等 |

**典型问题示例:**
```typescript
// 7zi-frontend/src/app/register/page.tsx:177
console.log('Register submitted:', { email, username, password, plan })
// ^ 明文密码日志 - 已在上次审计中标记但未修复
```

### 2.4 日志级别合理性评估

| 问题 | 位置 | 建议 |
|------|------|------|
| `console.log` 当 `debug` 用 | `src/lib/prefetch/prefetch-provider.tsx` | 改用 `logger.debug()` |
| Workflow engine 无日志 | `7zi-backend/workflow-engine/server.js` | 添加结构化日志 |
| WebSocket 日志过于简单 | `7zi-backend/websocket/websocket-server.js` | 统一使用结构化 logger |

---

## 3. 结构化日志检查

### 3.1 JSON 格式支持

| 组件 | 结构化程度 | 格式 |
|------|-----------|------|
| 后端 Logger | ✅ 完全 | JSON with context, timestamp, category |
| 前端 Logger | ❌ 部分 | 文本格式化，非 JSON |
| WebSocket Logger | ❌ 部分 | `console.log(JSON.stringify())` 手动 JSON |
| Scheduler | ❌ 无 | 纯文本 emoji 日志 |

**后端 Logger 输出示例:**
```json
{
  "level": "error",
  "category": "db",
  "message": "Query timeout",
  "timestamp": "2026-10-20T21:30:00.000Z",
  "data": { "query": "...", "duration": 5000 },
  "context": { "userId": "xxx", "requestId": "yyy" }
}
```

**前端 Logger 输出示例（非 JSON）:**
```
[2026-10-20T21:30:00.000Z] [INFO] User logged in {"userId":"xxx"}
```

### 3.2 敏感数据脱敏

✅ **后端已实现** - 30+ 敏感字段自动脱敏：
- password, token, secret, apiKey
- authorization, cookie, creditCard, ssn
- jwt, bearer, csrfToken, otp, pin
- cardNumber, cvv, cvc 等

❌ **前端未实现** - 前端 logger 无脱敏功能

⚠️ **注册页密码日志** - `7zi-frontend/src/app/register/page.tsx:177` 仍存在明文密码日志（上上次审计已标记）

---

## 4. 日志存储和轮转策略

### 4.1 日志文件分布

```
logs/
├── bot6_scheduler.log          # 调度器日志 (~798KB, 活跃)
├── bot6_scheduler.log.gz       # 压缩旧日志 (~17MB)
├── health-check/               # 健康检查日志
└── sync-botmem.log             # 同步日志 (~1.8KB)

src/lib/audit-log/storage/
├── audit-2026-10.json          # 审计日志
└── export/                     # 导出目录
```

### 4.2 日志轮转配置

**logrotate.conf 配置（用于 /var/log/7zi-frontend/*.log）:**
```
daily              # 每日轮转
rotate 14          # 保留 14 天
compress           # 压缩旧日志
delaycompress      # 延迟压缩
minsize 1M         # 最小 1M 才轮转
maxsize 100M       # 最大 100M 强制轮转
dateformat -%Y%m%d # 日期格式
```

**问题:**
1. `logs/bot6_scheduler.log` 不在 logrotate 管理的 `/var/log/7zi-frontend/` 目录下
2. 调度器日志在 workspace 内，未配置自动轮转
3. 当前 `bot6_scheduler.log.gz` 是手动或外部压缩，不是 logrotate 自动处理

### 4.3 审计日志存储

```typescript
// src/lib/audit-log/storage/file-storage.ts
- 缓冲写入（减少 IO）
- 批量 flush
- 文件轮转支持
- 支持 CSV/JSON 导出
```

### 4.4 存储策略评估

| 方面 | 评分 | 说明 |
|------|------|------|
| 轮转配置 | ⭐⭐⭐ | logrotate 配置存在但未覆盖调度器日志 |
| 压缩策略 | ⭐⭐⭐⭐ | 已配置压缩和延迟压缩 |
| 保留策略 | ⭐⭐⭐ | 14 天保留，审计日志需更长 |
| 存储路径 | ⭐⭐ | workspace 内不适合生产日志 |
| 容量监控 | ❌ | 无自动容量告警 |

---

## 5. 问题汇总

### 🔴 严重

| ID | 问题 | 位置 | 影响 |
|----|------|------|------|
| L-01 | 明文密码日志 | `register/page.tsx:177` | 安全泄露风险 |
| L-02 | 调度器日志无轮转 | `logs/bot6_scheduler.log` | 磁盘空间无限增长 |

### 🟡 中等

| ID | 问题 | 位置 | 影响 |
|----|------|------|------|
| L-03 | 前端 logger 非 JSON 格式 | `shared/lib/logger.ts` | 无法对接日志聚合 |
| L-04 | 前端 logger 无敏感数据脱敏 | `shared/lib/logger.ts` | 潜在信息泄露 |
| L-05 | Workflow engine 无结构化日志 | `workflow-engine/server.js` | 问题难排查 |
| L-06 | console.log 散落 (~130 处) | Frontend 组件 | 调试信息不可控 |
| L-07 | WebSocket logger 简化 | `websocket-server.js` | 不统一 |

### 🟢 建议

| ID | 问题 | 位置 | 影响 |
|----|------|------|------|
| L-08 | 日志无容量监控/告警 | 全部 | 磁盘满前无预警 |
| L-09 | 审计日志保留期短 | `audit-log` | 合规性风险 |
| L-10 | 无统一日志聚合 | 全部 | 分散难以分析 |

---

## 6. 改进建议

### 6.1 立即修复（1-2 天）

1. **修复明文密码日志**
   ```typescript
   // 7zi-frontend/src/app/register/page.tsx:177
   // 改前:
   console.log('Register submitted:', { email, username, password, plan })
   
   // 改后:
   logger.info('User registration attempt', { email, username, plan })
   // 或
   console.log('Register submitted:', { email, username, plan, password: '[HIDDEN]' })
   ```

2. **为调度器日志添加轮转**
   ```bash
   # 在 crontab 或 systemd timer 中配置
   /usr/sbin/logrotate /root/.openclaw/workspace/logrotate.conf
   ```

### 6.2 短期优化（1 周）

1. **前端 logger JSON 化**
   ```typescript
   // 7zi-frontend/src/shared/lib/logger.ts
   // 添加 JSON transport
   export class JSONTransport implements LogTransport {
     log(entry: LogEntry): void {
       console.log(JSON.stringify({
         level: LogLevelNames[entry.level],
         message: entry.message,
         timestamp: entry.timestamp.toISOString(),
         context: entry.context,
       }))
     }
   }
   ```

2. **前端 logger 添加脱敏**
   ```typescript
   // 在 log() 方法中添加
   private sanitize(data: Record<string, unknown>): Record<string, unknown> {
     const sensitiveKeys = ['password', 'token', 'secret', ...]
     // 递归脱敏
   }
   ```

3. **Workflow engine 添加日志**
   ```javascript
   // 使用 winston 或直接使用项目 logger
   const logger = require('../../../src/lib/logger').default;
   ```

### 6.3 中期优化（1 个月）

1. **统一日志格式为 JSON**
2. **配置日志聚合服务**（如 Loki, ELK, Datadog）
3. **添加日志容量监控**
4. **延长审计日志保留期**（合规要求）

### 6.4 长期优化（3 个月）

1. **引入专业日志库**（如 pinojs）
2. **日志链路追踪**（traceId）
3. **实时日志告警**
4. **日志分析 Dashboard**

---

## 7. 行动项优先级

| 优先级 | ID | 行动项 | 负责人 |
|--------|-----|--------|--------|
| P0 | L-01 | 修复明文密码日志 | 前端 |
| P0 | L-02 | 调度器日志轮转 | 运维 |
| P1 | L-03 | 前端 logger JSON 化 | 前端 |
| P1 | L-04 | 前端 logger 脱敏 | 前端 |
| P1 | L-05 | Workflow engine 日志 | 后端 |
| P2 | L-06 | 清理散落 console.log | 前端 |
| P2 | L-07 | WebSocket logger 统一 | 后端 |
| P3 | L-08 | 日志容量监控 | 运维 |
| P3 | L-09 | 审计日志保留期延长 | 合规 |

---

## 8. 总结

| 维度 | 评分 | 说明 |
|------|------|------|
| 日志实现完整性 | ⭐⭐⭐⭐ | 核心 logger 已实现，但覆盖不完整 |
| 结构化程度 | ⭐⭐⭐ | 后端良好，前端需改进 |
| 日志级别规范 | ⭐⭐⭐ | 大体正确，部分滥用 console.log |
| 敏感数据保护 | ⭐⭐⭐ | 后端良好，前端缺失，明文密码待修复 |
| 存储轮转 | ⭐⭐⭐ | 有配置但未全覆盖 |
| 可观测性 | ⭐⭐ | 无统一日志聚合，排查困难 |

**总体评价:** 7zi 项目有结构化日志的基础框架，但存在前端日志质量差、工作流引擎无日志、敏感数据泄露风险、存储轮转不完善等问题。建议按优先级逐步修复，特别是 P0 级别的明文密码日志和调度器日志轮转必须立即处理。
