# 数据库优化快速指南

# Database Optimization Quick Start Guide

## 🚀 快速应用所有补丁

```bash
cd /root/.openclaw/workspace/7zi-project

# 1. 备份原文件
mkdir -p .db-backup-$(date +%Y%m%d)
cp src/app/api/backup/route.ts .db-backup-$(date +%Y%m%d)/
cp src/lib/auth/repository.ts .db-backup-$(date +%Y%m%d)/
cp src/lib/agents/wallet-repository.ts .db-backup-$(date +%Y%m%d)/

# 2. 应用补丁
cp db-optimization-patches/patch-1-backup-api-optimized.ts src/app/api/backup/route.ts
cp db-optimization-patches/patch-2-auth-pagination-optimized.ts src/lib/auth/repository.ts
cp db-optimization-patches/patch-3-wallet-batch-optimized.ts src/lib/agents/wallet-repository.ts

# 3. 测试
npm run test:db-optimization
```

## 🔄 回滚

```bash
# 恢复备份
BACKUP_DATE=$(ls -t .db-backup-* | head -1 | cut -d- -f4)
cp .db-backup-${BACKUP_DATE}/backup-route.ts src/app/api/backup/route.ts
cp .db-backup-${BACKUP_DATE}/auth-repository.ts src/lib/auth/repository.ts
cp .db-backup-${BACKUP_DATE}/wallet-repository.ts src/lib/agents/wallet-repository.ts
```

## ✅ 验证检查

```bash
# 1. 检查备份 API
curl -X POST http://localhost:3000/api/backup
# 验证返回的备份不包含敏感字段

# 2. 检查用户分页
curl "http://localhost:3000/api/users?limit=50"
# 验证只返回 50 条记录

# 3. 检查钱包批量查询
# 使用 getWalletTransactionsBatch() 函数
# 验证查询次数从 N 减少到 1
```

## 📊 性能对比

| 补丁    | 优化前  | 优化后   | 提升       |
| ------- | ------- | -------- | ---------- |
| Patch 1 | 2N 查询 | N+1 查询 | ~50% ↓     |
| Patch 2 | 无限制  | 100 默认 | 99% 内存 ↓ |
| Patch 3 | N 查询  | 1 查询   | N 倍 ↑     |

## 📚 详细文档

- [完整优化报告](./DATABASE_QUERY_OPTIMIZATION_REPORT.md)
- [补丁说明](./db-optimization-patches/README.md)
