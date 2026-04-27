# 🛡️ 7zi.com 服务器健康报告

**生成时间**: 2026-04-27 10:18 GMT+2  
**检查方式**: 远程 + Cloudflare 代理检测  
**状态**: ⚠️ 部分可检查

---

## 1. SSH 连接状态

**结果**: ❌ 无法直连

- `172.67.184.212:22` — Connection timeout（Cloudflare 不代理 SSH）
- `104.21.59.229:22` — Connection timeout（同上）
- Cloudflare CDN 隐藏了真实源站 IP，无法绕过

**说明**: 7zi.com 使用 Cloudflare CDN，源站 IP 被隐藏保护，SSH 需通过已知 hostname（如 `ecm-cd59`）连接，但该 hostname 无法解析。

---

## 2. 网站可用性

**结果**: ✅ 正常运行

- `https://7zi.com` → HTTP 200，返回七子菜谱首页
- 重定向到 `/zh` 中文版
- Cloudflare CDN 已启用，流量经过 CDN 分发
- 服务器: **Next.js** 应用，Cloudflare 代理

---

## 3. SSL 证书

**结果**: ⚠️ 即将过期

| 项目 | 值 |
|------|-----|
| 颁发者 | Google Trust Services (WE1) |
| 域名 | 7zi.com |
| 生效时间 | 2026-03-01 |
| **到期时间** | **2026-05-30** |
| 剩余天数 | **约 33 天** |

**风险**: 证书将于 2026-05-30 到期，需在到期前续期，否则浏览器会报安全警告。

---

## 4. 安全头信息

**结果**: ✅ 良好

```
✅ strict-transport-security: max-age=63072000 (HSTS 开启，2年)
✅ x-content-type-options: nosniff
✅ x-frame-options: SAMEORIGIN
✅ x-xss-protection: 1; mode=block
✅ permissions-policy: 已配置（限制摄像头、麦克风等权限）
✅ cf-ray: Cloudflare 代理中
```

**CSP (Content Security Policy)**: 部分路径已配置，基础防护到位。

---

## 5. Cloudflare 保护状态

**结果**: ✅ 已启用

- `cf-cache-status: DYNAMIC` — 动态内容通过 Cloudflare
- `cf-ray: 9f2c64418f571182-FRA` — 流量经过法兰克福节点
- DDoS 防护、Bot 防护、CDN 加速均已启用

---

## 6. API 健康检查

**结果**: ⚠️ 无公开健康端点

- `GET /api/health` → 404
- `GET /api/status` → 404
- 建议: 添加 `/api/health` 返回 200+基础状态信息，便于监控

---

## 7. 安全风险评估

### 🔴 中风险

| 风险 | 说明 | 建议 |
|------|------|------|
| **SSL 证书即将过期** | 2026-05-30 到期，约 33 天 | 立即准备续期/自动续期 |
| **源站 SSH 不可达** | 无法进行深度系统检查 | 配置 Cloudflare Tunnel 或保留源站 IP 白名单 |
| **无健康检查端点** | 外部监控无法快速判断服务状态 | 添加 `/api/health` |

### 🟡 低风险

| 风险 | 说明 | 建议 |
|------|------|------|
| Cloudflare 隐藏源站 IP | 防止直接攻击源站 | 保持现状 |
| Next.js 版本未知 | 可能存在已知漏洞 | 定期 `npm audit` |
| 日志无法远程查看 | SSH 不可达 | 配置日志收集服务 |

---

## 8. 建议行动

### 紧急 (1-2天内)
1. **SSL 证书续期** — 登录 Cloudflare 或 Let's Encrypt 续期，2026-05-30 前必须完成

### 短期 (1周内)
2. **添加健康检查端点** — 在 Next.js 添加 `/api/health` 返回服务状态
3. **确认源站 SSH 连接方式** — 找管理员获取正确的 SSH hostname/端口

### 中期 (1个月内)
4. **配置日志集中收集** — 将关键日志推送到可访问位置
5. **Next.js 依赖安全审计** — `npm audit fix`

---

## 总结

| 项目 | 状态 |
|------|------|
| 网站可访问性 | ✅ 正常 |
| SSL 证书有效期 | ⚠️ 33 天后到期 |
| 安全头配置 | ✅ 良好 |
| Cloudflare 保护 | ✅ 启用 |
| SSH 远程管理 | ❌ 不可达 |
| 系统深度检查 | ❌ 无法执行（需要源站访问） |

**综合评分**: 7/10  
**主因扣分**: SSL 即将过期 + 无法直连进行深度运维检查
