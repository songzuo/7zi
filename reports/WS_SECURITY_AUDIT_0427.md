# WebSocket 安全审计报告

**审计日期:** 2026-04-27  
**审计对象:** `server/websocket-server.js` (774行) + `server/sentry-ws.js`  
**严重程度等级:** P0 (Critical) > P1 (High) > P2 (Medium)

---

## 🔴 P0 - 严重安全问题

### P0-1: JWT 认证失败后仍允许连接（致命设计缺陷）

**文件:** `server/websocket-server.js`  
**行号:** 232-268 (`authenticateSocket` 函数整体)  
**问题描述:**

当 JWT token 验证**失败时**，代码在 catch 块中创建了一个 demo 用户并调用 `next()`，使无效 token 的连接被接受：

```javascript
// 第 258-268 行
} catch (error) {
  // For demo purposes, accept the connection even with invalid token
  logger.warn('Connection accepted with invalid token (demo mode)', {
    socketId: socket.id,
    error: error.message,
  })

  const demoUserId =
    socket.handshake.auth.userId || `user-${Math.random().toString(36).substr(2, 9)}`
  // ...
  next()  // ❌ 这让攻击者可以用任意身份连接
}
```

**修复建议:**
```javascript
} catch (error) {
  logger.error('Connection rejected: Invalid token', { socketId: socket.id })
  return next(new Error('Authentication failed'))  // 拒绝连接
}
```

---

### P0-2: 无 Token 时也接受连接（认证绕过）

**文件:** `server/websocket-server.js`  
**行号:** 203-219 (`authenticateSocket` 函数中 `if (!token)` 分支)  
**问题描述:**

当连接没有提供任何 token 时，代码创建匿名 demo 用户并允许连接：

```javascript
if (!token) {
  logger.warn('Connection accepted: No token provided (demo mode)', { socketId: socket.id })
  // 创建任意ID的demo用户...
  return next()  // ❌ 任何人无需认证即可连接
}
```

**影响:** 任何人都可以以任意身份（任意 `userId`、`userName`、`email`）连接到 WebSocket 服务器，完全绕过认证。

**修复建议:** 生产环境必须要求有效 JWT token，删除 demo 分支。

---

### P0-3: 硬编码 Fallback JWT Secret

**文件:** `server/websocket-server.js`  
**行号:** 35  
**问题描述:**

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key'
```

如果环境变量未设置，使用了一个公开的默认值。攻击者可以用这个已知 secret 签发任意 JWT token。

**修复建议:**
```javascript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
const JWT_SECRET = process.env.JWT_SECRET
```

---

### P0-4: 用户输入完全未验证（注入风险）

**文件:** `server/websocket-server.js`  
**行号:** 280-300 (`room:join` handler)  
**问题描述:**

`room:join` 事件直接使用客户端传来的 `roomId`、`type`、`documentId`、`name`，没有任何验证：

```javascript
socket.on('room:join', data => {
  const { roomId, type, documentId, name } = data
  // ❌ roomId 可以是任意字符串，包括恶意构造的值
  const room = roomManager.ensureRoom(roomId, type, documentId, name)
  // ...
})
```

**后续所有事件**（`room:leave`、`room:get_users`、`doc:open`、`doc:operation`、`cursor:move`、`presence:typing`）同样直接使用未验证的 `roomId`。

**修复建议:**
```javascript
function validateRoomId(roomId) {
  if (typeof roomId !== 'string') return false
  if (roomId.length > 128) return false
  if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) return false
  return true
}
// 在每个 handler 开头验证
```

---

## 🟠 P1 - 高风险安全问题

### P1-1: 文档操作无权限验证 + 无内容长度限制

**文件:** `server/websocket-server.js`  
**行号:** 343-387 (`doc:operation` handler)  
**问题描述:**

1. **无权限验证:** 任意已连接用户可以对任意 `roomId` 发送操作，只要该 room 存在即可广播到所有用户。攻击者可以向其他用户的 room 注入内容。

```javascript
socket.on('doc:operation', data => {
  const { roomId, operation } = data
  // ❌ 没有验证 socket.data.user 是否有权操作此 room
  const room = roomManager.getRoom(roomId)
  // ...
  socket.to(roomId).emit('doc:operation_applied', operationMessage)  // 广播到所有
})
```

2. **无内容长度限制:** `operation.content` 可以是任意长度，`maxHttpBufferSize: 1e8` (100MB) 允许巨大的 payload。

3. **无操作类型白名单:** `operation.type` 可以是任意值，代码只处理 `insert` 和 `delete`，其他类型被静默忽略。

**修复建议:**
```javascript
// 验证用户属于该 room
if (!room.users.has(user.id)) {
  socket.emit('system:error', { message: 'Unauthorized' })
  return
}
// 限制内容长度
if (operation.content && operation.content.length > 10000) {
  socket.emit('system:error', { message: 'Content too large' })
  return
}
```

---

### P1-2: `cursor:move` / `selection:update` 无权限和范围验证

**文件:** `server/websocket-server.js`  
**行号:** 389-438  
**问题描述:**

```javascript
socket.on('cursor:move', data => {
  const { roomId, position, selection } = data
  // ❌ 未验证 roomId 是否属于用户当前加入的 room
  // ❌ position/selection 未验证类型和范围
  socket.to(roomId).emit('cursor:update', { userId: user.id, ... })
})
```

攻击者可以向任意 room 广播虚假的 cursor 位置，造成干扰或社会工程学攻击。

**修复建议:** 在 broadcast 前验证 `socket.data.rooms.has(roomId)`。

---

### P1-3: 允许连接到自己 `user:${user.id}` 频道

**文件:** `server/websocket-server.js`  
**行号:** 271  
**问题描述:**

```javascript
socket.join(`user:${user.id}`)
```

对于 demo 用户（anonymous），`user.id` 是可预测的（如 `user-abc123`）。攻击者可以订阅所有 `user:*` 频道，潜在地接收本应私密的个人通知。

**修复建议:** 确保只有经过完整 JWT 认证的用户才能 join 私有频道。

---

### P1-4: `/stats` 端点泄露系统信息

**文件:** `server/websocket-server.js`  
**行号:** 500-514  
**问题描述:**

`/stats` HTTP 端点返回所有房间的详细信息，包括房间名称、用户数、活动时间：

```javascript
if (req.url === '/stats') {
  res.end(JSON.stringify({ rooms: rooms, ... }))
}
```

**风险:** 攻击者可以不认证获取整个系统的实时状态，包括房间数量、用户分布等敏感信息。

**修复建议:** 认证此端点或完全移除（`/health` 已足够做健康检查）。

---

## 🟡 P2 - 中等风险 / 最佳实践问题

### P2-1: Heartbeat 超时过长

**文件:** `server/websocket-server.js`  
**行号:** 542-553  
**问题描述:**

```javascript
// 实际检测: 60秒无 heartbeat 才断开
// 但 pingTimeout 配置为 120 秒
```

`pingTimeout: 120000`（120秒）但 heartbeat 检测是 60 秒。Socket.IO 在 120 秒无响应才触发 disconnect 事件，导致无效连接占用资源更长时间。

**修复建议:** 将 `pingTimeout` 调整为 60 秒或更短以匹配检测逻辑。

---

### P2-2: Socket.IO CORS 允许子域名可能导致问题

**文件:** `server/websocket-server.js`  
**行号:** 519  
**问题描述:**

```javascript
cors: {
  origin: ALLOWED_ORIGIN,  // 来自 env，可能允许多个 origin
  credentials: true,
}
```

如果 `NEXT_PUBLIC_SITE_URL` 被配置为允许多个 origin 或通配符，跨域 WebSocket 请求可能被滥用。

**修复建议:** 显式验证 origin 不为通配符。

---

### P2-3: `Math.random()` 用于 ID 生成

**文件:** `server/websocket-server.js`  
**行号:** 210-212, 263-265  
**问题描述:**

Demo 用户的 ID 使用 `Math.random()` 生成，密码学不安全（可预测）。

```javascript
const demoUserId = `user-${Math.random().toString(36).substr(2, 9)}`
```

**修复建议:** 在认证模块中永远不要使用 `Math.random()` 生成 ID，改用 `crypto.randomUUID()`。

---

### P2-4: Room 清理 Timer 内存泄漏风险

**文件:** `server/websocket-server.js`  
**行号:** 113-130 (`scheduleRoomCleanup`)  
**问题描述:**

```javascript
scheduleRoomCleanup(roomId, delay) {
  const existingTimer = this.cleanupTimers.get(roomId)
  if (existingTimer) {
    clearTimeout(existingTimer)  // ✅ 正确清理
  }
  const timer = setTimeout(...)
  this.cleanupTimers.set(roomId, timer)
}
```

虽然代码有清理逻辑，但如果 `roomId` 永远不进入清理条件（反复有用户进出的 room），timer 会持续重新调度。建议在 `rooms` Map 删除时同步清理。

---

### P2-5: Sentry 集成可能泄露敏感上下文

**文件:** `server/sentry-ws.js`  
**行号:** 76-83 (`beforeSend` filter)  
**问题描述:**

```javascript
beforeSend(event, hint) {
  if (event.request?.headers) {
    delete event.request.headers.authorization
    delete event.request.headers.cookie
  }
  return event
}
```

`beforeSend` 只过滤了 request headers，但 WebSocket 消息体中的敏感数据（如 document content、用户输入）可能通过 span attributes 发送到 Sentry。

**修复建议:** 检查 `event.breadcrumbs` 和 span attributes 中的用户数据。

---

## 📊 问题汇总

| ID | 严重度 | 类别 | 位置 | 问题 |
|---|---|---|---|---|
| P0-1 | Critical | 认证 | websocket-server.js:258 | JWT 失败仍接受连接 |
| P0-2 | Critical | 认证 | websocket-server.js:203 | 无 token 接受匿名连接 |
| P0-3 | Critical | 密钥 | websocket-server.js:35 | 硬编码 fallback JWT secret |
| P0-4 | Critical | 注入 | websocket-server.js:280 | 用户输入完全未验证 |
| P1-1 | High | 授权+注入 | websocket-server.js:343 | 文档操作无权限+无内容限制 |
| P1-2 | High | 授权 | websocket-server.js:389 | cursor 事件无权限验证 |
| P1-3 | Medium | 信息泄露 | websocket-server.js:271 | 私有频道访问控制 |
| P1-4 | Medium | 信息泄露 | websocket-server.js:500 | /stats 端点暴露系统状态 |
| P2-1 | Medium | 资源 | websocket-server.js:519 | heartbeat 超时配置不一致 |
| P2-2 | Medium | CORS | websocket-server.js:519 | CORS 配置宽松 |
| P2-3 | Low | 随机性 | websocket-server.js:210 | Math.random() 用于 ID |
| P2-4 | Low | 内存 | websocket-server.js:113 | Timer 清理边界情况 |
| P2-5 | Low | 数据 | sentry-ws.js:76 | Sentry 可能泄露用户数据 |

---

## 🎯 优先修复顺序

1. **立即修复 P0**: 删除 `authenticateSocket` 中的两个 fallback demo 分支（203-219行, 258-268行）；添加 JWT_SECRET 必填检查
2. **其次修复 P0-4 + P1**: 为所有事件 handler 添加 `roomId` 验证；为 `doc:operation` 添加权限检查和内容长度限制
3. **第三修复 P1-3, P1-4**: 移除或认证 `/stats` 端点；限制私有频道 join
4. **最后修复 P2**: 优化超时配置、随机数生成、Sentry filter

---

## 🔧 附录：验证命令

```bash
# 检查硬编码 secret
grep -n "demo-secret-key\|demo-secret\|fallback" server/websocket-server.js

# 检查未验证的 roomId 使用
grep -n "socket.on('room:" server/websocket-server.js

# 检查无 try-catch 包装的事件
grep -n "socket.on(" server/websocket-server.js | grep -v "try {"
```
