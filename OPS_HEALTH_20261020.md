# 🛡️ 运维健康报告 - 2026-10-20

## 1. 磁盘使用情况

| 项目 | 数值 |
|------|------|
| 总容量 | 145G |
| 已使用 | 104G |
| 可用 | 41G |
| 使用率 | **73%** ✅ 健康 |

**目录占用 Top 10:**
| 目录 | 大小 |
|------|------|
| 7zi-frontend | 4.7G |
| node_modules | 2.3G |
| logs/ | 467M ⚠️ |
| botmem/ | 301M |
| workflow-engine/ | 300M |
| bot6/ | 50M |
| xunshi-inspector/ | 37M |
| src/ | 24M |
| docs/ | 12M |

---

## 2. 日志目录检查

- **7zi-backend/logs/** ❌ 不存在（使用 PM2 日志）
- **7zi-frontend/logs/** ❌ 不存在（使用 PM2 日志）

**PM2 日志情况:**
- `logs/` 目录总占用 **467M**，其中 `bot6_scheduler.log` 单文件占 **467M** ⚠️ 过大
- `sync-botmem.log`: 4K
- `health-check/`: 4K

**建议:** 清理或轮转 `bot6_scheduler.log`，避免继续增长。

---

## 3. Git 仓库状态

**状态:** 有未提交更改 ⚠️

```
On branch main (up to date with origin/main)

Changes not staged for commit:
  deleted:    7zi-frontend/html/assets/index-Da0hb3oU.css
  deleted:    7zi-frontend/html/assets/index-Di71CKDo.js
  deleted:    7zi-frontend/html/bg.png
  deleted:    7zi-frontend/html/favicon.ico
  deleted:    7zi-frontend/html/favicon.svg
  deleted:    7zi-frontend/html/html.meta.json.gz
  deleted:    7zi-frontend/html/index.html
  modified:   7zi-frontend/next-env.d.ts
  modified:   7zi-frontend/package.json
  modified:   7zi-frontend/pnpm-lock.yaml
  deleted:    7zi-frontend/report/jscpd-report.json
  modified:   memory/claw-mesh-state.json
  modified:   next-env.d.ts
  modified:   package.json
  modified:   pnpm-lock.yaml
  modified:   state/tasks.json

Untracked files:
  7zi-frontend/tests/api/__tests__/
  DB_SERVICES_RECOVERY_20261019.md
  NPM_VULNERABILITY_FIX_20261019.md
  SSL_RENEWAL_20261019.md
  TEST_COVERAGE_ANALYSIS_20261019.md
  tests/api/__tests__/rooms.route.test.ts
```

**注意:** 7zi-frontend 的 build 产物被删除（html/ 目录），需要确认是否需要重新构建。

---

## 4. 服务运行状态

### PM2 ✅
| 服务 | PID | 运行时间 | 内存 | 状态 |
|------|-----|----------|------|------|
| 7zi-shop | 1789 | 30h | 372.6MB | **online** ✅ |

### Nginx ❌
- 未安装或未在 PATH 中

### Docker ✅
| 容器 | 镜像 | 状态 | 端口 |
|------|------|------|------|
| 7zi-grafana | grafana/grafana:10.2.2 | **healthy** ✅ | 3001:3000 |
| 7zi-health-service | monitoring_health-service | **healthy** ✅ | 8085:8085 |
| 7zi-node-exporter | prom/node-exporter:v1.7.0 | **healthy** ✅ | 9101:9100 |
| 7zi-cadvisor | gcr.io/cadvisor/cadvisor:v0.47.2 | **healthy** ✅ | 8080:8080 |

**所有 Docker 容器运行正常，健康检查通过。**

---

## 5. 临时文件清理建议

| 项目 | 建议 |
|------|------|
| `bot6_scheduler.log` (467M) | 轮转或压缩，建议保留最新 7 天日志 |
| `deploy-20260323-*.tar.gz` (11M) | 历史部署包，可考虑归档或删除 |
| `deploy-minimal.tar.gz` (11M) | 如已完成部署，可删除 |
| `tsconfig.tsbuildinfo` (1.4M) | TypeScript 构建缓存，正常 |
| `7zi-frontend/html/` (已删除) | build 产物，确认是否需要重新构建 |

---

## 6. 总体评估

| 检查项 | 状态 |
|--------|------|
| 磁盘空间 | ✅ 正常 (73%) |
| 日志管理 | ⚠️ `bot6_scheduler.log` 过大需处理 |
| PM2 服务 | ✅ 正常运行 |
| Docker 容器 | ✅ 全部健康 |
| Nginx | ❌ 未安装/未运行 |
| Git 状态 | ⚠️ 有未提交更改 |

**综合评分: B+** — 基础服务运行良好，主要问题是日志文件过大和 Git 有未提交更改。
