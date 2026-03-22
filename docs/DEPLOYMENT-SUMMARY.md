# 7zi 服务器部署方案总结

## 📋 项目概述

本文档总结了 7zi AI 团队管理平台到 8 台服务器集群的完整部署方案。

**项目**: 7zi - AI 驱动的团队管理平台
**目标服务器**: 8 台
**部署模式**: 高可用、负载均衡、弹性扩展
**部署时间**: 4-6 天

---

## 🎯 当前状态

### 已配置服务器 (4 台)

| 编号 | 主机名 | IP | 角色 | 状态 |
|------|--------|-----|------|------|
| 1 | 7zi-lb-01 | 165.99.43.61 | 负载均衡器 | ✅ 已配置，需部署 HAProxy |
| 2 | 7zi-web-01 | 182.43.36.134 | Web 服务器 | ✅ 已配置，需优化 |
| 3 | 7zi-web-02 | 待配置 | Web 服务器 | ⏳ 待购买 |
| 4 | 7zi-dev | 本机 | 开发机 | ✅ 运行中 |

### 待配置服务器 (4 台)

| 编号 | 主机名 | IP | 角色 | 配置 | 状态 |
|------|--------|-----|------|------|------|
| 5 | 7zi-gw-01 | 待配置 | API 网关 | 4C/4G | ⏳ 待购买 |
| 6 | 7zi-gw-02 | 待配置 | API 网关 | 4C/4G | ⏳ 待购买 |
| 7 | 7zi-db-01 | 待配置 | 数据库主 | 4C/8G | ⏳ 待购买 |
| 8 | 7zi-db-02 | 待配置 | 数据库从 | 4C/8G | ⏳ 待购买 |

---

## 📦 部署脚本和配置文件

### 主部署脚本

**`deploy-cluster.sh`** - 集群一键部署脚本

功能：
- ✅ 支持多服务器批量部署
- ✅ 自动安装基础环境
- ✅ 按角色部署不同服务
- ✅ 健康检查和状态监控
- ✅ 支持快速部署模式
- ✅ 详细日志输出

使用方法：
```bash
# 完整部署
./deploy-cluster.sh deploy

# 快速部署 (仅重启服务)
./deploy-cluster.sh quick

# 查看集群状态
./deploy-cluster.sh status

# 健康检查
./deploy-cluster.sh health

# 测试连接
./deploy-cluster.sh test
```

### 配置文件

**`configs/haproxy.cfg`** - HAProxy 负载均衡配置

特性：
- ✅ HTTP/HTTPS 支持
- ✅ SSL/TLS 终止
- ✅ 健康检查
- ✅ 会话保持
- ✅ 限流防护
- ✅ 统计页面 (端口 8080)
- ✅ WebSocket 支持

### 辅助脚本

**`scripts/backup-db.sh`** - 数据库备份脚本

功能：
- ✅ SQLite 数据库备份
- ✅ Litestream 实时复制
- ✅ S3 云端备份
- ✅ 自动清理旧备份
- ✅ 备份验证
- ✅ 恢复功能

使用方法：
```bash
# 完整备份
./scripts/backup-db.sh full

# 快速备份
./scripts/backup-db.sh quick

# 启动实时复制
./scripts/backup-db.sh replicate

# 验证备份
./scripts/backup-db.sh verify

# 恢复数据库
./scripts/backup-db.sh restore /path/to/backup.sqlite.gz
```

**`scripts/health-check.sh`** - 集群健康检查脚本

功能：
- ✅ HTTP/HTTPS 健康检查
- ✅ TCP 端口检查
- ✅ Docker 容器检查
- ✅ 数据库完整性检查
- ✅ 系统资源监控
- ✅ 生成健康报告

使用方法：
```bash
# 执行健康检查
./scripts/health-check.sh
```

---

## 📚 文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 部署方案 | `docs/DEPLOYMENT-CLUSTER.md` | 完整的 8 服务器集群部署方案 |
| 部署检查清单 | `docs/DEPLOYMENT-CHECKLIST.md` | 部署前/中/后检查清单 |
| HAProxy 配置 | `configs/haproxy.cfg` | 负载均衡器配置文件 |
| 集群部署脚本 | `deploy-cluster.sh` | 一键部署脚本 |
| 备份脚本 | `scripts/backup-db.sh` | 数据库备份脚本 |
| 健康检查脚本 | `scripts/health-check.sh` | 集群健康检查脚本 |

---

## 🚀 部署步骤

### 第一步：更新配置

编辑 `deploy-cluster.sh`，添加新服务器配置：

```bash
# 在 SERVERS 数组中添加新服务器
["web-02"]="<IP>|7zi-web-02|web|root|'ge20993344\$ZZ'"
["gw-01"]="<IP>|7zi-gw-01|gateway|root|'ge20993344\$ZZ'"
["gw-02"]="<IP>|7zi-gw-02|gateway|root|'ge20993344\$ZZ'"
["db-01"]="<IP>|7zi-db-01|database|root|'ge20993344\$ZZ'"
["db-02"]="<IP>|7zi-db-02|database|root|'ge20993344\$ZZ'"
```

### 第二步：测试连接

```bash
./deploy-cluster.sh test
```

### 第三步：执行部署

```bash
# 完整部署（首次）
./deploy-cluster.sh deploy

# 或快速部署（仅更新代码）
./deploy-cluster.sh quick
```

### 第四步：健康检查

```bash
./deploy-cluster.sh health
```

---

## 📊 架构图

```
                            ┌─────────────────────────────┐
                            │    域名 / CDN / DNS         │
                            │   7zi.com, www.7zi.com     │
                            └────────────┬────────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────────┐
                            │     负载均衡器 (LB)          │
                            │   HAProxy / Nginx           │
                            │   Server 1: 165.99.43.61    │
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
    │                       │           │                       │
    │  Server 3: WEB-02     │           │  Server 6: GW-02      │
    │  IP: 待配置           │           │  IP: 待配置           │
    └───────────┬───────────┘           └───────────┬───────────┘
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
```

---

## 🔧 技术栈

### 负载均衡层
- **HAProxy 2.8+** - 负载均衡
- **Let's Encrypt** - SSL 证书

### Web 层
- **Next.js 16** - 前端框架
- **Docker 24+** - 容器化

### API 层
- **OpenClaw Gateway** - API 网关
- **Socket.IO** - WebSocket
- **Redis** - 缓存 (可选)

### 数据层
- **SQLite** - 嵌入式数据库
- **Litestream** - 实时复制

### 监控层
- **Prometheus** - 监控数据收集
- **Grafana** - 可视化仪表板
- **自定义脚本** - 健康检查和告警

---

## ✅ 下一步行动

1. **购买服务器**
   - Server 3 (WEB-02)
   - Server 5-6 (GW-01/02)
   - Server 7-8 (DB-01/02)

2. **配置 DNS**
   - 更新 7zi.com 解析到 165.99.43.61
   - 配置子域名

3. **更新部署脚本**
   - 添加新服务器 IP 到 `deploy-cluster.sh`
   - 更新 HAProxy 配置中的后端服务器

4. **执行部署**
   ```bash
   ./deploy-cluster.sh test      # 测试连接
   ./deploy-cluster.sh deploy    # 执行部署
   ./deploy-cluster.sh health    # 健康检查
   ```

5. **监控和维护**
   - 配置定时健康检查 (Cron)
   - 配置定时备份 (Cron)
   - 设置告警通知

---

## 📞 支持

- **部署文档**: `/root/.openclaw/workspace/docs/DEPLOYMENT-CLUSTER.md`
- **检查清单**: `/root/.openclaw/workspace/docs/DEPLOYMENT-CHECKLIST.md`
- **技术支持**: 宋琢环球旅行

---

**版本**: 1.0
**日期**: 2026-03-22
**作者**: 系统管理员 (OpenClaw 子代理)
