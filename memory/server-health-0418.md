# 服务器健康检查报告
**检查时间**: 2026-04-18 02:40 GMT+2

---

## 1️⃣ 7zi.com (165.99.43.61) - 生产服务器

### 状态: ✅ 正常运行

| 项目 | 状态 |
|------|------|
| 运行时间 | 24天 23小时 |
| 负载 | 1.15, 1.18, 1.10 (正常) |
| 内存 | 4.1Gi / 7.8Gi (53%) |
| 磁盘 | 66G / 88G (76%) ⚠️ |
| Docker | 3个容器运行中 |

### Docker 容器
- `rabbitmq-dating` - Up 7天 ✅
- `mysql-dating` - Up 7天 ✅
- `microclaw` - Up 8天 ✅

### 服务
- nginx.service ✅ 运行中
- node_exporter.service ✅ 运行中

### 警告
⚠️ **磁盘使用率 76%** - 建议关注
⚠️ fwupd metadata 更新失败 (systemd)

---

## 2️⃣ bot5.szspd.cn (182.43.36.134) - 测试服务器

### 状态: ✅ 正常运行

| 项目 | 状态 |
|------|------|
| 运行时间 | 22天 12小时 |
| 负载 | 0.03, 0.03, 0.00 (很空闲) |
| 内存 | 809Mi / 1.9Gi (正常) |
| 磁盘 | 25G / 40G (63%) |
| Docker | 无容器运行 |

### 服务
- nginx.service ✅ 运行中
- node_exporter.service ✅ 运行中

---

## 3️⃣ bot6 (本地) - OpenClaw 运行服务器

### 状态: ⚠️ 需要关注

| 项目 | 状态 |
|------|------|
| 运行时间 | 39天 15小时 |
| 负载 | 4.87, 3.26, 2.83 ⚠️ 偏高 |
| 内存 | 4.1Gi / 7.8Gi (53%) |
| 磁盘 | 72G / 145G (50%) |
| Swap | 2.6Gi / 4.0Gi (65%) ⚠️ |

### Docker 容器 (17个)
**运行中** (14个):
- elasticsearch, rabbitmq, adminui, adminvs ✅
- microclaw ✅
- mysql-dating, redis-dating ✅
- 7zi-* 监控栈 (prometheus, grafana, loki, alertmanager, cadvisor, node-exporter, pushgateway) ✅
- 7zi-health-service ✅

**已停止** (2个):
- redis-dating - Created (未启动)
- 7zi-grafana - Exited (1) 12天前 ⚠️

### OpenClaw 状态
- 状态检查进行中...

---

## 4️⃣ 错误日志摘要 (24小时内)

### 7zi.com
**SSH 攻击告警** - 大量 SSH 连接错误/暴力破解:
- `kex_exchange_identification` 错误 - 频繁
- `MaxStartups throttling` - 有人扫描SSH
- `client sent invalid protocol identifier "GET / HTTP/1.1"` - HTTP扫描

**Nginx SSL 错误**:
- SSL handshake failed (bad key share) - 来自 212.102.40.218, 38.147.164.245 等IP
- `/SDK/webLanguage` 404 - 有人探测

### bot5.szspd.cn
**SSH 攻击告警** - 大量 SSH 连接错误:
- 与7zi.com类似的大量扫描/暴力破解尝试

### bot6 (本地)
**SSH 暴力破解** - 大量来自以下IP的尝试:
- 45.148.10.x, 2.57.122.x, 2.57.121.x 等多个IP段
- 多次出现 "maximum authentication attempts exceeded"

**Nginx 错误**:
- `/opt/frontend/` directory index forbidden ⚠️
- rewrite/internal redirection cycle (有人在扫 .env, favicon.ico, sitemap.xml)
- 有人在用 HTTP/1.0 扫 bot6.szspd.cn

---

## 📋 建议

1. **bot6 负载偏高 (4.87)** - 检查是否有异常进程
2. **bot6 Swap 使用 65%** - 内存可能紧张，考虑优化
3. **bot6 nginx frontend 配置问题** - `/opt/frontend/` 目录索引被禁止，需修复nginx配置
4. **SSH 暴露在公网** - 三台服务器都遭受大量SSH扫描，建议:
   - 确认防火墙只允许必要IP访问SSH
   - 考虑更改SSH端口或使用密钥认证
5. **7zi.com 磁盘 76%** - 关注磁盘空间，及时清理
6. **7zi-grafana 容器退出** - 需手动启动或检查

---

*检查完成 - 2026-04-18 02:42 GMT+2*
