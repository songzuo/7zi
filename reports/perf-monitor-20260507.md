# 性能监控报告 - 2026-05-07 02:14

## 系统概览

| 项目 | 状态 |
|------|------|
| 主机 | bot6 |
| 运行时长 | 58 天 14 小时 57 分 |
| 当前时间 | 02:14:57 |
| 时区 | Europe/Berlin (GMT+2) |

---

## 1. 系统负载

```
02:14:57 up 58 days, 14:57,  5 users,  load average: 4.57, 3.47, 3.12
```

| 指标 | 当前 | 5分钟前 | 15分钟前 |
|------|------|---------|----------|
| 负载均值 | 4.57 | 3.47 | 3.12 |

**⚠️ 告警**: 负载较高 (4.57)，已超过 CPU 核心数（需确认核心数）。负载呈上升趋势。

---

## 2. 内存状态

```
Mem:            7941        5219         572           3        2523        2721
Swap:           4095        2465        1630
```

| 内存类型 | 总计 | 已用 | 可用 | 使用率 |
|----------|------|------|------|--------|
| 物理内存 | 7941 MB | 5219 MB | 2721 MB | **65.7%** |
| Swap | 4095 MB | 2465 MB | 1630 MB | **60.2%** |

**⚠️ 告警**:
- Swap 使用率 60.2%，系统存在内存压力
- 物理内存可用仅 2721 MB (34.3%)，可用较低

---

## 3. 磁盘状态

```
/dev/sda1       145G   71G   75G  49% /
```

| 文件系统 | 总计 | 已用 | 可用 | 使用率 |
|----------|------|------|------|--------|
| / (根分区) | 145 GB | 71 GB | 75 GB | 49% |
| /boot | 881 MB | 117 MB | 703 MB | 15% |
| /boot/efi | 105 MB | 6.2 MB | 99 MB | 6% |

**✅ 正常**: 根分区使用率 49%，磁盘空间充足。

---

## 4. Top 10 CPU 进程

| PID | CPU% | MEM% | RSS | 命令 |
|-----|------|------|-----|------|
| 3639334 | **99.7** | 2.5 | 204200 KB | vitest worker (forks.js) |
| 3963084 | 57.4 | 0.9 | 76552 KB | npm exec tsc --noEmit |
| 986887 | 10.9 | 22.7 | 1845972 KB | openclaw-gateway |
| 3582905 | 8.1 | 1.0 | 86352 KB | cadvisor |
| 3957589 | 2.7 | 1.8 | 153448 KB | vitest worker (forks.js) |
| 776866 | 2.6 | 0.8 | 71072 KB | mysqld |
| 3951498 | 1.9 | 1.9 | 154900 KB | vitest worker (forks.js) |
| 3951430 | 1.5 | 1.8 | 149212 KB | vitest.mjs --run |
| 3957533 | 2.2 | 1.8 | 148848 KB | vitest.mjs run |
| 3957596 | 2.0 | 1.8 | 146984 KB | vitest worker (forks.js) |

## 5. Top 10 内存进程

| PID | CPU% | MEM% | RSS | 命令 |
|-----|------|------|-----|------|
| 986887 | 10.9 | **22.7** | 1845972 KB | openclaw-gateway |
| 3354444 | 0.8 | 4.9 | 405140 KB | elasticsearch java |
| 3583292 | 0.8 | 4.9 | 398660 KB | vitest.mjs run |
| 3639334 | 99.7 | 2.5 | 204200 KB | vitest worker |
| 989687 | 2.0 | 2.7 | 220672 KB | im-usersearch.jar |
| 3957589 | 2.7 | 1.8 | 153448 KB | vitest worker |
| 3951498 | 1.9 | 1.9 | 154900 KB | vitest worker |
| 3951430 | 1.5 | 1.8 | 149212 KB | vitest.mjs |
| 3957533 | 2.2 | 1.8 | 148848 KB | vitest.mjs |
| 3957596 | 2.0 | 1.8 | 146984 KB | vitest worker |
| 2213253 | 0.8 | 1.8 | 152628 KB | prometheus |

---

## 6. 监听端口列表

| 端口 | 服务 | 说明 |
|------|------|------|
| 22 | SSH | 服务器管理 |
| 80 | HTTP | Web 服务 |
| 443 | HTTPS | 安全 Web |
| 3306 | MySQL | 数据库 |
| 4369 | Erlang Port Mapper | RabbitMQ/Erlang |
| 5001 | - | 备用服务 |
| 5672 | AMQP | RabbitMQ |
| 6379 | Redis | 缓存/消息队列 |
| 8080 | HTTP | Java/Node 服务 |
| 8085 | - | Java/Node 服务 |
| 8111 | - | 备用服务 |
| 8579 | - | 备用服务 |
| 8889 | - | 备用服务 |
| 8868 | - | 备用服务 |
| 9090 | Prometheus | 监控 |
| 9091 | - | 监控相关 |
| 9093 | - | 监控相关 |
| 9100 | - | 指标收集 |
| 9101 | - | 指标收集 |
| 9200 | Elasticsearch | 搜索引擎 |
| 9300 | Elasticsearch | 节点通信 |
| 18789-18792, 18795 | - | OpenClaw 相关 |
| 19001 | - | OpenClaw 相关 |
| 2325 | - | 备用服务 |
| 28790 | - | 备用服务 |
| 3100 | - | Grafana/Loki |
| 15672 | RabbitMQ | 管理界面 |
| 15692 | - | 监控指标 |
| 5001 | - | 开发服务 |

---

## 7. OpenClaw 服务状态

```
○ openclaw.service - OpenClaw Gateway
     Loaded: loaded (/etc/systemd/system/openclaw.service; disabled; preset: enabled)
     Active: inactive (dead)
```

**进程信息**:
- PID 986863: openclaw
- PID 986887: openclaw-gateway

**⚠️ 告警**:
- OpenClaw 服务通过 systemd 运行时处于 `inactive (dead)` 状态
- 但进程仍在运行 (PID 986863, 986887)，可能是直接启动未通过 systemd
- 建议检查是否需要重启 systemd 服务

---

## 8. 异常告警汇总

### 🚨 严重告警

1. **Vitest Worker CPU 占用 99.7%**
   - PID: 3639334
   - CPU: 99.7%
   - 累计运行时间: 282:52 (约 4.7 小时)
   - 建议: 这是之前发现的 vitest worker，需立即终止或等待测试完成

2. **多个 Vitest Worker 进程**
   - 发现至少 7 个 vitest 相关进程
   - 总 CPU 占用: 约 115%+
   - 建议: 确认是否有测试任务在运行，如无应终止

3. **Swap 使用率过高**
   - Swap 已使用 2465 MB (60.2%)
   - 表明系统内存压力较大

### ⚠️ 警告

1. **系统负载上升**
   - 5分钟前: 3.47 → 当前: 4.57 (上升 31%)
   - 需持续监控

2. **OpenClaw systemd 服务状态异常**
   - 服务定义存在但处于 dead 状态
   - 实际进程仍在运行，建议重新加载 systemd 配置

3. **npm exec tsc 占用 57.4% CPU**
   - 可能是 TypeScript 类型检查
   - 占用较高，建议观察

---

## 9. 优化建议

### 立即行动

1. **终止异常 vitest worker**
   ```bash
   kill -9 3639334
   ```
   该进程已运行 4.7 小时且占用 99.7% CPU，应检查测试任务状态

2. **检查 vitest 测试状态**
   ```bash
   ps aux | grep vitest
   ```
   确认是否有正在运行的测试，如有多个可考虑批量终止

### 短期优化

1. **重启 OpenClaw systemd 服务**
   ```bash
   systemctl daemon-reload
   systemctl restart openclaw
   ```

2. **监控 Swap 使用**
   - 如 Swap 持续上升，考虑：
     - 增加物理内存
     - 优化应用内存使用
     - 限制 vitest 并发数

3. **限制 vitest 资源使用**
   - 在 vitest 配置中限制并行 worker 数量
   - 添加 `--workers` 参数限制并发

### 长期建议

1. **资源隔离**
   - 将 vitest 测试环境与生产环境分离
   - 使用容器化隔离测试资源

2. **监控告警**
   - 配置 CPU > 80% 持续 N 分钟的告警
   - 设置 Swap 使用率 > 70% 告警

3. **定时任务**
   - 设置每日自动清理过期 vitest 进程
   - 配置资源使用超限自动告警

---

## 附录：完整进程列表（vitest 相关）

| PID | CPU% | MEM% | 启动时间 | 命令 |
|-----|------|------|----------|------|
| 3639334 | 99.7 | 2.5 | May06 | vitest forks.js |
| 3957589 | 2.7 | 1.8 | 02:11 | vitest forks.js |
| 3951498 | 1.9 | 1.9 | 02:07 | vitest forks.js |
| 3957596 | 2.0 | 1.8 | 02:11 | vitest forks.js |
| 3951507 | 1.3 | 1.6 | 02:07 | vitest forks.js |
| 3951430 | 1.5 | 1.8 | 02:07 | vitest.mjs --run |
| 3957533 | 2.2 | 1.8 | 02:11 | vitest.mjs run |
| 3583292 | 0.8 | 4.9 | May06 | vitest.mjs run |

**共计 8 个 vitest 进程**

---

*报告生成时间: 2026-05-07 02:14 GMT+2*
*检查周期: 每日自动执行*
