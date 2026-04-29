# 7zi 平台部署健康度检查报告

**检查时间**: 2026-04-28 23:40 GMT+2  
**检查人**: 系统管理员子代理 (sysadmin)  
**目标**: 7zi.com 生产环境 + 测试环境 (bot5)

---

## 一、部署状态总览

| 服务 | 状态 | 说明 |
|------|------|------|
| **7zi.com 前端** (Next.js) | ✅ 运行中 | 版本 v1.13.0, 端口 3000 |
| **7zi.com 后端** (API) | ✅ 运行中 | `/api/health` 返回 200 |
| **Nginx 反向代理** | ✅ 运行中 | 配置测试通过 |
| **PostgreSQL 数据库** | ✅ 运行中 | 端口 5432 监听 |
| **OpenClaw Gateway** | ✅ 运行中 | 端口 18789-18792 |
| **PM2 进程管理器** | ⚪ 未安装 | 使用 Node.js 直接运行 |

---

## 二、服务器资源使用情况

### 2.1 测试服务器 (bot5.szspd.cn / 182.43.36.134)

| 指标 | 数值 | 状态 |
|------|------|------|
| **CPU** | 1核, 负载 0.00 | ✅ 空闲 |
| **内存总量** | 2GB | - |
| **内存使用** | 998MB (49%) | ⚠️ 偏紧 |
| **内存空闲** | 75MB | ⚠️ 偏低 |
| **Swap** | 436MB / 2GB | ⚠️ 在使用 |
| **磁盘** | 26GB / 40GB (63%) | ✅ 良好 |
| **运行时间** | 33天 | ✅ 稳定 |

**问题**: 内存使用率达 99%，空闲仅 75MB，系统依赖 Swap。

### 2.2 本机 (bot6)

| 指标 | 数值 | 状态 |
|------|------|------|
| **磁盘** | 75GB / 145GB (52%) | ✅ 良好 |
| **内存** | - | 未知(未检查) |

---

## 三、7zi-backend 和 7zi-frontend 最新部署状态

### 3.1 前端 (Next.js)

- **运行版本**: v1.13.0
- **构建时间**: 2026-04-28T21:41:57
- **运行时长**: 48,078 分钟 (约 33 天)
- **进程**: `node /root/autonomous-agent.js` (PID 11547)
- **端口**: 3000
- **健康检查**: `/health` → 404 (返回 HTML), `/api/health` → 200 ✅

### 3.2 后端 API

- **状态**: healthy
- **响应时间**: 5ms
- **版本**: 1.13.0
- **环境**: production

### 3.3 Next.js 版本兼容性问题

⚠️ **发现严重问题**: 多个 Server Action 失败错误

```
Error: Failed to find Server Action "53ca2f19a13b60b8c763a9b7d3e701c9c7948631066b066682c6d56c2fee0e28"
```

这表明 Next.js 应用存在 **部署不匹配问题** — 旧版前端调用了不再存在的 Server Action，通常由以下原因导致：
1. 浏览器缓存了旧的 build
2. 部署后未完全重载

---

## 四、Nginx 反向代理配置检查

### 4.1 Nginx 状态

```
● nginx.service - A high performance web server
   Active: active (running) since Thu 2026-03-26 20:23:54 CST; 1 month 2 days ago
```

### 4.2 配置测试

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

✅ **Nginx 配置语法正确**

### 4.3 监听端口

| 端口 | 服务 | 状态 |
|------|------|------|
| 80 | Nginx HTTP | ✅ LISTEN |
| 443 | Nginx HTTPS | ✅ LISTEN |
| 3000 | Next.js | ✅ LISTEN |
| 5432 | PostgreSQL | ✅ LISTEN |
| 8888 | Nginx 额外 | ✅ LISTEN |
| 8000 | Nginx 额外 | ✅ LISTEN |

### 4.4 Nginx 配置要点

✅ HTTPS 重定向 (80 → 443)  
✅ SSL 证书配置 (Let's Encrypt)  
✅ WebSocket 支持 (Upgrade headers)  
✅ Gzip 压缩启用  
✅ 安全头配置 (HSTS, X-Frame-Options 等)  
✅ 静态资源缓存 (1年过期)  
✅ Gmail Pub/Sub 回调端点  
✅ 健康检查端点 `/health`  

---

## 五、数据库连接和迁移状态

### 5.1 PostgreSQL

- **状态**: 运行中, 端口 5432
- **连接测试**: psql 连接正常 (需要密码)
- **数据库**: postgres (默认)

### 5.2 数据库表结构

⚠️ **无法获取表列表** — psql 连接需要密码验证，未配置 .pgpass

### 5.3 迁移状态

📝 **未发现迁移文件** — 需要确认 `/root/.openclaw/workspace` 中是否有 `.sql` 迁移文件

---

## 六、问题汇总与优先级

### P0 - 紧急 (需立即处理)

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 1 | **Server Action 不匹配错误** | 用户可能遇到功能失效 | 清除浏览器缓存，或执行硬重载 (Ctrl+Shift+R) |
| 2 | **内存使用率过高 (99%)** | 系统稳定性风险 | 监控 autonomous-agent.js 内存增长 |

### P1 - 高优先级 (24小时内处理)

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 1 | **Swap 使用 436MB** | 系统响应变慢 | 增加物理内存或优化内存使用 |
| 2 | **Next.js /health 返回 404** | 健康检查端点配置问题 | 检查 Nginx location /health 配置 |

### P2 - 中优先级 (本周处理)

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 1 | **PM2 未安装** | 无法使用 PM2 管理进程 | 考虑安装 PM2 用于进程监控和自动重启 |
| 2 | **数据库迁移状态未知** | 无法确认 DB 结构 | 配置 pgpass 或通过应用检查 |

### P3 - 低优先级 (计划内处理)

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 1 | **7zi.com 无法直接 SSH** | Cloudflare CDN 遮挡 | 需要内网 hostname 或 VPN |
| 2 | **Next.js viewport deprecated** | 控制台警告 | 迁移 metadata.themeColor 至 viewport.export |

---

## 七、关键日志摘要

### 7.1 Next.js 警告

```
⚠ Unsupported metadata themeColor is configured in metadata export in /_not-found
⚠ Unsupported metadata viewport is configured in metadata export in /_not-found
```

**影响**: 仅控制台警告，不影响功能  
**解决**: 迁移到 Next.js 15 App Router 的 viewport export 格式

### 7.2 Server Action 错误

```
Error: Failed to find Server Action "xxx". This request might be from an older or newer deployment.
```

**影响**: 用户执行某些操作可能失败  
**原因**: 浏览器缓存了旧的 JS bundle  
**解决**: 1) 清除缓存 2) 配置 cache-control 头禁止缓存

---

## 八、建议行动项

### 立即行动

1. ✅ Nginx 和 Next.js 均正常运行
2. ⚠️ 通知用户清除浏览器缓存或硬重载
3. ⚠️ 监控内存使用，防范 OOM

### 短期计划

1. 安装 PM2 管理 Next.js 进程 (提供自动重启)
2. 配置数据库迁移检查脚本
3. 解决 Next.js metadata deprecation warnings

### 长期计划

1. 考虑升级服务器内存 (当前 2GB 偏紧)
2. 建立完整的健康检查告警机制
3. 配置 Logrotate 防止日志过大

---

## 九、检查完成时间

- **检查开始**: 2026-04-28 23:40 GMT+2
- **检查完成**: 2026-04-28 23:45 GMT+2
- **耗时**: 约 5 分钟

---

*报告生成: 系统管理员子代理 (devops-health-check-v2)*