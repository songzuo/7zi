# 🛡️ 服务器健康检查报告

**检查时间**: 2026-04-17 03:33 GMT+2  
**服务器**: bot6 (本机)

---

## 1. PM2 进程状态

⚠️ **PM2 未安装或不在 PATH 中**

---

## 2. 内存使用 (free -h)

```
               total        used        free      shared  buff/cache   available
Mem:           7.8Gi       4.4Gi       259Mi        30Mi       3.4Gi       3.3Gi
Swap:          4.0Gi       1.3Gi       2.7Gi
```

**状态**: ✅ 内存充足，available 3.3Gi

---

## 3. 磁盘空间 (df -h)

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       145G   68G   77G  48% /
```

**状态**: ✅ 磁盘使用 48%，剩余 77G，空间充足

---

## 4. Docker 容器状态

| CONTAINER ID | IMAGE | STATUS | PORTS | NAMES |
|-------------|-------|--------|-------|-------|
| 9a5279d2b4bf | elasticsearch:8.11.4 | Up 4 minutes | - | elasticsearch |
| 6de180896795 | rabbitmq:3.12-management | Up 7 minutes | - | rabbitmq |
| 6553f5bfc211 | mysql:8.0.31 | Up 39 hours | 3306/tcp | mysql-dating |
| 57a3ade9710d | im-admin:prod-logs-v1.1 | Up 20 hours | - | adminui |
| 3339c44ae452 | microclaw:latest | Up 14 hours | 28790/tcp | microclaw |
| 435e596d9014 | adminvs:v2.0 | Up 21 hours | 8111/tcp | adminvs |
| 763f49c930c5 | prom/prometheus:v2.48.0 | Up 3 days (healthy) | 9090/tcp | 7zi-prometheus |
| 5d2c543ed485 | grafana/loki:2.9.3 | Up 12 days (healthy) | 3100/tcp | 7zi-loki |
| 09daa62fa489 | prom/alertmanager:v0.26.0 | Up 3 days (healthy) | 9093/tcp | 7zi-alertmanager |
| 4e5071c589a8 | prom/node-exporter:v1.7.0 | Up 11 days (healthy) | 9100/tcp | 7zi-node-exporter |
| 64e743a00f64 | prom/pushgateway:v1.6.1 | Up 12 days (healthy) | 9091/tcp | 7zi-pushgateway |
| f1b02f68a91b | cadvisor:v0.47.2 | Up 12 days (healthy) | 8080/tcp | 7zi-cadvisor |
| 9267b169991b | monitoring_health-service | Up 11 days (healthy) | 8085/tcp | 7zi-health-service |

**状态**: ✅ 14 个容器运行中，7 个监控服务 healthy

---

## 5. 系统负载

```
03:33:57 up 38 days, 16:16, 4 users, load average: 4.05, 3.56, 3.27
```

**状态**: ⚠️ 负载较高 (4.05)，但正常运行

---

## 📊 健康总结

| 项目 | 状态 |
|------|------|
| PM2 | ⚠️ 未安装 |
| 内存 | ✅ 正常 (3.3Gi available) |
| 磁盘 | ✅ 正常 (48% used) |
| Docker | ✅ 14 容器运行中 |
| 系统负载 | ⚠️ 偏高 (4.05) |

**整体状态**: ✅ 服务器运行正常
