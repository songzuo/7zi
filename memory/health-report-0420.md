## 系统健康报告

**生成时间:** 2026-04-20 08:11 GMT+2

---

### 磁盘空间
| 项目 | 值 |
|------|-----|
| `/dev/sda1` 总容量 | 145G |
| 已用 | 78G (54%) |
| 可用 | 68G |
| workspace 目录大小 | 8.9G |
| workspace 文件数量 | 470,225 个 |

**状态:** ✅ 磁盘空间充足，54% 使用率

---

### 配置状态
- 配置文件: `~/.openclaw/openclaw.json`
- **验证结果:** ✅ Config valid

---

### 节点状态
- Gateway 目标地址: `ws://127.0.0.1:18789`
- 连接状态: ❌ `gateway closed (1000 normal closure): no close reason`
- **问题:** systemd 服务 `openclaw.service` 状态为 `inactive (dead)`，但 gateway 进程 (pid 518122) 仍在后台运行
- systemd 服务最后失败时间: 2026-03-30 18:42

**注意:** 存在进程残留（pid 518122 相关进程仍在运行），建议手动清理或重启 gateway

---

### 运行服务
**共 31 个运行中的服务，关键服务：**

| 服务 | 状态 |
|------|------|
| Docker | ✅ running |
| containerd | ✅ running |
| nginx | ✅ running |
| redis-server | ✅ running |
| postfix | ✅ running |
| dovecot | ✅ running |
| fail2ban | ✅ running |
| ssh | ✅ running |
| openclaw.service | ❌ **inactive (dead)** |
| picoclaw.service | ✅ running |
| claw-mesh.service | ✅ running |

**openclaw Gateway 进程状态:**
- `openclaw` (pid 3410369) - 运行中 (自 Apr19)
- `openclaw-gateway` (pid 3410376) - 运行中 (自 Apr19, CPU: 97:43)

---

### 最近错误
**来源:** journalctl 日志 (Mar 30)

```
Mar 30 18:41:39 bot6 systemd[1]: openclaw.service: Main process exited, code=exited, status=1/FAILURE
Mar 30 18:41:39 bot6 openclaw[993216]: Gateway failed to start: gateway already running (pid 518122); lock timeout after 5000ms
Mar 30 18:42:18 bot6 openclaw[993341]: Gateway failed to start: gateway already running (pid 518122); lock timeout after 5000ms
```

**根因:** openclaw.service 启动时检测到 gateway (pid 518122) 已在运行，触发 lock timeout 导致服务失败

**建议修复:**
1. 停止残留 gateway 进程: `openclaw gateway stop` 或 `kill <pid>`
2. 重启 systemd 服务: `systemctl restart openclaw`

---

## 总结

| 检查项 | 状态 |
|--------|------|
| 磁盘空间 | ✅ 正常 |
| 配置验证 | ✅ 通过 |
| 节点连接 | ⚠️ 需修复 |
| 核心服务 | ⚠️ openclaw 服务 inactive |
| 错误日志 | ⚠️ 存在历史启动失败记录 |
