# 🛡️ 系统健康检查报告

**检查时间**: 2026-05-04 06:40 (欧洲中部时间)
**主机**: bot6 (Linux 6.8.0-101-generic)
**运行时间**: 55 天 19 小时 23 分

---

## 1. 磁盘空间

| 文件系统 | 总大小 | 已用 | 可用 | 使用率 | 挂载点 |
|---------|--------|------|------|--------|-------|
| /dev/sda1 | 145G | 71G | 74G | 50% | / |
| /dev/sda16 | 881M | 117M | 703M | 15% | /boot |
| /dev/sda15 | 105M | 6.2M | 99M | 6% | /boot/efi |
| tmpfs | 795M | 2.2M | 793M | 1% | /run |

**状态**: ✅ 良好 — 根分区 50% 使用率，尚有充足空间

---

## 2. 内存使用

| 类型 | 总计 | 已用 | 空闲 | 共享 | 缓存 | 可用 |
|------|------|------|------|------|------|------|
| Mem | 7.8Gi | 4.1Gi | 2.3Gi | 3.1Mi | 1.6Gi | 3.6Gi |
| Swap | 4.0Gi | 2.5Gi | 1.5Gi | - | - | - |

**状态**: ⚠️ 注意 — Swap 使用率 62.5%，内存有一定压力

---

## 3. 系统负载

- **负载均值**: 4.98, 4.52, 4.49 (1/5/15分钟)
- **用户数**: 3

**状态**: ⚠️ 负载较高 — 4核系统负载接近5，建议关注

---

## 4. 运行中的服务 (30个)

**核心服务**:
- ✅ containerd.service (Docker运行时)
- ✅ docker.service
- ✅ nginx.service
- ✅ ssh.service
- ✅ systemd-networkd.service
- ✅ systemd-resolved.service
- ✅ systemd-timesyncd.service
- ✅ rsyslog.service
- ✅ fail2ban.service (SSH防护)

**邮件服务**:
- ✅ dovecot.service (IMAP/POP3)
- ✅ postfix@-.service
- ✅ opendkim.service

**业务服务**:
- ✅ alert-webhook.service
- ✅ api-gateway.service
- ✅ claw-mesh.service
- ✅ cluster-agent.service
- ✅ mail-api.service
- ✅ picoclaw.service

**状态**: ✅ 所有服务运行正常

---

## 5. 系统日志警告/错误

### 警告 (1小时内的错误级别日志):

```
May 04 06:11:01 bot6 systemd-networkd-wait-online[3236575]: 
  Timeout occurred while waiting for network connectivity.
```

```
May 04 06:11:26 bot6 sshd[3246079]: 
  error: maximum authentication attempts exceeded for root from 45.227.254.170 port 37280 ssh2 [preauth]
```

```
May 04 06:15:29 bot6 sshd[3310064]: 
  error: maximum authentication attempts exceeded for root from 45.148.10.141 port 29920 ssh2 [preauth]
```

### 安全分析:

| 来源IP | 端口 | 尝试次数 |
|--------|------|----------|
| 45.227.254.170 | 37280 | 多次失败 |
| 45.148.10.141 | 29920 | 多次失败 |

**状态**: 🔒 fail2ban 正在运行防护，但建议确认 SSH 密钥登录已正确配置

---

## 6. Docker 容器

检测到多个 overlay2 存储卷，总计占用 71GB (含重叠数据)。

---

## 总结

| 检查项 | 状态 |
|--------|------|
| 磁盘空间 | ✅ 良好 |
| 内存 | ⚠️ 轻微压力 (Swap使用高) |
| 系统负载 | ⚠️ 偏高 |
| 服务状态 | ✅ 正常 |
| 安全 | ⚠️ SSH暴力破解尝试 |

**建议**:
1. 监控 Swap 使用趋势，如持续高位考虑增加物理内存
2. 确认 SSH 密钥登录已启用，密码登录已禁用
3. 关注系统负载，如持续高位排查高负载进程

---

*报告生成: 2026-05-04 06:41*
