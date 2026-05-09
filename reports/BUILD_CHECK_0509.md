# 构建检查报告 - 2026-05-09

## 构建状态
**失败**

## 输出摘要
- Next.js 16.2.5 (Turbopack) 编译成功
- CSS 优化发现 5 个警告（CSS 变量中斜杠分隔符语法问题）
- Turbopack 打包警告 2 个（rate-limit database.ts 动态文件路径模式过宽）
- TypeScript 类型检查失败

## 错误信息

### TypeScript 类型错误
```
./src/components/Collaboration/RemoteCursor/useRemoteCursors.ts:234:14
Type error: Argument of type '(x: number, y: number, selection?: RemoteCursor["selection"]) => void'
is not assignable to parameter of type '(...args: unknown[]) => unknown'.
  Types of parameters 'x' and 'args' are incompatible.
    Type 'unknown' is not assignable to type 'number'.
```

问题代码：
```typescript
const updateLocalCursor = useCallback(
  throttle((x: number, y: number, selection?: RemoteCursor["selection"]) => {
```
`throttle` 函数的类型定义将参数推断为 `unknown[]`，导致具体的类型签名无法匹配。

### CSS 警告 (5个)
CSS 变量语法问题：`var(--color-xxx-900/30)` 中的 `/30` 透明度写法在某些上下文中报 Unexpected token Delim('/')

### Turbopack 警告 (2个)
1. `database.ts:35` - `existsSync(DB_DIR)` 匹配了 15523 个文件，模式过宽
2. `next.config.ts` - 意外的文件追踪（NFT list），与动态 require 有关

## 建议

### 高优先级 - 修复类型错误
修改 `useRemoteCursors.ts` 中的 `throttle` 调用，为 throttle 添加泛型类型：

```typescript
import { throttle } from 'lodash';

// 方案1：给 throttle 加类型
throttle<(x: number, y: number, selection?: RemoteCursor["selection"]) => void>

// 方案2：类型断言
throttle as any
```

### 中优先级 - CSS 警告
将 CSS 变量中的透明度写法从 `var(--color-xxx-900/30)` 改为 `rgba` 或 CSS 颜色函数

### 低优先级 - Turbopack 警告
在 `database.ts` 中添加 ignore 注释：
```typescript
path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'rate-limit')
```
