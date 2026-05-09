# 文档同步检查报告
**生成时间**: 2026-05-09 03:43 UTC  
**检查范围**: docs/ 目录 vs src/ 代码变更

---

## 📋 文档列表及最后更新时间

### ✅ 最近 7 天内更新的文档 (7个)

| 文档 | 更新时间 | 备注 |
|------|----------|------|
| `docs/deps-upgrade-plan-2026-05-08.md` | 2026-05-08 | 依赖升级计划 |
| `docs/git-workflow-2026-05-08.md` | 2026-05-08 | Git 工作流 |
| `docs/security-audit-2026-05-08.md` | 2026-05-08 | 安全审计 |
| `docs/EVOMAP-INTEGRATION.md` | 2026-05-08 | Evomap 集成 |
| `docs/test-coverage-analysis-2026-05-08.md` | 2026-05-08 | 测试覆盖率分析 |
| `docs/performance-analysis-2026-05-08.md` | 2026-05-08 | 性能分析 |
| `docs/TECH_SELECTION_REPORT_2026.md` | 2026-05-08 | 技术选型报告 |

### ⚠️ 较旧但近期有更新的文档 (6个)

| 文档 | 更新时间 | 备注 |
|------|----------|------|
| `docs/CHANGELOG.md` | 2026-05-07 | 版本变更日志 |
| `docs/README.md` | 2026-05-07 | 项目自述 |
| `docs/DEPLOYMENT.md` | 2026-05-07 | 部署文档 |
| `docs/QUICKSTART.md` | 2026-05-04 | 快速开始 (v1.14.2) |
| `docs/INDEX.md` | 2026-04-30 | 文档索引 |
| `docs/API.md` | 2026-04-30 | API 文档 (141KB, 大文档) |

### 🔴 严重过时的核心文档 (部分)

| 文档 | 更新时间 | 问题 |
|------|----------|------|
| `docs/ARCHITECTURE.md` | 2026-04-02 | 架构文档过时 |
| `docs/DEPLOYMENT-GUIDE.md` | 2026-04-02 | 部署指南过时 |
| `docs/DEPLOYMENT-CHECKLIST.md` | 2026-04-02 | 部署检查清单 |
| `docs/DEPLOYMENT-CLUSTER.md` | 2026-04-02 | 集群部署 |

---

## 📝 代码变更摘要 (最近 7 天, 自 2026-05-02)

### src/ 目录变更

| 提交 | 日期 | 变更内容 |
|------|------|----------|
| `6218017244` | May 7 | checkpoint - 工作区维护 |
| `7c2ee8aaf7` | May 4 | 🔧 代码优化: 清理冗余 vitest 配置 + 文档更新 |
| `b07cd51210` | May 3 | chore: 清理 vitest 僵尸进程、修复 HEARTBEAT |
| `78b39525db` | May 2 | fix: add logger import to audit-log/export-service.ts |
| `f729af6449` | May 2 | fix: add try-catch for JSON.parse in audit-log modules |

### 关键代码模块修改时间

| 模块 | 修改时间 | 说明 |
|------|----------|------|
| `src/lib/audit-log/export-service.ts` | 2026-05-02 | 导出服务 logger 修复 |
| `src/lib/db/audit-log.ts` | 2026-05-02 | 审计日志 JSON.parse 修复 |
| `src/lib/backup/backup-core.ts` | 2026-05-02 | 备份核心模块 |
| `src/lib/websocket/compression/*` | 2026-05-02 | WebSocket 压缩优化 |
| `src/lib/monitoring/types.ts` | 2026-05-07 | 监控类型定义 |
| `src/lib/fallback/*` | 2026-05-07 | 熔断器/降级逻辑 |
| `src/app/api/v1/tenants/*` | 2026-05-07 | 多租户 API 测试 |
| `src/app/api/auth/*` | 2026-05-07 | 认证 API 测试 |

---

## ⚠️ 同步问题清单

### 🔴 高优先级 (需要立即更新)

1. **docs/ARCHITECTURE.md** (最后更新: 2026-04-02)
   - 缺少 websocket compression 相关架构说明
   - 缺少 backup-core 模块文档
   - 缺少 monitoring types 更新

2. **docs/DEPLOYMENT-GUIDE.md** (最后更新: 2026-04-02)
   - 版本已升至 v1.14.2，文档仍显示旧版本
   - 缺少 vitest 配置清理说明
   - Docker/PM2 部署流程可能需要更新

3. **docs/API.md** (最后更新: 2026-04-30)
   - 141KB 大文档，可能需要增量更新
   - 需要确认是否包含最新的 v1.14.2 API 端点

### 🟡 中优先级 (建议近期更新)

4. **docs/audit-log/** 目录文档
   - `src/lib/audit-log/` 有代码变更，文档可能需要同步
   - 检查是否有相关使用文档

5. **docs/monitoring/** 相关文档
   - `src/lib/monitoring/types.ts` 修改于 May 7
   - 检查 monitoring-plan.md 是否需要更新

6. **docs/fallback/** 或错误处理文档
   - `src/lib/fallback/*` 修改于 May 7
   - 检查 ERROR_HANDLING.md 是否同步

### 🟢 低优先级 (可延后处理)

7. **docs/TESTING.md** 及相关测试文档
   - vitest 配置变更需要更新测试文档
   - 但测试覆盖分析报告已更新 (2026-05-08)

8. **docs/WEBSOCKET*.md** 
   - compression 模块变更，需要检查 websocket 相关文档

---

## 🎯 优先级建议

### 立即处理 (今日)

1. **更新 docs/DEPLOYMENT.md 和 docs/DEPLOYMENT-GUIDE.md**
   - 版本号从 v1.14.x 更新到 v1.14.2
   - 添加 vitest 配置变更说明
   - 同步 HEARTBEAT 修复内容

2. **更新 docs/QUICKSTART.md**
   - 已于 May 4 部分更新，确认 Docker 快速启动章节完整

### 本周内处理

3. **更新 docs/ARCHITECTURE.md**
   - 添加 websocket compression 架构图
   - 更新 backup-core 模块说明
   - 更新 monitoring 架构

4. **更新 docs/API.md**
   - 确认 v1.14.2 所有新端点已记录
   - 检查 audit-log 导出 API 是否已文档化

### 建议任务

5. **创建 docs/AUDIT_LOG_GUIDE.md** (如果不存在)
   - audit-log 模块有较多变更，应有专门文档

6. **更新 docs/MONITORING.md**
   - `src/lib/monitoring/types.ts` 变更于 May 7

---

## 📊 统计摘要

- **文档总数 (docs/*.md)**: ~180 个
- **最近 7 天更新**: 7 个 (3.9%)
- **超过 30 天未更新**: 约 160 个 (89%)
- **核心文档 (ARCHITECTURE/DEPLOYMENT/API/README)**: 3/4 严重过时

---

*报告生成: 文档同步检查子代理 | 2026-05-09*
