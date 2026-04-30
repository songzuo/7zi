# HEARTBEAT.md

## Current Time
- Thursday April 30th 2026 07:42 AM GMT+2 (Berlin, morning)

## 模型提供商状态
| Provider | 状态 |
|----------|------|
| minimax | ✅ 可用 |
| volcengine | 🔴 Rate Limit |
| glm-4.7 | 🔴 Rate Limit |

## 生产环境 (7zi.com)
| 服务 | 状态 | 运行时间 | 重启 |
|------|------|----------|------|
| 7zi-main | ✅ online | ~3.3h (uptime 11696s) | 3 (正常) |
| 磁盘 (/) | ✅ 50% (72G/145G) | - | - |

## 🔴 紧急待处理

| 优先级 | 问题 | 行动 |
|--------|------|------|
| ⚠️ 注意 | 本机磁盘正常 (50%)，7zi.com 磁盘需检查 | 见生产环境状态行 |
| 🔴 紧急 | Credits 耗尽 (Evomap) | 完成 https://evomap.ai/claim/T9QM-TJLH 认领 |

## 最近完成 (关键摘要)

- ✅ **部署成功**: 7zi.com v1.14.1 部署完成，PM2 online
- ✅ **Git 已推送**: `origin/main` (commit 3ec1cc1b3)
- ✅ **siteName undefined 修复**: 5个 layout 文件
- ✅ **nav.theme 翻译修复**: 已添加 zh/en 翻译
- ⚠️ **测试套件健康**: 176/5159 failed (初步结果) - 见下方详情

## ⚠️ 测试套件状态 (初步结果)

完整测试运行被超时中断 (4分钟后 SIGTERM)，但收集到足够的失败数据:

**失败数最多的模块**:
- `useTouchGestures.test.ts` — 25/52 failed (act() 警告、触摸事件 mock 不完整)
- `useSwipe.test.ts` — 16/25 failed (act() 警告、滑动方向检测)
- `WorkflowEditor.test.tsx` — 14/17 failed (节点状态初始化、拖放逻辑)
- `AlarmConfigPanel.test.tsx` — 6/12 failed (UI 组件渲染)
- `auth/route.test.ts` — 4/12 failed (SQLite 数据库损坏)
- `feedback/route.test.ts` — 2/17 failed (SQLite `database disk image is malformed`)

**主要错误模式**:
1. React act() 警告 - 异步状态更新未包装
2. SQLite 数据库共享损坏 - 测试间文件冲突
3. Unhandled Promise Rejection - 异步清理缺失
4. 条件评估空指针 - 动态上下文注入失败

**需要修复**: P0 为 SQLite 隔离和 act() 包装

## 待继续处理

- TypeScript 还有 463 个错误（主要在 lib/）
- 磁盘清理未执行（未获授权）
- Credits 认领未完成（需主人操作）
- console.log 清理未执行（1063处）
- 测试套件修复（176 failed → 需分析修复）