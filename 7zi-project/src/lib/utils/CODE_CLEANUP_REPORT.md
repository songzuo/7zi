# lib/utils 代码清理报告

## 执行时间

2026-04-04

---

## 执行摘要

✅ **已完成：** lib/utils 目录的代码清理和优化

**主要成果：**

- 创建了 3 个新的工具模块
- 清理了 ResourceManager.ts 和 AutoCleanMap.ts 中的重复代码
- 建立了统一的基础设施，为后续优化其他文件做准备
- 识别了项目中 10+ 处 ID 生成重复和 32 处日志重复

---

## 目录结构

```
/root/.openclaw/workspace/7zi-project/src/lib/utils/
├── AutoCleanMap.ts          (235 行)
├── AutoCleanMap.test.ts     (317 行)
├── ResourceManager.ts       (226 行)
└── ResourceManager.test.ts  (256 行)
```

---

## 发现的重复代码和问题

### 🔴 严重问题

#### 1. ID 生成函数重复（最严重）

**问题描述：**

- `ResourceManager.ts` 中有私有方法 `generateId()`
- `collaboration/types.ts` 中有导出函数 `generateId()`
- 多个文件中直接使用 `Date.now() + Math.random().toString(36)` 模式

**重复位置：**

| 文件                          | 行号     | 代码                                                                                    |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `ResourceManager.ts`          | 193      | `return \`res*${Date.now()}*${Math.random().toString(36).substring(2, 9)}\`;`           |
| `collaboration/types.ts`      | 568-571  | `export function generateId(prefix: string = ''): string { ... }`                       |
| `tenant/service.ts`           | 84       | `const tenantId = \`tenant*${Date.now()}*${Math.random().toString(36).substr(2, 9)}\`;` |
| `a2a/A2AClient.ts`            | 302      | `return \`msg*${Date.now()}*${Math.random().toString(36).substr(2, 9)}\`;`              |
| `a2a/A2AProtocol.ts`          | 156      | `return \`msg*${Date.now()}*${Math.random().toString(36).substr(2, 9)}\`;`              |
| `a2a/A2AServer.ts`            | 327      | `return \`conn*${Date.now()}*${Math.random().toString(36).substr(2, 9)}\`;`             |
| `monitoring/monitor.ts`       | 259      | `return \`op*${Date.now()}*${Math.random().toString(36).substring(2, 9)}\`;`            |
| `webhook/webhook-manager.ts`  | 412      | `const random = Math.random().toString(36).substring(2, 10);`                           |
| `webhook/event-dispatcher.ts` | 369      | `const random = Math.random().toString(36).substring(2, 10);`                           |
| `webhook/event-delivery.ts`   | 461, 470 | `const random = Math.random().toString(36).substring(2, 10);`                           |

**影响：**

- 至少 10 个文件中有重复的 ID 生成逻辑
- 使用不一致：有的用 `substring(2, 9)`，有的用 `substr(2, 9)`，有的用 `substring(2, 10)`
- 前缀模式不统一

---

### 🟡 中等问题

#### 2. 日志模式重复

**问题描述：**

- `console.error` 和 `console.warn` 在多个文件中重复使用
- 没有统一的日志工具或格式

**重复位置：**

| 文件                 | 使用次数 | 示例                                                              |
| -------------------- | -------- | ----------------------------------------------------------------- |
| `ResourceManager.ts` | 7        | `console.warn(\`[${this.name}] ResourceManager 已 disposed\`)`    |
| `AutoCleanMap.ts`    | 1        | `console.error('[AutoCleanMap] onExpire callback error:', error)` |
| 其他文件             | 24       | 各种日志调用                                                      |

**影响：**

- 日志格式不统一
- 难以统一管理日志级别
- 无法轻松切换日志实现

---

#### 3. 时间戳获取重复

**问题描述：**

- `Date.now()` 在多个地方重复调用
- 可以封装成工具函数

**重复位置：**

| 文件                                | 使用次数 |
| ----------------------------------- | -------- |
| `AutoCleanMap.ts`                   | 5        |
| `ResourceManager.ts`                | 3        |
| `collaboration/presence-service.ts` | 15+      |
| `collaboration/cursor-manager.ts`   | 5+       |

**影响：**

- 代码冗余
- 难以统一时间处理逻辑（如测试时 mock）

---

### 🟢 轻微问题

#### 4. 测试文件中的重复模式

**问题描述：**

- 两个测试文件都有类似的 beforeEach/afterEach 模式
- 都有类似的 mock 设置

**重复位置：**

- `AutoCleanMap.test.ts` 和 `ResourceManager.test.ts` 都有：
  - `beforeEach` 初始化
  - `afterEach` 清理
  - 类似的测试结构

---

## 优化建议

### 优先级 1：创建统一的 ID 生成工具

**建议：**

1. 在 `lib/utils/` 下创建 `id-generator.ts`
2. 提供统一的 ID 生成函数
3. 替换所有文件中的重复代码

**示例代码：**

```typescript
// lib/utils/id-generator.ts
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

// 预定义的 ID 生成器
export const idGenerators = {
  resource: () => generateId('res'),
  message: () => generateId('msg'),
  connection: () => generateId('conn'),
  operation: () => generateId('op'),
  tenant: () => generateId('tenant'),
}
```

**影响范围：**

- `ResourceManager.ts` - 替换私有 `generateId()` 方法
- `tenant/service.ts` - 使用 `idGenerators.tenant()`
- `a2a/A2AClient.ts` - 使用 `idGenerators.message()`
- `a2a/A2AProtocol.ts` - 使用 `idGenerators.message()`
- `a2a/A2AServer.ts` - 使用 `idGenerators.connection()`
- `monitoring/monitor.ts` - 使用 `idGenerators.operation()`
- `webhook/*.ts` - 使用 `generateId()`

---

### 优先级 2：创建统一的日志工具

**建议：**

1. 在 `lib/utils/` 下创建 `logger.ts`
2. 提供统一的日志接口
3. 支持日志级别控制

**示例代码：**

```typescript
// lib/utils/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  constructor(
    private name: string,
    private level: LogLevel = LogLevel.INFO
  ) {}

  debug(...args: any[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[${this.name}]`, ...args)
    }
  }

  info(...args: any[]) {
    if (this.level <= LogLevel.INFO) {
      console.info(`[${this.name}]`, ...args)
    }
  }

  warn(...args: any[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[${this.name}]`, ...args)
    }
  }

  error(...args: any[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[${this.name}]`, ...args)
    }
  }
}

export function createLogger(name: string, level?: LogLevel): Logger {
  return new Logger(name, level)
}
```

**影响范围：**

- `ResourceManager.ts` - 替换所有 `console.warn/error`
- `AutoCleanMap.ts` - 替换 `console.error`
- 其他 24 处日志调用

---

### 优先级 3：创建时间工具函数

**建议：**

1. 在 `lib/utils/` 下创建 `time.ts`
2. 提供时间戳获取函数
3. 方便测试时 mock

**示例代码：**

```typescript
// lib/utils/time.ts
export function now(): number {
  return Date.now()
}

export function elapsedSince(timestamp: number): number {
  return now() - timestamp
}

export function timeUntil(timestamp: number): number {
  return timestamp - now()
}
```

**影响范围：**

- `AutoCleanMap.ts` - 替换 `Date.now()`
- `ResourceManager.ts` - 替换 `Date.now()`
- `collaboration/*.ts` - 替换 `Date.now()`

---

### 优先级 4：创建测试工具函数

**建议：**

1. 在 `lib/utils/` 下创建 `test-helpers.ts`
2. 提供通用的测试辅助函数
3. 减少测试代码重复

---

## 已执行的修改

### 1. 创建了新的工具文件

#### id-generator.ts

- 统一的 ID 生成工具
- 提供了 `generateId()` 函数和 `idGenerators` 对象
- 包含多种预定义的 ID 生成器

#### logger.ts

- 统一的日志工具
- 支持日志级别控制 (DEBUG, INFO, WARN, ERROR, SILENT)
- 提供命名日志器和子日志器功能

#### index.ts

- 统一的工具库导出入口

### 2. 更新了现有文件

#### ResourceManager.ts

- 导入了 `idGenerators` 和 `Logger`
- 替换了私有 `generateId()` 方法，使用 `idGenerators.resource()`
- 替换了所有 `console.warn/error` 调用，使用 `this.log.warn/error`
- 添加了 `log` 私有字段

#### AutoCleanMap.ts

- 导入了 `Logger`
- 替换了 `console.error` 调用，使用 `this.log.error`
- 添加了 `log` 私有字段
- 导出了 `AutoCleanMapOptions` 接口

### 3. 代码行数变化

| 文件                 | 修改前行数 | 修改后行数 | 变化          |
| -------------------- | ---------- | ---------- | ------------- |
| ResourceManager.ts   | 226        | 221        | -5            |
| AutoCleanMap.ts      | 235        | 240        | +5 (添加导入) |
| id-generator.ts (新) | -          | 75         | +75           |
| logger.ts (新)       | -          | 145        | +145          |
| index.ts (新)        | -          | 36         | +36           |
| **总计**             | 461        | 717        | +256          |

### 4. 优化效果

- 消除了 ResourceManager.ts 中的重复 ID 生成代码
- 统一了日志格式，便于管理和调试
- 为后续其他文件的优化提供了基础设施

---

## 总结

### 发现的重复代码统计

- **ID 生成逻辑重复：** 10+ 处
- **日志调用重复：** 32 处
- **时间戳获取重复：** 30+ 处
- **测试模式重复：** 2 个文件

### 已完成的优化

- ✅ 创建了 `id-generator.ts` - 统一的 ID 生成工具
- ✅ 创建了 `logger.ts` - 统一的日志工具
- ✅ 创建了 `index.ts` - 统一的导出入口
- ✅ 更新了 `ResourceManager.ts` - 使用新的工具
- ✅ 更新了 `AutoCleanMap.ts` - 使用新的工具

### 优化收益

- **代码减少：** ResourceManager.ts 减少 5 行重复代码
- **可维护性：** 统一的工具函数更易于维护和测试
- **一致性：** 统一的格式和行为
- **可测试性：** 更容易 mock 和测试
- **基础设施：** 为后续优化其他文件提供了基础

### 后续优化建议

#### 高优先级（建议立即执行）

1. **替换其他文件中的 ID 生成代码**
   - `tenant/service.ts` - 使用 `idGenerators.tenant()`
   - `a2a/A2AClient.ts` - 使用 `idGenerators.message()`
   - `a2a/A2AProtocol.ts` - 使用 `idGenerators.message()`
   - `a2a/A2AServer.ts` - 使用 `idGenerators.connection()`
   - `monitoring/monitor.ts` - 使用 `idGenerators.operation()`
   - `webhook/*.ts` - 使用 `generateId()`

2. **替换其他文件中的日志调用**
   - `webhook/webhook-manager.ts`
   - `webhook/event-dispatcher.ts`
   - `webhook/event-delivery.ts`
   - 其他 24 处日志调用

#### 中优先级

3. **创建时间工具函数**
   - 创建 `lib/utils/time.ts`
   - 提供 `now()`, `elapsedSince()`, `timeUntil()` 等函数
   - 替换各文件中的 `Date.now()` 调用

4. **创建测试工具函数**
   - 创建 `lib/utils/test-helpers.ts`
   - 提供通用的测试辅助函数
   - 减少测试代码重复

#### 低优先级

5. **优化测试文件**
   - 提取公共的 beforeEach/afterEach 模式
   - 创建测试基类或工具函数

6. **代码审查**
   - 检查是否有其他重复模式
   - 评估是否需要进一步重构

---

## 附录：完整的重复代码列表

### ID 生成模式

```typescript
// 模式 1: substring(2, 9)
;`res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
// 模式 2: substr(2, 9) - 已废弃的 API
`msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 模式 3: substring(2, 10)
Math.random().toString(36).substring(2, 10)
```

### 日志模式

```typescript
// 模式 1: 带名称前缀
console.warn(`[${this.name}] ...`)

// 模式 2: 固定前缀
console.error('[AutoCleanMap] ...')

// 模式 3: 无前缀
console.error(...)
```

### 时间戳模式

```typescript
// 模式 1: 直接调用
Date.now()

// 模式 2: 计算差值
Date.now() - entry.lastAccess
```
