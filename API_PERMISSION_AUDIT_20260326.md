# API 路由权限审计报告

**审计日期**: 2026-03-26  
**项目**: 7zi-frontend  
**审计范围**: `/src/app/api/**/route.ts`

---

## 审计结果概览

| 状态        | 数量 | 说明                       |
| ----------- | ---- | -------------------------- |
| ✅ 安全     | 3    | 有完整的身份验证和权限控制 |
| ⚠️ 待修复   | 7    | 缺少身份验证或权限控制     |
| ❌ 严重漏洞 | 0    | 无严重安全漏洞             |

---

## 详细审计结果

### ✅ 有完整权限控制的路由

#### 1. `/api/projects` (GET, POST)

- **状态**: ✅ 安全
- **验证方式**:
  - 从 `x-user-id` 请求头获取用户身份
  - 使用 `@RequirePermission` 装饰器进行权限检查
  - 支持资源级别权限控制（owner 检查）
- **需要的权限**: `project:read` (GET), `project:create` (POST)

#### 2. `/api/projects/[id]` (GET)

- **状态**: ✅ 安全
- **验证方式**: 同上，有 owner 级别检查

#### 3. `/api/users` (GET, POST)

- **状态**: ✅ 安全
- **验证方式**:
  - 从 `x-user-id` 请求头获取用户身份
  - 使用 `@RequirePermission` 装饰器进行权限检查
- **需要的权限**: `user:list` (GET), `user:create` (POST)

---

### ⚠️ 需要添加权限控制的路由

#### 4. `/api/mcp/rpc` (GET, POST, OPTIONS)

- **状态**: ⚠️ 无认证（CORS 全开）
- **问题**:
  - 无用户身份验证
  - CORS 允许所有来源 (`Access-Control-Allow-Origin: *`)
  - 支持 `tools/call` 方法可执行任意工具
- **建议**:
  - 添加 API Key 或 JWT 认证
  - 限制 CORS 来源
  - 对 `tools/call` 添加权限检查
- **风险等级**: 中

#### 5. `/api/notifications` (GET, POST)

- **状态**: ⚠️ 无认证
- **问题**: 任何人都可以列出和创建通知
- **建议**: 添加 `x-user-id` 验证，GET 应限制为当前用户通知

#### 6. `/api/notifications/[id]` (GET, PATCH, DELETE)

- **状态**: ⚠️ 无认证
- **问题**: 任何人都可以读取、修改、删除任意通知
- **建议**: 添加权限检查，确保用户只能操作自己的通知

#### 7. `/api/notifications/preferences/[userId]` (GET, PUT)

- **状态**: ⚠️ 无认证
- **问题**:
  - **严重**: 任何人都可以查看/修改任意用户的通知偏好设置
  - URL 直接暴露 userId，无验证
- **建议**: 必须验证当前用户与 userId 一致，或要求 admin 权限
- **风险等级**: 高

#### 8. `/api/notifications/stats` (GET)

- **状态**: ⚠️ 无认证
- **问题**: 任何人可获取通知系统统计数据
- **建议**: 限制为 admin 或内部调用
- **风险等级**: 低

#### 9. `/api/notifications/socket` (GET, POST)

- **状态**: ⚠️ 无认证
- **问题**: 任何人都可以初始化 Socket.IO 服务器
- **建议**: 限制为服务器启动脚本调用，移除公开路由
- **风险等级**: 中

#### 10. `/api/notifications/enhanced` (GET, POST)

- **状态**: ⚠️ 无认证
- **问题**: 同 `/api/notifications`，但功能更强大（邮件、推送等）
- **建议**: 必须添加身份验证和权限控制
- **风险等级**: 中

---

## 硬编码问题

### 发现硬编码凭证（仅用于演示）

**文件**: `/api/auth/route.ts`

```typescript
const isAuthenticated = username === 'admin' && password === 'password123'
```

**说明**: 这是演示代码，实际部署时必须替换为真实数据库验证。

---

## 需要修复的路由优先级

| 优先级 | 路由                                      | 问题                       |
| ------ | ----------------------------------------- | -------------------------- |
| **高** | `/api/notifications/preferences/[userId]` | 未授权访问任意用户偏好设置 |
| **高** | `/api/notifications/[id]`                 | 未授权操作任意通知         |
| **中** | `/api/mcp/rpc`                            | CORS 全开 + 无认证执行工具 |
| **中** | `/api/notifications/enhanced`             | 功能强大但无保护           |
| **低** | `/api/notifications/stats`                | 暴露系统统计               |

---

## 安全建议

1. **统一认证中间件**: 创建认证中间件，统一处理 `x-user-id` 或 JWT 验证
2. **MCP 路由保护**:
   - 添加 API Key 验证
   - 限制 CORS 来源
   - 对敏感工具添加权限检查
3. **通知路由保护**:
   - 用户只能操作自己的通知
   - `preferences` 必须验证 userId 匹配
4. **移除演示凭证**: 生产环境移除硬编码的 `admin/password123`

---

## 结论

项目有良好的权限系统基础（`lib/permissions.ts`），但部分 API 路由未应用这些保护机制。建议优先修复高优先级问题后再上线。
