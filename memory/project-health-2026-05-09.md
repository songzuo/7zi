# 项目健康检查报告

**检查时间**: 2026-05-09 02:13 (凌晨)  
**检查环境**: bot6 | Node.js v22 | Next.js 16.2.4

---

## 1. 目录结构概览

### 根目录关键文件
| 文件/目录 | 状态 | 说明 |
|-----------|------|------|
| `package.json` | ✅ 存在 | v1.14.2, 最后更新 May 7 10:57 |
| `package-lock.json` | ⚠️ 存在 | lockfileVersion 3, 与 pnpm-lock.yaml 同时存在 |
| `pnpm-lock.yaml` | ✅ 存在 | lockfileVersion 9.0 |
| `node_modules/` | ✅ 存在 | 935 个包, 3.0GB |
| `.next/` | ✅ 存在 | Next.js 构建缓存 |
| `7zi-frontend/` | ⚠️ 子项目 | 独立 Next.js 项目, 有自己的 `node_modules` |

### 主要目录
- `src/` - 源码 (18 个子目录)
- `7zi-frontend/` - 前端子项目 (26 个子目录)
- `tests/` - 测试 (27 个子目录)
- `docs/` - 文档 (14 个子目录)
- `memory/` - 记忆文件 (包含多年历史)
- `archive/` - 归档 (12 个子目录)
- `reports/` - 报告输出
- `botmem/` - Bot 记忆 (34 个子目录, 20GB+)
- `backups/` - 备份 (12 个子目录)
- `exports/` - 导出数据 (1185 个文件)

---

## 2. 依赖完整性检查

### package.json 分析
```
项目: 7zi-frontend v1.14.2
生产依赖: 41 个
开发依赖: 22 个
```

**关键依赖版本**:
- `next`: ^16.2.4 (最新)
- `react` / `react-dom`: ^19.2.4
- `typescript`: ^5
- `vitest`: ^4.1.2
- `@ducanh2912/next-pwa`: ^10.2.9
- `zustand`: ^5.0.12

### node_modules 状态
- ✅ 存在, 3.0GB
- ✅ `.bin/next` 符号链接正常
- ✅ 最后更新: May 7 08:17

### 锁文件一致性
| 锁文件 | 状态 | 问题 |
|--------|------|------|
| `package-lock.json` | ✅ | lockfileVersion 3 |
| `pnpm-lock.yaml` | ✅ | lockfileVersion 9.0 |

⚠️ **注意**: 同时存在 npm 和 pnpm 锁文件，可能导致依赖安装冲突。

---

## 3. Git 状态

### 未提交更改 (21 个文件)
```
M 7zi-frontend/src/lib/agents/learning/learning-data.ts
M 7zi-frontend/src/lib/db/query-optimizer.ts
M 7zi-frontend/src/lib/evomap/gateway.ts
M 7zi-frontend/src/lib/evomap/index.ts
M 7zi-frontend/src/lib/services/notification.ts
D 7zi-frontend/src/lib/utils/image.ts (已删除)
M 7zi-frontend/tsconfig.json
M HEARTBEAT.md
M MEMORY.md
M botmem/
M memory/claw-mesh-state.json
M next.config.ts
M package-lock.json
M package.json
M src/components/Collaboration/RemoteCursor/useRemoteCursors.ts
M src/lib/export/queue/bull-stub.ts
M src/lib/monitoring/types.ts
M src/lib/search/types.ts
M src/lib/utils/validation.ts
M src/lib/workflow/examples.ts
```

最近提交: `1a051e3f48 docs: 更新记忆文件` (全部是 docs 更新类提交)

---

## 4. 内存/状态文件

### Daily Memory 状态
- ❌ **缺少** `memory/2026-05-09.md` (今天)
- ❌ **缺少** `memory/2026-05-08.md` (昨天)
- 最近: `memory/workspace-analysis.md` (May 2)

### HEARTBEAT.md
- ✅ 存在, 最后更新 May 9 03:44

### heartbeat-state.json
- 存在, 最后更新 Apr 28 20:40

---

## 5. 可能的配置问题

### 🔴 需关注

1. **删除文件未提交**: `7zi-frontend/src/lib/utils/image.ts` 已删除但未提交
   - 可能是遗留删除, 需确认是否有其他引用

2. **双包管理器锁文件**: 同时存在 `package-lock.json` 和 `pnpm-lock.yaml`
   - 可能导致 `npm install` vs `pnpm install` 行为不一致
   - 建议统一使用一个包管理器

3. **大量未提交更改**: 21 个文件修改未 commit
   - 建议检查这些更改是否需要保留

### 🟡 中等优先级

4. **记忆文件缺失**: 最近两天 (May 7-9) 无每日记忆
   - 凌晨 2:13 无人值守时可能正常
   - 建议确认是否需要补写

5. **工作区臃肿**: 
   - `exports/` 有 1185 个导出文件
   - `botmem/` 占用 20GB+
   - `backups/` 有 12 个子目录
   - 建议周期性清理

### 🟢 低优先级

6. **7zi-frontend 子项目**: 独立前端项目
   - 有自己的 `.next` 构建
   - 有自己的 `package.json` (未在 workspace 根目录检测到)
   - 可能是历史遗留或双项目架构

---

## 6. 建议的维护操作

### 立即执行 (优先级高)
1. **提交未保存的更改**
   ```bash
   git add -A && git status  # 审查更改
   git commit -m "chore: save current work state"
   ```

2. **确认 image.ts 删除安全**
   - 检查是否有其他文件引用 `lib/utils/image`
   - 如需恢复或确认删除

3. **统一包管理器**
   - 决定使用 npm 或 pnpm
   - 删除另一个锁文件
   ```bash
   # 选择 pnpm 后执行
   rm package-lock.json
   pnpm install
   ```

### 短期执行 (优先级中)
4. **补充记忆文件**
   - 创建 `memory/2026-05-08.md` (如果需要)
   - 创建 `memory/2026-05-09.md`

5. **清理 exports 目录**
   - 检查 `exports/` 中是否有超过 30 天的文件
   - 可考虑归档或删除

### 长期维护 (优先级低)
6. **周期性清理 botmem 和 backups**
7. **归档旧报告文件到 `archive/`**

---

## 7. 健康评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 依赖完整性 | 8/10 | node_modules 健康, 锁文件存在 |
| Git 状态 | 5/10 | 21 个未提交文件, 1 个删除未处理 |
| 记忆系统 | 6/10 | 最近两天无记忆 |
| 配置一致性 | 6/10 | 双包管理器可能造成问题 |
| 磁盘使用 | 5/10 | 部分目录可能臃肿 |
| **总体** | **6/10** | 项目整体健康, 需整理 |

---

## 总结

项目总体健康状态**中等偏上**，核心依赖完整，但存在以下需处理的问题:

1. **🔴 紧急**: 未提交的删除操作 (`image.ts`)
2. **⚠️ 重要**: 双包管理器锁文件共存
3. **🟡 注意**: 大量未提交工作

建议尽快执行维护操作，避免问题累积。