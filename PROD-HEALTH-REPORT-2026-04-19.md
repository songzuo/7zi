# 🛡️ 生产环境健康报告

**生成时间**: 2026-04-19 08:20 GMT+2  
**检查目标**: 7zi.com (165.99.43.61)  
**执行角色**: 🛡️ 系统管理员子代理

---

## 📊 服务状态总览

| 服务 | 状态 | 说明 |
|------|------|------|
| **Nginx** | ✅ 运行中 | master process 正常，8个worker进程 |
| **7zi-main** | ✅ 在线 | PM2 cluster模式，端口3000，uptime 18h |
| **ai-site** | ✅ 在线 | PM2 fork模式，端口3001，uptime 67m |

---

## 🌐 网站可用性测试

### 7zi.com (主站 - 静态站点)
```
状态: ✅ HTTP 200 OK
Content-Type: text/html
最后更新: Sun, 19 Apr 2026 04:48:30 GMT
服务目录: /var/www/erhu-brand
```

### ai.7zi.com (AI站点 - Next.js)
```
状态: ✅ HTTP 307 (语言重定向 - 正常行为)
重定向到: /zh
原因: next-intl 多语言自动重定向
服务目录: /var/www/new-7zi-site/.next/standalone
后端端口: 3001
```

⚠️ **关于307重定向**: ai.7zi.com 返回 307 是 **next-intl 的正常行为**，用于根据浏览器语言自动重定向到对应语言版本（/zh 或 /en）。这不是问题。

---

## ⚠️ 发现的问题

### 问题 1: visa.7zi.com 上游连接失败
```
错误: connect() failed (111: Unknown error) while connecting to upstream
上游: http://127.0.0.1:3003/
影响: visa.7zi.com 无法访问
原因: 端口3003没有服务监听
```
**建议**: 检查 visa.7zi.com 配置，确认上游服务是否需要启动

### 问题 2: 7zi-main 重启次数过多
```
重启次数: 16次
当前状态: online
```
**建议**: 检查 `/root/.pm2/logs/7zi-main-error-0.log` 排查重启原因

### 问题 3: SSL handshake 错误
```
错误: SSL_do_handshake() failed (SSL: error:0A00006C:SSL routines::bad key share)
影响: 少量连接失败
```
**分析**: 可能是 Cloudflare 或其他扫描器的连接问题，非关键

### 问题 4: ai-site 启动警告
```
警告: EADDRINUSE (端口3000已被占用)
说明: 当前 ai-site 正确运行在端口 3001
```
**分析**: 警告发生在启动时，但服务已通过端口3001正常运行

---

## 📋 PM2 进程详情

| ID | 名称 | 版本 | 模式 | PID | 端口 | 运行时间 | 重启次数 | 内存 |
|----|------|------|------|-----|------|----------|----------|------|
| 0 | 7zi-main | 1.3.0 | cluster | 2697060 | 3000 | 18h | 16 | 79.8MB |
| 2 | ai-site | 1.0.0 | fork | 2962783 | 3001 | 67m | 0 | 133.8MB |

---

## 🔍 Nginx 配置确认

- **7zi.com**: 静态站点，root `/var/www/erhu-brand`
- **ai.7zi.com**: Next.js 代理到 `127.0.0.1:3001`
- SSL证书: `/web/ssl_unified/7zi.com.crt` (泛域名)
- 安全头: HSTS, X-Content-Type-Options, X-Frame-Options 等已配置

---

## 📝 结论

| 项目 | 状态 |
|------|------|
| 7zi.com 主站 | ✅ 正常 |
| ai.7zi.com AI站点 | ✅ 正常 (307重定向为正常行为) |
| Nginx 服务 | ✅ 正常 |
| 7zi-main (主应用) | ⚠️ 运行但有16次重启历史 |
| ai-site (AI应用) | ✅ 正常 |
| visa.7zi.com | ❌ 需修复 (上游3003端口无服务) |

---

## ✅ 建议行动

1. **高优先级**: 检查 visa.7zi.com 的上游服务配置
2. **中优先级**: 调查 7zi-main 的16次重启原因
3. **低优先级**: 监控 SSL handshake 错误趋势

---

*报告生成: 2026-04-19 08:20 GMT+2*
