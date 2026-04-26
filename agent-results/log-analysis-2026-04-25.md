# 系统日志分析报告
**分析日期**: 2026-04-25
**分析机器**: bot6 (109.123.246.140)
**模型**: minimax/MiniMax-M2.7

---

## 📋 执行摘要

日志目录 `/root/.openclaw/logs/` 仅包含1个文件 `config-audit.jsonl`（配置审计日志），最近的系统级日志通过 `journalctl` 和 `/var/log/syslog` 获取。

**主要发现**:
1. 🚨 **严重**: API密钥过期导致子代理任务失败
2. ⚠️ **高危**: SSH暴力破解攻击持续进行（每小时数十次）
3. ⚡ **性能**: Swap使用率高达58%，OpenClaw Gateway内存占用2GB

---

## 🔴 错误模式分析

### 1. API密钥过期 (Critical)

**时间范围**: 2026-04-25 23:37

**错误日志**:
```
custom1/glm-4.7 error=401 该令牌已过期 (request id: 20260425213714631516043H1p73HM0)
```

**影响**:
- 子代理任务 `6f715880`, `360fa983`, `d8be1589` 全部失败
- volcengine/deepseek-v3-2-251201 遭遇 rate limit 后 fallback 到 custom1/glm-4.7 也失败
- 最终所有模型失败: `UNAVAILABLE: All models failed (2)`

**根本原因**: `custom1` provider (code.coolyeah.net) 的 API Key 已过期

---

### 2. WebFetch 失败

**错误日志**:
```
web_fetch failed: Web fetch failed (404): SECURITY NOTICE...
web_fetch failed: getaddrinfo ENOTFOUND www.mindbrush.info
```

**说明**: 
- 404 来自 Notion 页面（外部不可信内容被安全机制拦截）
- DNS 解析失败表示 `www.mindbrush.info` 域名不存在或不可达

---

## 🟡 性能瓶颈分析

### 1. Swap 使用率过高

```
Swap: 2.3Gi used / 4.0Gi total (58%)
Mem: 3.8Gi used / 7.8Gi total (49%)
```

**分析**: 
- 8GB内存中已使用3.8GB，可用3.9GB
- 但Swap已使用2.3GB，说明系统存在内存压力
- 长时间运行的进程（如Java应用）可能存在内存泄漏

### 2. 主要资源消耗进程

| 进程 | CPU% | MEM% | 说明 |
|------|------|------|------|
| openclaw-gateway | 19.2% | 25.2% (2GB) | OpenClaw主进程 |
| cadvisor | 6.8% | 0.7% | 容器监控 |
| mysqld | 2.1% | 0.6% | 数据库 |
| java (im-usersearch) | 1.7% | 2.8% | Java应用 |

### 3. WebSocket响应延迟

**观察到的延迟**:
- `sessions.patch`: 907ms ~ 2374ms
- `sessions.delete`: 1461ms ~ 4893ms
- `agent`: 2537ms ~ 4925ms

**分析**: 
- 存在明显的响应延迟波动
- `sessions.delete` 最高达4893ms，可能存在连接泄漏或清理阻塞

---

## 🔵 安全相关事件

### 1. SSH暴力破解 (持续进行)

**攻击统计** (2026-04-25 全天):

| 攻击类型 | 次数 | 来源特征 |
|----------|------|----------|
| `maximum authentication attempts exceeded` | 20+ | 多个IP段 |
| `kex_protocol_error` | 6+ | 自动化工具 |
| `Failed password for root` | 持续 | 103.236.201.99 |

**攻击来源IP段**:
- `2.57.122.x` (多次)
- `92.118.39.x` (多次)
- `45.148.10.x` (多次)
- `193.46.255.86`
- `45.227.254.170`
- `195.178.110.15`

**说明**: UFW已拦截这些攻击（kernel: [UFW BLOCK]），但攻击频率仍然很高。

### 2. 系统网络超时

```
systemd-networkd-wait-online[3303206]: Timeout occurred while waiting for network connectivity.
```

**发生时间**: 05:39:49, 06:47:49, 12:14:45

**说明**: 网络连接存在间歇性问题

---

## 📊 磁盘与内存

### 磁盘使用
```
/dev/sda1: 145GB总容量，已使用71GB (50%)
```

### 内存状态
```
total: 7.8Gi
used: 3.8Gi
free: 2.7Gi
buff/cache: 1.5Gi
available: 3.9Gi
```

---

## ✅ 建议措施

### 立即执行 (Critical)

1. **更新 custom1 provider API Key**
   - 当前 key `sk-0LNe1uYzhRRlivkafdn9vSnpl873SVPqXAVUdQU5CyvVmQib` 已过期
   - 需要到 code.coolyeah.net 获取新密钥
   - 命令: `openclaw config set models.providers.custom1.apiKey <NEW_KEY>`

2. **监控 volcengine API rate limit**
   - deepseek-v3-2-251201 出现频繁 rate limit
   - 考虑增加 fallback 链中的 minimax 权重

### 短期优化 (High)

3. **SSH防护强化**
   - 当前Fail2Ban或UFW已正常运作
   - 建议：仅允许特定IP段SSH访问（如果适用）
   - 检查 `/etc/ssh/sshd_config` 确认 `MaxAuthTries` 设置较低

4. **减少WebSocket响应延迟**
   - `sessions.delete` 高延迟需要排查
   - 检查是否存在长时间运行的会话未清理

### 中期优化 (Medium)

5. **Swap使用优化**
   - 2.3GB Swap使用偏高
   - 检查Java进程内存使用
   - 考虑增加内存或优化应用内存配置

6. **配置变更追踪**
   - config-audit.jsonl 显示配置频繁变更
   - 建议在非高峰时段进行配置变更

---

## 📁 附件: 配置审计摘要

config-audit.jsonl 显示近期配置变更:
- **2026-04-22**: Gateway重启
- **2026-04-16**: Gateway重启
- **2026-03-14**: 模型配置更新 (MiniMax-M2.5)
- **2026-03-08**: 多provider配置 (volcengine, bailian, custom1)
- **2026-03-07**: API密钥配置
- **2026-02-28**: 初始配置

---

*报告生成时间: 2026-04-25 23:41 GMT+2*
*来源: /root/.openclaw/logs/, journalctl, /var/log/syslog*