# NPM 安全漏洞处理报告

**日期**: 2026-10-20
**项目**: 7zi-frontend
**审计工具**: pnpm audit

---

## 漏洞概览

| 严重程度 | 数量 |
|---------|------|
| High    | 1    |
| Medium  | 0    |
| Low     | 0    |
| **Total** | **1** |

---

## 唯一漏洞详情

### braces (CVE-2026-93687)

| 属性 | 值 |
|------|-----|
| **包名** | braces |
| **受影响版本** | <= 3.0.3 |
| **修复版本** | 无 (当前最新仍为 3.0.3) |
| **严重程度** | High |
| **漏洞类型** | 栈耗尽拒绝服务 (stack-exhaustion DoS) |
| **依赖路径** | `@ducanh2912/next-pwa > fast-glob > micromatch > braces` |

**说明**: `braces` 是 `micromatch` 的依赖，当前没有包含修复的安全版本发布。漏洞通过深层嵌套的正则模式导致栈溢出。

---

## 自动修复尝试

```bash
pnpm audit fix
```

**结果**: ❌ 无法自动修复

原因: 上游包 `braces@3.0.3` 本身未发布修复版本，`pnpm` 无法自动升级。

---

## 手动处理方案

### 方案 1: 使用 pnpm overrides 强制锁定 (推荐)

在 `package.json` 的 `pnpm.overrides` 中添加:

```json
"braces@<3.0.4": ">=3.0.4"
```

但由于 `braces` 最新版本仍为 `3.0.3`，此方案**暂不可行**，需等待上游修复。

### 方案 2: 替换 @ducanh2912/next-pwa

`@ducanh2912/next-pwa` 用于 Next.js 的 PWA 支持。可考虑:
- 移除 PWA 功能 (如果非核心需求)
- 使用 `next-pwa`  fork 版本
- 自定义 workbox 配置

### 方案 3: 接受风险 (临时)

该漏洞利用条件需要**攻击者能控制 minimatch/braces 的 pattern 参数**，在构建阶段触发的风险较低。如果 `fast-glob` 仅用于静态文件匹配，可评估后接受风险。

### 方案 4: 锁定 Node 版本减少攻击面

添加 `engines` 字段确保使用最新 Node 版本:

---

## engines 字段建议

当前 `package.json` **没有** `engines` 字段。建议添加:

```json
"engines": {
  "node": ">=20.0.0"
}
```

**当前运行版本**: Node v22.22.1 ✅

**理由**:
- 较新 Node 版本对正则引擎有改进，降低栈溢出风险
- 统一团队开发环境
- 与项目中 `fast-glob` (engines: `node: 20 || >=22`) 要求一致

---

## 建议行动计划

1. **短期**: 添加 `engines` 字段，锁定 Node >= 20.0.0
2. **中期**: 监控 `braces` 上游，等待修复版本发布后使用 `overrides` 强制升级
3. **长期**: 考虑是否必须保留 `@ducanh2912/next-pwa`，评估替代方案

---

## 依赖链分析

```
7zi-frontend
└── @ducanh2912/next-pwa@10.2.9
    └── fast-glob@3.3.2
        └── micromatch@4.0.8
            └── braces@3.0.3  ← 漏洞点
```

`fast-glob` 和 `micromatch` 本身均无更新版本可解决此问题，需要上游 `braces` 修复。
