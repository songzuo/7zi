# 服务器健康检查报告
**检查时间**: 2026-05-04 14:44 GMT+2  
**检查人**: 系统管理员子代理

---

## 📊 服务器状态卡片

### 🖥️ 本地服务器 (bot6)

| 项目 | 状态 | 详情 |
|------|------|------|
| **主机名** | bot6 | 运行中 |
| **运行时间** | ✅ 56 天 | 2026-03-09 启动 |
| **负载** | ⚠️ 较高 | 7.04, 4.98, 5.14 (15min/5min/1min) |
| **CPU 用户** | high | 负载 > 7，需关注 |
| **内存总量** | 7.8 GiB | - |
| **内存使用** | ⚠️ 3.9 GiB (50%) | 还有 3.9 GiB 可用 |
| **Swap** | ⚠️ 2.5 GiB / 4 GiB (62%) | 使用较多，可能内存压力 |
| **磁盘 /dev/sda1** | ✅ 75 GiB 可用 (49%) | 健康 |
| **Docker 容器** | ✅ 14 容器运行 | 全部 Up |

#### Docker 容器列表
| 容器 | 镜像 | 状态 | 端口 |
|------|------|------|------|
| elasticsearch | elasticsearch:8.11.4 | Up 2 weeks | - |
| rabbitmq | rabbitmq:3.12-management | Up 2 weeks | 15672 |
| adminui | registry.cn-hangzhou.aliyuncs.com/wlove/im-admin:prod-logs-v1.1 | Up 2 weeks | - |
| adminvs | registry.cn-hangzhou.aliyuncs.com/wlove/adminvs:v2.0 | Up 2 weeks | 8111 |
| microclaw | ghcr.io/microclaw/microclaw:latest | Up 2 weeks | 28790 |
| mysql-dating | mysql:8.0.31 | Up 2 weeks | 3306 |
| 7zi-health-service | monitoring_health-service | Up 4 days (healthy) | 8085 |
| 7zi-alertmanager | prom/alertmanager:v0.26.0 | Up 3 weeks (healthy) | 9093 |
| 7zi-loki | grafana/loki:2.9.3 | Up 4 weeks (healthy) | 3100 |
| 7zi-prometheus | prom/prometheus:v2.48.0 | Up 3 weeks (healthy) | 9090 |
| 7zi-node-exporter | prom/node-exporter:v1.7.0 | Up 4 days (healthy) | 9101 |
| 7zi-pushgateway | prom/pushgateway:v1.6.1 | Up 4 weeks (healthy) | 9091 |
| 7zi-cadvisor | gcr.io/cadvisor/cadvisor:v0.47.2 | Up 4 weeks (healthy) | 8080 |

---

### 🖥️ Bot5 测试服务器 (182.43.36.134)

| 项目 | 状态 | 详情 |
|------|------|------|
| **主机名** | ecm-cd59 | 运行中 |
| **运行时间** | ✅ 39 天 | 2026-03-26 启动 |
| **负载** | ✅ 极低 | 0.00, 0.02, 0.00 |
| **内存总量** | 1.9 GiB | - |
| **内存使用** | ⚠️ 987 MiB (52%) | 还有 782 MiB 可用 |
| **Swap** | ⚠️ 672 MiB / 2 GiB (34%) | 使用中 |
| **磁盘 /dev/vda2** | ⚠️ 14 GiB 可用 (68%) | 使用 27 GB / 40 GB |
| **Docker** | ⚠️ 无 Docker | 未安装 |
| **应用目录** | ✅ `/root/7zi-website/` | 存在，数据完整 |

#### 应用状态 (Bot5)
- **项目版本**: v1.14.1 (最后更新 Apr 30 15:33)
- **日志目录**: 无独立日志文件
- **Nginx**: 未部署或未运行
- **应用进程**: 未检测到运行中的 Node 进程

---

## ❌ 发现的问题

### 1. 本地服务器 (bot6) - 高负载
- **负载过高**: 7.04 (15min) - 可能因多个 Docker 容器同时运行
- **Swap 使用率高**: 62% (2.5 GiB / 4 GiB) - 可能有内存压力

### 2. Bot5 服务器 - 磁盘空间紧张
- **磁盘使用 68%**: 27 GB / 40 GB 仅剩 14 GB
- **内存不足**: 1.9 GiB 总内存，使用 987 MiB，可用仅 782 MiB

### 3. Bot5 服务器 - 无 Docker
- 生产环境使用 Docker，但 Bot5 未安装 Docker
- 如需在 Bot5 部署 Docker 服务需先安装 Docker

### 4. Bot5 服务器 - 无应用运行
- 7zi-website 目录存在但无日志文件
- 未检测到 Node 进程或 Nginx 进程
- 应用可能未启动

---

## 💡 优化建议

### 本地服务器 (bot6)
1. **降低负载**: 负载 7+ 较高，建议检查是否有资源密集型任务
2. **Swap 优化**: 考虑增加物理内存或减少容器数量

### Bot5 服务器 (182.43.36.134)
1. **磁盘清理**: 68% 使用率，建议清理旧文件、备份
2. **内存优化**: 1.9 GiB 较小，考虑增加内存
3. **应用部署**: 如需运行应用需先安装 Docker 或 Node.js 运行环境
4. **监控**: 建议部署监控探针以便远程检查

---

## 📋 对比上次部署状态

| 项目 | 上次 (13:45) | 本次 (14:44) | 变化 |
|------|--------------|--------------|------|
| Bot5 连接 | ✅ 成功 | ✅ 成功 | 无变化 |
| Bot5 磁盘 | 68% | 68% | 无变化 |
| Bot5 内存 | 987 MiB | 987 MiB | 无变化 |
| 本地负载 | - | 7.04 | ⚠️ 较高 |
| 本地 Swap | - | 62% | ⚠️ 较高 |

---

**结论**: 两台服务器运行正常，但均存在资源使用优化空间。Bot5 需关注磁盘空间，本地服务器(bot6)需关注高负载问题。
