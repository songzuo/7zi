# HEARTBEAT.md

## Current Time
- Saturday April 25th 2026 02:38 GMT+2

## 模型提供商状态
| Provider | 状态 |
|----------|------|
| minimax (直接会话) | ✅ 当前会话可用 |
| volcengine | 🔴 Rate limit (持续) |
| glm-4.7 | 🔴 令牌过期 (7天+) |
| coze | 🔴 HTTP 404 (7天+) |

## 子代理系统
- 过去 24h: 几乎全部失败（volcengine rate limit + glm-4.7 过期 + coze 404）
- 直接会话（minimax）正常工作
- 建议所有子代理使用 minimax/MiniMax-M2.7 模型

## 生产环境状态
| 服务器 | 状态 |
|--------|------|
| 7zi.com 磁盘 | ✅ 88% (11GB可用，从99%降至88%) |
| ai-site | ⚠️ 249次重启后稳定 |
| bot5 磁盘 | ✅ 63% |
| bot6 磁盘 | ✅ 48% |
| 7zi Gateway | ✅ 运行中 |
| Nginx | ✅ 运行中 |
| PM2 7zi-main | ✅ 在线 17h+ (但版本v1.3.0落后) |

## 今日/昨日完成 (Apr 24-25)
- ✅ SSH配置更新 (Cloudflare CDN问题)
- ✅ OpenClaw健康报告
- ✅ 多个架构审查报告
- ✅ permissions.ts 拆分 (945行→5模块)
- ✅ 7zi.com 磁盘清理 (99%→88%)
- ✅ Nginx SSL 修复
- ✅ 7zi Gateway 服务修复
- ✅ TypeScript 11个核心错误修复

## 紧急问题
1. PM2运行v1.3.0，GitHub仓库已是v1.14.1 - 版本严重落后需部署
2. ai-site 重启 249 次
3. 54 测试文件失败 (~90% 通过率)
4. lib/websocket 1455行大文件待拆分
5. TypeScript ~300 错误待清理
6. 26 个前端文件未提交 Git
7. @hono/node-server 大版本风险
8. @types/bull 已弃用

## 模型提供商注意
- 所有子代理必须使用 minimax/MiniMax-M2.7 模型
- volcengine token 名称应使用 'volcengine' 而非 'volcengine/deepseek-v3-2-251201'
