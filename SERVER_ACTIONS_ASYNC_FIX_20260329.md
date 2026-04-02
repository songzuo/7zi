# Server Actions `async` 关键字修复报告

**日期**: 2026-03-29
**状态**: ✅ 已修复

## 问题摘要

构建失败，错误信息：

```
Server Actions must be async functions.
```

## 根本原因

`src/lib/websocket/server.ts` 文件包含 `'use server'` 指令，这意味着所有导出的函数都会被视为 Server Actions。但以下三个同步函数缺少 `async` 关键字：

1. `checkUserPermission`
2. `getUserRoomRole`
3. `isUserBannedFromRoom`

## 修复的函数列表

### 1. `checkUserPermission`

**修复前**:

```typescript
export function checkUserPermission(
  userId: string,
  roomId: string,
  permission: Permission
): boolean {
  if (!permissionManager) return false
  return permissionManager.hasPermission(userId, roomId, permission)
}
```

**修复后**:

```typescript
export async function checkUserPermission(
  userId: string,
  roomId: string,
  permission: Permission
): Promise<boolean> {
  if (!permissionManager) return false
  return permissionManager.hasPermission(userId, roomId, permission)
}
```

### 2. `getUserRoomRole`

**修复前**:

```typescript
export function getUserRoomRole(userId: string, roomId: string): UserRole {
  if (!permissionManager) return 'guest'
  return permissionManager.getUserRole(userId, roomId)
}
```

**修复后**:

```typescript
export async function getUserRoomRole(userId: string, roomId: string): Promise<UserRole> {
  if (!permissionManager) return 'guest'
  return permissionManager.getUserRole(userId, roomId)
}
```

### 3. `isUserBannedFromRoom`

**修复前**:

```typescript
export function isUserBannedFromRoom(userId: string, roomId: string): boolean {
  if (!permissionManager) return false
  return permissionManager.isUserBanned(userId, roomId)
}
```

**修复后**:

```typescript
export async function isUserBannedFromRoom(userId: string, roomId: string): Promise<boolean> {
  if (!permissionManager) return false
  return permissionManager.isUserBanned(userId, roomId)
}
```

## 验证结果

### Server Actions 错误 ✅ 已解决

运行 `npm run build` 后，Server Actions 相关的错误已全部消除。

### 剩余问题 ⚠️

构建仍有其他不相关的错误：

- `src/app/sse-demo/page.tsx` 导入了不存在的函数 `useHealthSSE` 和 `useSSE`

这不是 Server Actions 的问题，而是 SSE demo 页面与库导出不匹配的问题。

## 文件变更

| 文件                          | 变更类型 | 说明                               |
| ----------------------------- | -------- | ---------------------------------- |
| `src/lib/websocket/server.ts` | 修改     | 为 3 个导出函数添加 `async` 关键字 |

## 后续建议

1. **SSE Demo 页面**: 需要修复 `src/app/sse-demo/page.tsx` 中的导入问题
2. **架构审查**: 考虑将 WebSocket 服务器与 Server Actions 分离，`'use server'` 指令更适合纯 Server Actions 文件

## 总结

✅ Server Actions `async` 关键字问题已完全修复
✅ 构建可以继续进行（剩余错误与 Server Actions 无关）
