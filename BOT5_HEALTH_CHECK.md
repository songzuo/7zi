# BOT5 健康检查报告

**服务器:** bot5.szspd.cn (182.43.36.134)  
**检查时间:** 2026-03-30 03:41 UTC (05:41 GMT+2)  
**检查者:** ⚡ Executor 子代理

---

## 📊 系统状态

| 项目         | 状态  | 详情                                    |
| ------------ | ----- | --------------------------------------- |
| **主机名**   | ✅    | ecm-cd59                                |
| **操作系统** | ✅    | Ubuntu 20.04.6 LTS (5.15.0-161-generic) |
| **运行时间** | ✅    | 3天 15小时 15分钟                       |
| **负载**     | ⚠️ 高 | 0.59, 0.68, 0.71                        |

### CPU 使用率

| 项目         | 数值                                | 状态    |
| ------------ | ----------------------------------- | ------- |
| **总使用率** | 86.7% user, 13.3% system            | ⚠️ 高   |
| **最高进程** | openclaw (PID 496731) @ 99.9% CPU   | ❌ 异常 |
| **Tasks**    | 129 total (2 running, 127 sleeping) | ✅      |

### 内存使用

| 项目     | 数值                               | 状态 |
| -------- | ---------------------------------- | ---- |
| **总量** | 1.9 GiB                            | -    |
| **已用** | 1.0 GiB (51%)                      | ✅   |
| **空闲** | 205 MiB                            | ✅   |
| **可用** | 758 MiB                            | ✅   |
| **Swap** | 2.0 GiB (273MiB used, 1.7GiB free) | ✅   |

### 磁盘使用

| 分区  | 大小 | 已用 | 可用 | 使用率 | 状态 |
| ----- | ---- | ---- | ---- | ------ | ---- |
| **/** | 40G  | 27G  | 14G  | 67%    | ✅   |

---

## 🔧 服务状态

### ✅ 正常运行

| 服务              | 状态                | 版本/备注              |
| ----------------- | ------------------- | ---------------------- |
| **Nginx**         | ✅ Active (running) | nginx/1.18.0, 配置正确 |
| **PostgreSQL**    | ✅ Active (exited)  | 运行中，端口 5432      |
| **SSH**           | ✅ Active           | 端口 22                |
| **node_exporter** | ✅ Active           | 端口 9100, 9101        |
| **zerotier-one**  | ✅ Active           | 端口 9993              |
| **cups**          | ✅ Active           | 打印机服务             |
| **rpcbind**       | ✅ Active           | 端口 111               |

### ❌ 未运行 / 需要关注

| 服务                 | 状态        | 说明                                               |
| -------------------- | ----------- | -------------------------------------------------- |
| **Docker**           | ❌ 未安装   | 命令执行失败                                       |
| **OpenClaw Gateway** | ❌ Inactive | 端口 18789/18791/18792 监听中但 systemd 服务未运行 |

---

## 🌐 网络端口

| 端口              | 服务             | 状态                  |
| ----------------- | ---------------- | --------------------- |
| 22                | SSH              | ✅ LISTEN             |
| 80                | HTTP (Nginx)     | ✅ LISTEN             |
| 443               | HTTPS (Nginx)    | ✅ LISTEN             |
| 8000              | Nginx            | ✅ LISTEN             |
| 8888              | Nginx            | ✅ LISTEN             |
| 5432              | PostgreSQL       | ✅ LISTEN (127.0.0.1) |
| 9100              | node_exporter    | ✅ LISTEN             |
| 9101              | node_exporter    | ✅ LISTEN             |
| 9993              | zerotier-one     | ✅ LISTEN             |
| 111               | rpcbind          | ✅ LISTEN             |
| 631               | cups             | ✅ LISTEN             |
| 18789/18791/18792 | openclaw-gateway | ✅ LISTEN (127.0.0.1) |

---

## 🌐 网站访问测试

| 测试项                | 结果      |
| --------------------- | --------- |
| **HTTP (localhost)**  | ✅ 200 OK |
| **HTTPS (localhost)** | ✅ 200 OK |
| **bot5.szspd.cn**     | ✅ 200 OK |

---

## ⚠️ 发现的问题

### 1. 🔴 CPU 使用率过高

- **问题:** openclaw 进程 (PID 496731) 占用了 99.9% CPU
- **影响:** 系统负载高，响应可能变慢
- **建议:** 检查 OpenClaw 是否有死循环或异常任务

### 2. 🟡 Docker 未安装

- **问题:** Docker 服务不存在
- **影响:** 无法使用容器化部署
- **建议:** 如需 Docker，可执行 `apt install docker.io`

### 3. 🟡 OpenClaw Gateway 服务未注册

- **问题:** systemd 显示 openclaw-gateway inactive，但进程在运行
- **影响:** 进程通过其他方式启动（非 systemd）
- **建议:** 检查启动脚本或配置 systemd 服务

### 4. 🟡 防火墙未启用

- **问题:** UFW status: inactive
- **影响:** 服务器暴露在公网
- **建议:** 考虑启用防火墙并配置规则

---

## 📋 进程列表

```
PID      USER     %CPU  COMMAND
496731   root     99.9  openclaw (高负载源)
11547    root      0.0  node /root/autonomous-agent.js
1482     root      0.0  python3 cluster-agent.py
932      root      0.0  node_exporter
874      root      0.0  fail2ban-server
1158     root      0.0  nginx: master process
1159     www-data 0.0  nginx: worker process
1162     postgres 0.0  postgres
```

---

## 📝 总结

| 类别         | 评分 | 说明                   |
| ------------ | ---- | ---------------------- |
| **系统资源** | 6/10 | CPU 负载高，需关注     |
| **Web 服务** | 9/10 | Nginx 正常运行         |
| **数据库**   | 9/10 | PostgreSQL 正常        |
| **网络**     | 8/10 | 端口正常，防火墙需注意 |
| **容器化**   | 2/10 | Docker 未安装          |

**总体评估:** ⚠️ **基本可用，但需关注 CPU 负载**

---

## 🛠️ 建议操作

1. **立即:** 检查 openclaw 进程高 CPU 的原因
2. **可选:** 安装 Docker 如果需要容器化
3. **建议:** 配置防火墙规则
4. **建议:** 为 OpenClaw Gateway 创建 systemd 服务

---

_报告生成时间: 2026-03-30 03:41 UTC_
