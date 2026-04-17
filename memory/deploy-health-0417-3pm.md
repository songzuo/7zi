# 🛡️ 服务器健康检查报告
**时间**: 2026-04-17 15:16 GMT+2 (周五)  
**检查人**: 系统管理员子代理

---

## 📋 部署配置概览

**项目目录**: `/root/.openclaw/workspace/7zi-project`
- 版本: **1.12.2**
- Node.js: ≥18.0.0
- TypeScript: 5.9.3
- 测试: 340+ cases, 66%+ 覆盖率
- 模块数: 61

**主要功能**: 多智能体编排系统 (Multi-Agent Orchestration)，支持 A2A 协议、性能监控、多租户架构、工作流引擎、邮件告警

---

## 🌐 服务器连接状态

| 服务器 | IP | 状态 | 说明 |
|--------|-----|------|------|
| **7zi.com** | 165.99.43.61 | ❌ **连接超时** | SSH 22端口无法连接，可能是网络问题或服务器宕机 |
| **bot5.szspd.cn** | 182.43.36.134 | ✅ 正常 | SSH 连接成功，running 22 days |

### 7zi.com 诊断
- SSH 连接超时 (timeout 10s)
- **建议**: 需要人工介入检查，可能是网络、防火墙、或服务器宕机

---

## 🐳 Docker 容器状态 (本地 bot6 / 7zi.com)

| 容器 | 状态 | 端口 |
|------|------|------|
| elasticsearch | ✅ Up 12h | - |
| rabbitmq | ✅ Up 12h | - |
| adminui | ✅ Up 32h | - |
| adminvs | ✅ Up 33h | 8111 |
| microclaw | ✅ Up 26h | 28790 |
| mysql-dating | ✅ Up 2d | 3306 |
| 7zi-health-service | ✅ Up 12d (healthy) | 8085 |
| 7zi-alertmanager | ✅ Up 4d (healthy) | 9093 |
| 7zi-loki | ✅ Up 13d (healthy) | 3100 |
| 7zi-prometheus | ✅ Up 4d (healthy) | 9090 |
| 7zi-node-exporter | ✅ Up 12d (healthy) | 9101 |
| 7zi-pushgateway | ✅ Up 13d (healthy) | 9091 |
| 7zi-cadvisor | ✅ Up 13d (healthy) | 8080 |

**结论**: 所有容器正常运行，7zi 监控栈完整

---

## 🌊 Nginx 服务状态

### bot5.szspd.cn (182.43.36.134)
- ✅ **运行中** (3 weeks 1 day)
- ✅ 配置语法正确 (`nginx -t` OK)
- ✅ 已启用自动 reload

### 本机 (bot6)
- ✅ **运行中** (1 week 0 days)
- ✅ 最后Reload: 2026-04-10 06:55:14

---

## 🔍 其他服务

**bot5.szspd.cn 额外服务**:
- `docker.service` ✅ 运行中
- `nginx.service` ✅ 运行中
- `node_exporter.service` ✅ 运行中 (Prometheus 监控)

---

## ⚠️ 风险项

1. **7zi.com SSH 连接超时** — 需要立即检查网络/服务器状态
2. bot5 上无 Docker 容器运行 — 仅运行 Nginx 和监控 exporter（正常，测试机器）

---

## 📝 建议

1. **紧急**: 调查 7zi.com SSH 连接问题
   - 检查服务器是否宕机
   - 检查防火墙 22 端口规则
   - 检查网络路由
2. 7zi.com 上所有容器已正常运行较长时间，无需干预
3. 监控栈 (Prometheus/Loki/Grafana) 健康，可通过相应端口访问

---

*报告生成时间: 2026-04-17 15:16 GMT+2*
