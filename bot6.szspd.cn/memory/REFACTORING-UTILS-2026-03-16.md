# 代码重构报告：提取通用工具函数

**日期**: 2026-03-16  
**任务**: 扫描并提取重复代码为通用工具函数

---

## 📊 重构概览

### 新增文件

| 文件路径 | 行数 | 说明 |
|---------|------|------|
| `src/lib/utils/string.ts` | 150+ | 字符串处理工具函数 |
| `src/lib/utils/string.test.ts` | 120+ | 字符串工具测试 |
| `src/lib/utils/array.ts` | 150+ | 数组处理工具函数 |
| `src/lib/utils/array.test.ts` | 90+ | 数组工具测试 |
| `src/lib/validation/common-schemas.ts` | 150+ | Zod 通用 Schema |
| `src/lib/validation/index.ts` | 50+ | 验证模块统一导出 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/lib/utils/index.ts` | 添加字符串和数组工具导出 |
| `src/lib/activity/store.ts` | 使用 `now()` 和搜索工具函数 |
| `src/lib/logger/database-transport.ts` | 使用 `now()` 和搜索工具函数 |
| `src/lib/utils/task-utils.ts` | 使用搜索和数组检查函数 |
| `src/lib/services/notification-service.ts` | 使用 `now()` |
| `src/lib/services/ai-task-assignment.ts` | 使用 `now()` |
| `src/lib/api-response.ts` | 使用 `now()` |

---

## 🔧 提取的函数列表

### 1. 字符串处理 (`src/lib/utils/string.ts`)

| 函数名 | 说明 | 使用位置 |
|--------|------|---------|
| `matchesSearchIgnoreCase(text, searchTerm)` | 不区分大小写搜索匹配 | activity store, logger, task-utils |
| `matchesAnyField(fields, searchTerm)` | 多字段批量搜索 | activity store, logger |
| `prepareSearchTerm(term)` | 预处理搜索词（转小写） | 所有搜索功能 |
| `safeTrim(text)` | 安全 trim | - |
| `isEmptyString(text)` | 检查字符串是否为空 | - |
| `isNotEmptyString(text)` | 检查字符串是否非空 | - |
| `safeLowerCase(text)` | 安全转小写 | - |
| `safeUpperCase(text)` | 安全转大写 | - |
| `truncate(text, maxLength)` | 截断字符串 | - |
| `capitalize(text)` | 首字母大写 | - |

### 2. 数组处理 (`src/lib/utils/array.ts`)

| 函数名 | 说明 | 使用位置 |
|--------|------|---------|
| `isEmptyArray(arr)` | 检查数组是否为空 | dashboard, task-utils |
| `isNotEmptyArray(arr)` | 检查数组是否非空 | - |
| `safeLength(arr)` | 安全获取数组长度 | - |
| `unique(arr)` | 数组去重 | - |
| `uniqueBy(arr, keyFn)` | 按 key 去重 | - |
| `groupBy(arr, keyFn)` | 数组分组 | - |
| `chunk(arr, size)` | 数组分块 | - |
| `sortBy(arr, keyFn, order)` | 数组排序 | - |

### 3. Zod Schema 工具 (`src/lib/validation/common-schemas.ts`)

| 函数名 | 说明 |
|--------|------|
| `nonEmptyString(maxLength, message)` | 非空字符串 Schema |
| `optionalString(maxLength, defaultValue)` | 可选字符串 Schema |
| `descriptionText(maxLength)` | 描述文本 Schema |
| `idString(maxLength)` | ID 字符串 Schema |
| `paginationSchema` | 分页参数 Schema |
| `sortSchema(fields)` | 排序参数 Schema |
| `prioritySchema` | 优先级枚举 Schema |
| `statusSchema` | 状态枚举 Schema |
| `searchSchema` | 搜索关键词 Schema |
| `isoDateSchema` | ISO 日期 Schema |
| `dateRangeSchema` | 日期范围 Schema |
| `batchIdsSchema(maxItems)` | 批量 ID Schema |
| `createQuerySchema(sortFields)` | 创建查询 Schema |
| `createStatusQuerySchema(sortFields, statusEnum)` | 创建状态查询 Schema |

### 4. 日期时间工具 (已有，扩展使用)

| 函数名 | 说明 | 使用位置 |
|--------|------|---------|
| `now()` | 获取当前 ISO 时间戳 | 替换所有 `new Date().toISOString()` |
| `parseDate(date)` | 解析日期 | 现有 |
| `formatTimeAgo(date)` | 相对时间显示 | 现有 |

---

## 🔍 重复模式识别结果

### 已识别并处理的重复模式

1. **搜索匹配模式** (7+ 处)
   ```typescript
   // 之前
   const searchLower = query.search.toLowerCase();
   filtered = filtered.filter(a => 
     a.description.toLowerCase().includes(searchLower) ||
     a.userName?.toLowerCase().includes(searchLower)
   );

   // 之后
   const searchLower = prepareSearchTerm(query.search);
   filtered = filtered.filter(a => 
     matchesAnyField([a.description, a.userName], searchLower)
   );
   ```

2. **时间戳生成** (20+ 处)
   ```typescript
   // 之前
   timestamp: new Date().toISOString()

   // 之后
   timestamp: now() // 使用统一函数
   ```

3. **数组空检查** (多处)
   ```typescript
   // 之前
   if (!tasks || tasks.length === 0) return [];

   // 之后
   if (isEmptyArray(tasks)) return [];
   ```

### 仍可优化的模式（未处理）

1. **Zod 验证重复** - 可使用 `common-schemas.ts` 中的工厂函数重构
2. **IP 地址提取** - 可提取为独立函数
3. **错误处理模式** - 可创建统一错误处理工具

---

## ✅ 测试结果

```
✓ src/lib/utils/array.test.ts (13 tests) - 36ms
✓ src/lib/utils/string.test.ts (20 tests) - 54ms

Test Files: 2 passed
Tests: 33 passed
```

---

## 📝 使用示例

### 导入字符串工具
```typescript
import { 
  matchesSearchIgnoreCase, 
  prepareSearchTerm, 
  isEmptyString 
} from '@/lib/utils/string';
```

### 导入数组工具
```typescript
import { 
  isEmptyArray, 
  uniqueBy, 
  groupBy, 
  sortBy 
} from '@/lib/utils/array';
```

### 导入验证 Schema
```typescript
import { 
  nonEmptyString, 
  paginationSchema,
  prioritySchema 
} from '@/lib/validation';
```

---

## 🎯 后续建议

1. **使用 common-schemas.ts 重构现有 Zod schemas** - 减少验证代码重复
2. **创建 IP 处理工具** - 提取 `x-forwarded-for` 处理逻辑
3. **创建错误处理中间件** - 统一错误格式化
4. **添加更多测试覆盖** - 为新工具添加边缘情况测试
