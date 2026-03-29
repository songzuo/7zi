# ADR-0004: 启用 TypeScript Strict Mode

## 状态
Accepted

## 上下文

项目使用 TypeScript，但未启用 Strict Mode，导致：
- 类型安全问题（`any` 类型滥用）
- 运行时错误（未捕获的类型错误）
- 代码质量不一致
- IDE 智能提示不完整

在开发过程中遇到的典型问题：
- `null`/`undefined` 未处理导致运行时错误
- 对象属性访问未检查是否存在
- 类型推断不准确

## 决策

启用 TypeScript Strict Mode，在 `tsconfig.json` 中设置：

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 实现方案

1. **Phase 1**: 启用 Strict Mode 并修复类型错误
2. **Phase 2**: 移除 `@ts-ignore` 和 `@ts-expect-error`
3. **Phase 3**: 添加类型检查到 CI/CD

### Strict Mode 包含的检查

- `strictNullChecks`: 禁止 `null`/`undefined` 隐式赋值
- `noImplicitAny`: 禁止隐式 `any` 类型
- `strictFunctionTypes`: 函数类型严格检查
- `strictBindCallApply`: `bind`/`call`/`apply` 严格检查
- `strictPropertyInitialization`: 类属性必须初始化
- `noImplicitThis`: 禁止 `this` 隐式 `any`
- `alwaysStrict`: 严格模式解析 JS 文件

## 权衡

### 替代方案 1: 不启用 Strict Mode

**优点**:
- 快速开发
- 无类型错误修复成本

**缺点**:
- 类型安全问题
- 运行时错误风险
- 代码质量不一致

**选择 Strict Mode 的原因**: 项目规模增长，类型安全能显著减少运行时错误。

### 替代方案 2: 部分启用 Strict Mode

**优点**:
- 渐进式迁移
- 较小的改动成本

**缺点**:
- 配置复杂
- 类型检查不一致

**选择完全启用的原因**: 统一的类型检查更利于长期维护。

## 后果

### 正面影响

- ✅ **类型安全**: 编译时捕获 80-90% 类型错误
- ✅ **代码质量**: 强制正确的类型使用
- ✅ **IDE 支持**: 完整的智能提示和自动补全
- ✅ **重构信心**: 类型检查确保重构安全
- ✅ **文档化**: 类型即文档

### 负面影响

- ⚠️ **初期成本**: 需要修复现有类型错误（约 50-100 个）
- ⚠️ **开发效率**: 初期可能略慢（需要处理类型）
- ⚠️ **第三方库**: 部分库类型定义不完善

### 迁移策略

1. **启用 Strict Mode**:
   ```bash
   # 更新 tsconfig.json
   # 运行类型检查
   npm run type-check
   ```

2. **修复类型错误**:
   - 添加正确的类型定义
   - 使用类型守卫
   - 使用 `unknown` 替代 `any`

3. **示例修复**:

   **Before**:
   ```typescript
   function getUser(id: string) {
     const user = db.find(id); // any
     return user.name; // 运行时可能错误
   }
   ```

   **After**:
   ```typescript
   function getUser(id: string): User | null {
     const user = db.find(id);
     if (!user) return null;
     return user;
   }
   ```

4. **CI/CD 集成**:
   ```yaml
   # .github/workflows/ci.yml
   - name: Type Check
     run: npm run type-check
   ```

## 最佳实践

1. **避免 `any`**: 使用 `unknown` 或具体类型
2. **类型守卫**: 使用 `typeof`、`instanceof` 等进行运行时检查
3. **可选属性**: 明确标记 `?` 或使用 `| undefined`
4. **泛型**: 提高类型复用性

## 相关决策

- [ADR-0005: 使用 Vitest 作为测试框架](0005-use-vitest-for-testing.md) - TypeScript 测试支持
- [ADR-0006: Agent Scheduler 架构](0006-agent-scheduler-architecture.md) - 完整的类型定义
