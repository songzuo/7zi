# 依赖安全审计报告

**项目:** 7zi-frontend
**版本:** 1.14.2
**审计时间:** 2026-05-11
**审计工具:** npm audit --audit-level=high
**漏洞总数:** 11 (4 moderate, 7 high)

---

## 摘要

| 严重程度 | 数量 |
|----------|------|
| High     | 7    |
| Moderate | 4    |

---

## 高危漏洞详情

### 1. @babel/plugin-transform-modules-systemjs

| 属性 | 值 |
|------|-----|
| **受影响版本** | 7.12.0 - 7.29.0 |
| **严重程度** | High |
| **漏洞类型** | 编译恶意输入时生成任意代码 (Arbitrary Code Execution) |
| **CVE/GHSA** | GHSA-fv7c-fp4j-7gwp |
| **修复建议** | `npm audit fix` |

**传递依赖路径:**
```
@babel/plugin-transform-modules-systemjs (直接依赖)
```

---

### 2. fast-uri

| 属性 | 值 |
|------|-----|
| **受影响版本** | <= 3.1.1 |
| **严重程度** | High |
| **漏洞类型** | 路径遍历 (Path Traversal) + 主机混淆 (Host Confusion) |
| **CVE/GHSA** | GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc |
| **修复建议** | `npm audit fix` |

**传递依赖路径:**
```
fast-uri (传递依赖 via 某依赖树)
```

---

### 3. serialize-javascript (workbox-build 内部)

| 属性 | 值 |
|------|-----|
| **受影响版本** | <= 7.0.4 |
| **严重程度** | High |
| **漏洞类型** | RCE via RegExp.flags/Date.toISOString() + CPU 拒绝服务 (DoS) |
| **CVE/GHSA** | GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v |
| **修复建议** | `npm audit fix --force` (可能触发破坏性变更) |

**传递依赖路径:**
```
workbox-webpack-plugin@7.1.0-7.4.0
  └── workbox-build@7.1.0-7.4.0
        └── @rollup/plugin-terser@0.2.0-0.4.4
              └── serialize-javascript@<=7.0.4

workbox-webpack-plugin@7.1.0-7.4.0
  └── workbox-build@7.1.0-7.4.0
        └── serialize-javascript@<=7.0.4
```

**注意:** 此漏洞由 `@ducanh2912/next-pwa` 间接引入，fix 会安装 `@ducanh2912/next-pwa@8.7.1`，为破坏性变更。

---

### 4. @rollup/plugin-terser (workbox-build 内部)

| 属性 | 值 |
|------|-----|
| **受影响版本** | 0.2.0 - 0.4.4 |
| **严重程度** | High |
| **漏洞类型** | 传递依赖引入的 serialize-javascript 高危漏洞 |
| **CVE/GHSA** | 继承自 serialize-javascript |
| **修复建议** | `npm audit fix --force` |

**传递依赖路径:**
```
@rollup/plugin-terser@0.2.0-0.4.4
  └── serialize-javascript@<=7.0.4 (vulnerable)
```

---

### 5. workbox-build (workbox-webpack-plugin 内部)

| 属性 | 值 |
|------|-----|
| **受影响版本** | 7.1.0 - 7.4.0 |
| **严重程度** | High |
| **漏洞类型** | 传递依赖引入的 serialize-javascript + @rollup/plugin-terser 高危漏洞 |
| **CVE/GHSA** | 继承自传递依赖 |
| **修复建议** | `npm audit fix --force` |

---

### 6. workbox-webpack-plugin

| 属性 | 值 |
|------|-----|
| **受影响版本** | 7.1.0 - 7.4.0 |
| **严重程度** | High |
| **漏洞类型** | 传递依赖引入的 @rollup/plugin-terser + workbox-build 高危漏洞 |
| **CVE/GHSA** | 继承自传递依赖 |
| **修复建议** | `npm audit fix --force` |

---

## 中危漏洞 (不计入 high 级别统计)

> 以下漏洞严重程度为 moderate，不在本次 `audit-level=high` 扫描范围内，仅作记录:

| 漏洞包 | 严重程度 | 漏洞类型 |
|--------|----------|----------|
| postcss (<8.5.10) | Moderate | CSS Stringify XSS (</style> 未转义) |
| next (9.3.4-canary.0 - 16.3.0-canary.5) | Moderate | 传递依赖 postcss XSS |
| @ducanh2912/next-pwa (>=9.0.0) | Moderate | 传递依赖 next + workbox-build |
| @sentry/nextjs (>=6.3.6) | Moderate | 传递依赖 next |

---

## 根因分析

### 直接依赖

1. **`@babel/plugin-transform-modules-systemjs`** — 直接依赖，babel 生态

### PWA 依赖链

2. **`@ducanh2912/next-pwa`** → 引入 **`next`** + **`workbox-webpack-plugin`@7.x** → 引入 **`workbox-build`** → 引入 **`@rollup/plugin-terser`** + **`serialize-javascript`**

### 传递依赖 (fast-uri)

3. **`fast-uri`** 通过某依赖的传递依赖引入

---

## 修复建议

### 方案 A: 保守修复 (推荐)

```bash
npm audit fix
```
- 修复 `@babel/plugin-transform-modules-systemjs` 和 `fast-uri`
- 不会触发破坏性变更
- **不能** 完全解决 workbox 链漏洞

### 方案 B: 强制修复

```bash
npm audit fix --force
```
- 尝试修复所有漏洞，包括 workbox 链
- ⚠️ **警告:** 会安装 `@ducanh2912/next-pwa@8.7.1`，为破坏性变更
- 可能影响 PWA 功能，需全面回归测试

### 方案 C: 分步修复

1. 先执行 `npm audit fix` 修复非破坏性漏洞
2. 单独评估 PWA 依赖升级:
   ```bash
   # 检查当前 @ducanh2912/next-pwa 版本
   npm ls @ducanh2912/next-pwa
   # 考虑升级到最新稳定版本来修复 workbox 漏洞
   npm install @ducanh2912/next-pwa@latest
   ```

### 长期建议

1. **监控依赖健康:** 定期执行 `npm audit` 并关注 DEP AUDIT 报告
2. **锁定 workbox 版本:** 考虑 fork 或维护 workbox-webpack-plugin 的安全补丁版本
3. **考虑替代 PWA 方案:** 如果 PWA 功能非核心，可考虑移除 `@ducanh2912/next-pwa` 以消除 workbox 依赖链
4. **Babel 依赖审计:** 检查 `@babel/plugin-transform-modules-systemjs` 的使用是否可替代

---

## 相关文件

- `package.json` — 项目依赖声明
- `package-lock.json` — 锁定依赖版本树
- `REPORT_DEPS_AUDIT_0510.md` — 上次审计记录 (2026-05-10)
- `REPORT_DEPENDENCY_HEALTH_0510.md` — 依赖健康报告

---

*报告生成: 2026-05-11 14:35 GMT+2*
