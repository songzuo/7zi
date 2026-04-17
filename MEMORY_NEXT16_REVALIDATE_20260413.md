# Next.js 16 revalidateTag 迁移修复文档

**日期**: 2026-04-13  
**问题**: Next.js 16 迁移中 `revalidateTag` API 不兼容  
**状态**: ✅ 已修复

---

## 问题概述

Next.js 16 的 `revalidateTag` API 签名与项目中的使用方式不兼容：

```typescript
// Next.js 16 实际签名
revalidateTag(tag: string, options?: { revalidate?: number | false, keepalive?: number })

// 项目中的错误用法 (route.ts)
revalidateTag(tag, tag)  // ❌ 第二个参数 tag 不是有效 profile

// 项目中可能的正确用法 (actions/revalidate.ts)
revalidateTag('posts', 'max')  // ❌ 'max' 不是有效选项
```

---

## 需要修复的文件

### 1. `src/app/api/revalidate/route.ts` (主要问题)

**当前代码**:
```typescript
revalidateTag(tag, tag)  // POST 和 GET 中都有
```

**问题**: `tag` 作为第二个参数不是有效的 Next.js 16 选项。

**修复方案**:
```typescript
// 选项 A: 省略第二个参数（使用默认行为）
revalidateTag(tag)

// 选项 B: 提供正确的 revalidate 选项
revalidateTag(tag, { revalidate: 3600 })  // 1小时后重新验证
revalidateTag(tag, { revalidate: false })  // 禁用自动重新验证
```

---

### 2. `src/app/actions/revalidate.ts`

**当前代码**:
```typescript
revalidateTag('posts', 'max')
revalidateTag('projects', 'max')
```

**问题**: `'max'` 不是有效的 Next.js 16 cacheLife profile。

**修复方案**:
```typescript
// 方案 A: 单参数（恢复到原始行为）
revalidateTag('posts')
revalidateTag('projects')

// 方案 B: 使用正确的选项对象
revalidateTag('posts', { revalidate: 3600 })   // 1小时
revalidateTag('posts', { keepalive: 60 })      // 保持活跃60秒
revalidateTag('posts', { revalidate: false })  // 不重新验证
```

---

### 3. `src/app/api/revalidate/route_new_api.ts`

**当前代码**:
```typescript
revalidateTag(`user-${userId}`, 'max')
revalidateTag('posts', 'hours')
revalidateTag(`dashboard-${userId}`, 'minutes')
revalidateTag('posts', 'min')
revalidateTag('projects', 'min')
revalidateTag('team', 'min')
```

**问题**: 同样的 `'max'`, `'hours'`, `'minutes'`, `'min'` 不是有效的 profile 值。

**修复方案**: 全部改为单参数或正确的选项对象：
```typescript
revalidateTag(`user-${userId}`)
revalidateTag('posts')
revalidateTag(`dashboard-${userId}`)
revalidateTag('posts')
revalidateTag('projects')
revalidateTag('team')
```

---

### 4. `src/app/api/revalidate/__tests__/new_cache_api.test.ts`

**当前断言**:
```typescript
expect(revalidateTag).toHaveBeenCalledWith('posts')  // 期望单参数
```

**问题**: actions/revalidate.ts 实际调用的是 `revalidateTag('posts', 'max')`，两参数。

**修复方案**: 统一 actions 后更新断言：
```typescript
// 如果 action 使用单参数
expect(revalidateTag).toHaveBeenCalledWith('posts')

// 如果 action 使用选项对象
expect(revalidateTag).toHaveBeenCalledWith('posts', { revalidate: 3600 })
```

---

## 修复优先级

| 文件 | 优先级 | 说明 |
|------|--------|------|
| `route.ts` | 🔴 高 | 生产环境 API，直接报错 |
| `actions/revalidate.ts` | 🔴 高 | Server Actions 被多处调用 |
| `route_new_api.ts` | 🟡 中 | 新 API 参考实现 |
| `new_cache_api.test.ts` | 🟡 中 | 测试需要同步更新 |

---

## 实际修复（已完成）

```bash
# 1. src/app/api/revalidate/route.ts
revalidateTag(tag, tag) → revalidateTag(tag)  # 两处已修复

# 2. src/app/actions/revalidate.ts
revalidateTag('posts', 'max') → revalidateTag('posts')
revalidateTag('projects', 'max') → revalidateTag('projects')
# revalidateAll 中的同样修复

# 3. src/app/api/revalidate/route_new_api.ts
revalidateTag(`user-${userId}`, 'max') → revalidateTag(`user-${userId}`)
revalidateTag('posts', 'hours') → revalidateTag('posts')
revalidateTag(`dashboard-${userId}`, 'minutes') → revalidateTag(`dashboard-${userId}`)
revalidateTag('posts', 'min') → revalidateTag('posts')
revalidateTag('projects', 'min') → revalidateTag('projects')
revalidateTag('team', 'min') → revalidateTag('team')
```

---

## 修复后验证

```bash
# 检查是否还有错误用法（两参数且第二参数是字符串）
grep -rn "revalidateTag.*,.*'" src/app/ --include="*.ts" --include="*.tsx" | grep -v "test.ts"
# 结果: 无输出 ✅

---

## 附：Next.js 16 revalidateTag 正确用法

```typescript
import { revalidateTag } from 'next/cache'

// 基础用法 - 使 tag 缓存失效，下次请求重新获取
revalidateTag('posts')

// 带选项 - 控制重新验证行为
revalidateTag('posts', { 
  revalidate: 3600  // 1小时后可重新验证
})

revalidateTag('posts', { 
  revalidate: false  // 禁止自动重新验证
})

// 注意: Next.js 16 没有 'max', 'min', 'hours', 'minutes' 等 profile
```

---

## 相关文件路径汇总

- `src/app/api/revalidate/route.ts` - API 路由（主要问题）
- `src/app/api/revalidate/route_new_api.ts` - 新 API 参考
- `src/app/actions/revalidate.ts` - Server Actions
- `src/app/api/revalidate/__tests__/new_cache_api.test.ts` - 测试文件
