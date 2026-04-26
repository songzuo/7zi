# HEARTBEAT.md

## Current Time
- Sunday April 26th 2026 07:48 AM GMT+2

## 模型提供商状态
| Provider | 状态 |
|----------|------|
| minimax (直接会话) | ✅ 当前会话可用 |
| volcengine | 🔴 Rate limit (持续) |
| glm-4.7 | 🔴 令牌过期（custom1 API Key 已过期）|
| coze | 🔴 HTTP 404 |

## 子代理系统
- 过去 52+ 小时: 几乎全部失败
- root cause: custom1 API Key 过期导致 glm-4.7 fallback 失败

## 生产环境状态
| 服务器 | 状态 |
|--------|------|
| 7zi.com | ✅ v1.14.1 运行中（nginx→10087） |
| PM2 7zi-main | ⚠️ errored（配置错误，服务不依赖它） |
| 端口 3003 | ✅ 监听中 (visa-openness) |
| bot5 | ✅ 63% 磁盘，33天+ 无重启 |
| bot6 | ✅ 50% 磁盘 |

## 当前阻塞问题
1. 🚨 custom1 API Key 过期（`sk-0LNe1uYzhRRlivkafdn9vSnpl873SVPqXAVUdQU5CyvVmQib`）
2. 测试失败：AudioProcessor copyToChannel (jsdom 不支持 Web Audio API)
3. 根目录 300+ .md 文件需整理到 reports/ 目录

## 项目版本（已确认）
- **7zi**: v1.14.1 ✅
- **Next.js**: 16.2.4
- **React**: 19.2.4

## 待处理事项
- 磁盘清理 650M+（7zi.com backups/493M, deploy-*.tar.gz 22M, backup-original-next/135M）
- PM2 7zi-main 配置修复
- lib/ 重复模块合并（audit/audit-log, error/errors, collab/collaboration）
- Workflow condition executor bug 手动修复