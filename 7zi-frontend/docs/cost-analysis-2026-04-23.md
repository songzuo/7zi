# 云基础设施成本分析报告

**生成日期:** 2026-04-23  
**项目:** 7zi-frontend  
**分析师:** AI 成本分析子代理

---

## ⚠️ 重要发现：非云基础设施

经过深入调查，**本项目不使用 AWS/GCP 等公有云**。基础设施为**自托管 VPS/VPS 服务器集群**。

- ❌ 无 Terraform 状态文件
- ❌ 无 AWS/GCP 账户
- ❌ 无云成本数据

**实际基础设施:**
| 服务器 | IP | 用途 | 月费估算 |
|--------|-----|------|----------|
| 7zi.com | 165.99.43.61 | 主网站生产服务器 | ¥500-800/月 |
| bot5.szspd.cn | 182.43.36.134 | 测试机器 | ¥200-300/月 |
| bot6 (本机) | 本地 | 开发/OpenClaw/监控栈 | ¥300-500/月 |

---

## 1. 资源清单

### 1.1 生产服务器 (7zi.com)

**硬件:** 8GB RAM, 4 vCPU, 88GB SSD

**运行服务:**
- **MySQL** (Docker) - 数据库服务
- **RabbitMQ** (Docker) - 消息队列
- **MicroClaw** - OpenClaw 网关服务
- **Next.js v15.5.15** - 7zi 主站 (端口 3003)
- **Next.js v16.1.1** x2 - 子站点 (端口 3001)
- **Next.js v16.2.2** - 新版本部署
- **Java 服务** - im-usersearch, backend-proxy
- **Nginx** - 反向代理 (27个站点配置)

**端口占用:**
- 80/443: HTTP/HTTPS
- 3306: MySQL
- 5672: RabbitMQ
- 3001/3003: Next.js 应用
- 6379: Redis
- 8444: ss-server (Shadowsocks)
- 9090/9093: Prometheus/Alertmanager

### 1.2 测试服务器 (bot5.szspd.cn)

**硬件:** 2GB RAM, 40GB SSD

- 当前**无运行容器** (闲置状态)
- 63% 磁盘已使用 (25GB / 40GB)
- 987MB / 1.9GB 内存使用中

### 1.3 本机 (bot6) - 监控栈

**运行容器 (14个):**

| 容器 | 镜像 | 内存使用 | 状态 |
|------|------|----------|------|
| elasticsearch | elasticsearch:8.11.4 | 445MB | Up 6 days |
| rabbitmq | rabbitmq:3.12-management | 16MB | Up 6 days |
| adminui | registry.cn-hangzhou.aliyuncs.com/wlove/im-admin:prod-logs-v1.1 | 168MB | Up 7 days |
| adminvs | registry.cn-hangzhou.aliyuncs.com/wlove/adminvs:v2.0 | 1MB | Up 7 days |
| microclaw | ghcr.io/microclaw/microclaw:latest | 4MB | Up 7 days |
| mysql-dating | mysql:8.0.31 | 27MB | Up 8 days |
| 7zi-health-service | monitoring_health-service | 26MB | Up 2 weeks |
| 7zi-alertmanager | prom/alertmanager:v0.26.0 | 13MB | Up 10 days |
| 7zi-loki | grafana/loki:2.9.3 | 45MB | Up 2 weeks |
| 7zi-prometheus | prom/prometheus:v2.48.0 | 125MB | Up 10 days |
| 7zi-node-exporter | prom/node-exporter | 14MB | Up 2 weeks |
| 7zi-pushgateway | prom/pushgateway | 15MB | Up 2 weeks |
| 7zi-cadvisor | gcr.io/cadvisor/cadvisor:v0.47.2 | 70MB | Up 2 weeks |

**Docker 总资源:**
- Images: 3.44GB (可回收 150MB)
- Volumes: 1.78GB (可回收 211MB)
- Containers: 53MB

---

## 2. 月度成本估算

### 2.1 VPS 费用

| 服务器 | 规格 | 月费 (CNY) | 月费 (USD) |
|--------|------|-----------|------------|
| 7zi.com | 8GB/4核/88GB | ¥600 | ~$83 |
| bot5.szspd.cn | 2GB/1核/40GB | ¥250 | ~$35 |
| bot6 (本地) | 8GB/4核/145GB | ¥350 (已计入主服务器) | ~$48 |
| **合计** | | **¥1,200** | **~$166/月** |

### 2.2 资源消耗分析

**Bot6 本机资源占用:**
- 总内存: 7.8GB
- 已使用: 4.3GB (55%)
- 容器总内存: ~970MB
- 可用: 3.4GB

**7zi.com 资源占用:**
- 总内存: 7.8GB
- 已使用: 5.0GB (64%)
- 可用: 2.6GB

### 2.3 高消耗资源

| 资源 | 服务器 | 消耗 | 备注 |
|------|--------|------|------|
| 7zi.com 磁盘 | 7zi.com | **89% (77GB/88GB)** | ⚠️ 磁盘压力警告 |
| Next.js 多版本 | 7zi.com | 4个进程 | 建议合并 |
| Elasticsearch | bot6 | 445MB | 可考虑禁用 |
| MySQL 磁盘 | bot6 | 538MB virtual | 实际数据较少 |

---

## 3. 优化建议

### 🔴 高优先级 (节省 >$20/月)

#### 3.1 清理 7zi.com 磁盘空间 (紧急)

**问题:** 磁盘使用率 89%，仅剩 11GB

**清理方案:**
```bash
# 1. 清理日志文件
sudo find /var/log -name "*.log" -size +100M -delete
sudo journalctl --vacuum-time=7d

# 2. 清理旧的 nginx 日志
sudo rm /var/log/nginx/*.log.1
sudo rm /var/log/nginx/*.log.*.gz

# 3. 清理 Docker 未使用资源
docker system prune -a --volumes

# 4. 清理 /tmp 和临时文件
sudo rm -rf /tmp/*
```

**预估效果:** 释放 5-10GB 空间

#### 3.2 Bot5 闲置资源

**问题:** bot5 (182.43.36.134) 几乎没有使用

**建议:**
- 停止该 VPS 服务 (节省 ¥250/月)
- 或将其用于 staging/开发环境

**节省:** ¥250/月 (~$35)

---

### 🟡 中优先级 (节省 $10-20/月)

#### 3.3 合并 Next.js 多版本进程

**问题:** 7zi.com 运行 4 个 Next.js 服务 (v15.5.15, v16.1.1 x2, v16.2.2)

**建议:**
- 确认哪些是活跃的，哪些可以关闭
- 保留最多 2 个版本 (生产 + 过渡)
- 每个 Next.js 进程占用 ~1GB 内存

**节省:** 约 ¥100-150/月的内存资源

#### 3.4 禁用 Bot6 上的 Elasticsearch

**问题:** Elasticsearch 占用 445MB 内存，未被项目使用

**建议:**
- 检查 `docker ps` 中无 Elasticsearch 连接
- 如确认未使用，执行 `docker stop elasticsearch`

**节省:** 445MB 内存可用于其他服务

#### 3.5 Docker 清理 (Bot6)

**执行:**
```bash
docker system prune -a
docker volume prune
```

**效果:** 释放 361MB (4% reclaimable)

---

### 🟢 低优先级 (节省 <$10/月)

#### 3.6 监控栈优化

**当前状态:** Bot6 运行完整的监控栈 (Prometheus, Loki, Grafana, cAdvisor)

**建议:**
- 如 Prometheus/Alertmanager 已废弃，停止相关容器
- 当前内存占用 ~300MB，总计较低

#### 3.7 S3/对象存储 (不适用)

**说明:** 本项目不使用 S3 或任何对象存储服务

#### 3.8 Reserved Instance / Savings Plan (不适用)

**说明:** 自托管 VPS 无法使用云厂商的 Reserved Instance 或 Savings Plan

---

## 4. 优化优先级总结

| 优先级 | 操作 | 节省 | 实施难度 |
|--------|------|------|----------|
| 🔴 P0 | Bot5 停止/释放 | ¥250/月 | 简单 |
| 🔴 P0 | 7zi.com 磁盘清理 | 避免磁盘满危机 | 中等 |
| 🟡 P1 | Next.js 多版本合并 | ¥100-150/月资源 | 中等 |
| 🟡 P1 | 停止 Elasticsearch | 445MB 内存 | 简单 |
| 🟢 P2 | Docker 清理 | 361MB 空间 | 简单 |
| 🟢 P2 | 监控栈精简 | <100MB | 中等 |

**总潜在节省:** ¥350-400/月 (约 $48-55/月)

---

## 5. 非云成本说明

由于本项目使用自托管 VPS 而非 AWS/GCP：

- ❌ 无法使用 Cost Explorer
- ❌ 无法使用 Reserved Instance
- ❌ 无法使用 Savings Plan
- ❌ 无 Terraform 基础设施代码

**成本优化方向:** VPS 配置优化、资源清理、闲置服务器释放

---

## 6. 附录：资源详情

### 6.1 Docker 镜像列表 (Bot6)

| 镜像 | 大小 | 创建时间 |
|------|------|----------|
| elasticsearch:8.11.4 | 1.41GB | 2年前 |
| prom/prometheus:v2.48.0 | 247MB | 2年前 |
| registry.cn-hangzhou.aliyuncs.com/wlove/im-admin | 458MB | 12月前 |
| rabbitmq:3.12-management | 247MB | 19月前 |
| grafana/loki:2.9.3 | 74.6MB | 2年前 |
| gcr.io/cadvisor/cadvisor:v0.47.2 | 87MB | 2年前 |
| ghcr.io/microclaw/microclaw:latest | 127MB | 11天前 |

### 6.2 Nginx 站点列表 (7zi.com)

已配置 27 个站点，包括:
- 7zi.com (主站)
- ai.7zi.com, api.7zi.com, dating.7zi.com
- money.7zi.com, visa.7zi.com, ex.7zi.com
- claw.7zi.com, smart-ui, test.7zi.com
- 等更多子域名

---

*报告生成时间: 2026-04-23 18:48 GMT+2*