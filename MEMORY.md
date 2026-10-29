# MEMORY.md - 7zi.com 电商平台长期记忆

**最后更新**: 2026-10-19 07:05 UTC  
**维护者**: AI主管（OpenClaw）  
**主人**: 宋琢环球旅行

---

## 📦 项目概述

| 属性 | 值 |
|------|-----|
| **项目名称** | 7zi.com 电商平台 |
| **当前版本** | v1.14.2 |
| **部署地址** | 7zi.com (172.67.184.212 / 104.21.59.229) |
| **测试地址** | bot5.szspd.cn (182.43.36.134) |
| **本地环境** | bot6 (本机，OpenClaw 运行节点) |
| **Windows测试机** | 36.133.22.15 (RDP:3389, Administrator) |

---

## 🛠️ 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| **框架** | Next.js | 16.2.4 |
| **UI库** | React | 19.2.4 |
| **语言** | TypeScript | 5.x |
| **状态管理** | Zustand | 5.0.12 |
| **PWA** | @ducanh2912/next-pwa | 10.2.9 |
| **测试** | Vitest | 4.1.2 |
| **包管理** | pnpm (优先) / npm (次选) | - |

### 项目结构
- `src/` - 主源码 (18个子目录)
- `7zi-frontend/` - 前端子项目 (26个子目录，有独立 node_modules)
- `tests/` - 测试文件 (27个子目录)
- `docs/` - 文档 (14个子目录)
- `memory/` - 记忆文件
- `archive/` - 归档 (12个子目录)
- `reports/` - 报告输出
- `botmem/` - Bot记忆 (34个子目录，~1.3GB)
- `backups/` - 备份 (12个子目录)
- `exports/` - 导出数据 (1185个文件)

---

## 🚨 已知的紧急问题

### 🔴 最高优先级

1. **TypeScript 测试文件类型错误** (2026-10-19 新发现)
   - 目录: `src/lib/db/__tests__/`
   - 文件: `enhanced-db.test.ts`, `index-analyzer.test.ts`, `optimization-init.test.ts`, `user-preferences.test.ts`
   - 错误类型:
     - `EnhancedDatabase` 缺少 `DatabaseConnection` 的属性: `queryRows`, `exec`, `prepare`, `pragma`, `batch`
     - `clearPerformanceMetrics` 未定义
     - `getMetrics` 不存在于 `DatabaseConnection` 类型
     - `IndexInfo.reason` 属性不存在
     - `delete` 操作符不能用于只读属性
     - `mockRejectedValueOnce` 方法不存在
   - 影响: 测试文件无法通过 TypeScript 类型检查
   - 解决方案: 修正测试文件中的类型引用，或更新 `DatabaseConnection` 接口定义

2. **双锁文件冲突**
   - 同时存在 `package-lock.json` (lockfileVersion 3) 和 `pnpm-lock.yaml` (lockfileVersion 9.0)
   - 问题: npm install vs pnpm install 可能行为不一致
   - 建议: 统一使用 pnpm，删除 package-lock.json

3. **npm audit 安全警告** (2026-10-19 确认)
   - 63 个漏洞 (3 low, 31 moderate, 26 high, 3 critical)
   - 主要高危依赖:
     - `vite 8.0.0-8.0.15`: UNC path 处理导致 NTLMv2 hash 泄露, Windows 路径绕过
     - `ws 7.0.0-7.5.10 || 8.0.0-8.20.1`: 内存泄露 + DoS 漏洞
     - `engine.io-client`, `socket.io-adapter`: 依赖有漏洞的 ws 版本
   - 建议: `npm audit fix` (非破坏性修复优先)

---

## 🔌 API提供商状态

| 提供商 | 模型 | 状态 | 备注 |
|--------|------|------|------|
| **MiniMax** | MiniMax-M2.7 | ✅ 正常 | 默认模型 |
| **glm-4.7** | 智谱GLM-4.7 | ❌ 过期 | 需要续费 |
| **deepseek-v3** | DeepSeek V3 | ❌ 过期 | 需要续费 |

> **注意**: 仅 MiniMax 可用，其他模型需续费后才能使用

---

## 👤 主人信息

| 属性 | 值 |
|------|-----|
| **名称** | 宋琢环球旅行 |
| **角色** | 人类用户，团队最高决策者 |
| **权限** | 下达任务、参加会议、一票否决、查看所有汇报 |
| **时区** | Europe/Berlin (GMT+2) |

---

## 📜 最近完成的工作

### 2026-10-19 - 心跳检查 + 文档更新 (本次)
| 任务 | 类型 | 状态 | 产出 |
|------|------|------|------|
| 心跳检查 | 系统 | ✅ 完成 | 发现 TypeScript 测试文件类型错误 |
| MEMORY.md 更新 | 文档 | ✅ 完成 | 添加新问题、清理过期项 |
| HEARTBEAT.md 更新 | 文档 | ✅ 完成 | 添加待处理 TypeScript 问题 |
| 日记更新 | 文档 | ✅ 完成 | 记录本次心跳检查 |

**本次发现**:
- ✅ **image.ts 已删除并提交**: 原紧急问题已解决
- ⚠️ **TypeScript 测试错误**: `src/lib/db/__tests__/` 目录存在类型不匹配问题
- ⚠️ **npm audit 警告**: 63 个安全漏洞待修复
- ✅ **系统状态正常**: 磁盘73%使用，内存正常，Docker/PM2/Nginx 运行正常

### 2026-05-12 - 心跳检查 + 系统清理
| 任务 | 类型 | 状态 | 产出 |
|------|------|------|------|
| 心跳检查 | 系统 | ✅ 完成 | 系统状态正常 |
| 僵尸进程清理 | 运维 | ✅ 完成 | 清理10个vitest进程，负载从15+降至5.0 |
| TypeScript 错误统计 | 开发 | ✅ 完成 | 41 errors, 579 warnings |
| Git 状态审查 | 开发 | 🔴 待处理 | 多个文件待提交 |

**关键发现**:
- ⚠️ **API阻塞持续 224+ 小时**: volcengine rate limit + glm-4.7 token过期
- ⚠️ **所有子代理任务失败**: 共10+个子代理任务因API阻塞而失败
- ✅ **MiniMax API 正常**: 主管直接执行时使用MiniMax可用
- ✅ **系统负载恢复**: 清理僵尸进程后从15+降至5.0
- ✅ **7zi.com 正常**: HTTP 301 重定向正常

### 2026-05-11 - 子代理任务批量失败 (API阻塞)
| 任务 | 类型 | 状态 | 产出 |
|------|------|------|------|
| TypeScript 修复 | 开发 | 🔴 失败 | API阻塞 |
| 测试覆盖率提升 | 测试 | 🔴 失败 | API阻塞 |
| 代码优化 | 开发 | 🔴 失败 | API阻塞 |
| 文档更新 | 文档 | 🔴 失败 | API阻塞 |
| Bug修复 (多任务) | 开发 | 🔴 失败 | API阻塞 |

### 2026-05-10 (May 10) - 子代理调度尝试
| 任务 | 类型 | 状态 | 产出 |
|------|------|------|------|
| Git健康检查 | minimax | 🟢 运行中 | - |
| 依赖健康检查 | bailian | 🟢 运行中 | - |
| 文档健康检查 | minimax | 🟢 运行中 | - |
| 内存清理 | bailian | 🟢 运行中 | - |

### 2026-05-09 (May 9) - 系统健康与深度分析
| 任务 | 类型 | 状态 | 产出 |
|------|------|------|------|
| 项目结构扫描 | 系统检查 | ✅ 完成 | dev-project-scan-20260509.md |
| 系统健康监控 | 系统检查 | ✅ 完成 | dev-health-monitor-20260509.md |
| 日志分析 | 系统检查 | ✅ 完成 | dev-log-analysis-20260509.md |
| 代码质量审查 | 开发 | ✅ 完成 | dev-code-review-20260509.md |
| 性能深度分析 | 开发 | ✅ 完成 | dev-performance-deep-20260509.md |
| Evomap 技能检查 | 系统检查 | ✅ 完成 | dev-evomap-check-20260509.md |
| API 错误调查 | 开发 | ✅ 完成 | api-error-investigation-2026-05-09.md |
| 记忆库健康审计 | 整理 | ✅ 完成 | memory-audit-2026-05-09.md |

### 2026-05-07 (May 7)
| 任务 | 类型 | 状态 | 产出 |
|------|------|------|------|
| 安全漏洞修复 | Bug修复 | ✅ 完成 | REPORT_SECURITY_FIX_0507.md |
| TypeScript any 审计 | 代码优化 | ✅ 完成 | REPORT_TS_ANY_AUDIT_0507.md |
| API 测试覆盖率 | 测试编写 | ✅ 完成 | REPORT_API_COVERAGE_0507.md |

---

## 📋 待处理事项

### 🔴 紧急 (需立即处理)
- [ ] **修复 TypeScript 测试错误**: `src/lib/db/__tests__/` 目录类型不匹配
  - 涉及文件: `enhanced-db.test.ts`, `index-analyzer.test.ts`, `optimization-init.test.ts`, `user-preferences.test.ts`
  - 错误数量: ~10 个类型错误
- [ ] **npm audit 修复**: 63 个安全漏洞 (3 critical, 26 high)
  - 可用命令: `npm audit fix`
- [ ] 更新 Evomap Gateway (deadline 已过)

### 🟡 中期 (本周内)
- [ ] 清理 coverage-*.json 临时文件 (~500MB)
- [ ] 清理 logs/archive/ 会话临时文件 (2.4MB)
- [ ] 清理 .bak 备份文件
- [ ] 添加临时文件到 .gitignore
- [ ] 配置日志轮转 (防止 evomap-heartbeat.log 无限增长)
- [ ] 监控 Volcengine API 使用量和限流情况

### 🟢 长期 (本月内)
- [ ] 解决 TypeScript 架构债务 (221 @ts-nocheck, 452 any)
- [ ] 提升 API 测试覆盖率 (当前25%)
- [ ] 清理 botmem/ 旧session数据 (1.3GB)
- [ ] 归档或清理 exports/ 旧文件
- [ ] 续费 glm-4.7 和 deepseek-v3 API
- [ ] 调查 missing_env_fingerprint 问题

---

## 🔐 SSH 服务器清单

| 服务器 | IP | 用户 | 密码 | 用途 |
|--------|-----|------|------|------|
| **7zi.com** | 198.44.179.155 (源站) / 104.21.59.229 (CF) | root | `${SSH_PASSWORD}` | 主网站部署 |
| **bot5.szspd.cn** | 182.43.36.134 | root | `${SSH_PASSWORD}` | 测试机器 |
| **bot6** (本机) | - | root | - | OpenClaw运行 |
| **Windows测试机** | 36.133.22.15 | Administrator | `${WINDOWS_PASSWORD}` | RDP:3389 |

### SSH 认证注意
密码统一存放在 `.env.secrets`（已 gitignore），使用前先加载：
```bash
source ~/.openclaw/workspace/.env.secrets
sshpass -p "$SSH_PASSWORD" ssh root@7zi.com
```
> 历史 commit 曾含明文密码，已在 HEAD 清除；如需彻底清理需重写 git 历史。

---

## 📊 项目健康评分 (2026-10-19 更新)

| 维度 | 评分 | 说明 |
|------|------|------|
| 系统资源 | 🟢 8/10 | 磁盘73%，内存正常，无僵尸进程 |
| 进程健康 | 🟢 9/10 | Docker/PM2/Nginx 正常，vitest 已清理 |
| 依赖完整性 | 🟡 6/10 | 双锁文件冲突，npm audit 63漏洞 |
| Git状态 | 🟢 9/10 | 分支正常，仅 heartbeat-state.json 待提交 |
| 记忆系统 | 🟢 8/10 | MEMORY.md已更新，记忆文件正常 |
| 配置一致性 | 🟡 6/10 | 双包管理器可能造成问题 |
| 磁盘使用 | 🟡 6/10 | botmem 1.3GB, exports 1185文件 |
| **总体** | **7.5/10** | ✅ 系统稳定，需关注代码质量 |

> ✅ **改进**: 系统资源问题已解决，vitest 僵尸进程已清理

---

## 📝 记忆文件索引

| 文件 | 日期 | 说明 |
|------|------|------|
| memory/2026-10-19.md | Oct 19 | 日志归档、架构/运维/研究报告 |
| memory/2026-05-12.md | May 12 | 心跳检查、系统清理、TypeScript统计 |
| memory/2026-05-11.md | May 11 | 子代理任务启动 |
| memory/2026-05-10.md | May 10 | 子代理调度、API阻塞 |
| memory/2026-05-09.md | May 9 | 晚间任务、系统健康分析 |
| memory/2026-05-07.md | May 7 | 开发任务执行报告 |

> 2026-05-08.md 每日记忆文件缺失 (5/9前未创建)

---

*最后更新: 2026-10-19 07:05 UTC*

---

## 📋 第23轮派发（2026-10-30 01:38）

- 上一轮 T260/T261 **从未真正执行**（文件 mtime 仍是 10-25，仓库零改动）。教训：派发后必须 `subagents list` 回验 running，不能只信任务书里的 session id。
- 本轮 6 个并行子代理（全部已回验 running）：T260R/T261R（重派去重实现）、T262（billing 零测试）、T263（config-center 4893 行仅 1 测试）、T264（OT vs CRDT 双栈审计）、T265（A2A 协议 + 鉴权漏洞）。
- 新发现的调度盲区：T240 技术债审计只扫了「未使用导出」和「重复代码」，**没扫测试覆盖率空白** —— billing/config-center 这类大面积零测试模块因此长期漏网。后续审计需补覆盖率维度。
- T260 的陷阱：`repository.ts` 比 `repository-optimized-v2.ts` 多导出 `mapRowToAgent`，直接 `export *` 会丢导出。
- T264 的关键事实：CRDT 栈 `src/lib/collab/` **全仓无生产 import**（只有自己的 5 个测试），OT 栈 `src/lib/collaboration/` 才是事实标准（websocket 生产路径在用）。两栈 `Operation` 同名但语义不同。
