# 数据库查询优化补丁集合

本目录包含针对 7zi 项目数据库查询性能的优化补丁。

## 📋 补丁列表

### Patch 1: 备份 API 优化 🔴 高优先级

**文件**: `patch-1-backup-api-optimized.ts`

**问题**:
- N+1 查询问题：循环中对每个表执行 2 次查询（`SELECT *` + `COUNT`）
- 安全问题：`SELECT *` 导出敏感字段（password, api_key, token 等）

**优化**:
- 使用 UNION ALL 批量获取所有表的行数
- 动态获取表结构，自动排除敏感字段
- 查询次数从 2N 减少到 N + 1

**性能提升**: ~50% 减少查询次数

**安全性**: 自动排除敏感字段

---

### Patch 2: 添加分页限制 🟡 中优先级

**文件**: `patch-2-auth-pagination-optimized.ts`

**问题**:
- `getAllUsers()` 等函数没有分页限制
- 可能返回数万条记录，导致内存和性能问题

**优化**:
- 添加默认分页限制（100 条记录）
- 设置最大限制（1000 条）防止滥用
- 新增 `getAllUsersPaginated()` 返回分页元数据
- 新增 `getUsersCount()` 支持分页 UI

**性能提升**: 防止内存溢出，确保响应时间可控

---

### Patch 3: 批量查询优化 🟢 低优先级

**文件**: `patch-3-wallet-batch-optimized.ts`

**问题**:
- 获取多个钱包的交易记录时需要 N 次查询

**优化**:
- 使用 `IN` 子句批量查询，从 N 次减少到 1 次
- 新增 `getWalletTransactionsBatch()` 返回按钱包 ID 分组的结果
- 新增 `getWalletTransactionsAggregated()` 返回扁平数组结果

**性能提升**: N 倍查询性能提升（N = 钱包数量）

**适用场景**: 需要同时显示多个智能体的钱包交易

---

## 🚀 如何应用补丁

### 方式 1: 直接替换（推荐用于开发环境）

```bash
# 备份原文件
cp src/app/api/backup/route.ts src/app/api/backup/route.ts.backup
cp src/lib/auth/repository.ts src/lib/auth/repository.ts.backup
cp src/lib/agents/wallet-repository.ts src/lib/agents/wallet-repository.ts.backup

# 应用补丁
cp db-optimization-patches/patch-1-backup-api-optimized.ts src/app/api/backup/route.ts
cp db-optimization-patches/patch-2-auth-pagination-optimized.ts src/lib/auth/repository.ts
cp db-optimization-patches/patch-3-wallet-batch-optimized.ts src/lib/agents/wallet-repository.ts
```

### 方式 2: 逐步应用（推荐用于生产环境）

1. 先在测试环境应用 Patch 1
2. 运行测试，验证备份功能
3. 应用 Patch 2
4. 更新 API 调用方，使用分页参数
5. 应用 Patch 3（按需）

### 方式 3: 使用 git patch

```bash
# 创建补丁文件
git diff --no-index src/app/api/backup/route.ts db-optimization-patches/patch-1-backup-api-optimized.ts > patch-1.diff

# 应用补丁
git apply patch-1.diff
```

---

## 📊 性能对比

### Patch 1: 备份 API

| 表数量 | 优化前查询数 | 优化后查询数 | 改进 |
|--------|------------|------------|------|
| 10     | 20         | 11         | 45% ↓ |
| 20     | 40         | 21         | 47% ↓ |
| 50     | 100        | 51         | 49% ↓ |

### Patch 2: 用户列表

| 用户数 | 优化前内存 | 优化后内存 | 改进 |
|--------|----------|----------|------|
| 100    | ~5MB     | ~5MB     | -    |
| 1,000  | ~50MB    | ~50MB    | -    |
| 10,000 | ~500MB   | ~5MB     | 99% ↓ |
| 100,000| ~5GB     | ~5MB     | 99.9% ↓ |

### Patch 3: 钱包交易批量查询

| 钱包数 | 优化前查询数 | 优化后查询数 | 改进 |
|--------|------------|------------|------|
| 10     | 10         | 1          | 90% ↓ |
| 50     | 50         | 1          | 98% ↓ |
| 100    | 100        | 1          | 99% ↓ |

---

## ✅ 验证清单

### Patch 1 验证
- [ ] 备份 API 正常工作
- [ ] 备份文件不包含敏感字段（password, api_key, token）
- [ ] 备份文件大小合理
- [ ] 备份可以正常恢复

### Patch 2 验证
- [ ] 用户列表 API 支持分页参数
- [ ] 默认返回 100 条记录
- [ ] 最大限制为 1000 条
- [ ] `getAllUsersPaginated()` 返回正确的分页元数据
- [ ] 现有 API 调用需要更新（如果依赖无限制返回）

### Patch 3 验证
- [ ] `getWalletTransactionsBatch()` 正确返回分组结果
- [ ] `getWalletTransactionsAggregated()` 正确返回扁平结果
- [ ] 查询性能符合预期
- [ ] 支持过滤条件和分页

---

## 🧪 测试建议

### 单元测试

```typescript
// Patch 1 测试
describe('Backup API', () => {
  it('should exclude sensitive fields from backup', async () => {
    const backup = await createBackup();
    const userData = backup.data.users as any[];

    // 确保不包含密码
    expect(userData[0].password).toBeUndefined();
    expect(userData[0].api_key).toBeUndefined();
  });

  it('should reduce query count', async () => {
    // 使用查询计数器验证
    const queryCountBefore = getQueryCount();
    await createBackup();
    const queryCountAfter = getQueryCount();

    expect(queryCountAfter - queryCountBefore).toBeLessThan(20); // 假设有 10 个表
  });
});

// Patch 2 测试
describe('User Repository with Pagination', () => {
  it('should respect default limit', async () => {
    const users = await getAllUsers();
    expect(users.length).toBeLessThanOrEqual(100);
  });

  it('should support custom limit', async () => {
    const users = await getAllUsers({ limit: 50 });
    expect(users.length).toBeLessThanOrEqual(50);
  });

  it('should enforce max limit', async () => {
    const users = await getAllUsers({ limit: 10000 });
    expect(users.length).toBeLessThanOrEqual(1000);
  });
});

// Patch 3 测试
describe('Wallet Batch Queries', () => {
  it('should fetch transactions for multiple wallets in one query', async () => {
    const walletIds = ['wallet-1', 'wallet-2', 'wallet-3'];
    const transactions = await getWalletTransactionsBatch(walletIds);

    expect(transactions.size).toBe(3);
    expect(transactions.get('wallet-1')).toBeDefined();
  });
});
```

### 性能测试

```typescript
// 使用 performance-analyzer.ts
import { generatePerformanceReport } from '@/lib/db/performance-analyzer';

async function testPerformance() {
  const reportBefore = await generatePerformanceReport();
  console.log('Before optimization:', reportBefore.slowQueries);

  // 执行优化后的查询
  await createBackup();

  const reportAfter = await generatePerformanceReport();
  console.log('After optimization:', reportAfter.slowQueries);
}
```

---

## 🔧 回滚步骤

如果优化后出现问题，可以快速回滚：

```bash
# 恢复备份文件
mv src/app/api/backup/route.ts.backup src/app/api/backup/route.ts
mv src/lib/auth/repository.ts.backup src/lib/auth/repository.ts.backup
mv src/lib/agents/wallet-repository.ts.backup src/lib/agents/wallet-repository.ts.backup
```

---

## 📝 注意事项

### 兼容性
- Patch 2 引入了分页限制，现有 API 调用需要更新
- Patch 3 是新增功能，不影响现有 API

### 数据迁移
- 不需要数据迁移
- 索引已经在现有代码中定义

### 监控建议
- 在生产环境应用前，先在测试环境充分测试
- 启用慢查询日志和 N+1 检测
- 监控数据库性能指标

---

## 📚 相关文档

- [DATABASE_QUERY_OPTIMIZATION_REPORT.md](../DATABASE_QUERY_OPTIMIZATION_REPORT.md) - 完整的优化审查报告
- [src/lib/db/performance-analyzer.ts](../src/lib/db/performance-analyzer.ts) - 性能分析工具
- [src/lib/db/nplus1-detector.ts](../src/lib/db/nplus1-detector.ts) - N+1 查询检测
- [src/lib/db/batch-operations.ts](../src/lib/db/batch-operations.ts) - 批量操作工具

---

## 🤝 贡献

如果发现新的优化机会或补丁有问题，欢迎提出 issue 或 pull request。

---

**最后更新**: 2026-03-20
