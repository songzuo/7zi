# HEARTBEAT.md

## Current Time
- Sunday April 26th 2026 04:16 AM GMT+2

## 模型提供商状态
| Provider | 状态 |
|----------|------|
| minimax (直接会话) | ✅ 当前会话可用 |
| volcengine | 🔴 Rate limit (持续) |
| glm-4.7 | 🔴 令牌过期（custom1 API Key 已过期）|
| coze | 🔴 HTTP 404 |

## 子代理系统
- 过去 48+ 小时: 几乎全部失败
- root cause: custom1 API Key 过期导致 glm-4.7 fallback 失败
- Gateway 已重启

## 生产环境状态
| 服务器 | 状态 |
|--------|------|
| 7zi.com | ✅ v1.14.1 运行中（nginx→10087） |
| PM2 7zi-main | ⚠️ errored（配置错误，服务不依赖它） |
| 端口 3003 | ✅ 监听中 (visa-openness Next.js dev) |
| bot5 | ✅ 63% 磁盘，33天无重启 |
| bot6 | ✅ 48% 磁盘 |

## 测试失败根因确认
- **AudioProcessor**: `copyToChannel` 是浏览器 Web Audio API，在 Node.js jsdom 中不存在
- **AlertChannel**: send failed 错误
- **HTMLMediaElement.play**: jsdom 不支持

## 紧急事项
- 🚨 custom1 API Key 过期
- SSH 暴力破解攻击（已被 UFW 拦截）
- 磁盘清理 650M+ 未执行（7zi.com 90%）