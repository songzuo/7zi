# 🛡️ 7zi.com 服务器安全健康检查报告

**检查时间**: 2026-03-30 08:05 CST  
**服务器**: 165.99.43.61 (7zi.com)  
**检查人**: 系统管理员子代理

---

## 📊 总体状态: ⚠️ 需要关注

| 检查项     | 状态      | 说明                      |
| ---------- | --------- | ------------------------- |
| SSH 连接   | ✅ 正常   | 连接成功                  |
| Nginx 服务 | ✅ 运行中 | Active (running)          |
| 磁盘空间   | ⚠️ 警告   | 82% 使用率，剩余 16GB     |
| 内存使用   | ✅ 正常   | 32% 使用，4.9GB 可用      |
| CPU 负载   | ✅ 正常   | 0.20, 0.31, 0.25          |
| Docker     | ⚠️ 无容器 | Docker 已安装但无运行容器 |
| 安全威胁   | ⚠️ 高风险 | 大量 SSH 暴力破解尝试     |

---

## 🔍 详细检查结果

### 1. SSH 连接测试

- **状态**: ✅ 成功
- **连接方式**: sshpass + SSH
- **认证**: 密码认证正常

### 2. Nginx 服务状态

- **状态**: ✅ Active (running)
- **运行时间**: 1天 18小时
- **进程数**: 9 (1 master + 8 workers)
- **内存占用**: 25.4M
- **开机自启**: ✅ enabled

**⚠️ 配置警告**:

```
conflicting server name "7zi.com" on 0.0.0.0:80, ignored
conflicting server name "www.7zi.com" on 0.0.0.0:80, ignored
conflicting server name "api.7zi.com" on 0.0.0.0:80, ignored
conflicting server name "visa.7zi.com" on 0.0.0.0:80, ignored
conflicting server name "mail.7zi.com" on 0.0.0.0:443, ignored
```

**建议**: 检查 Nginx 配置文件，移除重复的 server_name 定义。

### 3. 错误日志分析

最近 20 条错误日志显示:

- **上游连接失败**: 3 条错误
  - `connect() to [2001:67c:4e8:f004::9]:443 failed`
  - 客户端 IP: 45.156.87.24, 176.65.151.74
  - 端口: 8080 (反向代理端口)

**建议**: 检查上游服务器的 IPv6 连接问题。

### 4. 磁盘空间使用

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda1        88G   72G   16G  82% /
```

**⚠️ 警告**: 磁盘使用率 82%，剩余 16GB
**建议**:

- 清理旧日志文件
- 检查大文件占用
- 考虑扩容或清理策略

### 5. Docker 容器状态

- **Docker 状态**: 已安装
- **运行容器**: 0
- **所有容器**: 0

**说明**: Docker 已安装但当前无运行容器，可能是服务部署在其他方式（直接 Node.js 进程）。

### 6. 内存使用

```
               total        used        free      shared  buff/cache   available
Mem:           7.8Gi       2.5Gi       1.1Gi        21Mi       4.1Gi       4.9Gi
```

- **使用率**: 32%
- **可用内存**: 4.9GB
- **状态**: ✅ 正常

### 7. CPU 负载

```
0.20 0.31 0.25 1/877
```

- **1分钟**: 0.20
- **5分钟**: 0.31
- **15分钟**: 0.25
- **状态**: ✅ 负载很低

### 8. 开放端口

| 端口      | 服务                    | 风险级别                 |
| --------- | ----------------------- | ------------------------ |
| 22        | SSH                     | ⚠️ 暴露公网              |
| 80        | Nginx HTTP              | ✅ 正常                  |
| 443       | Nginx HTTPS             | ✅ 正常                  |
| 6379      | Redis                   | 🔴 **高风险** - 暴露公网 |
| 5432      | PostgreSQL              | ✅ 仅监听本地            |
| 8444      | ss-server (Shadowsocks) | ⚠️ VPN 服务              |
| 631       | CUPS 打印服务           | ⚠️ 不应暴露              |
| 9101      | node_exporter           | ⚠️ 监控暴露              |
| 9090      | Prometheus              | ⚠️ 监控暴露              |
| 3000/3001 | Node.js 应用            | ✅ 正常                  |

**🔴 严重安全问题**:

- **Redis (6379)** 暴露在公网！这是极高风险配置
- **Prometheus (9090)** 和 **node_exporter (9101)** 暴露公网
- **CUPS (631)** 打印服务不应暴露

### 9. SSH 暴力破解检测

**🔴 高风险**: 检测到大量 SSH 登录失败尝试

最近 10 条记录:

```
root     ssh:notty    171.25.158.47    Mon Mar 30 08:05
root     ssh:notty    82.196.7.70      Mon Mar 30 08:04
root     ssh:notty    183.36.126.68    Mon Mar 30 08:04
user     ssh:notty    45.148.10.121    Mon Mar 30 08:03
root     ssh:notty    159.89.153.50    Mon Mar 30 08:03
root     ssh:notty    45.64.74.51      Mon Mar 30 08:03
root     ssh:notty    61.245.11.236    Mon Mar 30 08:03
root     ssh:notty    110.164.228.242  Mon Mar 30 08:02
```

**攻击特征**:

- 多个 IP 地址尝试暴力破解
- 目标账户: root, user
- 持续时间: 长期持续攻击

---

## 🚨 安全建议（按优先级排序）

### 🔴 紧急 (立即处理)

1. **关闭 Redis 公网访问**

   ```bash
   # 编辑 Redis 配置
   bind 127.0.0.1
   # 或使用防火墙限制
   ufw deny 6379
   ```

2. **关闭 Prometheus/node_exporter 公网访问**

   ```bash
   ufw deny 9090
   ufw deny 9101
   ```

3. **安装 fail2ban 防御 SSH 攻击**
   ```bash
   apt install fail2ban
   systemctl enable fail2ban
   systemctl start fail2ban
   ```

### 🟡 重要 (尽快处理)

4. **配置 SSH 安全加固**
   - 禁用 root 密码登录
   - 使用 SSH 密钥认证
   - 修改默认端口 22

5. **清理磁盘空间**

   ```bash
   # 查找大文件
   du -h --max-depth=1 / | sort -hr | head -20
   # 清理日志
   journalctl --vacuum-time=7d
   ```

6. **修复 Nginx 配置警告**
   - 检查 `/etc/nginx/sites-enabled/`
   - 移除重复的 server_name 定义

### 🟢 建议 (计划处理)

7. **设置日志轮转**
8. **配置自动安全更新**
9. **部署入侵检测系统**

---

## 📈 趋势分析

- **服务器运行时间**: 5天 23小时 (稳定)
- **资源使用**: CPU/内存正常
- **磁盘趋势**: 需要监控，可能很快达到 90%
- **安全态势**: 正遭受持续 SSH 攻击

---

## ✅ 下次检查建议

1. 检查 fail2ban 是否已安装配置
2. 验证 Redis 是否已限制本地访问
3. 检查磁盘清理效果
4. 确认 SSH 加固措施是否生效

---

**报告生成**: 🤖 OpenClaw 系统管理员子代理  
**下次检查**: 建议 24 小时内复查紧急安全项
