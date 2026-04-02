# 安全状态报告 - v1.5.0 生产环境

**检查时间**: 2026-03-31 04:07 GMT+2  
**检查人**: 🛡️ 系统管理员

---

## 1. 生产服务运行状态

### 1.1 服务端口状态

| 端口        | 服务             | 状态          | 备注         |
| ----------- | ---------------- | ------------- | ------------ |
| 80/443      | Nginx            | ✅ 运行中     | 主网站入口   |
| 8444        | ss-server        | ✅ 运行中     | VPN 服务     |
| 5171-5177   | Node.js          | ✅ 运行中     | 7zi 项目实例 |
| 10087-10089 | Node.js          | ✅ 运行中     | API 服务     |
| 18789       | OpenClaw Gateway | ✅ 运行中     | AI 主管      |
| 18791       | OpenClaw Gateway | ✅ 运行中     | AI 主管      |
| 22          | SSH              | ✅ 运行中     | 管理入口     |
| 631         | CUPS             | ⚠️ 可考虑禁用 | 打印服务     |

### 1.2 PM2 状态

- **PM2 守护进程**: 未运行（项目直接使用 Node 进程）
- **服务进程数**: 7 个 Node 进程（端口 5171-5177, 10087-10089）

### 1.3 最近安全日志

**Nginx 错误日志分析**:

- 多起 IPv6 代理连接错误（2001:67c:4e8:f004::9）
- 多起恶意扫描请求:
  - `/cgi-bin/luci/` - 路由器漏洞利用尝试
  - `/boaform/admin/formLogin` - 路由器登录扫描
  - `/judge` - VPN 代理测试
- 2xx 响应正常，204.76.203.18 访问较多（需监控）

**SSH 认证日志**:

- ⚠️ **检测到暴力破解尝试**:
  - `181.167.144.229` - 多次 root 登录失败
  - `180.76.105.16` - root 登录失败
  - `82.196.7.70` - ubuntu/mysql 登录失败
- 最近成功登录: `113.240.178.147` (2026-03-29), `38.95.78.114` (2026-03-28)

---

## 2. 安全修复验证结果

### 2.1 xlsx 包检查 ❌ 未修复

| 项目                    | 状态       | 版本   | 风险             |
| ----------------------- | ---------- | ------ | ---------------- |
| `/var/www/7zi`          | ✅ 无 xlsx | -      | 安全             |
| `/var/www/ai-dashboard` | ❌ 仍使用  | 0.18.5 | **原型污染漏洞** |

**建议**: 将 `ai-dashboard` 中的 `xlsx` 替换为 `exceljs`

### 2.2 CSP 配置检查 ⚠️ 部分配置

**已有安全头**:

- `X-Frame-Options: SAMEORIGIN` ✅
- `X-Content-Type-Options: nosniff` ✅
- `X-XSS-Protection: 1; mode=block` ✅

**缺失**:

- ❌ `Content-Security-Policy` (CSP) 未在 Nginx 配置
- ❌ Next.js 项目中需检查 middleware 是否配置 CSP

### 2.3 SSL/TLS 配置 ⚠️ 证书问题

**证书状态**:

- 主证书: `/web/ssl_unified/7zi.com.crt` ✅
- 协议: TLSv1.2 + TLSv1.3 ✅
- 无效配置:
  - `/etc/letsencrypt/renewal/api.7zi.com.conf`
  - `/etc/letsencrypt/renewal/visa.mainlander.cn.conf`

**建议**: 修复或删除无效的 renewal 配置

### 2.4 .env.production 配置 ✅ 基本安全

```
NODE_ENV=production ✅
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com ✅
NEXT_PUBLIC_GITHUB_OWNER=songzhuo
NEXT_PUBLIC_GITHUB_REPO=openclaw-workspace
```

**注意**: 未发现数据库密码等敏感信息明文存储

---

## 3. 基础设施安全

### 3.1 防火墙 (UFW) ⚠️ 端口过多

| 端口      | 服务           | 风险等级             |
| --------- | -------------- | -------------------- |
| 6379      | Redis          | 🔴 高 - 已在公网开放 |
| 3306      | MySQL          | 🔴 高 - 应限制       |
| 10086     | 1Panel         | 🟡 中                |
| 8080-8082 | Telegram Proxy | 🟡 中                |
| 9100/9101 | Node Exporter  | 🟡 中                |

**建议**: 限制 Redis 和数据库端口仅允许内网访问

### 3.2 Fail2ban 状态 ✅ 已启用

```
Jail list: nginx-http-auth, nginx-limit-req, sshd
```

**SSH 暴力破解防护**: ✅ 已启用

### 3.3 Docker 容器

- 当前无运行中的容器

---

## 4. 待处理安全问题清单

| 优先级 | 问题                  | 项目         | 建议操作               |
| ------ | --------------------- | ------------ | ---------------------- |
| 🔴 P0  | xlsx 原型污染漏洞     | ai-dashboard | 替换为 exceljs         |
| 🔴 P0  | Redis 6379 公网开放   | 服务器       | 限制为内网 10.0.0.0/8  |
| 🟠 P1  | SSL 证书 renewal 无效 | api.7zi.com  | 修复或删除配置         |
| 🟠 P1  | CSP 配置缺失          | Nginx        | 添加 CSP header        |
| 🟡 P2  | SSH 暴力破解日志      | 服务器       | 确认 fail2ban 生效     |
| 🟡 P2  | 开放端口过多          | 服务器       | 审查并关闭不必要的端口 |
| 🟢 P3  | favicon.ico 缺失      | 7zi.com      | 添加网站图标           |

---

## 5. 建议优先级

### 立即处理 (24小时内)

1. 将 ai-dashboard 的 xlsx 替换为 exceljs
2. 限制 Redis 端口访问（修改 ufw 规则）
3. 检查 fail2ban SSH jail 是否正常拦截

### 本周内

4. 修复无效的 SSL renewal 配置
5. 为 Nginx 添加 CSP 配置
6. 审查并关闭非必要端口

### 持续监控

- SSH 登录日志中的异常 IP
- Nginx 错误日志中的恶意扫描
- 204.76.203.18 的访问来源

---

**报告生成**: 2026-03-31 04:18 GMT+2  
**下次检查建议**: 每周定期安全审计
