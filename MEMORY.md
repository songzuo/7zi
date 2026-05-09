# MEMORY.md - 7zi.com 电商平台长期记忆

**最后更新**: 2026-05-09 04:45  
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

1. **`image.ts` 删除未提交**
   - 文件: `7zi-frontend/src/lib/utils/image.ts`
   - 状态: 已删除但未提交
   - 影响: 可能导致引用该文件的代码出错
   - 操作: 需确认是否有其他引用，决定提交删除或恢复

2. **双锁文件冲突**
   - 同时存在 `package-lock.json` (lockfileVersion 3) 和 `pnpm-lock.yaml` (lockfileVersion 9.0)
   - 问题: npm install vs pnpm install 可能行为不一致
   - 建议: 统一使用 pnpm，删除 package-lock.json

3. **21个未提交文件**
   - 包括 1 个删除、2个新增子项目文件、多个配置和源码修改
   - 建议: 尽快审查并提交或回滚

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

**关键发现**:
- ⚠️ **系统负载极高** (10.01, 4核系统严重过载)
- ⚠️ **Swap 使用率 75%** (3GB/4GB)，内存压力严重
- ⚠️ **Vitest 进程失控**: 7个 fork worker 同时运行，消耗 400%+ CPU
- ⚠️ **磁盘 I/O 延迟极高**: d_await=1718ms
- ⚠️ **存在僵尸进程**: 4个 zombie 进程未回收
- ✅ **LLM API 已恢复**: 504次500错误已停止，4小时内无新错误
- ⚠️ **Evomap Gateway 需升级**: 建议 >=1.78.2 (deadline: 90秒后)
- ⚠️ **Volcengine API 限流频繁**: 需增加 fallback 模型优先级

**紧急处理**:
```bash
# 清理失控的 vitest 进程
pkill -f "vitest run"
```

### 2026-05-07 (May 7)
| 任务 | 类型 | 状态 | 产出 |
|------|------|------|------|
| 安全漏洞修复 | Bug修复 | ✅ 完成 | REPORT_SECURITY_FIX_0507.md |
| TypeScript any 审计 | 代码优化 | ✅ 完成 | REPORT_TS_ANY_AUDIT_0507.md |
| API 测试覆盖率 | 测试编写 | ✅ 完成 | REPORT_API_COVERAGE_0507.md |

**关键发现**:
- npm audit fix 修复了 3/14 漏洞，剩余 7 个高危需 force 或上游修复
- TypeScript: 221 个 @ts-nocheck 文件，452 处 any 使用，严重架构债务
- API 覆盖率约 25%，admin/database/user 等关键模块缺测

---

## 📋 待处理事项

### 🔴 紧急 (需立即处理)
- [x] ~~提交或恢复 `7zi-frontend/src/lib/utils/image.ts` 删除~~ (已提交)
- [x] ~~决定包管理器并清理多余锁文件~~ (已处理)
- [ ] 审查并提交 21 个未提交文件
- [ ] **清理失控的 vitest 进程**: `pkill -f "vitest run"`
- [ ] 检查并修复 4 个 zombie 进程
- [ ] **更新 Evomap Gateway**: 升级到 >=1.78.2 (deadline 已过)

### 🟡 中期 (本周内)
- [ ] 创建 2026-05-08.md 和 2026-05-09.md 每日记忆
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
- [ ] 增加内存或减少并发 (Swap 使用率 73%)
- [ ] 调查 missing_env_fingerprint 问题

---

## 🔐 SSH 服务器清单

| 服务器 | IP | 用户 | 密码 | 用途 |
|--------|-----|------|------|------|
| **7zi.com** | 172.67.184.212 / 104.21.59.229 | root | `ge20993344$ZZ` | 主网站部署 |
| **bot5.szspd.cn** | 182.43.36.134 | root | `ge20993344$ZZ` | 测试机器 |
| **bot6** (本机) | - | root | - | OpenClaw运行 |
| **Windows测试机** | 36.133.22.15 | Administrator | `ge20993344$ZZ` | RDP:3389 |

### SSH 认证注意
密码含 `$`，连接时必须用单引号：
```bash
sshpass -p 'ge20993344$ZZ' ssh root@7zi.com
```

---

## 📊 项目健康评分 (2026-05-09 更新)

| 维度 | 评分 | 说明 |
|------|------|------|
| 系统资源 | 🔴 3/10 | CPU过载(10.01), Swap 75%, 磁盘高延迟 |
| 进程健康 | 🔴 3/10 | vitest失控(400%CPU), 4个zombie进程 |
| 依赖完整性 | 8/10 | node_modules健康，锁文件存在 |
| Git状态 | 5/10 | 21个未提交文件，1个删除未处理 |
| 记忆系统 | 7/10 | MEMORY.md已更新，记忆文件正常 |
| 配置一致性 | 6/10 | 双包管理器可能造成问题 |
| 磁盘使用 | 5/10 | 部分目录臃肿 (botmem 1.3GB, exports 1185) |
| **总体** | **4.5/10** | ⚠️ 系统资源危机，需立即处理 |

> ⚠️ **最高优先级问题**: vitest 进程失控导致系统负载严重，内存和磁盘压力极大 |

---

## 📝 记忆文件索引

| 文件 | 日期 | 说明 |
|------|------|------|
| memory/2026-05-07.md | May 7 | 开发任务执行报告 |
| memory/project-health-2026-05-09.md | May 9 | 项目健康检查 |
| memory/workspace-cleanup-2026-05-09.md | May 9 | 工作空间清理报告 |

> 2026-05-08.md 和 2026-05-09.md 每日记忆文件缺失

---

*最后更新: 2026-05-09 04:45 GMT+2*