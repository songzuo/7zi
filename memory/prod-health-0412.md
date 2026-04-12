# 生产环境健康检查报告

**检查时间**: 2026-04-12 13:53 (GMT+2)  
**服务器**: 7zi.com (165.99.43.61)  
**运行时间**: 19 天 5 小时

---

## ✅ 系统概览

| 项目 | 状态 | 详情 |
|------|------|------|
| 系统运行 | ✅ 正常 | 19天5小时 |
| 负载 | ✅ 低 | 0.25, 0.22, 0.24 |
| CPU | ✅ 空闲 98.6% | 几乎无负载 |
| 内存 | ⚠️ 偏高 | 5.1Gi/7.8Gi (65%)，可用 2.3Gi |
| 磁盘 | ⚠️ 需关注 | 66G/88G used (76%)，剩余 22G |
| Swap | ✅ 正常 | 未使用 |

---

## ✅ Docker 容器 (3个运行中)

| 容器 | 镜像 | 状态 | 端口 |
|------|------|------|------|
| mysql-dating | mysql:8.0 | ✅ Up 41h | 3306 |
| rabbitmq-dating | rabbitmq:3-management | ✅ Up 41h | 5672, 15672 |
| microclaw | ghcr.io/microclaw/microclaw:latest | ✅ Up 2d | - |

---

## ✅ PM2 进程 (5个在线)

| 进程名 | 版本 | PID | 运行时长 | 内存 | 重启 | 状态 |
|--------|------|-----|---------|------|------|------|
| 7zi-main | 1.10.1 | 533009 | 25h | 135.2mb | 0 | ✅ online |
| ex-7zi | N/A | 475670 | 27h | 44.5mb | 0 | ✅ online |
| export-7zi | N/A | 495028 | 26h | 47.8mb | 0 | ✅ online |
| money-7zi | 1.0.0 | 641842 | 15h | 62.3mb | **22** | ✅ online |
| visa | N/A | 475861 | 27h | 14.9mb | 0 | ✅ online |

**⚠️ 注意**: `money-7zi` 有 22 次重启记录，可能存在稳定性问题

---

## ✅ Nginx 服务

- **状态**: active (running)
- **运行时间**: 3天 (自 2026-04-09 11:36)
- **Worker进程**: 8个
- **内存**: 40.4M
- **近期reload**: 多次 (4月11日多次reload)

---

## ✅ 网站可访问性

| URL | 状态码 | 响应时间 |
|-----|--------|---------|
| https://7zi.com | 307 | 0.82s |
| http://7zi.com | 301 | 0.53s |

---

## 📋 端口监听 (关键端口)

| 端口 | 服务 | 状态 |
|------|------|------|
| 80/443 | Nginx | ✅ LISTEN |
| 3000 | Next.js (7zi-main) | ✅ LISTEN |
| 3306 | MySQL (Docker) | ✅ LISTEN |
| 5672 | RabbitMQ | ✅ LISTEN |
| 6379 | Redis | ✅ LISTEN |
| 18089 | Nginx/money-7zi | ✅ LISTEN |
| 18090 | money-7zi | ✅ LISTEN |

---

## ⚠️ 需要关注的问题

1. **磁盘使用 76%** - 建议清理或扩容 (剩余22G)
2. **money-7zi 重启22次** - 检查日志排查问题
3. **内存使用 65%** - 目前尚可，但需监控

---

## 📁 /opt 目录下的项目

```
7zi-frontend/       - 前端
api-gateway/        - API网关 (22目录)
api-gateway-backup/ - 备份
claw-mesh/          - Claw Mesh
clawmail/           - ClawMail
dating-project/     - 交友项目
microclaw/          - MicroClaw
openclaw-cluster/   - OpenClaw集群
probe-7zi/          - 探测服务
```

---

**检查完成**: 2026-04-12 13:54 GMT+2
