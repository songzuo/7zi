# 搜索 API 文档

**版本**: v1.4.0
**最后更新**: 2026-03-29
**基础路径**: `/api/search`

---

## 概述

搜索 API 提供全局搜索功能，支持跨任务、项目、成员等多实体的统一搜索。具备高级过滤、模糊匹配、搜索历史等功能。

### 功能特性

- ✅ 全局多实体搜索
- ✅ 高级过滤条件
- ✅ 模糊匹配 (Fuzzy Search)
- ✅ 搜索历史记录
- ✅ 自动完成建议
- ✅ 搜索结果高亮

---

## 认证方式

所有 API 请求建议携带 JWT Token：

```bash
Authorization: Bearer <your-jwt-token>
```

---

## 端点列表

| 方法 | 端点 | 描述 |
|------|------|------|
| `GET` | `/api/search` | 执行全局搜索 |
| `GET` | `/api/search/autocomplete` | 获取自动完成建议 |
| `GET` | `/api/search/history` | 获取搜索历史 |

---

## GET /api/search

执行全局搜索，支持多实体类型和高级过滤。

### 请求参数

#### 基本参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `q` | string | 否 | - | 搜索查询字符串 |
| `target` | string | 否 | `all` | 搜索目标 |
| `limit` | number | 否 | 50 | 返回结果数量限制 |
| `offset` | number | 否 | 0 | 分页偏移量 |
| `history` | boolean | 否 | false | 是否包含搜索历史 |

#### 搜索目标 (target)

| 值 | 描述 |
|------|------|
| `all` | 搜索所有实体 |
| `tasks` | 仅搜索任务 |
| `projects` | 仅搜索项目 |
| `members` | 仅搜索成员 |

#### 过滤参数

| 参数 | 类型 | 描述 |
|------|------|------|
| `status` | string | 状态过滤 (逗号分隔多个值) |
| `priority` | string | 优先级过滤 (逗号分隔多个值) |
| `labels` | string | 标签过滤 (逗号分隔多个值) |
| `assignees` | string | 负责人过滤 (逗号分隔多个值) |
| `createdAfter` | string | 创建时间起点 (ISO 格式) |
| `createdBefore` | string | 创建时间终点 (ISO 格式) |
| `updatedAfter` | string | 更新时间起点 (ISO 格式) |
| `updatedBefore` | string | 更新时间终点 (ISO 格式) |

#### 搜索配置参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `fuzzy` | boolean | true | 是否启用模糊匹配 |
| `fuzzyThreshold` | number | 0.3 | 模糊匹配阈值 (0-1) |
| `caseSensitive` | boolean | false | 是否区分大小写 |
| `highlights` | boolean | true | 是否包含高亮标记 |

### 请求示例

```bash
# 基本搜索
curl -X GET "https://7zi.com/api/search?q=任务&limit=20"

# 搜索任务，带过滤条件
curl -X GET "https://7zi.com/api/search?q=urgent&target=tasks&status=in_progress&priority=high"

# 搜索项目
curl -X GET "https://7zi.com/api/search?q=AI&target=projects"

# 带日期范围的搜索
curl -X GET "https://7zi.com/api/search?q=feature&createdAfter=2026-03-01&createdBefore=2026-03-31"

# 包含搜索历史
curl -X GET "https://7zi.com/api/search?q=test&history=true"

# 模糊搜索
curl -X GET "https://7zi.com/api/search?q=featrue&fuzzy=true&fuzzyThreshold=0.4"
```

```javascript
// 使用 fetch
const searchQuery = 'urgent task';
const response = await fetch(
  `/api/search?q=${encodeURIComponent(searchQuery)}&target=tasks&limit=20`
);

const data = await response.json();
console.log(data.results);
```

```typescript
// TypeScript 完整示例
interface SearchResult {
  results: SearchItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  history?: SearchHistoryItem[];
}

const performSearch = async (
  query: string,
  options: {
    target?: 'all' | 'tasks' | 'projects' | 'members';
    limit?: number;
    offset?: number;
    filters?: {
      status?: string[];
      priority?: string[];
      labels?: string[];
    };
  } = {}
): Promise<SearchResult> => {
  const params = new URLSearchParams();
  params.set('q', query);
  
  if (options.target) params.set('target', options.target);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  
  if (options.filters?.status) {
    params.set('status', options.filters.status.join(','));
  }
  if (options.filters?.priority) {
    params.set('priority', options.filters.priority.join(','));
  }
  if (options.filters?.labels) {
    params.set('labels', options.filters.labels.join(','));
  }

  const response = await fetch(`/api/search?${params}`);
  return response.json();
};

// 使用示例
const result = await performSearch('AI task', {
  target: 'tasks',
  limit: 20,
  filters: {
    status: ['in_progress', 'pending'],
    priority: ['high', 'urgent'],
  },
});
```

### 响应格式

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "item": {
          "id": "task-001",
          "type": "task",
          "title": "紧急任务：AI 模块开发",
          "description": "开发 AI Agent 调度模块",
          "status": "in_progress",
          "priority": "high",
          "assignee": "agent-executor",
          "labels": [
            { "name": "urgent" },
            { "name": "AI" }
          ],
          "createdAt": "2026-03-29T10:00:00Z",
          "updatedAt": "2026-03-29T11:00:00Z"
        },
        "score": 0.95,
        "highlights": {
          "title": "<mark>紧急任务</mark>：<mark>AI</mark> 模块开发",
          "description": "开发 <mark>AI</mark> Agent 调度模块"
        }
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

### 包含搜索历史的响应

```json
{
  "success": true,
  "data": {
    "results": [...],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "hasMore": true,
    "history": [
      {
        "query": "urgent tasks",
        "timestamp": "2026-03-29T10:00:00Z"
      },
      {
        "query": "AI development",
        "timestamp": "2026-03-29T09:30:00Z"
      }
    ]
  }
}
```

### 响应字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| `results` | array | 搜索结果列表 |
| `results[].item` | object | 实体数据 |
| `results[].score` | number | 匹配分数 (0-1) |
| `results[].highlights` | object | 高亮标记 |
| `total` | number | 总结果数 |
| `page` | number | 当前页码 |
| `pageSize` | number | 每页数量 |
| `hasMore` | boolean | 是否有更多结果 |
| `history` | array | 搜索历史 (可选) |

---

## GET /api/search/autocomplete

获取搜索自动完成建议，用于实现搜索框的实时建议功能。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `q` | string | 是 | - | 输入字符串前缀 |
| `limit` | number | 否 | 10 | 返回建议数量 |

### 请求示例

```bash
curl -X GET "https://7zi.com/api/search/autocomplete?q=AI&limit=10"
```

```javascript
// 实时搜索建议
const input = document.getElementById('search-input');

input.addEventListener('input', debounce(async (e) => {
  const query = e.target.value;
  if (query.length < 2) return;

  const response = await fetch(
    `/api/search/autocomplete?q=${encodeURIComponent(query)}&limit=5`
  );
  const data = await response.json();
  
  // 显示建议列表
  showSuggestions(data.suggestions);
}, 300));
```

### 响应格式

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "AI Agent 调度系统",
        "type": "task",
        "count": 15
      },
      {
        "text": "AI 模块开发",
        "type": "project",
        "count": 8
      },
      {
        "text": "AI 助手配置",
        "type": "task",
        "count": 5
      }
    ],
    "query": "AI"
  }
}
```

### 响应字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| `suggestions` | array | 建议列表 |
| `suggestions[].text` | string | 建议文本 |
| `suggestions[].type` | string | 实体类型 |
| `suggestions[].count` | number | 相关结果数量 |
| `query` | string | 原始查询字符串 |

---

## GET /api/search/history

获取用户的搜索历史记录。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `limit` | number | 否 | 10 | 返回历史数量 |

### 请求示例

```bash
curl -X GET "https://7zi.com/api/search/history?limit=10" \
  -H "Authorization: Bearer your-jwt-token"
```

```javascript
const response = await fetch('/api/search/history?limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(data.history);
```

### 响应格式

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "hist-001",
        "query": "urgent tasks",
        "resultCount": 15,
        "target": "tasks",
        "timestamp": "2026-03-29T10:00:00Z"
      },
      {
        "id": "hist-002",
        "query": "AI development",
        "resultCount": 42,
        "target": "all",
        "timestamp": "2026-03-29T09:30:00Z"
      }
    ]
  }
}
```

---

## 高级用法

### 1. 组合过滤条件

```bash
# 搜索高优先级、进行中的任务
curl -X GET "https://7zi.com/api/search?q=&target=tasks&status=in_progress&priority=high,urgent"
```

### 2. 日期范围搜索

```bash
# 搜索 3 月份创建的任务
curl -X GET "https://7zi.com/api/search?createdAfter=2026-03-01&createdBefore=2026-03-31"
```

### 3. 负责人过滤

```bash
# 搜索分配给特定成员的任务
curl -X GET "https://7zi.com/api/search?q=&target=tasks&assignees=agent-executor,agent-architect"
```

### 4. 模糊搜索

```bash
# 使用模糊匹配容忍拼写错误
curl -X GET "https://7zi.com/api/search?q=featrue&fuzzy=true&fuzzyThreshold=0.4"
```

---

## 搜索算法

### 匹配分数计算

```
score = (
  titleMatch * 0.4 +
  descriptionMatch * 0.3 +
  labelMatch * 0.2 +
  metadataMatch * 0.1
)
```

### 排序规则

1. **相关性分数** - 高分数结果优先
2. **更新时间** - 近期更新的结果优先
3. **重要性** - 高优先级任务优先

### 模糊匹配

使用 Levenshtein 距离算法计算字符串相似度：

- `fuzzyThreshold = 0.3` - 需要 70% 相似度
- `fuzzyThreshold = 0.5` - 需要 50% 相似度

---

## 错误码

| HTTP 状态码 | 错误码 | 描述 |
|------------|--------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Search failed"
  }
}
```

---

## 数据模型

### SearchItem

```typescript
interface SearchItem {
  item: {
    id: string;
    type: 'task' | 'project' | 'member';
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee?: string;
    labels?: Array<{ name: string }>;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
  };
  score: number;
  highlights?: {
    title?: string;
    description?: string;
  };
}
```

### SearchHistoryItem

```typescript
interface SearchHistoryItem {
  id: string;
  query: string;
  resultCount: number;
  target: string;
  timestamp: string;
}
```

### AdvancedSearchQuery

```typescript
interface AdvancedSearchQuery {
  query: string;
  target?: 'all' | 'tasks' | 'projects' | 'members';
  filters?: {
    status?: string[];
    priority?: string[];
    labels?: string[];
    assignees?: string[];
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  };
  config?: {
    caseSensitive?: boolean;
    fuzzyMatch?: boolean;
    fuzzyThreshold?: number;
    includeHighlights?: boolean;
  };
  pagination?: {
    limit?: number;
    offset?: number;
  };
}
```

---

## 限流策略

| 端点 | 限制 | 说明 |
|------|------|------|
| `GET /api/search` | 100 请求/分钟 | 搜索操作 |
| `GET /api/search/autocomplete` | 200 请求/分钟 | 自动完成 |
| `GET /api/search/history` | 60 请求/分钟 | 历史查询 |

---

## 最佳实践

### 1. 防抖动输入

```javascript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query) => {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return response.json();
}, 300);
```

### 2. 分页加载

```javascript
const loadMoreResults = async (query, currentPage) => {
  const offset = currentPage * 20;
  const response = await fetch(
    `/api/search?q=${query}&offset=${offset}&limit=20`
  );
  return response.json();
};
```

### 3. 缓存搜索结果

```javascript
const searchCache = new Map();

const cachedSearch = async (query) => {
  if (searchCache.has(query)) {
    return searchCache.get(query);
  }
  
  const result = await fetch(`/api/search?q=${query}`).then(r => r.json());
  searchCache.set(query, result);
  
  // 5 分钟后清除缓存
  setTimeout(() => searchCache.delete(query), 5 * 60 * 1000);
  
  return result;
};
```

### 4. 高亮显示

```jsx
function HighlightedText({ text, highlights }) {
  if (!highlights) return <span>{text}</span>;
  
  // 解析 <mark> 标签
  return (
    <span 
      dangerouslySetInnerHTML={{ __html: highlights }} 
    />
  );
}
```

---

## 相关文档

- [API.md](../API.md) - API 完整文档
- [WEBSOCKET.md](../WEBSOCKET.md) - WebSocket API
- [RATINGS.md](./ratings.md) - 评分 API

---

**维护者**: 📚 咨询师 (AI 团队)
**最后更新**: 2026-03-29
