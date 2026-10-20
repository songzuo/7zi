# Rooms API 空字符串名称验证修复报告

**日期**: 2026-10-20  
**问题**: POST /api/rooms 允许创建空字符串名称的房间  
**状态**: ✅ 已修复

## 问题描述

原验证逻辑只检查 `!body.name`，但没有处理以下情况：
- 空格字符串 `"   "` (truthy, 通过验证)
- 制表符/换行字符串 (truthy, 通过验证)
- 仅包含空白字符的字符串

虽然代码使用了 `body.name.trim()`，但验证发生在 trim 之前，导致这些无效名称被接受。

## 修复内容

**文件**: `src/app/api/rooms/route.ts`

**修改前**:
```typescript
if (!body.name || typeof body.name !== 'string') {
  return createBadRequestError('Room name is required')
}
// Create room
const room = roomStore.createRoom({
  ...
  name: body.name.trim(),
```

**修改后**:
```typescript
if (!body.name || typeof body.name !== 'string') {
  return createBadRequestError('Room name is required')
}

// Validate name is not empty after trimming (rejects whitespace-only strings)
const trimmedName = body.name.trim()
if (trimmedName.length === 0) {
  return createBadRequestError('Room name cannot be empty')
}

// Create room
const room = roomStore.createRoom({
  ...
  name: trimmedName,
```

## 验证

- 运行 `npm test -- --run src/app/api/rooms/__tests__/route.test.ts`
- ✅ 4 tests passed

## 修复的边界情况

| 输入 | 原行为 | 修复后 |
|------|--------|--------|
| `""` | ❌ 创建成功 | ✅ 拒绝 (400) |
| `"   "` | ❌ 创建成功 | ✅ 拒绝 (400) |
| `"\t\n"` | ❌ 创建成功 | ✅ 拒绝 (400) |
| `"Valid Name"` | ✅ 创建成功 | ✅ 创建成功 |
| `"  Valid  "` | ✅ 创建成功 (trimmed) | ✅ 创建成功 (trimmed) |
