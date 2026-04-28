# 7zi.com 生产服务器健康报告

**检查时间:** 2026-04-28 04:08 GMT+2  
**服务器:** 165.99.43.61

---

## 1. PM2 进程状态

| ID | 应用 | 版本 | 模式 | 状态 | 重启次数 | 内存 | 运行时间 |
|----|------|------|------|------|---------|------|---------|
| 0 | 7zi-main | 1.14.0 | cluster | ⚠️ **errored** | 46 | 0b | 0 |
| 1 | ai-site | 1.0.0 | fork | ✅ online | 249 | 140.3mb | 4天 |

**问题:** `7zi-main` 处于 errored 状态，cluster 模式但 pid=0，说明主进程已崩溃。

---

## 2. 磁盘空间使用率

| 分区 | 大小 | 已用 | 可用 | 使用率 |
|------|------|------|------|--------|
| /dev/vda1 | 88G | 79G | 9.0G | ⚠️ **90%** |

**警告:** 根分区使用率达 90%，仅剩 9GB，需尽快清理。

---

## 3. Nginx 服务状态

✅ **active (running)** - 自 2026-04-09 起已稳定运行 2 周 4 天，8 个 worker 进程。

---

## 4. 内存使用情况

| 类型 | 总计 | 已用 | 空闲 | 共享 | 缓存 | 可用 |
|------|------|------|------|------|------|------|
| Mem | 7.8Gi | 4.9Gi | 1.1Gi | 48Mi | 1.7Gi | 2.5Gi |
| Swap | 0B | 0B | 0B | - | - | - |

✅ 内存使用正常，无 swap 使用。

---

## 5. 最近日志错误

### SSH 连接问题 (非关键)
- 大量 `kex_exchange_identification: Connection closed by remote host` - 外部暴力破解或客户端问题
- `MaxStartups throttling` - SSH 并发连接被限制
- `banner line contains invalid characters` - 异常客户端

### fwupd 定时任务失败 (非关键)
- `Failed to start Refresh fwupd metadata and update motd` - 固件更新服务失败，不影响业务

### 7zi-main Server Action 错误 ⚠️
```
Error: Failed to find Server Action. This request might be from an older or newer deployment.
```
**此错误持续出现在日志中，说明 Next.js 部署版本不一致，Server Action 无法找到，导致 7zi-main 崩溃。**

---

## 健康结论

| 项目 | 状态 | 说明 |
|------|------|------|
| 7zi-main | 🔴 **严重** | errored，46次重启，需立即处理 |
| ai-site | ✅ 正常 | 正常运行 |
| 磁盘 | 🟡 警告 | 90% 使用率，需清理 |
| Nginx | ✅ 正常 | 运行中 |
| 内存 | ✅ 正常 | 无问题 |

### 需立即处理

1. **7zi-main 已崩溃** — Server Action 错误导致 cluster 进程全部退出，需重新部署或回滚
2. **磁盘空间紧张** — 清理日志、临时文件、旧的 Docker 镜像
3. **SSH 暴力破解** — 建议配置 fail2ban 防护

---

*报告生成于 2026-04-28 04:08 GMT+2*