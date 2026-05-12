# 依赖健康检查报告 - 2026-05-11 晚间

## 1. 安全漏洞（Workspace 主项目）

**总计：10 个漏洞**
| 严重程度 | 数量 |
|---------|------|
| Low | 1 |
| Moderate | 6 |
| High | 3 |

### 🔴 High 严重漏洞

1. **fast-uri <=3.1.0** — 路径遍历漏洞
   - 路径：`.>@ducanh2912/next-pwa>webpack>schema-utils>ajv>fast-uri`
   - 补丁版本：>=3.1.1
   - 来源：https://github.com/advisories/GHSA-q3j6-qgpj-74h6

2. **fast-uri <=3.1.1** — 主机混淆漏洞
   - 路径：同上
   - 补丁版本：>=3.1.2
   - 来源：https://github.com/advisories/GHSA-v39h-62p7-jpjc

3. **@babel/plugin-transform-modules-systemjs 7.12.0~7.29.3** — 任意代码执行
   - 路径：`.>@ducanh2912/next-pwa>workbox-build>@babel/preset-env>@babel/plugin-transform-modules-systemjs`
   - 补丁版本：>=7.29.4
   - 来源：https://github.com/advisories/GHSA-fv7c-fp4j-7gwp

**根因**：`@ducanh2912/next-pwa` 依赖旧版 `workbox-build`，间接引入漏洞依赖链。

---

## 2. 过期依赖（Workspace 主项目）

| 包 | 当前版本 | 最新版本 | 建议 |
|----|---------|---------|------|
| `hono` | 4.12.14 | 4.12.18 | 低优先级 |
| `recharts` | 3.8.0 | 3.8.1 | 低优先级 |
| `@modelcontextprotocol/sdk` | 1.27.1 | 1.29.0 | 建议升级 |
| `@sentry/nextjs` | 10.45.0 | 10.52.0 | 建议升级 |
| `lucide-react` | 1.7.0 | **1.14.0** | ⚠️ 大版本跳跃，建议升级 |
| `@types/nodemailer` (dev) | 7.0.11 | 8.0.0 | dev依赖，可延后 |
| `eslint` (dev) | 9.39.4 | **10.3.0** | ⚠️ major升级，需测试 |
| `exceljs` | 3.10.0 | **4.4.0** | ⚠️ major升级，需测试 |
| `redis` | 4.7.1 | **5.12.1** | ⚠️ major升级，需检查breaking changes |
| `typescript` (dev) | 5.9.3 | 6.0.3 | dev依赖，建议升级 |
| `prettier-plugin-tailwindcss` (dev) | 0.7.4 | 0.8.0 | dev依赖，可延后 |
| `three` | 0.183.2 | 0.184.0 | 低优先级 |

---

## 3. 未使用依赖分析

**分析脚本执行失败**：`analyze-dependencies.js` 引用路径 `/root/.openclaw/workspace/7zi-project/package.json` 不存在。需要更新脚本中的项目路径或确认 `7zi-project` 目录的实际名称。

---

## 4. botmem 目录 Git 变更分析

botmem 是 Claw-Mesh 子代理内存系统。

**最近10次提交变更：**
- 仅修改 1 个文件：`bot6/memory/claw-mesh-state.json`（+2行，-2行）
- 每次提交消息格式：`bot6: Claw-Mesh 同步 YYYY-MM-DD HH:MM`

**分析结论：**
- botmem 在高频自动同步（每4分钟一次）
- 仅状态文件有变更，内容稳定
- 无代码或配置变更，风险低

---

## 5. 7zi-frontend 过期依赖

共 **60+** 个包有过期版本。关键批次：

### 🔴 高优先级（major/breaking）

| 包 | 当前 | 最新 | 说明 |
|----|-----|-----|-----|
| `@faker-js/faker` | 8.4.1 | **10.4.0** | major跳跃 |
| `@testing-library/react` | 14.3.1 | **16.3.2** | major跳跃 |
| `@tiptap/*` 全家桶 | 2.27.2 | **3.23.1** | major跳跃，共16个包 |
| `@vitejs/plugin-react` | 4.7.0 | **6.0.1** | major升级 |
| `date-fns` | 3.6.0 | **4.1.0** | major跳跃 |
| `jsdom` (dev) | 24.1.3 | **29.1.1** | major升级 |
| `undici` | 7.24.7 | **8.2.0** | major升级 |
| `zod` | 3.25.76 | **4.4.3** | major升级 |
| `typescript` (dev) | 5.9.3 | 6.0.3 | dev依赖，建议升 |
| `lucide-react` | 1.8.0 | **1.14.0** | 建议升级 |

### ⚠️ 中优先级

| 包 | 当前 | 最新 |
|----|-----|-----|
| `next` | 16.2.4 | 16.2.6 |
| `react` / `react-dom` | 19.2.5 | 19.2.6 |
| `jose` | 6.2.2 | 6.2.3 |
| `nodemailer` | 8.0.5 | 8.0.7 |
| `msw` (dev) | 2.13.2 | 2.14.6 |

---

## 6. 升级计划建议

### 立即处理（安全相关）
1. **`@ducanh2912/next-pwa` → 最新版本**，或考虑替换为其他PWA方案（该包维护不活跃）
2. **`fast-uri`** — 通过升级 `ajv` 或 `schema-utils` 间接修复

### 本周处理（重要功能）
1. **`lucide-react`** — 主项目 1.7.0→1.14.0，frontend 1.8.0→1.14.0（图标库大版本）
2. **`@tiptap/*` 全家桶**（7zi-frontend）— 2.x → 3.x，breaking changes较多，需全面回归测试
3. **`@faker-js/faker`** — 8.x → 10.x
4. **`date-fns`** — 3.x → 4.x
5. **`zod`** — 3.x → 4.x

### 延后处理（低风险/可选）
1. `eslint` 9.x → 10.x（major，breaking changes需review）
2. `exceljs` 3.x → 4.x（major）
3. `redis` 4.x → 5.x（major）
4. `undici` 7.x → 8.x（major）

### 不紧急（dev依赖）
- `typescript`、prettier相关、storybook相关补丁版本，按需升级

---

## 7. 总结

| 项目 | 漏洞 | 过期包 | 高优先级动作 |
|------|-----|--------|------------|
| Workspace主项目 | 10个（3 high） | 12个 | 修fast-uri/babel漏洞 |
| 7zi-frontend | 未检测 | 60+个 | tiptap 2→3，faker 8→10 |

**最大风险**：`@ducanh2912/next-pwa` 间接引入了两个fast-uri高危漏洞，且该包更新缓慢，建议评估替代方案。
