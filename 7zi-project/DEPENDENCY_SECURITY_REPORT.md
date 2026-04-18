# 前端依赖安全审计报告

**项目:** 7zi-frontend  
**版本:** 1.3.0  
**审计日期:** 2026-04-03  
**审计范围:** package.json 全部依赖

---

## 📊 安全评级: **B**

| 指标         | 数值  |
| ------------ | ----- |
| 总依赖数     | 892   |
| 生产依赖     | 177   |
| 开发依赖     | 680   |
| 可选依赖     | 178   |
| **漏洞总数** | **4** |
| Critical     | 0     |
| High         | 0     |
| Moderate     | 4     |
| Low          | 0     |
| Info         | 0     |

---

## 🔴 已知安全漏洞 (4个)

### 1. esbuild (间接依赖)

| 属性         | 值                                  |
| ------------ | ----------------------------------- |
| **漏洞等级** | 🟡 Moderate (CVSS 5.3)              |
| **版本范围** | ≤ 0.24.2                            |
| **依赖路径** | vitest → vite-node → vite → esbuild |
| **CVE**      | GHSA-67mh-4wv8-2f99                 |
| **CWE**      | CWE-346                             |

**描述:** esbuild 开发服务器允许任何网站向开发服务器发送请求并读取响应，可能导致源代码泄露。

**影响:** 仅影响开发环境，不影响生产构建。

---

### 2. vite (间接依赖)

| 属性         | 值             |
| ------------ | -------------- |
| **漏洞等级** | 🟡 Moderate    |
| **版本范围** | 0.11.0 - 6.1.6 |
| **依赖路径** | vitest → vite  |

**描述:** 通过 esbuild 漏洞间接影响。

---

### 3. vite-node (间接依赖)

| 属性         | 值                 |
| ------------ | ------------------ |
| **漏洞等级** | 🟡 Moderate        |
| **版本范围** | ≤ 2.2.0-beta.2     |
| **依赖路径** | vitest → vite-node |

**描述:** 通过 vite 漏洞间接影响。

---

### 4. vitest (直接依赖)

| 属性           | 值                   |
| -------------- | -------------------- |
| **漏洞等级**   | 🟡 Moderate          |
| **当前版本**   | 1.6.1                |
| **受影响版本** | 0.3.3 - 2.2.0-beta.2 |

**描述:** 测试框架，通过其依赖的 vite/esbuild 引入漏洞。

---

## ✅ 修复建议

### 立即修复 (安全相关)

```bash
# 升级 vitest 到 v4.1.2+ (主要版本升级，需测试兼容性)
npm install vitest@latest @vitest/coverage-v8@latest @vitest/browser-playwright@latest
```

**注意:** vitest v4 是主要版本升级，可能包含破坏性变更，升级后需运行完整测试。

---

## 📦 过期依赖分析

### 高优先级更新 (主版本变更)

| 包名                   | 当前版本 | 最新版本 | 类型 | 建议                        |
| ---------------------- | -------- | -------- | ---- | --------------------------- |
| vitest                 | 1.6.1    | 4.1.2    | dev  | ⚠️ 安全漏洞，需升级         |
| @faker-js/faker        | 8.4.1    | 10.4.0   | dev  | 测试数据生成，API可能有变化 |
| @testing-library/react | 14.3.1   | 16.3.2   | dev  | React 19兼容，建议升级      |
| zustand                | 4.5.7    | 5.0.12   | prod | 状态管理，需检查API变化     |
| typescript             | 5.9.3    | 6.0.2    | dev  | 主版本升级，需验证          |
| undici                 | 7.24.7   | 8.0.1    | prod | HTTP客户端，检查兼容性      |
| jsdom                  | 24.1.3   | 29.0.1   | dev  | 测试环境，大版本跳跃        |
| @vitejs/plugin-react   | 4.7.0    | 6.0.1    | dev  | Vite插件，配合vitest升级    |

### 中优先级更新 (次版本变更)

| 包名          | 当前版本 | 最新版本 | 类型 | 风险             |
| ------------- | -------- | -------- | ---- | ---------------- |
| next          | 16.2.1   | 16.2.2   | prod | 低风险，建议更新 |
| i18next       | 26.0.1   | 26.0.3   | prod | 低风险补丁       |
| react-i18next | 17.0.1   | 17.0.2   | prod | 低风险补丁       |
| next-i18next  | 16.0.4   | 16.0.5   | prod | 低风险补丁       |
| date-fns      | 3.6.0    | 4.1.0    | prod | 主版本，检查API  |
| @types/node   | 20.19.37 | 25.5.2   | dev  | 类型定义，低风险 |

### 类型定义不匹配

```
⚠️ React 类型版本与 React 版本不匹配:
- react: 19.2.4
- @types/react: 18.3.28 (应为 19.x)
- @types/react-dom: 18.3.7 (应为 19.x)
```

**修复:**

```bash
npm install @types/react@latest @types/react-dom@latest
```

---

## 🔍 维护状态检查

### 活跃维护的包 ✅

- next (频繁更新)
- react/react-dom (活跃)
- typescript (活跃)
- zustand (活跃)
- lucide-react (活跃)
- zod (活跃)

### 无明显问题的包

- i18next 系列 (稳定维护)
- tailwind-merge (活跃)
- socket.io-client (稳定)
- jose (安全库，活跃)

---

## 📋 修复命令汇总

### 1. 安全漏洞修复 (优先)

```bash
cd /root/.openclaw/workspace/7zi-frontend

# 升级 vitest 相关包
npm install vitest@4 @vitest/coverage-v8@4 @vitest/browser-playwright@4
```

### 2. 类型定义同步

```bash
npm install @types/react@19 @types/react-dom@19
```

### 3. 次版本安全更新

```bash
npm install next@latest i18next@latest react-i18next@latest next-i18next@latest
```

### 4. 主版本升级 (需测试)

```bash
# 建议创建分支测试
npm install zustand@5 @testing-library/react@16
```

---

## 🎯 总结

### 优点

- ✅ 无 Critical/High 级别漏洞
- ✅ 核心依赖 (Next.js, React) 版本较新
- ✅ 主要依赖均活跃维护

### 需改进

- ⚠️ vitest 安全漏洞需升级
- ⚠️ React 类型定义版本不匹配
- ⚠️ 部分开发依赖版本较旧

### 建议优先级

1. **立即:** 升级 vitest 修复安全漏洞
2. **本周:** 同步 React 类型定义版本
3. **本月:** 规划主版本依赖升级测试

---

_报告生成: 2026-04-03 by 咨询师 (研究分析专家)_
