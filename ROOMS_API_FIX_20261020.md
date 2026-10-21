# Rooms API 空字符串名称验证修复报告

**日期**: 2026-10-20  
**状态**: ✅ 已完成  
**修复文件**: `7zi-frontend/src/app/api/rooms/route.ts`  
**测试文件**: `7zi-frontend/src/app/api/rooms/__tests__/route.test.ts`

---

## 问题描述

POST `/api/rooms` API 允许使用空字符串名称创建房间，缺少输入验证。

## 修复内容

### 1. 验证逻辑 (route.ts)

在 `POST /api/rooms` handler 中添加了以下验证（第 97-107 行）:

```typescript
// Validate required fields
if (!body.name || typeof body.name !== 'string') {
  return createBadRequestError('Room name is required')
}

// Validate name is not empty after trimming (rejects whitespace-only strings)
const trimmedName = body.name.trim()
if (trimmedName.length === 0) {
  return createBadRequestError('Room name cannot be empty')
}
```

**验证规则**:
- 检查 name 字段是否存在且为字符串
- 使用 `trim()` 去除首尾空白
- 空字符串或仅空白字符返回 400 错误

### 2. 测试用例 (route.test.ts)

新增 9 个测试用例覆盖各种场景:

| 测试用例 | 输入 | 期望结果 |
|---------|------|---------|
| 空字符串名称 | `""` | 400 Bad Request |
| 仅空白字符 | `"   "` | 400 Bad Request |
| Tab/换行空白 | `"\t\n  \t"` | 400 Bad Request |
| 首尾带空格 | `"  Valid Name  "` | 201 Created (自动 trim) |
| 正常名称 | `"Valid Room"` | 201 Created |
| 缺少 name 字段 | `{}` | 400 Bad Request |
| null 名称 | `{name: null}` | 400 Bad Request |
| 返回数据验证 | 有效请求 | 包含 id/name/inviteCode/createdAt |
| 列表获取 | GET 请求 | 200 OK |

### 3. 测试结果

```
✓ src/app/api/rooms/__tests__/route.test.ts (9 tests)
  ✓ Room API > POST /api/rooms - Name Validation (7 tests)
  ✓ Room API > POST /api/rooms - Successful Creation (1 test)
  ✓ Room API > GET /api/rooms (1 test)

Test Files: 1 passed
Tests: 9 passed
```

---

## 验证测试用例

| 输入 | 输出 | 说明 |
|------|------|------|
| `""` | 400 Bad Request | ✅ 空字符串被拒绝 |
| `" "` | 400 Bad Request | ✅ 空白字符被拒绝 |
| `"Valid Name"` | 201 Created | ✅ 正常创建 |
| `"  Room  "` | 201 Created | ✅ 首尾空格被自动去除 |

---

## 结论

验证逻辑已正确实现，所有测试用例通过。API 现在会正确拒绝空字符串和仅包含空白字符的房间名称。
