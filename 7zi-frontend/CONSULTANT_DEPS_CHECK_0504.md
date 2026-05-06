# 7zi-frontend 上游兼容性报告
**日期**: 2026-05-04  
**检查人**: 咨询师子代理  
**项目路径**: `/root/.openclaw/workspace/7zi-frontend`

---

## 1. react-hook-form 检查

**结论: 项目未使用 react-hook-form**

```bash
$ pnpm why react-hook-form
# (无输出 - 未安装)

$ grep -r "react-hook-form" src/ --include="*.ts" --include="*.tsx"
# (无结果)
```

package.json 中也**没有** `react-hook-form` 依赖。

> ⚠️ 原任务描述中提到 "可能需要检查 react-hook-form 版本"，但该项目实际上**根本没有使用** react-hook-form。这是误导信息。

---

## 2. zod 版本检查

**当前版本**: `zod@3.25.76` (dependencies 中)

```
$ pnpm ls zod
└── zod@3.25.76
```

- **zod v3.25.76** 是 zod v3 系列的最新稳定版本
- zod v4 (^4.1.11) 目前处于 beta 阶段，项目未使用
- npm ls 中显示的 `invalid: "^4.1.11"` 来自 `jiti@2.6.1` 内部依赖，与项目自身使用无关

---

## 3. 验证相关依赖分析

| 依赖 | 版本 | 用途 |
|------|------|------|
| zod | 3.25.76 | 唯一验证库 |
| zundo | 2.3.0 | Zustand 的 undo/redo，支持 zod |
| zustand | 5.0.12 | 状态管理 |

项目中验证架构:
```
src/lib/validation-schemas.ts   (zod schema 定义)
src/lib/validation/zod-adapter.ts  (zod 适配器)
src/lib/validation/index.ts
src/lib/validation/types.ts
src/shared/lib/validation-schemas.ts
```

---

## 4. TypeScript 错误分析

运行 `tsc --noEmit` 发现 **~50+ 个错误**，按原因分类:

### 4.1 `unknown` 类型未正确收窄 (最多)
```
src/components/WorkflowEditor/stores/workflow-store.ts:328,331,349,363,377
  Argument of type 'unknown' is not assignable to parameter of type 'Error | undefined'
  
src/app/api/pwa/route.ts:115,117,137
  'error' is of type 'unknown'
```
**原因**: 代码中 catch 块的 error 变量类型为 `unknown`，未做类型守卫就传给了期望 `Error | undefined` 的函数。  
**解决方案**: 添加类型守卫 `if (error instanceof Error)` 或类型断言

### 4.2 测试文件类型错误
```
src/app/api/notifications/__tests__/route.test.ts:321,347,497
  Argument of type 'string' is not assignable to parameter of type 'Notification'

src/app/api/a2a/jsonrpc/__tests__/route.test.ts:279
  Expected 0 arguments, but got 1

src/components/WorkflowEditor/__tests__/workflow-store.test.ts:496
  Property 'id' is missing in type
```
**原因**: 测试 mock 数据与实际类型定义不匹配

### 4.3 缺失的导出/导入
```
src/app/[locale]/login/page.tsx:105
  Cannot find name 'identifyUser'  (函数未定义或未导入)

src/app/dashboard/page.tsx:5
  Module '"@/components/onboarding/OnboardingFlow"' has no exported member 'OnboardingData'

src/components/performance/__tests__/PerformanceDashboard.test.tsx
  Cannot find module './PerformanceDashboard'  (文件不存在)
  Namespace 'global.jest' has no exported member 'Mock' (jest 类型问题)
```

### 4.4 API 方法不存在
```
src/app/api/users/__tests__/[id].test.ts:272+
  Property 'PATCH'/'DELETE' does not exist on type 'typeof import(".../route")'
```
**原因**: route 文件可能只导出了 GET，没有 PATCH/DELETE，或方法未正确导出

### 4.5 WorkflowEditor 测试类型错误
```
src/components/WorkflowEditor/__tests__/workflow-editor-v110.test.ts
  Type 'null' is not assignable to type 'PasteResult'
  Variable 'pastedResult' is used before being assigned
```
**原因**: 返回值可能为 null 但类型期望 PasteResult

---

## 5. 结论

| 问题类型 | 原因 | 是否依赖版本问题 |
|----------|------|-----------------|
| react-hook-form | 项目未使用该库 | ❌ 不适用 |
| zod 版本 | 3.25.76 稳定最新版 | ❌ 不是问题 |
| `unknown` 类型错误 | catch 块未做类型收窄 | ❌ 代码问题 |
| 测试文件错误 | mock 数据与类型定义不匹配 | ❌ 代码问题 |
| 缺失导出 | import/export 不匹配 | ❌ 代码问题 |

**TypeScript 错误的根本原因不是依赖版本不匹配，而是代码层面的类型处理问题：**
1. `unknown` 类型未正确收窄
2. 测试 mock 数据不完整
3. 缺失的函数/变量/模块引用
4. API route 导出不完整

**zod 版本无需升级** — zod@3.25.76 与当前代码完全兼容。

---

## 6. 建议修复顺序

1. **优先级高**: 修复 `unknown` → `Error | undefined` 错误 (workflow-store.ts, pwa/route.ts)
2. **优先级高**: 修复 `identifyUser` 缺失问题 (login/page.tsx)
3. **优先级中**: 补充测试 mock 数据的必填字段
4. **优先级中**: 检查 API route 的 PATCH/DELETE 导出
5. **优先级低**: 清理/删除或修复 PerformanceDashboard 测试文件
