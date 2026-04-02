# 7zi.com 生产环境健康检查报告

**检查时间**: 2026-03-26 20:10 GMT+1  
**检查服务器**: 165.99.43.61 (主网站), 182.43.36.134 (测试机)

---

## ✅ 正常项

| 检查项     | 状态      | 说明                       |
| ---------- | --------- | -------------------------- |
| DNS 解析   | ✅ 正常   | 7zi.com → 165.99.43.61     |
| Nginx 服务 | ✅ 运行中 | 2天以上持续运行            |
| HTTP 响应  | ✅ 可访问 | HTTP 200/307               |
| 端口监听   | ✅ 正常   | 80/443/8080/8081/8082 正常 |
| 测试机连接 | ✅ 正常   | SSH 可连接                 |

**开放端口**:

- 80, 443: Nginx
- 8080, 8081, 8082: Node.js 应用
- 8443: ss-server
- 19000, 19001: node

---

## ⚠️ 需要关注的问题

### 1. 内存使用率过高 🔴

```
总内存: 7.8GB
已使用: 5.4GB (69%)
可用: 2.0GB
```

**风险**: 内存不足可能导致应用崩溃

### 2. PM2 应用崩溃循环 🔴

```
PM2 日志显示:
App [7zi:0] exited with code [1] via signal [SIGINT]
反复重启后最终停止 (2026-03-25 12:34:29)
```

**风险**: 主应用已停止运行，需重启

### 3. Nginx 配置冲突 🟡

```
[warn] conflicting server name "7zi.com" on 0.0.0.0:80
[warn] conflicting server name "7zi.com" on 0.0.0.0:443
```

**风险**: 多处重复配置导致警告

### 4. IPv6 连接错误 🔴

```
connect() to [2001:67c:4e8:f004::9]:443 failed (101: Unknown error)
```

**风险**: IPv6 上游连接失败

### 5. 缺少 SSL 证书路径 🟡

```
open() "/var/www/certbot/.well-known/acme-challenge/index.php" failed
```

**风险**: Let's Encrypt 验证可能失败

### 6. 响应时间较长 🟡

```
首页响应: 2.1-2.4秒
```

**风险**: 用户体验可能受影响

### 7. 磁盘使用率 🟡

```
使用率: 73% (64GB/88GB)
剩余: 24GB
```

**风险**: 需监控磁盘增长

---

## 🔴 紧急修复建议

### 1. 重启 PM2 应用

```bash
ssh root@165.99.43.61
pm2 start 7zi
pm2 save
```

### 2. 修复 Nginx 配置冲突

检查 `/etc/nginx/sites-enabled/` 和 `/etc/nginx/conf.d/` 中的重复 server_name 配置

### 3. 清理内存/扩容

考虑清理不需要的进程或增加内存

### 4. 禁用 IPv6 上游或修复连接

如果 IPv6 不需要，可以在 nginx 中禁用

---

## 📊 性能指标

| 指标      | 当前值  | 参考值        |
| --------- | ------- | ------------- |
| TTFB      | ~2.1s   | < 0.8s (良好) |
| HTTP 状态 | 307/200 | 200 (最佳)    |
| 内存使用  | 69%     | < 80%         |
| 磁盘使用  | 73%     | < 85%         |

---

## 检查方法

```bash
# 网站可访问性
curl -I https://7zi.com/

# API 端点
curl -I https://7zi.com/api/status

# 服务器状态
ssh root@165.99.43.61 'systemctl status nginx && pm2 list'

# 错误日志
ssh root@165.99.43.61 'tail -50 /var/log/nginx/error.log'
```
