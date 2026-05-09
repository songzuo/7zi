# 项目依赖安全审计报告

**审计时间**: 2026-05-09 03:43 UTC  
**项目**: 7zi-frontend (v1.14.2)  
**审计范围**: npm 依赖漏洞扫描

---

## 📊 审计概要

| 指标 | 数值 |
|------|------|
| 总漏洞数 | **13** |
| 高危 (High) | 9 |
| 中危 (Moderate) | 4 |
| 可自动修复 | 部分 (含破坏性变更) |

---

## 🔴 高危漏洞 (9个)

### 1. @babel/plugin-transform-modules-systemjs (7.12.0 - 7.29.0)

**漏洞类型**: 生成任意代码 (arbitrary code generation)  
**CVE**: GHSA-fv7c-fp4j-7gwp  
**影响**: 高危 - 编译恶意输入时可执行任意代码  
**修复**: `npm audit fix`

---

### 2. fast-uri (<=3.1.1)

**漏洞类型**:
- 路径遍历 via percent-encoded dot segments (GHSA-q3j6-qgpj-74h6)
- 主机混淆 via percent-encoded authority delimiters (GHSA-v39h-62p7-jpjc)

**影响**: 高危 - 可绕过安全检查访问敏感资源  
**修复**: `npm audit fix`

---

### 3. redis (2.6.0 - 3.1.0)

**漏洞类型**: 监控模式下正则表达式指数级放大 (ReDoS)  
**CVE**: GHSA-35q2-47q7-3pc3  
**传递依赖**: `bull → redis`  
**修复**: `npm audit fix --force` (会升级 bull@4.16.5，破坏性变更)

---

### 4. serialize-javascript (<=7.0.4)

**漏洞类型**:
- RCE via RegExp.flags 和 Date.prototype.toISOString() (GHSA-5c6j-r48x-rmvq)
- CPU 耗尽 DoS via crafted array-like objects (GHSA-qj8w-gfj5-8c6v)

**传递依赖链**:
```
workbox-webpack-plugin → workbox-build → @rollup/plugin-terser → serialize-javascript
workbox-webpack-plugin → workbox-build → serialize-javascript
```
**修复**: `npm audit fix --force`

---

## 🟡 中危漏洞 (4个)

### 5. postcss (<8.5.10)

**漏洞类型**: XSS via Unescaped `</style>` in CSS Stringify Output  
**CVE**: GHSA-qx2v-qp2m-jg93  
**传递依赖**: `next → postcss`  
**修复**: `npm audit fix --force` (会升级 next@9.3.3，破坏性变更)

---

## 🔵 依赖传递链分析

| 顶级依赖 | 传递漏洞包 | 风险等级 |
|---------|----------|--------|
| @ducanh2912/next-pwa | next (postcss), workbox-build, workbox-webpack-plugin | 高 |
| @sentry/nextjs | next (postcss) | 中 |
| next-intl | next (postcss) | 中 |
| bull | redis | 高 |
| workbox-webpack-plugin | workbox-build → serialize-javascript | 高 |

---

## ✅ 修复建议

### 立即行动 (低风险)

```bash
# 修复 babel 和 fast-uri (安全)
npm audit fix
```

### 需评估 (含破坏性变更)

```bash
# 修复 postcss 和 redis (含破坏性变更)
npm audit fix --force

# 可能需要额外工作:
# - 检查 bull API 变更 (如使用 Bull queue)
# - 检查 Next.js 相关依赖兼容性
```

### 长期建议

1. **考虑替换 workbox-webpack-plugin** - 若 PWA 不是核心功能，可移除 `@ducanh2912/next-pwa` 以消除 workbox 依赖链
2. **评估 redis 替代** - 若 Bull 不是核心功能，考虑使用原生方案或替代队列库
3. **监控更新** - 关注 serialize-javascript 未来版本修复

---

## 📅 节点模块变更检查

最近7天变更好的文件: 仅 jszip 相关文件 (+30 个)  
**结论**: 无异常大规模变更，以例行更新为主

---

## 📋 历史对比

| 日期 | 总漏洞 | 高危 | 中危 | 修复状态 |
|------|--------|------|------|---------|
| 2026-03-18 | 16 | 12 | 4 | 部分修复 |
| 2026-05-09 | 13 | 9 | 4 | 待处理 |

**趋势**: 漏洞数量下降 3 个，高危减少 3 个

---

## ⚠️ 注意事项

1. `npm audit fix --force` 可能引入破坏性变更，**建议在测试环境验证后再部署**
2. 部分修复需要更新主依赖 (next, bull)，需检查 API 兼容性
3. 建议记录每次依赖更新的变更日志

---

*报告生成: 2026-05-09 03:43 UTC*