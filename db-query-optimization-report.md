# 7zi-Project 数据库查询性能优化报告

**日期**: 2026-03-21
**检查范围**: `src/lib/db/`、`src/lib/repositories/`、`src/app/api/`
**分析工具**: 代码审查 + N+1 查询检测 + 索引分析

---

## 执行摘要

本次检查发现了 **3 个严重的 N+1 查询问题**，主要影响用户批量操作 API。这些问题可能导致：
- 单个请求执行 100+ 次数据库查询
- 响应时间增加 10-100 倍
- 数据库连接池耗尽
- 高并发时系统崩溃

**严重等级**: 🔴 高危

---

## 发现的性能问题

### 🔴 问题 1: 用户批量获取 API 中的 N+1 查询

**位置**: `/src/app/api/users/batch/route.ts` - GET 端点

**问题描述**:
```typescript
// 当前实现 - N+1 问题
const users = await Promise.all(
  ids.map(async (id) => {
    try {
      const user = await getUserById(id);  // ❌ 每个ID执行一次查询
      return user ? { id, user, error: null } : { id, user: null, error: 'User not found' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { id, user: null, error: errorMsg };
    }
  })
);
```

**性能影响**:
- 请求 100 个用户 = **100 次单独查询**
- 每次查询约 1-5ms，总耗时 **100-500ms**
- 数据库连接被长时间占用

**优化方案**:
```typescript
// 优化后 - 使用 IN 子句批量查询
export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const db = await getDatabaseAsync();
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`);
  return stmt.all(...ids) as User[];
}

// 在 route.ts 中使用
const users = await getUsersByIds(ids);
const userMap = new Map(users.map(u => [u.id, u]));
const results = ids.map(id => ({
  id,
  user: userMap.get(id) || null,
  error: userMap.has(id) ? null : 'User not found'
}));
```

**预期改进**:
- 查询次数：100 → **1**
- 响应时间：100-500ms → **5-20ms**
- 性能提升：**20-100x**

---

### 🔴 问题 2: 用户批量创建 API 中的 N+1 查询

**位置**: `/src/app/api/users/batch/route.ts` - POST 端点

**问题描述**:
```typescript
// 当前实现 - N+1 问题
const existingEmails = await Promise.all(
  emails.map(async (email) => {
    const existing = await getUserByEmail(email);  // ❌ 每个邮件执行一次查询
    return existing ? email : null;
  })
);
```

**性能影响**:
- 批量创建 50 个用户 = **50 次重复邮件检查**
- 总耗时 **50-250ms**

**优化方案**:
```typescript
// 优化后 - 批量检查重复邮件
export async function checkExistingEmails(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const db = await getDatabaseAsync();
  const placeholders = emails.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT email FROM users WHERE email IN (${placeholders})`);
  const results = stmt.all(...emails) as Array<{ email: string }>;
  return results.map(r => r.email);
}

// 在 route.ts 中使用
const duplicateEmails = await checkExistingEmails(emails);
if (duplicateEmails.length > 0) {
  return NextResponse.json({
    success: false,
    error: {
      code: 'EMAIL_EXISTS',
      message: 'Some email addresses already exist',
      details: duplicateEmails,
    }
  }, { status: 409 });
}
```

**预期改进**:
- 查询次数：50 → **1**
- 响应时间：50-250ms → **5-15ms**
- 性能提升：**10-50x**

---

### 🔴 问题 3: 用户批量更新/删除 API 中的 N+1 查询

**位置**:
- `/src/app/api/users/batch/route.ts` - PATCH/DELETE 端点
- `/src/app/api/users/batch/bulk/route.ts` - POST 端点

**问题描述**:
```typescript
// PATCH 端点 - N+1 问题
const results = await Promise.all(
  updates.map(async (update: any, index: number) => {
    try {
      const { id, ...updateData } = update;
      const updated = await updateUser(id, updateData);  // ❌ 每个ID执行一次 UPDATE
      return { index, id, user: updated, error: !updated ? 'User not found' : null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { index, id: update.id, user: null, error: errorMsg };
    }
  })
);

// bulk/route.ts - N+1 问题
const userChecks = await Promise.all(
  uniqueUserIds.map(async (userId) => {
    const user = await getUserById(userId);  // ❌ 每个ID执行一次查询
    return { userId, exists: !!user, user };
  })
);
```

**性能影响**:
- 批量更新 100 个用户 = **100 次 UPDATE 查询**
- 批量删除 100 个用户 = **100 次 DELETE 查询**

**优化方案**:
```typescript
// 批量更新优化
export async function batchUpdateUsers(updates: Array<{ id: string; data: Partial<User> }>) {
  if (updates.length === 0) return [];

  const db = await getDatabaseAsync();

  // 使用事务批量更新
  const stmt = db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        avatar = COALESCE(?, avatar),
        role = COALESCE(?, role),
        status = COALESCE(?, status),
        updated_at = ?
    WHERE id = ?
  `);

  const results: Array<{ id: string; success: boolean }> = [];

  const updateTransaction = db.transaction((updates) => {
    for (const { id, data } of updates) {
      try {
        const result = stmt.run(
          data.name,
          data.avatar,
          data.role,
          data.status,
          new Date().toISOString(),
          id
        );
        results.push({ id, success: result.changes > 0 });
      } catch (error) {
        results.push({ id, success: false });
      }
    }
  });

  updateTransaction(updates);
  return results;
}

// 批量删除优化
export async function batchDeleteUsers(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const db = await getDatabaseAsync();
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`);
  const result = stmt.run(...ids);
  return result.changes;
}
```

**预期改进**:
- 查询次数：100 → **1 个事务**
- 响应时间：100-500ms → **10-50ms**
- 性能提升：**10-50x**

---

### 🟡 问题 4: 备份 API 中的冗余 COUNT 查询

**位置**: `/src/app/api/backup/route.ts`

**已优化**: 代码已经移除了冗余的 COUNT 查询，改用数组长度计算记录数。

```typescript
// 优化前（已修复）
// const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
// recordCounts[table] = countResult[0].count;

// 优化后（当前代码）
const tableData = await db.query(`SELECT * FROM ${table}`);
backupData[table] = Array.isArray(tableData) ? tableData : [];
recordCounts[table] = Array.isArray(tableData) ? tableData.length : 0;  // ✅ 使用数组长度
```

**状态**: ✅ 已优化

---

## 索引使用情况分析

### ✅ 现有索引（良好）

从 `src/lib/auth/repository.ts` 中发现已经定义了以下索引：

```typescript
-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);           -- ✅ 邮箱唯一查询
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);           -- ✅ 状态过滤
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);               -- ✅ 角色过滤
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC); -- ✅ 排序

-- 令牌表索引
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires ON user_tokens(expires_at);
```

### ✅ 智能体表索引（良好）

从 `src/lib/agents/repository.ts` 中发现已经优化了索引：

```typescript
-- 智能体表索引
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(provider);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_last_active ON agents(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);  -- API key 认证索引

-- 复合索引（优秀）
CREATE INDEX IF NOT EXISTS idx_agents_status_provider ON agents(status, provider);

-- 数据访问记录复合索引
CREATE INDEX IF NOT EXISTS idx_agent_data_access_agent_timestamp ON agent_data_access(agent_id, timestamp DESC);
```

### ✅ RBAC 表索引（良好）

从 `src/lib/permissions/repository.ts` 中发现：

```typescript
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);
```

**索引使用结论**: ✅ **索引设计良好，覆盖了主要查询场景**

---

## 现有优化工具

### ✅ N+1 查询检测器

`src/lib/db/nplus1-detector.ts` 提供了完善的 N+1 查询检测功能：

- 自动检测重复查询模式
- 生成优化建议
- 支持批量查询生成
- Eager loading 辅助函数

**建议**: 在开发环境启用此检测器。

### ✅ 性能分析器

`src/lib/db/performance-analyzer.ts` 提供了：
- 慢查询检测
- 索引使用分析
- 表结构分析
- EXPLAIN QUERY PLAN 支持

### ✅ 批量操作工具

`src/lib/db/batch-operations.ts` 提供了批量插入、更新、删除功能。

### ✅ 缓存系统

`src/lib/db/cache.ts` 提供了查询结果缓存，可减少重复查询。

---

## 优化建议

### 优先级 1 (立即实施)

1. **修复用户批量获取 API 的 N+1 查询**
   - 添加 `getUsersByIds()` 函数到 `src/lib/auth/repository.ts`
   - 更新 `/src/app/api/users/batch/route.ts` GET 端点
   - 预期性能提升：**20-100x**

2. **修复用户批量创建 API 的 N+1 查询**
   - 添加 `checkExistingEmails()` 函数到 `src/lib/auth/repository.ts`
   - 更新 `/src/app/api/users/batch/route.ts` POST 端点
   - 预期性能提升：**10-50x**

3. **修复用户批量更新/删除 API 的 N+1 查询**
   - 添加 `batchUpdateUsers()` 和 `batchDeleteUsers()` 函数
   - 更新 `/src/app/api/users/batch/route.ts` PATCH/DELETE 端点
   - 更新 `/src/app/api/users/batch/bulk/route.ts` POST 端点
   - 预期性能提升：**10-50x**

### 优先级 2 (短期内实施)

4. **在开发环境启用 N+1 查询检测器**
   ```typescript
   // 在开发中间件中添加
   if (process.env.NODE_ENV === 'development') {
     const detector = getNPlus1Detector();
     const requestId = crypto.randomUUID();
     detector.startRequest(requestId);
     // ... 记录查询
     const detection = detector.endRequest(requestId);
     if (detection.detected) {
       logger.warn('N+1 query detected', detection);
     }
   }
   ```

5. **添加查询性能监控**
   - 记录所有查询的执行时间
   - 对慢查询发出警告（>100ms）
   - 定期生成性能报告

### 优先级 3 (长期优化)

6. **实施数据库查询缓存**
   - 对频繁查询但不常变化的数据启用缓存
   - 使用现有的 `src/lib/db/cache.ts`
   - 设置合理的 TTL

7. **优化数据库连接池**
   - 调整连接池大小（当前在 `src/lib/db/connection-pool.ts`）
   - 监控连接使用情况

8. **定期运行 VACUUM**
   - 减少数据库碎片
   - 提升查询性能
   - 可通过 `/api/database/optimize` 端点触发

---

## 性能指标监控建议

### 建议监控的指标

1. **查询延迟**
   - P50: < 10ms
   - P95: < 50ms
   - P99: < 100ms

2. **查询数量**
   - 单个请求查询数 < 5
   - 批量操作查询数 = 1-2

3. **缓存命中率**
   - 目标: > 70%
   - 最低: > 50%

4. **数据库连接池使用率**
   - 正常: < 70%
   - 警告: > 85%
   - 危险: > 95%

### 现有监控端点

- `/api/database/health` - 数据库健康状态
- `/api/database/optimize` - 数据库优化
- `/api/analytics/metrics` - 性能指标

---

## 测试建议

### 性能测试场景

1. **批量获取 100 个用户**
   - 当前预期: 100-500ms
   - 优化后预期: 5-20ms

2. **批量创建 50 个用户**
   - 当前预期: 200-500ms
   - 优化后预期: 20-50ms

3. **批量更新 100 个用户**
   - 当前预期: 200-500ms
   - 优化后预期: 10-50ms

4. **批量删除 100 个用户**
   - 当前预期: 200-500ms
   - 优化后预期: 10-50ms

### 负载测试

使用工具如 Apache Bench (ab) 或 wrk 进行压力测试：

```bash
# 测试批量获取 API
ab -n 1000 -c 10 "http://localhost:3000/api/users/batch?ids=id1,id2,...,id10"

# 测试批量创建 API
ab -n 100 -c 5 -p test-data.json -T application/json \
  "http://localhost:3000/api/users/batch"
```

---

## 实施计划

### 第 1 阶段 (1-2 天)

- [ ] 实现 `getUsersByIds()` 函数
- [ ] 实现 `checkExistingEmails()` 函数
- [ ] 实现 `batchUpdateUsers()` 函数
- [ ] 实现 `batchDeleteUsers()` 函数

### 第 2 阶段 (1 天)

- [ ] 更新 `/src/app/api/users/batch/route.ts`
- [ ] 更新 `/src/app/api/users/batch/bulk/route.ts`
- [ ] 添加单元测试

### 第 3 阶段 (1 天)

- [ ] 运行性能测试
- [ ] 验证性能提升
- [ ] 部署到生产环境

### 第 4 阶段 (持续)

- [ ] 启用 N+1 查询检测器
- [ ] 监控性能指标
- [ ] 定期生成性能报告

---

## 总结

### 发现的问题

- 🔴 **3 个严重的 N+1 查询问题**
  - 用户批量获取 API
  - 用户批量创建 API
  - 用户批量更新/删除 API

### 现有的优势

- ✅ 索引设计良好
- ✅ N+1 查询检测工具已实现
- ✅ 性能分析工具已实现
- ✅ 批量操作工具已实现
- ✅ 备份 API 已优化

### 预期改进

实施所有优化后：

- **批量操作性能提升**: **10-100x**
- **单个 API 请求查询数**: 100+ → **1-2**
- **响应时间**: 200-500ms → **10-50ms**
- **数据库连接压力**: 大幅降低
- **系统并发能力**: 显著提升

### 风险评估

- **实施风险**: 低
- **测试风险**: 低（有完善的测试工具）
- **部署风险**: 低（向后兼容）

---

## 附录：优化代码示例

### A1. 批量获取用户函数

```typescript
// 添加到 src/lib/auth/repository.ts

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];

  const db = await getDatabaseAsync();
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`);
  const rows = stmt.all(...ids) as Array<Record<string, unknown>>;

  return rows.map(row => mapRowToUser(row));
}
```

### A2. 批量检查邮件函数

```typescript
// 添加到 src/lib/auth/repository.ts

export async function checkExistingEmails(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];

  const db = await getDatabaseAsync();
  const placeholders = emails.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT email FROM users WHERE email IN (${placeholders})`);
  const rows = stmt.all(...emails) as Array<{ email: string }>;

  return rows.map(r => r.email);
}
```

### A3. 批量更新用户函数

```typescript
// 添加到 src/lib/auth/repository.ts

export async function batchUpdateUsers(
  updates: Array<{ id: string; data: Partial<User> }>
): Promise<Array<{ id: string; success: boolean; user?: User }>> {
  if (updates.length === 0) return [];

  const db = await getDatabaseAsync();

  const stmt = db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        avatar = COALESCE(?, avatar),
        role = COALESCE(?, role),
        status = COALESCE(?, status),
        updated_at = ?
    WHERE id = ?
  `);

  const results: Array<{ id: string; success: boolean; user?: User }> = [];

  const updateTransaction = db.transaction((updates) => {
    for (const { id, data } of updates) {
      try {
        const result = stmt.run(
          data.name ?? null,
          data.avatar ?? null,
          data.role ?? null,
          data.status ?? null,
          new Date().toISOString(),
          id
        );

        if (result.changes > 0) {
          const user = await getUserById(id);
          results.push({ id, success: true, user: user ?? undefined });
        } else {
          results.push({ id, success: false });
        }
      } catch (error) {
        results.push({ id, success: false });
      }
    }
  });

  updateTransaction(updates);
  return results;
}
```

### A4. 批量删除用户函数

```typescript
// 添加到 src/lib/auth/repository.ts

export async function batchDeleteUsers(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const db = await getDatabaseAsync();
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`);
  const result = stmt.run(...ids);

  return result.changes;
}
```

---

**报告生成时间**: 2026-03-21 22:56
**分析人员**: Database Optimization Subagent
**版本**: 1.0
