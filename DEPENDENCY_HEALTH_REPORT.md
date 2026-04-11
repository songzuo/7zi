# 依赖健康报告

**生成时间:** 2026-04-07 23:53 GMT+2  
**项目:** 7zi-frontend v1.13.0  
**报告类型:** 依赖健康检查

---

## 1. 依赖概览

| 类型 | 数量 |
|------|------|
| 生产依赖 | 43 |
| 开发依赖 | 25 |
| **总计** | **68 packages** |

---

## 2. 未使用依赖 ⚠️

### 2.1 完全未使用的依赖

| 依赖 | 版本 | 风险 |
|------|------|------|
| `@jest/globals` | 30.3.0 | 高 - 已在 devDependencies 但测试文件使用 vitest |
| `bull` | 4.16.5 | 中 - 仅有 stub 引用，实际使用 queue stub |
| `commander` | 14.0.3 | 中 - 确认在 `src/tools/agent-cli.ts` 使用中 |

**注意:** `bull` 在 `src/lib/export/queue/export-queue.ts` 中通过 `./bull-stub` 导入，而非直接使用 `bull` 包本身。

### 2.2 可能过度安装的依赖

| 依赖 | 说明 |
|------|------|
| `socket.io` | 同时存在于 dependencies 和 devDependencies |
| `@types/bull`, `@types/jszip`, `@types/lodash` | 已有内联类型或不再需要 |

---

## 3. 潜在安全风险 🔴

### 3.1 高危漏洞

| 依赖 | 漏洞 | 严重性 | 状态 |
|------|------|--------|------|
| `xlsx` | Prototype Pollution (GHSA-4r6h-8v6p-xvw6) | HIGH | 无修复 |
| `xlsx` | ReDoS (GHSA-5pgg-2g8v-p4x9) | HIGH | 无修复 |
| `vite` (dev) | 3个漏洞 (文件读取/路径遍历/fs bypass) | HIGH | 可修复 |

### 3.2 修复建议

```bash
# vite 漏洞可通过更新修复
pnpm update vite --latest

# xlsx 无修复 - 建议:
# 1. 评估是否可迁移到其他 Excel 库 (如 exceljs)
# 2. 或锁定版本并添加安全隔离层
```

---

## 4. 依赖版本状态

### 4.1 过旧依赖

| 依赖 | 当前 | 最新 | 建议 |
|------|------|------|------|
| `glob` | 13.0.6 | 11.x | 可升级 |
| `handlebars` | 4.7.9 | 4.7.x | 确认无漏洞后继续 |
| `lodash` | 4.18.1 | 4.17.x | 已足够新 |
| `lodash-es` | 4.18.1 | 4.17.x | 与 lodash 重复 |

### 4.2 双版本问题

- `lodash` + `lodash-es` 同时安装 (功能重复)

---

## 5. 依赖结构分析

### 5.1 循环依赖检查

```bash
pnpm dep:check  # 已配置 madge
```

结果: 已配置 circular dependency 检测

### 5.2 大型依赖

| 依赖 | 风险 |
|------|------|
| `three` + `@react-three/*` | 打包体积大 (~600KB) |
| `sharp` | 原生模块，构建复杂 |
| `better-sqlite3` | 原生模块，构建复杂 |
| `xlsx` | 体积大，建议 tree-shake |

---

## 6. 依赖覆盖情况

| 范围 | 覆盖工具 |
|------|----------|
| 循环依赖 | madge |
| 未使用导出 | ts-prune |
| 安全漏洞 | npm audit |
| 打包分析 | @next/bundle-analyzer |

---

## 7. 行动建议

### 高优先级 🔴
1. **xlsx 安全风险** - 评估迁移到 `exceljs` 或实现数据隔离
2. **bull 依赖** - 确认是否需要完整 bull 包，或仅使用 stub

### 中优先级 🟡
1. **vite 更新** - `pnpm update vite --latest` 修复高危漏洞
2. **lodash-es** - 考虑移除，与 lodash 功能重复
3. **socket.io 重复** - 从 devDependencies 移除

### 低优先级 🟢
1. **glob 更新** - 检查兼容性后升级
2. **添加依赖健康检查到 CI**

---

## 8. 推荐命令

```bash
# 安全更新
pnpm update vite --latest

# 检查未使用导出
pnpm ts-prune | head -50

# 检查循环依赖
pnpm dep:check

# 完整安全审计
npm audit
```

---

*报告生成: dep-health-v1130-v2 subagent*
