# 服务器健康检查报告

**检查时间**: 2026-04-28 22:45 (GMT+2 / 北京时间 06:45)  
**服务器**: bot5.szspd.cn (182.43.36.134)  
**检查人**: 系统管理员子代理

---

## 服务器健康检查报告

| 检查项 | 状态 | 详情 |
|--------|------|------|
| 系统运行时间 | ✅ 正常 | 运行 33 天 10 小时，负载 0.00 |
| Next.js 应用 | ✅ 正常运行 | 进程 PID 1590245，内存 55MB，监听 0.0.0.0:3000 |
| PM2 服务 | ⚠️ 未使用 PM2 | Next.js 直接由 systemd 托管运行 |
| Nginx | ✅ 运行中 | master PID 1158, worker PID 1159，已运行 1 个月 2 天 |
| 端口 80 (HTTP) | ✅ 监听中 | 0.0.0.0:80 |
| 端口 443 (HTTPS) | ✅ 监听中 | 0.0.0.0:443 |
| 端口 3000 (Next.js) | ✅ 监听中 | 0.0.0.0:3000 |
| 端口 8888 | ✅ 监听中 | Nginx 配置监听 |
| 端口 8000 | ✅ 监听中 | Nginx 配置监听 |
| Python/Bot 服务 | ✅ 运行中 | cluster-agent.py (PID 1482) |
| OpenClaw Gateway | ✅ 运行中 | PID 2281549，监听 127.0.0.1:18789/18791/18792 |
| 数据库 (PostgreSQL) | ✅ 运行中 | PID 1162，监听 127.0.0.1:5432 |
| 磁盘空间 | ✅ 正常 | /dev/vda2 40G，已用 26G (63%)，剩余 15G |
| 内存使用 | ⚠️ 偏高 | 总计 1.9G，已用 967M，可用 802M，Swap 已用 436M |
| Nginx 配置 | ✅ 正常 | 配置语法检查通过 |
| HTTP 访问 (本地) | ✅ 200 | curl http://127.0.0.1/ 返回 200 |
| HTTPS 外部访问 | ✅ 200 | https://7zi.com 正常访问 |
| HTTP 外部访问 | ⚠️ 返回默认页 | http://7zi.com 返回 nginx 默认页（Cloudflare 跳转 HTTPS） |
| 防火墙 UFW | ✅ 已关闭 | inactive |
| Fail2Ban | ✅ 运行中 | sshd 监狱已激活 |
| SSL 证书 | ✅ 已配置 | 证书路径 /etc/ssl/86.work.gd/ |
| Cron 任务 | ✅ 已配置 | 11 个定时任务（含 OpenClaw、自主管家、备份等） |
| 日志文件 | ✅ 无错误 | Nginx error.log / access.log 最近无错误记录 |

---

## 🔍 详细说明

### 1. Next.js 应用状态
- **进程**: `next-server (v16.2.2)` PID 1590245，运行于 `/var/www/7zi-frontend/`
- **内存占用**: VmRSS 55MB，VmSize 11.7GB（含地址空间）
- **启动时间**: 2026-04-09（运行约 20 天）
- **路由测试**: curl http://127.0.0.1:3000/ 返回完整 HTML（`7zi Frontend - 智能体协作平台`）

### 2. PM2 状态说明
服务器**未使用 PM2**，Next.js 应用直接以 standalone 模式运行（监听 3000 端口）。PM2 未安装或未启用。这是一种有效的部署方式，但缺少 PM2 的进程管理和自动重启功能。

### 3. Nginx 配置
- 配置文件: `/etc/nginx/sites-available/default-universal`
- 监听端口: 80, 8000, 8888, 443
- 代理规则:
  - `/bot/` → `http://127.0.0.1:9000/`
  - `/api/` → `http://127.0.0.1:9000/api/`
  - `/static/` → `http://127.0.0.1:9000/static/`
  - 其他请求 → `try_files $uri $uri/ /index.html`

### 4. 网站外部访问
- **HTTPS**: https://7zi.com ✅ 正常，显示 `7zi Studio` 首页
- **HTTP**: http://7zi.com → Cloudflare 自动跳转到 HTTPS，返回 nginx 默认页是因为 nginx default vhost
- **实际部署**: 应用运行在 3000 端口，通过 Nginx 反向代理访问

### 5. 建议关注项
1. **内存使用率偏高** — 系统总计 1.9GB，已用 967MB (51%)，Swap 使用 436MB，建议监控
2. **PM2 未使用** — 考虑使用 PM2 管理 Next.js 进程以获得更好的进程保护
3. **UFW 防火墙关闭** — 服务器依赖云厂商安全组，建议确认网络访问控制
4. **SSL 证书** — 使用 86.work.gd 域名证书，注意过期时间

---

## 📊 服务架构

```
用户请求 (HTTPS 443)
    ↓
Cloudflare CDN
    ↓
Nginx (1158/1159)
    ↓
Next.js (3000) ← 主应用 (PID 1590245)
    ↓
PostgreSQL (5432)
    ↓
其他服务 (OpenClaw Gateway, Bot, etc.)
```
