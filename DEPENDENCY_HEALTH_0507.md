# 依赖健康报告 (2026-05-07)

## 📊 漏洞概览

| 严重程度 | 数量 |
|---------|------|
| 🔴 高危 (High) | 7 |
| 🟡 中危 (Moderate) | 7 |
| 🟢 低危 | 0 |
| **总计** | **14** |

---

## 🔴 高危漏洞 (需要立即处理)

### 1. serialize-javascript (RCE + DoS)
- **版本**: <=7.0.4
- **CVE**: GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v
- **影响**: 可导致远程代码执行和CPU耗尽
- **受影响包**: 
  - `workbox-build` → `node_modules/workbox-build/node_modules/serialize-javascript`
  - `workbox-webpack-plugin` → `node_modules/workbox-webpack-plugin/node_modules/serialize-javascript`
  - `@rollup/plugin-terser` (1.0.0 版本)
- **修复**: `npm audit fix --force` (会降级 @ducanh2912/next-pwa 到 8.7.1)
- **优先级**: ⭐⭐⭐ **最高**

### 2. redis (正则DoS)
- **版本**: 2.6.0 - 3.1.0
- **CVE**: GHSA-35q2-47q7-3pc3
- **影响**: 监控模式下正则指数级匹配导致DoS
- **受影响包**: `bull@1.1.3`
- **修复**: `npm audit fix --force` (会升级 bull 到 4.16.5，破坏性变更)
- **优先级**: ⭐⭐⭐ **最高**

---

## 🟡 中危漏洞

### 3. hono (请求限制绕过 + XSS)
- **版本**: <=4.12.15
- **CVE**: 
  - GHSA-9vqf-7f2p-gf9v (bodyLimit绕过)
  - GHSA-69xw-7hcm-h432 (JSX HTML注入)
- **当前版本**: ^4.12.14 (已安装)
- **修复**: `npm audit fix`
- **优先级**: ⭐⭐ 高

### 4. ip-address (XSS)
- **版本**: <=10.1.0
- **CVE**: GHSA-v2v4-37r5-5v8g
- **影响**: Address6 HTML输出方法存在XSS
- **受影响包**: `express-rate-limit@8.0.1 - 8.5.0`
- **修复**: `npm audit fix`
- **优先级**: ⭐⭐ 高

### 5. postcss (XSS)
- **版本**: <8.5.10
- **CVE**: GHSA-qx2v-qp2m-jg93
- **影响**: CSS字符串化输出中未转义 `</style>`
- **受影响包** (传递依赖):
  - `next@9.3.4-canary.0 - 16.3.0-canary.5` (当前 ^16.2.4)
  - `@sentry/nextjs` (当前 ^10.44.0)
  - `next-intl` (当前 ^4.9.1)
- **修复**: `npm audit fix --force` (会降级 next 到 9.3.3，破坏性变更)
- **优先级**: ⚠️ 需谨慎，可能需要等待 next 更新

---

## 📦 直接依赖问题分析

### 🔴 需立即更新
| 包名 | 当前版本 | 建议版本 | 原因 |
|------|---------|---------|------|
| `hono` | ^4.12.14 | >4.12.15 | 中危漏洞 |
| `bull` | ^1.1.3 | ^4.16.5 | 高危redis漏洞(破坏性) |
| `@rollup/plugin-terser` | 1.0.0 | 最新 | 高危serialize-javascript |

### 🟡 可计划更新
| 包名 | 当前版本 | 建议版本 | 原因 |
|------|---------|---------|------|
| `jose` | ^6.2.1 | 检查最新 | 库较旧 |
| `socket.io-client` | ^4.8.3 | 检查最新 | 可能有更新 |

### ✅ 依赖较新
| 包名 | 当前版本 | 状态 |
|------|---------|------|
| `next` | ^16.2.4 | ✅ 最新主版本 |
| `react` | ^19.2.4 | ✅ 最新 |
| `typescript` | ^5 | ✅ 最新 |
| `zod` | ^4.3.6 | ✅ 最新 |
| `zustand` | ^5.0.12 | ✅ 最新 |
| `sharp` | ^0.34.5 | ✅ 最新 |

---

## 🔧 修复建议

### 方案1: 保守修复 (推荐先执行)
```bash
npm audit fix
```
- 修复 hono、ip-address 等非破坏性漏洞
- 保留 bull 和 postcss 的破坏性更新

### 方案2: 激进修复 (需测试)
```bash
npm audit fix --force
```
- 修复所有漏洞
- ⚠️ 会降级 @ducanh2912/next-pwa 和 next
- ⚠️ 会升级 bull 到 4.16.5 (API可能变化)
- **建议**: 在测试环境充分验证后再生产部署

### 方案3: 手动更新关键包
```bash
# 单独更新 hono
npm update hono

# 单独更新 @rollup/plugin-terser
npm update @rollup/plugin-terser

# bull 需要大版本升级，建议分步
npm update bull
```

---

## ⚠️ 特殊注意事项

1. **workbox-webpack-plugin**: 通过 @ducanh2912/next-pwa 引入，是PWA功能核心，不能随意删除
2. **bull**: 队列系统核心，升级需检查API变化
3. **redis**: 单独看版本是3.x，但bull内部绑定的是旧版redis，需升级bull
4. **postcss**: Next.js 16.2.4 依赖的 postcss 版本有漏洞，需等上游修复或降级 Next

---

## 📋 行动清单

| 优先级 | 任务 | 风险 |
|-------|------|------|
| P0 | 备份当前环境 | - |
| P1 | 运行 `npm audit fix` | 低 |
| P2 | 在测试环境验证 bull 升级 | 中 |
| P3 | 评估 workbox 升级对 PWA 影响 | 中 |
| P4 | 考虑将 bull 迁移到 bullmq | 低 (可选) |

---

*报告生成时间: 2026-05-07 07:52 GMT+2*
*扫描工具: npm audit*
