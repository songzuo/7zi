# HEARTBEAT.md

## Current Time
- Thursday April 23rd 2026 22:23 UTC / 00:23 (Europe/Berlin)

## 21:46 UTC - 2026-04-22

### ✅ Production Status - ALL SYSTEMS OPERATIONAL

| Service | Status | Notes |
|---------|--------|-------|
| 7zi.com | ✅ Working | "7zi Studio" content correct |
| ai.7zi.com | ✅ Working | 307 redirect |
| visa.7zi.com | ✅ Working | Visa Openness Index 200 OK |
| 7zi-main PM2 | ✅ Stable | 32h uptime, 0 restarts |
| ai-site PM2 | ⚠️ 230 restarts | Running but frequent restarts |

### ✅ Server Ports Status
```
0.0.0.0:3000 - 7zi-main (PM2) ✅
0.0.0.0:3001 - ai-site (Next.js) ✅
0.0.0.0:3002 - next-server (PID 1010115) ✅
0.0.0.0:3003 - next-server (PID 2983734) ✅ visa.7zi.com
```

### Nginx SSL Configuration (Checked 21:46 UTC)
- ssl_protocols: TLSv1.2 TLSv1.3 ✅
- ssl_ciphers: HIGH:!aNULL:!MD5 ✅
- Cloudflare proxy compatible ✅

## 模型提供商状态
| Provider | Status |
|---|---|
| minimax | ⚠️ subagent 不可靠 |
| coze | 🔴 failing (HTTP 404) |
| glm-4.7 | 🔴 failing (401 token expired) |
| volcengine | ⚠️ rate limit |

## 子代理状态
- **全部失败** - 持续 60+ 小时
- 只有直接会话（minimax/MiniMax-M2.7）正常工作

## 今日完成的工作
- ✅ 7zi.com 危机修复（nginx 配置问题）
- ✅ ai-site 修复（端口 3001 代理）
- ✅ visa.7zi.com 正常运行
- ✅ 服务器端口全部正常监听
- ✅ PM2 7zi-main 稳定运行 32h

## 待处理任务
- ai-site 重启次数过多（230次）- 需调查
- 本地代码落后 origin/main 71 commits
- 子代理团队恢复（等待 coze/glm-4.7 修复）

## 架构状态
- Next.js 16.2.4 ✅
- React 19.2.4 ✅
- PWA 离线能力 ✅
- Evomap Gateway 集成 ✅
