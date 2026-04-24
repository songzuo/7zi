# 7zi-frontend 依赖健康报告

**项目**: 7zi-frontend (v1.14.0)  
**生成时间**: 2026-04-24  
**检查命令**: `npm outdated` + `npm audit`

---

## 📊 概览

| 类别 | 数量 |
|------|------|
| 总依赖包 | ~90+ |
| 有可用更新 | 44 |
| 需要大版本升级 | 12 |
| 安全漏洞 | 2 (5个高危, 2个中危) |

---

## 🔴 高优先级 - 需要大版本升级（可能破坏性变更）

### 1. Tiptap 编辑器套件 (2.27.2 → 3.22.4) ⭐⭐⭐
**风险**: ⭐⭐⭐⭐⭐ (最大跨越，从 v2 到 v3)

```
@tiptap/core               2.27.2  →  3.22.4
@tiptap/react              2.27.2  →  3.22.4
@tiptap/starter-kit        2.27.2  →  3.22.4
+ 16 个 extension 包
```

**影响**: Tiptap v3 是重大版本升级，API 可能有显著变化  
**建议**: 
- 先在 dev 环境测试，评估迁移成本
- 检查 [Tiptap v3 Migration Guide](https://tiptap.dev/docs/migrate)
- 考虑安排专项升级任务

### 2. @xenova/transformers (2.0.1 → 2.17.2) ⭐⭐⭐⭐
**风险**: ⭐⭐⭐⭐ (大版本跳跃)

**影响**: AI/ML 相关核心依赖，升级可能影响模型加载和推理  
**建议**: 
- 查看 Changelog 评估新功能是否需要
- 如无需新功能，可暂缓

### 3. @vitejs/plugin-react (4.7.0 → 6.0.1) ⭐⭐⭐⭐
**风险**: ⭐⭐⭐ (v4 → v6，BREAKING CHANGES)

**影响**: 可能影响 Vite 构建和 React HMR  
**建议**: 确认其他 dev 依赖兼容性后再升级

### 4. @faker-js/faker (8.4.1 → 10.4.0) ⭐⭐⭐
**风险**: ⭐⭐ (开发依赖，影响测试数据生成)

**建议**: 可安排在测试优化阶段升级

### 5. zod (3.25.76 → 4.3.6) ⭐⭐⭐
**风险**: ⭐⭐⭐ (v3 → v4，schema 定义可能需要调整)

**影响**: 表单验证、数据校验  
**建议**: 全面测试 schema 定义后升级

### 6. undici (7.24.7 → 8.1.0) ⭐⭐⭐
**风险**: ⭐⭐ (HTTP 客户端，主要用于 next-i18next)

**建议**: 确认 API 兼容性

### 7. uuid (13.0.0 → 14.0.0) ⭐⭐
**风险**: ⭐⭐ (直接受影响，还有安全修复)

**安全漏洞**: Missing buffer bounds check (GHSA-w5hq-g745-h8pq)  
**建议**: 尽快升级

---

## 🟡 中优先级 - 次版本更新

| 包 | 当前 | 最新 | 风险 |
|----|------|------|------|
| date-fns | 3.6.0 | 4.1.0 | ⭐ (v4 有 API 变化) |
| jsdom | 24.1.3 | 29.0.2 | ⭐ (测试依赖) |
| @types/node | 20.19.39 | 25.6.0 | ⭐ (类型定义) |
| typescript | 5.9.3 | 6.0.3 | ⭐ (需检查 breaking changes) |
| lucide-react | 1.8.0 | 1.9.0 | ⭐ (UI 图标库) |
| msw | 2.13.4 | 2.13.5 | ⭐ (mock 服务) |
| i18next | 26.0.5 | 26.0.7 | ⭐ |
| react-i18next | 17.0.2 | 17.0.4 | ⭐ |
| vite | 8.0.8 | 8.0.10 | ⭐ |
| vitest | 4.1.4 | 4.1.5 | ⭐ |
| @vitest/coverage-v8 | 4.1.4 | 4.1.5 | ⭐ |
| @vitest/browser-playwright | 4.1.4 | 4.1.5 | ⭐ |
| @tailwindcss/postcss | 4.2.2 | 4.2.4 | ⭐ |
| @chromatic-com/storybook | 5.1.1 | 5.1.2 | ⭐ |

---

## 🟢 低优先级 - Patch 更新

| 包 | 当前 | 最新 |
|----|------|------|
| better-sqlite3 | 12.8.0 | 12.9.0 |
| three | 0.183.2 | 0.184.0 |
| autoprefixer | 10.4.27 | 10.5.0 |

---

## 🔒 安全漏洞

### 1. serialize-javascript (高危) ⚠️
```
Severity: high
问题: RCE via RegExp.flags + CPU Exhaustion DoS
来源: @ducanh2912/next-pwa → workbox-build → @rollup/plugin-terser
修复: 需要升级 @ducanh2912/next-pwa 到 10.2.6 (breaking change)
```

**说明**: package.json 中已有 `overrides: "serialize-javascript": ">=7.0.5"` 但仍被依赖树引入低版本

### 2. uuid (中危) ✅
```
Severity: moderate
问题: Buffer bounds check 缺失
影响: exceljs 和直接使用 uuid 的地方
修复: 升级到 14.0.0
```

**建议**: 
```bash
npm audit fix --force  # 会升级 uuid 到 14.0.0
```

---

## 📦 核心框架版本 (当前最新)

| 框架 | 当前版本 | 最新版本 | 状态 |
|------|----------|----------|------|
| Next.js | 16.2.4 | 16.x | ✅ 已是最新 |
| React | 19.2.5 | 19.x | ✅ 已是最新 |
| React DOM | 19.2.5 | 19.x | ✅ 已是最新 |

---

## 🎯 升级建议路线图

### Phase 1: 安全修复 (立即)
- [ ] `npm audit fix --force` (修复 uuid 安全漏洞)
- [ ] 验证 PWA 功能正常

### Phase 2: 小版本更新 (本周)
- [ ] 更新所有 ⭐ 风险的 patch/minor 版本
- [ ] 全面测试确保无回归

### Phase 3: 大版本评估 (本月)
- [ ] **Tiptap v3 迁移评估** - 最重要
  - 阅读官方迁移指南
  - 在分支测试
  - 评估新功能是否需要
- [ ] @xenova/transformers 评估
- [ ] @vitejs/plugin-react 评估

### Phase 4: 可选升级 (按需)
- [ ] zod v4 (如需新功能)
- [ ] date-fns v4 (如需新功能)

---

## 📝 备注

1. **Next.js 16.2.4**: 已是最新主版本，无需升级
2. **React 19.2.5**: 已是最新主版本，无需升级
3. **pnpm overrides**: 已设置 serialize-javascript >=7.0.5 但漏洞仍存在，需进一步调查
4. **Tiptap 升级优先级最高**: 因为它涉及多个包，且是核心编辑功能

---

*报告生成: 咨询师子代理 @ 2026-04-24*
