# 工作区健康报告

**生成时间:** 2026-05-04 11:42 GMT+2  
**检查路径:** /root/.openclaw/workspace

---

## 1. 目录结构概览

| 目录/文件 | 状态 | 说明 |
|-----------|------|------|
| `package.json` | ✅ 存在 | v1.14.1, 59个依赖 |
| `pnpm-lock.yaml` | ✅ 存在 | 508KB |
| `memory/` | ✅ 正常 | 191文件, 1.7M |
| `node_modules/` | ⚠️ 较大 | 2.6G (正常但偏大) |
| `botmem/` | ⚠️ 可优化 | 1.3G - 包含34个文件夹 |
| `.next/` | ⚠️ 缓存大 | 594M - 构建缓存 |
| `exports/` | ✅ 正常 | 14M - 1017子目录 |
| `logs/` | ✅ 正常 | 目录存在 |
| `coverage/` | ✅ 正常 | 目录存在 |

---

## 2. 依赖状态

```
项目: 7zi-frontend v1.14.1
包管理器: pnpm
锁文件: pnpm-lock.yaml ✓

依赖数量:
- 生产依赖: ~45个 (React 19.2.4, Next.js 16.2.4, etc.)
- 开发依赖: ~25个 (Vitest, Playwright, TypeScript 5, etc.)
```

**状态:** 依赖完整，锁文件存在，无异常

---

## 3. 磁盘空间

```
/dev/sda1: 145G 总容量
           71G 已使用 (49%)
           75G 可用
```

**状态:** 磁盘空间充足，无需紧急清理

---

## 4. 可优化项

### 🔴 高优先级

1. **botmem/ 目录 (1.3G)**
   - 包含大量子代理数据
   - 建议: 检查并清理过期数据

### 🟡 中优先级

2. **.next/ 构建缓存 (594M)**
   - Next.js 构建产物
   - 可通过 `rm -rf .next` 清理后重建

3. **root 目录文件过多 (~800+ 个)**
   - 包含大量历史报告文件 (REPORT_*, DEV_TASK_*, etc.)
   - 建议: 归档或清理旧文件

### 🟢 低优先级

4. **exports/ 目录 (14M, 1017子目录)**
   - 看起来是正常的导出缓存
   - 可根据需要清理

---

## 5. 健康评分

| 项目 | 评分 | 说明 |
|------|------|------|
| 依赖完整性 | 10/10 | package.json + lock 完整 |
| 磁盘空间 | 9/10 | 49%使用，尚有余量 |
| memory/ 健康 | 9/10 | 191文件，1.7M，正常 |
| 缓存优化 | 6/10 | .next + botmem 占用2G |
| 文件整洁度 | 5/10 | root目录过于杂乱 |

**综合评分: 7.8/10** - 工作区状态良好，部分缓存可优化

---

## 6. 建议操作

```bash
# 清理 Next.js 构建缓存 (安全)
rm -rf .next && npm run build

# 检查 botmem/ 内容
ls -la botmem/

# 归档旧报告文件
mkdir -p archive/reports-$(date +%Y%m)
mv REPORT_*.md archive/reports-$(date +%Y%m)/
```

---

*报告生成: workspace-health-check subagent*