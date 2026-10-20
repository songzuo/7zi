# 7zi-frontend 测试回归检查报告

**日期**: 2026-03-30 02:05 GMT+2

## 📊 测试结果摘要

| 指标            | 数量                                  |
| --------------- | ------------------------------------- |
| 总测试文件      | 75 (29 失败 / 45 通过 / 1 跳过)       |
| 总测试用例      | 1681 (113 失败 / 1555 通过 / 13 跳过) |
| 测试时长        | 72.10s                                |
| TypeScript 编译 | ❌ 失败 (9 个错误)                    |

## 🔴 失败的测试文件 (29 个)

### 主要失败类别

#### 1. 模块缺失问题 (MODULE_NOT_FOUND)

- `src/components/notifications/__tests__/NotificationProvider.test.tsx` - 缺少 `@/hooks/useNotifications`
- `src/app/api/search/__tests__/route.test.ts` - 缺少 `@/middleware/auth.middleware`

#### 2. API 路由测试失败 (返回 500/401 而非预期状态码)

- `src/app/api/auth/__tests__/route.test.ts` - 11 个失败
- `src/app/api/feedback/__tests__/route.test.ts` - 17 个失败
- `src/app/api/projects/__tests__/route.test.ts` - 6 个失败
- `src/app/api/data/import/__tests__/route.test.ts` - 2 个失败
- `src/app/api/feedback/response/__tests__/route.test.ts` - 1 个失败

#### 3. WebSocket 集成测试失败

- `src/features/websocket/__tests__/integration.test.ts` - 3 个失败
  - 权限验证不正确
  - 离线消息同步问题
  - 未读消息计数问题

#### 4. WebSocket Manager 单元测试失败

- `src/lib/__tests__/websocket-manager.test.ts` - 5 个失败
  - 心跳监控
  - 指数退避重连
  - 消息处理

#### 5. 通知服务增强测试失败

- `src/lib/services/__tests__/notification-enhanced.test.ts` - 8 个失败
  - 邮件通知偏好设置
  - 优先级阈值过滤
  - 安静时段检测

#### 6. 其他测试失败

- `src/components/notifications/__tests__/NotificationProvider.test.tsx` - 7 个失败
- `src/lib/i18n/__tests__/client.test.ts` - 1 个失败

## 🔴 TypeScript 编译错误 (9 个)

### 错误详情

1. **src/lib/api/error-handler.ts (5 处)**
   - `unknown` 类型不能赋值给 `Error | undefined`
   - 第 215, 217, 220, 223, 225 行

2. **src/lib/websocket-manager.ts (2 处)**
   - `unknown` 类型不能赋值给 `Error | undefined`
   - 第 582, 584 行

3. **src/middleware.ts (3 处)**
   - `Promise<JWTPayload>` 上不存在 `userId`、`username`、`role` 属性
   - 可能缺少 `await`

4. **src/shared/components/DynamicIcon.tsx (1 处)**
   - `ref` 类型不兼容

5. **src/shared/index.ts (1 处)**
   - 重复导出 `sanitizeHtml`

6. **src/shared/lib/validation-schemas.ts (2 处)**
   - ZodError 类型问题

## 📋 建议修复优先级

### 高优先级 (阻塞 CI/CD)

1. **TypeScript 编译错误** - 必须修复才能通过严格模式编译
   - 修复 `unknown` 类型断言问题
   - 检查 `middleware.ts` 中是否缺少 `await`
   - 解决 `sanitizeHtml` 重复导出

### 中优先级

2. **模块缺失问题**
   - 创建缺失的 `@/hooks/useNotifications` 模块
   - 创建缺失的 `@/middleware/auth.middleware` 模块

3. **API 路由测试**
   - 检查 API 错误处理返回正确的状态码
   - 修复认证中间件问题

### 低优先级

4. **WebSocket 功能测试**
   - 检查权限验证逻辑
   - 修复离线消息同步功能
   - 修复未读消息计数

5. **通知服务测试**
   - 检查邮件通知偏好设置逻辑
   - 修复安静时段检测

## ✅ 通过的测试模块

以下模块测试全部通过，表明其功能稳定：

- `src/lib/services/__tests__/notification.test.ts` (28 tests)
- `src/lib/mcp/__tests__/server.test.ts` (29 tests)
- `src/lib/__tests__/validation-schemas.test.ts` (35 tests)
- `src/lib/performance-monitoring/` 相关测试
- `src/features/mcp/lib/__tests__/server.test.ts` (29 tests)
- `src/features/websocket/room/__tests__/room-manager.test.ts` (18 tests)
- `src/test/seo/seo-schema.test.tsx` (20 tests)

## 📝 总结

最近的 TypeScript 修复和错误处理改进引入了一些回归问题：

1. **类型安全问题**: `unknown` 类型处理不当导致 9 个编译错误
2. **模块依赖问题**: 缺少 `useNotifications` 和 `auth.middleware` 模块
3. **API 错误处理**: 返回状态码不符合预期，可能是验证逻辑变更导致

建议先修复 TypeScript 编译错误，确保构建可以通过，然后再逐步修复测试失败。

---

_报告生成时间: 2026-03-30 02:07 GMT+2_
