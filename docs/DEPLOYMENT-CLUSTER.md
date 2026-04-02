# 7zi 8 服务器集群部署方案

## 📋 概述

本方案规划将 7zi AI 团队管理平台部署到 8 台服务器集群，实现高可用、负载均衡和弹性扩展。

## 🎯 部署目标

- **高可用性**: 无单点故障，支持服务器故障自动切换
- **负载均衡**: 流量分发，优化性能
- **弹性扩展**: 根据负载动态调整资源
- **数据安全**: 多副本备份，灾难恢复
- **安全防护**: 防火墙、SSL/TLS、访问控制

## 🏗️ 服务器集群架构

```
                            ┌─────────────────────────────┐
                            │    域名 / CDN / DNS         │
                            │   (7zi.com, www.7zi.com)   │
                            └────────────┬────────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────────┐
                            │     负载均衡器 (LB)          │
                            │   HAProxy / Nginx           │
                            │   Server 1: LB-01          │
                            │   IP: 165.99.43.61          │
                            │   (7zi.com - 复用)          │
                            └─────┬───────┬───────────────┘
                                  │       │
                ┌─────────────────┘       └─────────────────┐
                │                                           │
                ▼                                           ▼
    ┌───────────────────────┐           ┌───────────────────────┐
    │   Web 服务器集群       │           │   应用服务器集群       │
    │   Next.js Frontend    │           │   OpenClaw Gateway    │
    │                       │           │                       │
    │  Server 2: WEB-01    │           │  Server 5: GW-01      │
    │  IP: 182.43.36.134    │           │  IP: 待配置           │
    │  (bot5.szspd.cn)      │           │                       │
    │                       │           │  Server 6: GW-02      │
    │  Server 3: WEB-02     │           │  IP: 待配置           │
    │  IP: 待配置           │           │                       │
    │                       │           └───────────┬───────────┘
    └───────────┬───────────┘                       │
                │                                   │
                └─────────────┬─────────────────────┘
                              │
                              ▼
                ┌───────────────────────────────┐
                │      数据库集群               │
                │   SQLite (主从复制)           │
                │                               │
                │  Server 7: DB-01 (主)        │
                │  IP: 待配置                  │
                │                               │
                │  Server 8: DB-02 (从)         │
                │  IP: 待配置                  │
                └───────────────────────────────┘
                              │
                              ▼
                ┌───────────────────────────────┐
                │      备份 / 监控             │
                │   Server 9 (可选)            │
                │   IP: 待配置                 │
                │   - 日志收集                 │
                │   - 监控仪表板               │
                │   - 定期备份                 │
                └───────────────────────────────┘
```

## 🖥️ 服务器角色分配

### 基础 8 台服务器配置

| 编号  | 主机名       | IP 地址       | 角色       | 配置  | 用途                              |
| ----- | ------------ | ------------- | ---------- | ----- | --------------------------------- |
| **1** | `7zi-lb-01`  | 165.99.43.61  | 负载均衡器 | 2C/2G | HAProxy/Nginx, SSL 终止, 流量分发 |
| **2** | `7zi-web-01` | 182.43.36.134 | Web 服务器 | 2C/2G | Next.js 前端, Docker 容器         |
| **3** | `7zi-web-02` | 待配置        | Web 服务器 | 2C/2G | Next.js 前端, Docker 容器         |
| **4** | `7zi-dev`    | 本机          | 开发机     | 2C/2G | OpenClaw 运行, 测试环境           |
| **5** | `7zi-gw-01`  | 待配置        | API 网关   | 4C/4G | OpenClaw Gateway, API 服务        |
| **6** | `7zi-gw-02`  | 待配置        | API 网关   | 4C/4G | OpenClaw Gateway, API 服务        |
| **7** | `7zi-db-01`  | 待配置        | 数据库主   | 4C/8G | SQLite 主库, 实时数据             |
| **8** | `7zi-db-02`  | 待配置        | 数据库从   | 4C/8G | SQLite 从库, 数据备份, 读取副本   |

### 扩展服务器 (可选)

| 编号   | 主机名        | IP 地址 | 角色       | 配置  | 用途                          |
| ------ | ------------- | ------- | ---------- | ----- | ----------------------------- |
| **9**  | `7zi-monitor` | 待配置  | 监控中心   | 2C/4G | Prometheus, Grafana, 日志收集 |
| **10** | `7zi-backup`  | 待配置  | 备份服务器 | 4C/8G | 异地备份, 灾难恢复            |

## 🔧 技术栈

### 负载均衡层 (Server 1)

- **HAProxy 2.8+** 或 **Nginx 1.25+**
- Let's Encrypt 自动化 SSL
- 健康检查
- 会话保持
- 限流防护

### Web 服务器层 (Server 2-3)

- **Next.js 16** (Standalone 模式)
- **Docker 24+** (容器化部署)
- **PM2** (进程管理，可选)
- **Nginx** (静态资源缓存)

### API 网关层 (Server 5-6)

- **OpenClaw Gateway** (最新版本)
- **Node.js 22 LTS**
- **Socket.IO** (WebSocket 服务)
- **Redis** (会话缓存，可选)

### 数据库层 (Server 7-8)

- **SQLite** (嵌入式数据库)
- **litestream** (实时复制到 S3)
- **Rclone** (S3 同步工具)
- 定期备份脚本

## 📊 网络拓扑

### 内部网络 (推荐)

```
                    ┌─────────────────┐
                    │   外部网络       │
                    │   (互联网)       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   防火墙/安全组  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼─────┐ ┌─────▼──────┐ ┌────▼─────────┐
    │  公网 IP      │ │  内网 VPN   │ │  管理网络    │
    │  80/443       │ │  10.0.0.x   │ │  192.168.1.x │
    │  (LB)         │ │  服务器互联  │ │  运维管理    │
    └───────────────┘ └────────────┘ └──────────────┘
```

### 端口规划

| 端口 | 用途         | 说明                      |
| ---- | ------------ | ------------------------- |
| 80   | HTTP         | 重定向到 HTTPS            |
| 443  | HTTPS        | 主要服务端口              |
| 3000 | Next.js      | Web 服务器内部端口        |
| 8080 | HAProxy 统计 | 负载均衡状态页            |
| 22   | SSH          | 服务器管理 (限制 IP 访问) |
| 6379 | Redis        | 缓存服务 (可选)           |

## 🚀 部署策略

### 阶段一：基础环境准备

1. **服务器采购与配置**
   - [ ] 购买 7 台新服务器 (Server 3, 5-8)
   - [ ] 配置域名 DNS 解析
   - [ ] 设置防火墙规则
   - [ ] 配置 SSH 密钥认证

2. **基础软件安装**
   ```bash
   # 所有服务器执行
   curl -fsSL https://get.docker.com | sh
   apt update && apt install -y sshpass rsync git nginx
   ```

### 阶段二：负载均衡器部署 (Server 1)

在 `7zi.com` (165.99.43.61) 上部署 HAProxy：

```bash
# 安装 HAProxy
apt install -y haproxy

# 配置文件见: ./configs/haproxy.cfg
systemctl enable haproxy
systemctl start haproxy
```

### 阶段三：Web 服务器部署 (Server 2-3)

部署 Next.js 应用：

```bash
# 使用已有脚本
./deploy-remote.sh deploy --target bot5.szspd.cn  # Server 2
./deploy-remote.sh deploy --target <SERVER-3-IP>    # Server 3
```

### 阶段四：API 网关部署 (Server 5-6)

部署 OpenClaw Gateway：

```bash
# 使用 OpenClaw CLI
openclaw gateway init
openclaw gateway start
```

### 阶段五：数据库部署 (Server 7-8)

部署 SQLite 主从复制：

```bash
# 安装 litestream
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-linux-amd64
chmod +x litestream
mv litestream /usr/local/bin/

# 配置实时复制
# 配置文件见: ./configs/litestream.yml
```

### 阶段六：监控和备份

部署监控系统 (可选 Server 9)：

```bash
# 安装 Prometheus + Grafana
# 配置文件见: ./configs/monitoring/
```

## 📦 部署清单

### 服务器 1 (LB-01 - 7zi.com)

- [x] ✅ 已配置
- [ ] HAProxy 安装配置
- [ ] SSL 证书 (Let's Encrypt)
- [ ] 健康检查配置
- [ ] 监控仪表板配置

### 服务器 2 (WEB-01 - bot5.szspd.cn)

- [x] ✅ 已配置
- [x] Docker 安装
- [x] Next.js 部署
- [ ] Nginx 反向代理配置
- [ ] 日志收集配置

### 服务器 3 (WEB-02 - 待配置)

- [ ] 购买服务器
- [ ] 基础环境配置
- [ ] Docker 安装
- [ ] 部署脚本运行

### 服务器 4 (DEV - 本机)

- [x] ✅ OpenClaw 运行中
- [x] ✅ 开发环境就绪

### 服务器 5-6 (GW-01/02 - 待配置)

- [ ] 购买服务器
- [ ] OpenClaw Gateway 部署
- [ ] Socket.IO 配置
- [ ] Redis 配置 (可选)

### 服务器 7-8 (DB-01/02 - 待配置)

- [ ] 购买服务器
- [ ] SQLite 安装配置
- [ ] Litestream 复制配置
- [ ] 备份脚本配置

### 服务器 9 (MONITOR - 可选)

- [ ] Prometheus 安装
- [ ] Grafana 安装
- [ ] 告警规则配置
- [ ] 日志收集 (ELK/Loki)

## 🔐 安全配置

### 防火墙规则

```bash
# 仅允许必要的端口
ufw allow 22/tcp    # SSH (限制 IP)
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### SSH 安全

```bash
# 禁用密码登录，使用密钥
PasswordAuthentication no
PubkeyAuthentication yes
```

### SSL/TLS 配置

- 使用 Let's Encrypt 自动续期
- 强制 HTTPS 重定向
- 配置 HSTS 头

## 📈 性能优化

### Web 层优化

- 启用 HTTP/2
- Gzip/Brotli 压缩
- 静态资源 CDN
- Next.js 图片优化

### 数据库层优化

- SQLite WAL 模式
- 索引优化
- 查询缓存
- 连接池

### 负载均衡优化

- 连接复用
- 智能健康检查
- 动态权重调整

## 🔄 备份与恢复

### 数据库备份

```bash
# 每小时快照
litestream replicate -config /etc/litestream.yml

# 每日完整备份
0 2 * * * /opt/scripts/backup-db.sh
```

### 代码备份

```bash
# Git 版本控制
git push origin main

# Docker 镜像备份
docker save | gzip > backup.tar.gz
```

### 灾难恢复

1. 从备份恢复数据库
2. 重新部署 Docker 容器
3. 更新负载均衡配置
4. DNS 切换 (如需要)

## 📊 监控指标

### 关键指标

- **服务器**: CPU, 内存, 磁盘, 网络
- **应用**: QPS, 响应时间, 错误率
- **数据库**: 查询延迟, 连接数, 复制延迟
- **负载均衡**: 后端健康状态, 流量分布

### 告警规则

- CPU > 80% 持续 5 分钟
- 内存 > 90%
- 磁盘 > 85%
- 错误率 > 5%

## 📝 部署脚本

见以下文件：

- `deploy-cluster.sh` - 集群一键部署
- `configs/haproxy.cfg` - HAProxy 配置
- `configs/litestream.yml` - 数据库复制配置
- `scripts/backup-db.sh` - 数据库备份脚本
- `scripts/health-check.sh` - 健康检查脚本

## 🎯 部署时间线

| 阶段     | 任务           | 时间       |
| -------- | -------------- | ---------- |
| 1        | 购买服务器     | 1-2 天     |
| 2        | 基础环境配置   | 1 天       |
| 3        | 负载均衡部署   | 0.5 天     |
| 4        | Web 服务器部署 | 0.5 天     |
| 5        | API 网关部署   | 0.5 天     |
| 6        | 数据库部署     | 0.5 天     |
| 7        | 监控备份配置   | 0.5 天     |
| **总计** |                | **4-6 天** |

## 📞 联系信息

- **技术支持**: 宋琢环球旅行
- **部署文档**: `/root/.openclaw/workspace/docs/DEPLOYMENT-CLUSTER.md`
- **问题反馈**: GitHub Issues

---

**版本**: 1.0
**更新日期**: 2026-03-22
**作者**: 系统管理员 (OpenClaw 子代理)
