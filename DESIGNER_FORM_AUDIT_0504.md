# 表单验证 UI 组件审计报告

**日期**: 2026-05-04  
**审计者**: 设计师子代理  
**项目**: 7zi-frontend  

---

## 1. 验证系统架构总览

### 验证库 (`src/lib/validation/`)

项目有一套完整的表单验证系统，但**几乎没有被实际使用**：

| 文件 | 功能 | 状态 |
|------|------|------|
| `index.ts` | 导出所有 API | ✅ |
| `types.ts` | `ValidationRule`, `FieldState`, `FormValidationResult` 等类型 | ✅ |
| `use-validation.ts` | `useValidation` / `useFieldValidation` hooks | ✅ 未被使用 |
| `form-validator.ts` | `FormValidator` 类 | ✅ 未被使用 |
| `validators.ts` | 预置验证器 (required, email, minLength 等) | ✅ 未被使用 |
| `async-validators.ts` | 异步验证器 (uniqueEmail 等) | ✅ 未被使用 |
| `zod-adapter.ts` | Zod schema 集成 | ✅ 未被使用 |

**核心问题**: 验证库基础设施完善，但所有业务表单都绕过了它，使用手写 local state 验证。

---

## 2. 组件审计详情

### 2.1 Input 组件 — `src/components/ui/Input.tsx`

**评分**: ⭐⭐⭐⭐⭐ (优秀)

**优点**:
- `validationState` prop 支持 `none|valid|invalid|warning` 四种状态
- `error`, `success`, `warning`, `helperText` props 覆盖所有反馈场景
- 视觉验证图标 (SVG: ✓/✗/⚠)
- 密码可见性切换
- 边框颜色 + 背景色联动变化 (`bg-red-50`, `border-red-300`)
- 无效状态 shake 动画
- `aria-invalid` + `aria-describedby` 无障碍支持
- 支持 `prefix`/`suffix` 图标插槽

**问题**: 无

---

### 2.2 Select 组件 — `src/components/ui/Select.tsx`

**评分**: ⭐⭐ (差)

**严重缺陷**:
- ❌ **没有 error/errorMessage prop** — 无法显示验证错误
- ❌ **没有 validationState prop** — 无法展示验证状态
- ❌ 没有使用 `useValidation` hook
- ❌ 不支持 `aria-invalid` 无障碍错误提示

虽然使用了 `<button>` 自定义实现，但失去了原生 `<select>` 的键盘可访问性和验证状态支持。

**建议**: 添加 `error`, `validationState` props，与 Input 组件保持一致。

---

### 2.3 MultiStepFeedbackForm — `src/components/feedback/MultiStepFeedbackForm.tsx`

**评分**: ⭐⭐ (差)

**问题**:
- ❌ **没有使用 `useValidation` hook** — 验证逻辑散落在 `canGoNext()` 中
- ❌ **没有使用 `Input` 组件的 `validationState`** — Email/Name 输入框用原生 `<input>`/`<textarea>`，只靠 `required` 属性
- ❌ Email 验证只检查非空，不验证格式
- ❌ 步骤切换靠 `canGoNext()` 硬编码判断，缺少统一的验证规则
- ⚠️ Step 4 (Contact) 的 Email 输入没有 `type="email"` 也没有格式验证

```tsx
// 现状: 原生 input，无验证状态
<input type="text" ... />

// 建议: 使用 Input 组件 + validationState
<Input type="email" value={contactInfo.email} validationState={emailError ? 'invalid' : 'none'} error={emailError} ... />
```

---

### 2.4 AlertRuleForm — `src/components/alerts/AlertRuleForm.tsx`

**评分**: ⭐⭐ (差)

**问题**:
- ❌ **没有使用 `useValidation` / `FormValidator`** — 自建 `validate()` 函数
- ❌ **所有输入用原始 `<input>` / `<select>` / `<textarea>`**，不用 `Input` 组件
- ❌ 错误显示仅靠 `FormField` 底部的 `<p className="text-red-600">`，无视觉边框/背景变化
- ❌ 验证逻辑与 UI 耦合，无法复用

```tsx
// 现状: 原始 input + 手动样式
<input className={clsx('border-2', errors.name ? 'border-red-300' : 'border-gray-300')} />

// 问题: 没有红色背景色，没有 shake 动画，没有验证图标
// AlertRuleForm 完全没有使用 Input 组件的 validationState 功能
```

---

### 2.5 RoomCreateModal — `src/components/rooms/RoomCreateModal.tsx`

**评分**: ⭐⭐⭐⭐ (良好)

**优点**:
- ✅ 正确使用 `Input` 组件的 `error` prop 显示错误
- ✅ 手动验证逻辑在 `validateForm()` 中，清晰可见

**问题**:
- ❌ 没有使用 `useValidation` hook
- ❌ 描述 (`<textarea>`) 的错误只显示红色文字，没有红色边框/背景
- ⚠️ 密码切换按钮用 emoji `🙈`/`👁️` 而非 SVG 图标，与 Input 组件风格不一致

---

### 2.6 RoomJoinModal — `src/components/rooms/RoomJoinModal.tsx`

**评分**: ⭐ (很差)

**严重缺陷**:
- ❌ 密码输入用原始 `<input type="password">`，没有使用 `Input` 组件
- ❌ 没有 error prop，没有 validationState
- ❌ 错误仅用文字-banner 显示 (`border border-red-200 bg-red-50`)
- ❌ 缺少 `type="email"` 的格式验证

---

### 2.7 WorkflowEditor 验证 — `useWorkflowValidation.ts`

**评分**: ⭐⭐⭐⭐ (良好，场景不同)

这是工作流编辑器专属的图结构验证 (节点/边)，与表单验证无关。设计合理：
- 检测 Start/End 节点缺失
- 检测孤立节点
- 检测循环
- 检测 Agent/Condition/Wait 节点配置缺失

不适用于通用表单验证。

---

## 3. UI/UX 问题汇总

### 🔴 严重问题

| # | 问题 | 影响组件 | 建议 |
|---|------|----------|------|
| 1 | `Select` 组件无 error/validationState 支持 | 所有下拉表单 | 为 Select 添加与 Input 一致的验证 API |
| 2 | `AlertRuleForm` 大量使用原始 HTML 输入，不用 Input 组件 | AlertRuleForm | 重构使用 Input 组件 + useValidation hook |
| 3 | 验证库 (`useValidation`) 完全未被业务组件使用 | 所有表单 | 建立规范：新表单必须使用 useValidation |
| 4 | `RoomJoinModal` 密码输入无 Input 组件包裹 | RoomJoinModal | 改用 Input 组件 |

### 🟡 中等问题

| # | 问题 | 影响组件 | 建议 |
|---|------|----------|------|
| 5 | 错误消息仅文字显示，无视觉强调 (AlertRuleForm 的 description textarea) | AlertRuleForm | 统一使用 Input 组件的 validationState 样式 |
| 6 | 多步表单 (MultiStepFeedbackForm) email 无格式验证 | MultiStepFeedbackForm | 添加 `isValidEmail()` 验证 |
| 7 | 密码可见性切换按钮用 emoji 而非 SVG | RoomCreateModal | 统一使用 Input 组件内置的 PasswordToggle |

### 🟢 轻微问题

| # | 问题 | 建议 |
|---|------|------|
| 8 | 缺少表单验证使用文档 | 在 `docs/` 或 `src/lib/validation/README.md` 添加示例 |
| 9 | Select 组件无 `disabled` 状态的视觉区分 | 添加 disabled 样式 |

---

## 4. 一致性分析

### 错误消息显示方式 (不一致)

| 组件 | 错误显示方式 | 边框变红 | 背景变红 | 图标 |
|------|------------|---------|---------|------|
| Input 组件 | prop `error` | ✅ | ✅ | ✅ SVG |
| AlertRuleForm (FormField) | `<p>` 文字 | ❌ | ❌ | ❌ |
| RoomCreateModal (textarea) | `<p>` 文字 | ❌ | ❌ | ❌ |
| RoomJoinModal | Banner div | ✅ | ✅ | ❌ |

### 验证实现方式 (不一致)

| 组件 | 验证方式 |
|------|---------|
| Input (示例页面) | 手动 `validateEmail()` + `validationState` prop |
| MultiStepFeedbackForm | `canGoNext()` 硬编码判断 |
| AlertRuleForm | 本地 `validate()` 函数 + `errors` state |
| RoomCreateModal | `validateForm()` 函数 + `errors` state |
| RoomJoinModal | 简单 `try/catch` + 错误文字 |
| **推荐方式** | `useValidation` hook |

---

## 5. 改进优先级

### P0 (立即修复)
1. **AlertRuleForm**: 重构为使用 `Input` 组件 + `useValidation` hook，统一错误样式
2. **Select 组件**: 添加 `error` prop 和 `validationState` 支持

### P1 (本周内)
3. **RoomJoinModal**: 密码输入改用 `Input` 组件
4. **MultiStepFeedbackForm**: Email 字段加格式验证，使用 `Input` 组件的 `validationState`

### P2 (计划中)
5. 建立表单验证规范文档，推广 `useValidation` 使用
6. RoomCreateModal 的 textarea 描述使用与 Input 一致的错误样式

---

## 6. 验证库使用示例 (推荐)

```tsx
import { useValidation, required, email, minLength } from '@/lib/validation'
import { Input } from '@/components/ui/Input'

function ContactForm() {
  const form = useValidation({
    fields: [
      { name: 'name', initialValue: '', rules: [required('名称不能为空')] },
      { name: 'email', initialValue: '', rules: [required(), email()] },
      { name: 'password', initialValue: '', rules: [required(), minLength(8)] },
    ],
    defaultTrigger: 'onBlur',
  })

  return (
    <form>
      <Input
        label="名称"
        value={form.values.name}
        onChange={v => form.handleChange('name', v)}
        onBlur={() => form.handleBlur('name')}
        validationState={
          form.errors.name?.length ? 'invalid' :
          form.fieldStates.name?.touched ? 'valid' : 'none'
        }
        error={form.errors.name?.[0]}
      />
      <Input
        label="邮箱"
        type="email"
        value={form.values.email}
        onChange={v => form.handleChange('email', v)}
        onBlur={() => form.handleBlur('email')}
        validationState={form.errors.email?.length ? 'invalid' : 'none'}
        error={form.errors.email?.[0]}
      />
    </form>
  )
}
```

---

## 总结

| 维度 | 评分 |
|------|------|
| 验证库设计 | ⭐⭐⭐⭐⭐ 完善且设计良好 |
| Input 组件验证 UI | ⭐⭐⭐⭐⭐ 优秀 |
| Select 组件验证 UI | ⭐⭐ 缺失严重 |
| 表单组件一致性 | ⭐⭐ 分散、不统一 |
| useValidation hook 使用率 | ⭐ 0% (未被任何业务组件使用) |

**核心结论**: 项目有高质量的表单验证基础设施，但业务层完全绕过了它。每个表单组件各自为战，导致 UI 不一致、验证逻辑无法复用、维护成本高。建议优先将 AlertRuleForm 和 Select 作为改进试点，推广 `useValidation` hook 的使用。