# WebSocketClient 导出缺失问题分析与修复方案

## 1. WebSocketClient 的正确位置

`WebSocketClient` 定义在 `/root/.openclaw/workspace/7zi-frontend/src/lib/websocket/core.ts` (第41行)

```typescript
export class WebSocketClient {
  // ... 实现
}
```

## 2. 当前导出/导入的问题分析

### 问题 1: index.ts 导出错误

**文件**: `src/lib/websocket/index.ts` (第12行)

**当前代码**:
```typescript
export { WebSocketManager, WebSocketClient } from './manager'
```

**问题**: `manager.ts` 试图从 `./core` 导出 `WebSocketClient as WebSocketManager`，但 `manager.ts` 本身没有正确处理这个导出。

### 问题 2: types.ts 缺少 ConnectionState 导入

**文件**: `src/lib/websocket/types.ts` (第79, 137, 147, 148行)

**问题**: `types.ts` 使用了 `ConnectionState` 但没有从 `constants.ts` 导入它。

### 问题 3: manager.ts 导出链断裂

**文件**: `src/lib/websocket/manager.ts` (第13行)

```typescript
export { WebSocketClient as WebSocketManager } from './core'
```

这看起来正确，但问题是 `index.ts` 从 `manager.ts` 导出时，`manager.ts` 的导出可能有问题。

### 根因分析

TypeScript 编译错误显示：
```
src/lib/websocket/index.ts(12,28): error TS2305: Module '"./manager"' has no exported member 'WebSocketClient'.
src/lib/websocket/types.ts(79,18): error TS2304: Cannot find name 'ConnectionState'.
```

这表明 `manager.ts` 没有正确从 `core.ts` 重新导出 `WebSocketClient`。

## 3. 具体的修复代码

### 修复 1: 修复 `src/lib/websocket/manager.ts`

当前 `manager.ts` 是正确的，问题可能在它没有正确从 core.ts 导出。验证 `manager.ts`:

```typescript
// manager.ts 应该是这样:
export { WebSocketClient as WebSocketManager } from './core'
```

如果这个导出失败，需要检查 `core.ts` 是否有正确的 export。

### 修复 2: 修复 `src/lib/websocket/types.ts` - 添加缺失的 ConnectionState 导入

在 `types.ts` 顶部添加:

```typescript
import { ConnectionState } from './constants'
```

或者，如果 ConnectionState 是 enum，需要确保 constants.ts 正确导出。

### 修复 3: 修复 `src/lib/websocket/index.ts` - 确保正确导出

当前 `index.ts` 第12行尝试从 `manager.ts` 导出 `WebSocketClient`，但这依赖于 manager.ts 的正确导出。如果 manager.ts 有问题，可以直接从 core.ts 导出。

**建议修改 `index.ts` 第12行**:

```typescript
// 选项A: 从 manager 导出 (如果 manager.ts 正确)
export { WebSocketManager } from './manager'
export { WebSocketClient } from './core'

// 选项B: 直接从 core 导出
export { WebSocketClient, WebSocketManager } from './core'
```

### 综合修复方案

1. **修复 `types.ts`** - 在顶部添加缺失的 `ConnectionState` 导入:
```typescript
import { ConnectionState } from './constants'
```

2. **修复 `index.ts`** - 直接从 core 导出 WebSocketClient:
```typescript
export { WebSocketManager } from './manager'
export { WebSocketClient } from './core'
```

或者更简洁地:
```typescript
export { WebSocketClient as WebSocketManager } from './core'
export type { ... } from './types'
export { ... } from './constants'
```

## 4. 完整修复文件内容

### `src/lib/websocket/types.ts` 顶部应该是:

```typescript
import type { CompressionConfig, CompressionStats } from '../websocket-compression'
import { ConnectionState } from './constants'
```

### `src/lib/websocket/index.ts` 第12行修改为:

```typescript
export { WebSocketManager, WebSocketClient } from './core'
```

这样可以直接从 core.ts 导出，绕过 manager.ts 的中间层。

## 5. 验证步骤

修复后运行:
```bash
cd /root/.openclaw/workspace/7zi-frontend
npx tsc --noEmit 2>&1 | grep -i websocket
```

应该没有关于 WebSocketClient 导出的错误。