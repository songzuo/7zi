# Validation 库架构分析报告

**项目**: 7zi-frontend  
**日期**: 2026-05-04  
**作者**: 架构师子代理

---

## 1. 目录结构

```
src/lib/validation/
├── types.ts           # 核心类型定义
├── validators.ts      # 同步验证器工厂 + ChainedValidator
├── async-validators.ts # 异步验证器工厂
├── form-validator.ts  # FormValidator 主引擎
├── use-validation.ts  # React Hook
├── zod-adapter.ts     # Zod schema 转换适配器
├── index.ts           # 统一导出
└── __tests__/         # 测试文件
```

### 设计概述

- **分层设计**: types → validators → form-validator → use-validation
- **验证规则统一接口**: `ValidationRule<T>` 和 `AsyncValidator<T>` 双轨并行
- **链式 API**: `chain().required().email().build()`
- **Zod 集成**: `zodToRules()` 将 Zod schema 转为 ValidationRule[]

---

## 2. TypeScript 错误分析

### 错误清单

| 文件 | 行号 | 问题 |
|------|------|------|
| validators.ts | 409, 414 | `Number.call` 不可调用 |
| validators.ts | 444 | AsyncValidator → ValidationRule 类型断言不兼容 |
| form-validator.ts | 165, 210 | 类型谓词/断言错误 |
| form-validator.ts | 218 | 同上 + debounce 属性访问问题 |
| use-validation.ts | 215 | handleSubmit 返回类型不匹配 |

### 2.1 validators.ts 中的 `Number.call` 问题

**位置**: `ChainedValidatorImpl.asyncValidate()` 方法

```typescript
asyncValidate(...): ChainedValidator<T> {
  const asyncRule: AsyncValidator<T> = {
    name,
    validate: async (value: T) => {
      const isValid = await validateFn(value)
      return isValid
        ? createResult(true)
        : createResult(false, message || getErrorMessage('async'))
    },
    message: message || getErrorMessage('async'),
    debounce,
  }
  this.rules.push(asyncRule as ValidationRule<T>)  // 行444: 类型断言失败
  return this
}
```

**问题**: `asyncRule` 是 `AsyncValidator<T>` 类型，不能直接断言为 `ValidationRule<T>`。两个接口的结构不同。

### 2.2 form-validator.ts 中的类型谓词问题

**位置**: 行165 和 行210 的类型保护

```typescript
const asyncRules = fieldConfig.rules?.filter(
  (r): r is AsyncValidator => 'validate' in r && r.validate.constructor.name === 'AsyncFunction'
)
```

**问题**:  
1. 类型谓词 `r is AsyncValidator` 的返回值类型必须可赋值给参数类型
2. `r.validate.constructor.name === 'AsyncFunction'` 这个检查在 TypeScript 中不可靠
3. `AsyncValidator` 缺少 `debounce` 属性的类型检查方式不对

**行218**:
```typescript
const debounce = (asyncRules[0] as AsyncValidator).debounce ?? 300
```
这里的类型断言导致后续无法正确访问属性。

### 2.3 use-validation.ts handleSubmit 返回类型问题

```typescript
const handleSubmit = useCallback(
  async (onSubmit: ...) => {
    return async (e?: React.FormEvent) => { ... }
  },
  ...
)
```

返回类型是 `Promise<(e?: React.FormEvent) => Promise<void>>`，但接口期望 `Promise<void>`。

---

## 3. AsyncValidator vs ValidationRule 类型对比

| 属性 | ValidationRule | AsyncValidator |
|------|---------------|----------------|
| `name: string` | ✅ | ✅ |
| `message: string` | ✅ | ✅ |
| `validate: (value, context?) => ValidationResult` | ✅ | ❌ |
| `validate: (value, context?) => Promise<ValidationResult>` | ❌ | ✅ |
| `skipIfEmpty?` | ✅ | ❌ |
| `debounce?` | ❌ | ✅ |
| `serverSide?` | ❌ | ✅ |

**根本问题**: `AsyncValidator` 不是 `ValidationRule` 的超集，而是功能不同的并行接口。代码中试图将 `AsyncValidator` 当作 `ValidationRule` 使用是类型设计上的错误。

---

## 4. 与 React Hook Form 的集成

**结论**: 当前 validation 库**没有**与 React Hook Form 集成。

- `use-validation.ts` 是自研的 React Hook
- 没有 `react-hook-form` 依赖
- 没有 `Controller` 组件或 RHF adapter

**自研 Hook 与 RHF 的对比**:

| 特性 | 自研 useValidation | React Hook Form |
|------|-------------------|------------------|
| 状态管理 | 内部 Map | RHF 上下文 |
| 异步验证 | 自实现 debounce | useForm 内置 |
| 性能 | 每次 setState 触发重渲染 | 引用稳定，按需重渲染 |
| 生态 | 自封闭 | 庞大生态 |

---

## 5. 修复计划

### Phase 1: 修复核心类型不兼容 (优先级: 高)

1. **定义联合类型**
```typescript
type AnyValidationRule = ValidationRule<unknown> | AsyncValidator<unknown>
```

2. **修复 ChainedValidatorImpl**
- `asyncValidate()` 不应返回 `ValidationRule[]`
- 考虑分离同步/异步规则数组

3. **修复 form-validator.ts 行165/210**
- 使用更安全的类型守卫
- 不要依赖 `constructor.name`

### Phase 2: 修复 validators.ts 行409/414

检查具体代码位置，修复 `Number.call` 相关问题。

### Phase 3: 修复 use-validation.ts handleSubmit

```typescript
// 修复前
handleSubmit: (...) => Promise<(e?: React.FormEvent) => Promise<void>>

// 修复后 - 应该是
handleSubmit: (onSubmit: ...) => (e?: React.FormEvent) => Promise<void>
```

### Phase 4: 考虑 RHF 集成或重构自研 Hook

当前自研 Hook 的问题:
- 每次状态变化触发完整重渲染
- 性能优化空间大
- 缺少可控性更新机制

---

## 6. 总结

| 问题类别 | 严重程度 | 原因 |
|----------|----------|------|
| AsyncValidator/ValidationRule 类型混杂 | 高 | 设计缺陷，两个接口不兼容但被混用 |
| ChainedValidator 混入异步规则 | 高 | 链式 API 设计错误 |
| use-validation handleSubmit 返回值 | 中 | 函数签名不匹配 |
| form-validator 类型守卫 | 中 | 依赖不可靠的 constructor.name |
| 无 React Hook Form 集成 | 低 | 自研方案，但需要评估是否迁移 |

**核心问题**: validation 库试图用同一套规则数组同时存储同步和异步验证器，但 `ValidationRule` 和 `AsyncValidator` 是两个不兼容的接口。这种设计需要在架构层面重构。