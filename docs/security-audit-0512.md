# 安全审计报告

**项目:** `/root/.openclaw/workspace`
**审计时间:** 2026-05-12 20:36 GMT+2
**审计人:** 🛡️ 系统管理员

---

## 📋 检查项总览

| 检查项 | 状态 | 严重程度 |
|--------|------|----------|
| .env 文件 gitignore | ✅ 通过 | - |
| 硬编码凭据 | 🔴 严重 | 高 |
| package.json 脚本 | ✅ 通过 | - |
| Docker 端口暴露 | ⚠️ 警告 | 中 |
| SSH 密钥检查 | ⚠️ 警告 | 中 |
| 数据库连接字符串 | ✅ 通过 | - |

---

## ✅ 通过项

### 1. .env 文件保护
- `.gitignore` 正确排除所有 `.env` 文件
- `.env`, `.env.local`, `.env.production` 等均被忽略
- 无 `.env` 文件被意外提交到仓库

### 2. package.json 脚本正常
检查了 4 个 `package.json` 文件，所有脚本均为标准开发/构建/测试命令：
- `dev`, `build`, `start`, `lint`, `test`
- `storybook`, `test:e2e`
- 无可疑的 `eval()`, `child_process`, 或网络请求脚本

### 3. Docker Compose 前端服务端口合理
- `7zi-frontend/docker-compose.yml`: 仅暴露 `3000:3000` (HTTP)
- `7zi-frontend/docker-compose.prod.yml`: 仅暴露 `3000:3000` (HTTP)
- 前端服务无敏感端口暴露

### 4. 数据库连接字符串
- `.env.production` 无数据库连接字符串
- `.env.test` 使用本地 SQLite (`/tmp/test-7zi.db`)
- 无生产数据库凭据泄露

---

## ⚠️ 警告项

### 1. 监控栈暴露多个端口

**文件:** `.next/standalone/monitoring/docker-compose.yml`

**暴露端口:**
| 服务 | 端口 | 风险 |
|------|------|------|
| Prometheus | 9090 | 指标数据泄露 |
| AlertManager | 9093 | 告警配置泄露 |
| Grafana | 3001 | 仪表盘未授权访问 |
| Loki | 3100 | 日志数据访问 |
| Node Exporter | 9100 | 系统指标 |
| cAdvisor | 8080 | 容器运行状态 |
| Pushgateway | 9091 | 指标推送 |
| Health Service | 8085 | 健康检查 |

**问题:** 这些端口绑定到 `0.0.0.0`，公网可访问。建议：
- 使用防火墙规则限制来源 IP
- 或使用 `127.0.0.1` 绑定避免公网暴露

### 2. Mock 认证文件在代码库中

**文件:** `7zi-frontend/.auth/user.json` 和 `7zi-frontend/.auth/admin.json`

```json
{"token":"mock-user-token-12345","userId":"test-user-1","role":"user"}
{"token":"mock-admin-token-67890","userId":"admin-user-1","role":"admin"}
```

**问题:** 虽然是 mock token，但 `.auth/` 目录应加入 `.gitignore`，避免意外提交。

### 3. SSH 凭据在文档中记录

**文件:** `TOOLS.md`

**问题:** TOOLS.md 包含完整的 SSH 服务器表：

```
| 服务器 | IP | 用户 | 密码 |
|--------|----|----|------|
| 7zi.com | 172.67.184.212 | root | `ge20993344$ZZ` |
```

**风险:** 
- 文档可被 git 提交
- 密码格式暴露 (`$ZZ` 结尾可能被识别为复杂密码模式)
- 如果代码库公开，服务器面临严重风险

---

## 🔴 严重问题（需立即修复）

### 1. 硬编码 Grafana 密码

**文件:** `.next/standalone/monitoring/docker-compose.yml`

```yaml
- GF_SECURITY_ADMIN_PASSWORD=7zi_monitor_2026
```

**密码出现位置:**
- `monitoring/docker-compose.yml` (GF_SECURITY_ADMIN_PASSWORD)
- `monitoring/README.md` (文档说明)
- `monitoring/QUICKSTART.md`
- `monitoring/scripts/deploy.sh`
- `monitoring/scripts/health-check.sh`

**风险:** 
- 密码以明文形式存在于多个文件中
- 分布在文档、脚本、Compose 文件中
- 如果容器端口 (3001) 对公网开放，可直接登录 Grafana

**修复建议:**
1. 使用 Docker secrets 或环境变量文件
2. 修改为强随机密码
3. 确保 Grafana 端口不对公网开放

### 2. SSH 主密码泄露风险

**文件:** `TOOLS.md`, `docs/SERVERS.md`, `docs/SSH-SETUP.md`

**问题:** 密码 `ge20993344$ZZ` 在多处文档中出现：

```bash
# TOOLS.md
| 7zi.com | 172.67.184.212 | root | `ge20993344$ZZ` |

# 多个服务器均使用相同密码
- 7zi.com (主网站)
- bot5.szspd.cn (测试机)
- Windows 测试机 (36.133.22.15)
```

**风险:**
- 多台服务器共用同一密码
- 密码在文档中明文存储
- 一台服务器被入侵，所有服务器都危险

**修复建议:**
1. 立即为每台服务器设置不同密码
2. 将敏感凭据移出代码库，存入密码管理器
3. 使用 SSH Key 认证替代密码
4. 从 git 历史中清除敏感信息

---

## 📊 风险汇总

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| 🔴 严重 | 2 | Grafana 密码明文、SSH 密码泄露 |
| ⚠️ 警告 | 3 | 监控端口暴露、Mock token 文件、凭据文档 |
| ✅ 通过 | 4 | Env 保护、脚本正常、前端端口、数据库 |

---

## 🛠️ 修复优先级

### P0 - 立即修复
1. **修改 Grafana 密码** → 生成随机强密码，通过环境变量注入
2. **清除 SSH 密码文档** → 将 TOOLS.md 中的密码移除，使用 SSH Key
3. **限制监控端口** → 防火墙规则或绑定到 localhost

### P1 - 尽快处理
4. **添加 .auth 到 .gitignore**
5. **为每台服务器设置独立密码**
6. **清除 git 历史中的敏感信息**

---

## 📝 附录

### A. 相关文件路径
- `TOOLS.md` - SSH 服务器和凭据表
- `7zi-frontend/.auth/user.json` - Mock 用户 token
- `7zi-frontend/.auth/admin.json` - Mock 管理员 token
- `.next/standalone/monitoring/docker-compose.yml` - 监控栈配置
- `monitoring/docker-compose.yml` - 监控栈配置
- `docs/security-audit-2026-05-08.md` - 上次审计报告

### B. 暴露的监控端点 (建议封锁)
```
45.33.32.156:9090   - Prometheus
45.33.32.156:9093   - AlertManager
45.33.32.156:3001   - Grafana
45.33.32.156:3100   - Loki
45.33.32.156:9100   - Node Exporter
45.33.32.156:8080   - cAdvisor
45.33.32.156:9091   - Pushgateway
45.33.32.156:8085   - Health Service
```

---

*报告生成时间: 2026-05-12 20:36 GMT+2*
*下次建议审计: 2026-05-19*