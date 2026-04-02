# 搜索功能增强文档

本文档详细说明了 `src/lib/search-filter.ts` 中新增的搜索功能增强。

## 目录

1. [功能概览](#功能概览)
2. [新功能说明](#新功能说明)
3. [API 参考](#api-参考)
4. [使用示例](#使用示例)
5. [性能考虑](#性能考虑)
6. [最佳实践](#最佳实践)
7. [向后兼容性](#向后兼容性)

---

## 功能概览

本次更新为搜索功能添加了以下增强特性：

- ✅ **模糊匹配 (Fuzzy Search)**: 允许拼写错误和接近的匹配
- ✅ **相关性评分 (Relevance Scoring)**: 智能排序搜索结果
- ✅ **拼音搜索 (Pinyin Search)**: 支持中文拼音输入
- ✅ **字段权重 (Field Weights)**: 为不同字段设置不同权重
- ✅ **最低分数阈值 (Min Score)**: 过滤低质量匹配结果

---

## 新功能说明

### 1. 模糊匹配 (Fuzzy Search)

模糊匹配使用 **Levenshtein 编辑距离**算法，允许用户输入存在拼写错误的查询。

**工作原理：**

- 计算查询字符串与目标文本之间的编辑距离
- 编辑距离 = 将一个字符串转换为另一个字符串所需的最少操作数（插入、删除、替换）
- 动态调整阈值：较长的查询允许更大的编辑距离

**默认行为：**

- `fuzzyMatch: false` - 默认禁用
- `fuzzyThreshold: 1` - 最多允许 1 个字符差异

**评分规则：**

- 精确子串匹配：分数 = `1 + (1 - position/length) * 0.3`
- 模糊匹配：分数 = `1 - distance/max(lengths)`，然后乘以 0.8

**示例：**

```typescript
// 搜索 "搜素"（"搜索" 的拼写错误）
const results = searchItems(items, '搜素', {
  fuzzyMatch: true,
  fuzzyThreshold: 1,
})
// 会找到包含 "搜索" 的项目
```

---

### 2. 相关性评分 (Relevance Scoring)

搜索结果现在根据多个因素计算相关性分数，自动排序。

**评分因素：**

| 因素     | 说明                                      | 权重                  |
| -------- | ----------------------------------------- | --------------------- |
| 匹配类型 | 完全匹配 > 子串匹配 > 模糊匹配 > 拼音匹配 | 3.0 > 2.0 > 0.8 > 0.7 |
| 匹配位置 | 文本开头匹配分数更高                      | 0-0.5 的额外分数      |
| 字段权重 | 不同字段的重要性不同                      | 可自定义（默认 1.0）  |

**评分公式：**

```typescript
score = (基础分数 + 位置加成) × 字段权重 × 匹配类型系数
```

**示例：**

```typescript
const results = searchItems(items, '搜索', {
  fieldWeights: {
    title: 2.0, // 标题匹配更重要
    description: 1.0,
    status: 0.5,
  },
})
// 标题中包含 "搜索" 的项目会排在前面
```

---

### 3. 拼音搜索 (Pinyin Search)

支持使用拼音搜索中文内容，无需切换输入法。

**工作原理：**

- 检测查询是否为纯拼音（字母+空格）
- 将中文文本转换为拼音进行匹配
- 支持模糊拼音匹配

**默认行为：**

- `pinyinMatch: false` - 默认禁用
- 内置常用汉字拼音映射表

**拼音映射：**

当前包含常用汉字的拼音映射（约 60+ 字符）。

> **注意**: 生产环境建议使用完整的拼音库，如 `pinyin-engine`。

**示例：**

```typescript
// 搜索 "renwu"（"任务" 的拼音）
const results = searchItems(items, 'renwu', {
  pinyinMatch: true,
})
// 会找到包含 "任务" 的项目
```

---

### 4. 字段权重 (Field Weights)

为不同的搜索字段设置不同的权重，影响相关性评分。

**使用场景：**

- 标题匹配比描述匹配更重要
- 特定字段应该优先显示

**默认权重：**

所有字段默认权重为 `1.0`。

**示例：**

```typescript
const results = searchItems(items, '设计', {
  fieldWeights: {
    title: 2.0, // 标题匹配得双倍分数
    description: 1.0, // 描述匹配得正常分数
    priority: 0.5, // 优先级匹配得一半分数
  },
})
```

---

### 5. 最低分数阈值 (Min Score)

过滤掉低质量的匹配结果，提升结果质量。

**默认行为：**

- `minScore: 0` - 默认不过滤

**推荐值：**

- `0.3` - 严格过滤
- `0.5` - 中等过滤
- `0` - 不过滤（默认）

**示例：**

```typescript
const results = searchItems(items, '测试', {
  fuzzyMatch: true,
  minScore: 0.5, // 只保留高质量匹配
})
```

---

## API 参考

### SearchConfig 类型

```typescript
export interface SearchConfig {
  /** 搜索目标类型 */
  target: SearchTarget

  /** 是否区分大小写（默认: false） */
  caseSensitive?: boolean

  /** 是否完全匹配（默认: false） */
  exactMatch?: boolean

  /** 搜索字段（可选，不指定则搜索所有字段） */
  fields?: string[]

  // ========== 新增功能 ==========

  /** 是否启用模糊匹配（默认: false） */
  fuzzyMatch?: boolean

  /** 模糊匹配的最大编辑距离（0-3，默认: 1） */
  fuzzyThreshold?: number

  /** 是否启用拼音模糊匹配（默认: false） */
  pinyinMatch?: boolean

  /** 字段权重（用于相关性评分） */
  fieldWeights?: Record<string, number>

  /** 最低相关性分数阈值（0-1，默认: 0） */
  minScore?: number

  /** 是否在结果中包含高亮（默认: true） */
  includeHighlights?: boolean
}
```

### searchItems 函数

```typescript
export function searchItems<T extends object>(
  items: T[],
  query: string,
  config: SearchConfig = { target: 'all' }
): SearchResult<T>[]
```

**参数：**

- `items`: 要搜索的项目列表
- `query`: 搜索关键词
- `config`: 搜索配置（可选）

**返回：**

```typescript
export interface SearchResult<T = unknown> {
  /** 匹配的项目 */
  item: T

  /** 匹配的字段 */
  matchedFields: string[]

  /** 匹配的文本片段（高亮显示） */
  highlights: {
    field: string
    text: string
    start: number
    end: number
  }[]

  /** 相关性分数 */
  score: number
}
```

---

## 使用示例

### 示例 1: 基础模糊搜索

```typescript
import { searchItems } from '@/lib/search-filter'

const items = [
  { id: 1, title: '任务管理系统', description: '完整的任务管理平台' },
  { id: 2, title: '搜索功能优化', description: '增强搜索算法' },
]

// 用户输入 "搜素"（拼写错误）
const results = searchItems(items, '搜素', {
  fuzzyMatch: true,
  fuzzyThreshold: 1,
})

// 结果会包含 "搜索功能优化"（编辑距离为 1）
```

### 示例 2: 拼音搜索

```typescript
// 用户输入拼音 "renwu"
const results = searchItems(items, 'renwu', {
  pinyinMatch: true,
})

// 结果会包含 "任务管理系统"
```

### 示例 3: 智能权重排序

```typescript
const results = searchItems(items, '设计', {
  fuzzyMatch: true,
  fieldWeights: {
    title: 2.0, // 标题最重要
    description: 1.0,
    status: 0.5,
    priority: 0.3,
  },
  minScore: 0.4,
})

// 标题中包含 "设计" 的结果会排在前面
```

### 示例 4: 综合配置

```typescript
const results = searchItems(items, 'sousuo', {
  target: 'all',
  fuzzyMatch: true,
  fuzzyThreshold: 2, // 允许 2 个字符错误
  pinyinMatch: true, // 启用拼音搜索
  fieldWeights: {
    title: 2.0,
    description: 1.0,
  },
  minScore: 0.5, // 过滤低质量结果
  includeHighlights: true, // 包含高亮信息
})

// 综合使用所有功能
```

### 示例 5: 高亮显示

```typescript
import { highlightSearchTerm } from '@/lib/search-filter'

const text = '任务管理系统'
const query = '任务'

const highlighted = highlightSearchTerm(text, query, {
  fuzzyMatch: true,
  pinyinMatch: true,
})

// 结果: "<mark class="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">任务</mark>管理系统"
```

---

## 性能考虑

### 时间复杂度

| 操作     | 时间复杂度       | 说明                       |
| -------- | ---------------- | -------------------------- |
| 精确匹配 | O(n × m)         | n = 项目数，m = 平均字段数 |
| 模糊匹配 | O(n × m × a × b) | a = 查询长度，b = 文本长度 |
| 拼音匹配 | O(n × m × k)     | k = 文本长度               |

**优化建议：**

1. **缓存机制**: 内置 LRU 缓存，最多缓存 100 个查询
2. **早期退出**: 空查询或空数组立即返回
3. **动态阈值**: 较长查询自动调整模糊阈值

### 内存使用

- 搜索缓存: 最多 100 条
- 每个缓存条目: 取决于结果大小
- 总内存: 通常 < 10MB

**清空缓存：**

```typescript
import { clearAllCaches } from '@/lib/search-filter'

clearAllCaches() // 释放所有缓存
```

### 性能调优

```typescript
// 1. 限制搜索字段
const results = searchItems(items, query, {
  fields: ['title', 'description'], // 只搜索重要字段
})

// 2. 适当提高 minScore
const results = searchItems(items, query, {
  minScore: 0.6, // 过滤更多低质量结果
})

// 3. 控制模糊阈值
const results = searchItems(items, query, {
  fuzzyMatch: true,
  fuzzyThreshold: 1, // 不要设置太大，避免过慢
})
```

---

## 最佳实践

### 1. 选择合适的配置

```typescript
// 场景 A: 简单关键词搜索（快速）
const config = {
  fuzzyMatch: false,
  pinyinMatch: false,
}

// 场景 B: 用户友好搜索（推荐）
const config = {
  fuzzyMatch: true,
  fuzzyThreshold: 1,
  pinyinMatch: true,
  fieldWeights: {
    title: 2.0,
    description: 1.0,
  },
}

// 场景 C: 高精度搜索（严格）
const config = {
  exactMatch: true,
  minScore: 0.7,
  fuzzyMatch: false,
}
```

### 2. 实时搜索防抖

```typescript
import { debounce } from 'lodash-es'

const debouncedSearch = debounce((query: string) => {
  const results = searchItems(items, query, searchConfig)
  updateResults(results)
}, 300) // 300ms 防抖

// 在输入框变化时调用
input.addEventListener('input', e => {
  debouncedSearch(e.target.value)
})
```

### 3. 显示搜索建议

```typescript
// 使用高分数结果作为建议
const results = searchItems(items, query, {
  fuzzyMatch: true,
  pinyinMatch: true,
  minScore: 0.3, // 较低阈值以获得更多建议
})

const suggestions = results
  .slice(0, 5) // 只显示前 5 个
  .map(r => r.item.title)
```

### 4. 处理空结果

```typescript
const results = searchItems(items, query, config)

if (results.length === 0) {
  // 尝试放宽条件
  const relaxedResults = searchItems(items, query, {
    ...config,
    fuzzyThreshold: 2, // 增加模糊阈值
    minScore: 0.3, // 降低分数阈值
  })

  if (relaxedResults.length > 0) {
    showSuggestion('没有找到精确匹配，以下是相近结果：', relaxedResults)
  } else {
    showNoResults()
  }
}
```

### 5. 完善的错误处理

```typescript
try {
  const results = searchItems(items, query, config)
  return { success: true, results }
} catch (error) {
  console.error('搜索失败:', error)
  // 降级到简单搜索
  const fallbackResults = searchItems(items, query, {
    fuzzyMatch: false,
    pinyinMatch: false,
  })
  return { success: true, results: fallbackResults, isFallback: true }
}
```

---

## 向后兼容性

### ✅ 完全向后兼容

所有新功能都是**可选的**，默认行为与之前版本完全一致。

### 旧代码无需修改

```typescript
// 旧代码继续工作，无需任何修改
const results = searchItems(items, query)

// 或者使用旧版配置
const results = searchItems(items, query, {
  target: 'all',
  caseSensitive: false,
  exactMatch: false,
})
```

### 渐进式增强

你可以逐步启用新功能：

```typescript
// 阶段 1: 保持现状
const results = searchItems(items, query)

// 阶段 2: 添加模糊匹配
const results = searchItems(items, query, { fuzzyMatch: true })

// 阶段 3: 添加拼音搜索
const results = searchItems(items, query, {
  fuzzyMatch: true,
  pinyinMatch: true,
})

// 阶段 4: 完整配置
const results = searchItems(items, query, {
  fuzzyMatch: true,
  fuzzyThreshold: 1,
  pinyinMatch: true,
  fieldWeights: { title: 2.0, description: 1.0 },
  minScore: 0.5,
})
```

---

## 测试

运行测试套件：

```bash
cd /root/.openclaw/workspace/7zi-project
npx tsx src/lib/search-filter.test.ts
```

测试覆盖：

- ✅ 基本搜索
- ✅ 模糊匹配
- ✅ 拼音搜索
- ✅ 权重排序
- ✅ 综合搜索
- ✅ 高亮功能
- ✅ 向后兼容性

---

## 总结

本次更新为搜索功能带来了强大的增强能力：

1. **模糊匹配** - 提高容错性，用户体验更好
2. **相关性评分** - 智能排序，结果质量更高
3. **拼音搜索** - 中文用户友好，无需切换输入法
4. **字段权重** - 灵活控制排序逻辑
5. **向后兼容** - 无需修改现有代码

所有新功能都是可选的，你可以根据项目需求选择启用。

**推荐配置：**

```typescript
const defaultSearchConfig: SearchConfig = {
  fuzzyMatch: true,
  fuzzyThreshold: 1,
  pinyinMatch: true,
  fieldWeights: {
    title: 2.0,
    description: 1.0,
  },
  minScore: 0.4,
  includeHighlights: true,
}
```

---

## 附录

### A. 拼音映射表

当前内置拼音映射（约 60+ 常用字符）。

如需完整拼音支持，建议集成第三方库：

```bash
npm install pinyin-engine
```

```typescript
import PinyinEngine from 'pinyin-engine'

const engine = new PinyinEngine(items, ['title', 'description'])
const results = engine.search(query)
```

### B. 算法参考

- **Levenshtein Distance**: https://en.wikipedia.org/wiki/Levenshtein_distance
- **Fuzzy Search**: https://fusejs.io/
- **Pinyin Conversion**: https://pinyin.js.org/

### C. 相关资源

- 测试文件: `src/lib/search-filter.test.ts`
- 类型定义: `src/types/search-filter.ts`
- 主文件: `src/lib/search-filter.ts`

---

**文档版本**: 1.0
**最后更新**: 2026-03-18
