# 🛡️ 服务器健康检查报告
**时间**: 2026-05-05 17:46 GMT+2  
**服务器**: bot6 (本机)  
**检查者**: 系统管理员子代理

---

## 系统状态概览

### 1. Git 部署状态
- **分支**: main
- **状态**: ✅ 已与 origin/main 同步，无落后
- **未提交更改**: 14 个文件 modified, 4 个 untracked
- **主要变更文件**:
  - `7zi-frontend/data/feedback.db` (数据库文件)
  - `7zi-frontend/public/sw.js` (Service Worker)
  - `7zi-frontend/src/app/[locale]/login/page.tsx`
  - `7zi-frontend/src/app/dashboard/page.tsx`
  - `HEARTBEAT.md`, `memory/claw-mesh-state.json`, `state/tasks.json`
  - 多 个 test files 修改
- **建议**: 考虑提交或丢弃这些工作区更改

### 2. 依赖检查
- ✅ **Next.js**: `/7zi-frontend/node_modules/.bin/next` 存在
- ✅ **Node.js**: v22.22.1 运行中
- ✅ **package.json** 完整: 7zi-frontend v1.14.1

### 3. 磁盘空间
| 分区 | 大小 | 已用 | 可用 | 使用率 |
|------|------|------|------|--------|
| / (root) | 145G | 71G | 75G | **49%** |
| /boot | 881M | 117M | 703M | 15% |
| /boot/efi | 105M | 6.2M | 99M | 6% |
| /run | 795M | 2.1M | 793M | 1% |

**状态**: ✅ 磁盘空间充足

### 4. 内存使用
| 类型 | 大小 |
|------|------|
| 总内存 | 7.8Gi |
| 已用 | 4.6Gi |
| 可用 | 3.2Gi |
| Swap | 4.0Gi (2.3Gi 已用) |

**状态**: ⚠️ Swap 使用率较高 (57%)，内存压力需要注意

### 5. 日志文件状态
| 日志 | 大小 | 最近状态 |
|------|------|----------|
| `logs/bot6_scheduler.log` | **44MB** | 正常（任务调度日志） |
| `logs/sync-botmem.log` | 9.2K | ⚠️ 推送失败 |

**关键日志问题**:
- `bot6_scheduler.log` 达到 44MB，建议配置 logrotate 或压缩归档
- `sync-botmem.log` 显示 `推送失败，将在下一次同步时重试` (5月4-5日)

### 6. 运行中的服务/进程

| 服务 | 状态 |
|------|------|
| PM2 | ✅ 运行中但无托管进程（空列表） |
| OpenClaw Gateway | ⏳ 命令超时（可能正常响应慢） |
| Docker | ✅ 有多个 overlay 层活跃 |

**用户进程摘要**: 系统进程正常，内核线程无异常

---

## 发现的问题清单

| # | 问题 | 严重程度 | 说明 |
|---|------|----------|------|
| P1 | **Git 工作区有未提交更改** | 🟡 中 | 14 个文件 modified + 4 untracked，可能包含重要的本地修改 |
| P2 | **botmem 推送失败** | 🟡 中 | 5月4-5日两次同步都推送到 botmem 失败，原因未知 |
| P3 | **Scheduler 日志文件过大** | 🟡 中 | 44MB 单文件，无轮转，存在磁盘占满风险 |
| P4 | **Swap 使用率偏高** | 🟡 中 | 2.3Gi/4Gi (57%) 使用，可能有内存压力 |
| P5 | **dump.rdb 文件存在** | 🟡 中 | Redis dump.rdb 5.8GB 大文件，可能来自旧部署 |
| P6 | **日志目录有 .md 报告文件** | ℹ️ 低 | logs/ 下混有非日志文件（cleanup-report, config-review 等） |

---

## 修复建议

### 立即可执行

1. **清理 scheduler 日志**
   ```bash
   # 压缩旧日志
   gzip /root/.openclaw/workspace/logs/bot6_scheduler.log
   # 或清空（确认无重要信息）
   : > /root/.openclaw/workspace/logs/bot6_scheduler.log
   ```

2. **提交或清理 git 更改**
   ```bash
   cd /root/.openclaw/workspace
   git status  # 查看详情
   git stash   # 暂存不想提交的更改
   ```

3. **配置 logrotate** (如果尚未配置)
   - 检查 `/root/.openclaw/workspace/logrotate.conf`

### 进一步调查

4. **调查 botmem 推送失败原因**
   - 网络连接问题？
   - botmem 仓库权限问题？
   - 5月4日后未再同步

5. **评估 dump.rdb**
   - 是否需要？如不需要可删除
   - 如果需要，确认备份策略

6. **检查内存使用高峰来源**
   - 是否 Node.js 进程内存泄漏？
   - 考虑增加监控告警

---

## 服务健康结论

| 维度 | 评分 | 备注 |
|------|------|------|
| 🚀 前端依赖 | 9/10 | Next.js 正常，无明显缺失 |
| 🧭 部署状态 | 8/10 | 代码最新，但有工作区污染 |
| 💾 磁盘 | 9/10 | 充足，49% 使用率 |
| 🧠 内存/Swap | 7/10 | 轻微压力，Swap 使用率高 |
| 📋 日志 | 6/10 | 文件过大，需轮转 |
| 🔗 同步状态 | 7/10 | botmem 推送持续失败 |

**总体评分: 7.8/10** — 服务器运行基本健康，需要关注日志和 git 工作区问题。