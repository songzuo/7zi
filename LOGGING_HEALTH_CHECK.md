# 日志系统健康检查报告

**检查时间:** 2026-05-12 02:12 GMT+2  
**检查范围:** `/root/.openclaw/workspace/src`, `/root/.openclaw/workspace/7zi-frontend/src`, `/root/.openclaw/workspace/scripts`

---

## 1. 现状概览

### 结构化日志库状态
✅ **已实现** - `src/lib/logger/index.ts`

- 支持级别: `debug`, `info`, `warn`, `error`, `fatal`
- 支持分类: `api`, `auth`, `db`, `cache`, `perf`, `user`, `security`, `business`
- 集成 Sentry 错误追踪
- 自动数据脱敏 (password, token, secret, apiKey 等 30+ 字段)
- 生产环境自动限制错误详情输出

---

## 2. 问题清单

### 🔴 高风险

| 文件 | 行号 | 问题 | 严重度 |
|------|------|------|--------|
| `7zi-frontend/src/app/register/page.tsx` | 177 | `console.log('Register submitted:', { email, username, password, plan })` - **明文密码日志** | 🔴 严重 |
| `7zi-frontend/src/app/register/page.tsx` | 179 | `console.error('Registration error:', error)` - 错误可能包含敏感数据 | 🟡 中等 |

### 🟡 中等风险 (console.log 散落在各处)

**Frontend 实际代码 (非 demo/example):**
| 文件 | 风险 |
|------|------|
| `7zi-frontend/src/app/mobile-optimization-v1130/page.tsx` | UI 事件调试日志 (可接受) |
| `7zi-frontend/src/app/dashboard/page.tsx` | 房间创建日志 |
| `7zi-frontend/src/app/pricing/page.tsx` | Email 提交日志 |
| `7zi-frontend/src/components/onboarding/OnboardingProvider.tsx` | 房间创建/邀请日志 |
| `7zi-frontend/src/components/ui/EmptyState.tsx` | JSDoc 示例代码 |

**Backend/Utility 代码:**
| 文件 | 行数 | 说明 |
|------|------|------|
| `src/lib/audit-log/audit-log.ts` | 4 | 审计日志 flush 失败 |
| `src/lib/audit-log/storage/file-storage.ts` | 2 | 文件操作错误 |
| `src/lib/audit-log/signature-handler.ts` | 1 | 签名验证警告 |
| `src/lib/prefetch/prefetch-provider.tsx` | 7 | 预取状态日志 |
| `src/lib/prefetch/user-behavior.ts` | 2 | 用户行为保存失败 |
| `src/lib/performance-optimization.ts` | 3 | 性能测量日志 |

**Scripts (开发工具):**
| 文件 | console.log 数量 |
|------|-----------------|
| `scripts/migrate-to-multi-tenant.ts` | ~50 |
| `scripts/performance-demo.ts` | ~40 |
| `scripts/archive/audit-routes.ts` | ~30 |
| `scripts/run-test-groups.js` | ~15 |

---

## 3. 敏感信息泄露风险报告

### 🔴 已确认泄露

**位置:** `7zi-frontend/src/app/register/page.tsx:177`
```typescript
console.log('Register submitted:', { email, username, password, plan })
```
**风险:** 用户注册时密码以明文形式输出到控制台，任何能访问日志的人都能看到用户密码。

**影响:** 
- 开发环境: 开发者能看到用户测试密码
- 生产环境: 如果 logs 被持久化或发送到日志服务，密码会泄露

**建议修复:**
```typescript
// 替换为
logger.info('User registration attempt', { email, username, plan });
// 或
console.log('Register submitted:', { email, username, plan: '[REDACTED]' });
```

---

## 4. 敏感信息泄露检查结果

| 检查项 | 结果 |
|--------|------|
| 密码在 console.log 中 | ✅ 仅 1 处 (已标记) |
| Token 在 console.log 中 | ✅ 未发现 |
| API Key 在 console.log 中 | ✅ 未发现 |
| JWT 在 console.log 中 | ✅ 未发现 |
| 用户个人数据泄露 | ✅ 未发现 |

---

## 5. 日志级别使用检查

### ✅ 正确使用
- `console.error` 用于错误/异常
- `console.warn` 用于警告
- `console.log` 用于信息输出

### ⚠️ 可改进
| 文件 | 问题 |
|------|------|
| `src/lib/prefetch/prefetch-provider.tsx:142` | `console.log('[PrefetchProvider] Initialized')` 应为 debug |
| `src/lib/performance-optimization.ts:359` | `console.log` 应为 debug |

---

## 6. 改进建议

### 短期 (立即修复)

1. **移除注册页密码日志**
   ```bash
   # 或将其改为
   console.log('Register submitted:', { email, username, plan: '[HIDDEN]' })
   ```

2. **统一 scripts 中的日志使用**
   - Scripts 可继续使用 console.log (工具脚本)
   - 建议标注 "dev-only"

### 中期 (1-2 周)

1. **将 frontend 组件中的调试日志迁移到 logger**
   ```typescript
   import { logger } from '@/lib/logger';
   
   // 替换 console.log('xxx')
   logger.debug('Room created', { roomName: data.roomName });
   ```

2. **为 Sentry 配置敏感数据过滤规则**
   - 确保即使错误对象包含敏感信息也不会发送

3. **添加 ESLint 规则**
   ```json
   {
     "no-console": ["error", { "allow": ["warn", "error"] }]
   }
   ```

### 长期 (架构优化)

1. **考虑使用专业日志库**
   - 现有 `src/lib/logger` 已实现核心功能
   - 可考虑添加: 日志轮转 (logrotate)、远程日志聚合

2. **统一日志格式**
   - 全部结构化 JSON 输出
   - 便于日志分析和监控

3. **添加日志监控告警**
   - 错误率阈值告警
   - 敏感操作审计日志

---

## 7. 检查覆盖率

| 类型 | 文件数 |
|------|--------|
| TypeScript/TSX 源文件 | 5,294 |
| 使用 console.log 的文件 | ~40 |
| 使用结构化 logger 的文件 | ~20 |

---

## 8. 总结

| 类别 | 评分 | 说明 |
|------|------|------|
| 结构化日志覆盖 | ⭐⭐⭐⭐ | 核心库已实现，backend 使用良好 |
| 敏感数据保护 | ⭐⭐ | 有 1 处密码泄露，需立即修复 |
| 日志级别规范 | ⭐⭐⭐ | 大体正确，偶有 debug 当 info 用 |
| Scripts 工具日志 | ⭐⭐⭐⭐ | 可接受，工具脚本无需强制规范 |

**行动优先级:**
1. 🔴 **立即修复** - `register/page.tsx` 密码日志
2. 🟡 **本周修复** - frontend 组件调试日志改用 logger.debug
3. 🟢 **可选优化** - 添加 ESLint no-console 规则