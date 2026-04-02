# v1.5.0 技术债务清理优先级报告

**分析日期**: 2026-03-30
**分析师**: 📚 咨询师
**版本**: v1.5.0

---

## 📊 执行摘要

| 问题类别               | 当前状态          | 预估影响 |
| ---------------------- | ----------------- | -------- |
| TypeScript 错误        | 1 个错误          | 低       |
| 测试失败               | ~20-30 个测试失败 | 中       |
| PermissionContext 迁移 | ✅ 已完成         | 无       |

**关键发现**:

- 原任务描述的 "120 个测试失败" 和 "~40 个 TypeScript 错误" **已被大幅修复**
- TypeScript 错误从 69 个降至 **1 个** (v1.4.1 完成)
- PermissionContext → Zustand 迁移实际上**已完成**
- 当前测试失败主要是 **环境配置问题** 和 **遗留代码问题**

---

## 🔍 问题分类与根因分析

### 1️⃣ TypeScript 错误 (1 个)

**错误位置**: `src/app/api/auth/me/route.ts:25`

```typescript
// 问题代码
if (user.status === 'deleted') {  // TS2367: 类型无重叠
```

**根因**: `UserStatus` 枚举缺少 `DELETED` 成员

**当前枚举值**:

```typescript
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  // 缺少: DELETED = 'deleted'
}
```

**修复方案**: 在 `UserStatus` 枚举中添加 `DELETED = 'deleted'`

**预估工时**: 5 分钟 (Quick Win!)

**优先级**: 🔴 P0 - 阻塞构建

---

### 2️⃣ 测试失败分析

从测试输出中识别出以下失败类别：

#### A. CollaborationManager 测试 (6 个失败)

**失败模式**:

```
No "CollaborationManager" export is defined on the "../lib/collaboration/manager" mock
```

**根因**: vi.mock() 未正确返回 `CollaborationManager` 导出

- 测试文件: `src/lib/collaboration/manager.test.ts`
- 可能是模块导出结构变更后测试未同步更新

**修复方案**: 更新 mock 工厂函数，确保返回正确的导出

**预估工时**: 30 分钟

**优先级**: 🟡 P1

---

#### B. TeamPage SSR 测试 (14 个失败)

**失败模式**:

```
document is not defined
```

**根因**: 在 SSR 环境中访问 `document` 对象

- 测试文件: `src/app/[locale]/team/page.test.tsx`
- 缺少必要的 DOM 环境 mock

**修复方案**:

1. 添加 `global.document` mock
2. 或将测试标记为客户端测试

**预估工时**: 20 分钟

**优先级**: 🟡 P1

---

#### C. user-preferences 数据库测试 (~30 个失败)

**失败模式**:

```
Database exec failed: no such table: user_preferences
Database exec failed: The supplied SQL string contains more than one statement
```

**根因**:

1. 测试数据库未初始化 `user_preferences` 表
2. SQL 语句包含多条语句（需要拆分或使用 batch 执行）

**修复方案**:

1. 在测试 setup 中添加表初始化
2. 修改 SQL 执行方式

**预估工时**: 1 小时

**优先级**: 🟡 P1

---

### 3️⃣ PermissionContext → Zustand 迁移

**状态**: ✅ **已完成**

**实际情况**:

- `src/contexts/PermissionContext.tsx` 已是 Zustand 的兼容包装层
- 实际状态管理在 `src/stores/permissionStore.ts`
- 所有导出都是对 Zustand store 的引用

**无需进一步迁移工作**

---

### 4️⃣ 其他发现

#### PermissionContext 类型定义重复

发现 **3 个不同位置** 定义了 `PermissionContext` 接口:

1. `src/lib/permissions.ts`
2. `src/features/auth/lib/permissions.ts`
3. `src/features/websocket/room/permission-manager.ts`

**建议**: 统一到一个 shared types 文件

**预估工时**: 1 小时

**优先级**: 🟢 P2

---

## ✅ Quick Wins (可快速修复)

| 修复项                         | 预估工时    | 预期收益             |
| ------------------------------ | ----------- | -------------------- |
| 添加 UserStatus.DELETED        | 5 分钟      | 消除 TypeScript 错误 |
| CollaborationManager mock 修复 | 30 分钟     | 6 个测试通过         |
| TeamPage SSR 环境 mock         | 20 分钟     | 14 个测试通过        |
| **总计**                       | **~1 小时** | **21+ 测试通过**     |

---

## 📋 修复优先级排序

### 🔴 P0 - 阻塞级 (立即修复)

| #   | 问题                        | 预估工时 | 影响         |
| --- | --------------------------- | -------- | ------------ |
| 1   | UserStatus 枚举缺少 DELETED | 5 分钟   | 1 个 TS 错误 |

### 🟡 P1 - 重要 (本周修复)

| #   | 问题                      | 预估工时 | 影响       |
| --- | ------------------------- | -------- | ---------- |
| 2   | CollaborationManager mock | 30 分钟  | 6 个测试   |
| 3   | TeamPage SSR 测试         | 20 分钟  | 14 个测试  |
| 4   | user-preferences DB 测试  | 1 小时   | ~30 个测试 |

### 🟢 P2 - 优化 (可延后)

| #   | 问题                                 | 预估工时 | 影响     |
| --- | ------------------------------------ | -------- | -------- |
| 5   | PermissionContext 类型统一           | 1 小时   | 代码质量 |
| 6   | 删除 PermissionContext 兼容层 (可选) | 2 小时   | 减少代码 |

---

## 📊 预期修复后状态

| 指标            | 当前 | 修复后 | 变化        |
| --------------- | ---- | ------ | ----------- |
| TypeScript 错误 | 1    | 0      | -100% ✅    |
| 测试失败        | ~50  | ~0-10  | -80-100% ✅ |
| 测试覆盖率      | ~94% | ~98%   | +4%         |

---

## 🛠️ 建议行动计划

### 第一步 (5 分钟)

```bash
# 添加缺失的 DELETED 状态到 UserStatus 枚举
# 文件: src/lib/auth/types.ts
```

### 第二步 (30 分钟)

```bash
# 修复 CollaborationManager 测试
# 文件: src/lib/collaboration/manager.test.ts
```

### 第三步 (20 分钟)

```bash
# 修复 TeamPage SSR 测试的 document mock
# 文件: src/app/[locale]/team/page.test.tsx
```

### 第四步 (1 小时)

```bash
# 修复 user-preferences 数据库测试
# 文件: src/lib/db/__tests__/user-preferences.test.ts
```

---

## 📝 备注

1. **任务描述差异**: 原任务提到 "120 个测试失败" 和 "~40 个 TypeScript 错误"，实际当前状态已大幅改善。这可能是基于旧数据的估计。

2. **PermissionContext 迁移状态**: 经过代码审查，PermissionContext → Zustand 迁移实际上已在 v1.4.1/v1.5.0 开发周期中完成。无需额外迁移工作。

3. **测试稳定性**: 当前测试失败主要是环境配置和 mock 问题，不是代码逻辑问题，修复相对简单。

---

**报告完成**
