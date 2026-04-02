# 评分 API 文档

**版本**: v1.4.0
**最后更新**: 2026-03-29
**基础路径**: `/api/ratings`

---

## 概述

评分 API 提供 AI Agent、任务、功能特性和项目的评分管理功能。支持创建评分、查询评分列表、标记评分是否有帮助等操作。

### 功能特性

- ✅ 多目标类型评分 (Agent、任务、功能、项目)
- ✅ 评分 CRUD 操作
- ✅ 反垃圾检测
- ✅ 评分投票 (有帮助/无帮助)
- ✅ 评分统计

---

## 认证方式

所有 API 请求需要携带 JWT Token：

```bash
Authorization: Bearer <your-jwt-token>
```

或通过请求头传递用户 ID：

```bash
X-User-Id: <user-id>
```

---

## 端点列表

| 方法     | 端点                       | 描述               |
| -------- | -------------------------- | ------------------ |
| `GET`    | `/api/ratings`             | 获取评分列表       |
| `POST`   | `/api/ratings`             | 创建评分           |
| `GET`    | `/api/ratings/:id`         | 获取单个评分       |
| `DELETE` | `/api/ratings/:id`         | 删除评分           |
| `POST`   | `/api/ratings/:id/helpful` | 标记评分是否有帮助 |

---

## GET /api/ratings

获取评分列表，支持多条件筛选和分页。

### 请求参数

| 参数          | 类型   | 必需 | 默认值       | 描述                                |
| ------------- | ------ | ---- | ------------ | ----------------------------------- |
| `user_id`     | string | 否   | -            | 用户 ID                             |
| `target_type` | string | 否   | -            | 目标类型                            |
| `target_id`   | string | 否   | -            | 目标 ID                             |
| `rating_min`  | number | 否   | -            | 最小评分 (1-5)                      |
| `rating_max`  | number | 否   | -            | 最大评分 (1-5)                      |
| `status`      | string | 否   | -            | 状态过滤                            |
| `start_date`  | string | 否   | -            | 开始日期 (ISO 格式)                 |
| `end_date`    | string | 否   | -            | 结束日期 (ISO 格式)                 |
| `sort_by`     | string | 否   | `created_at` | 排序字段 (`created_at` \| `rating`) |
| `sort_order`  | string | 否   | `desc`       | 排序方向 (`asc` \| `desc`)          |
| `page`        | number | 否   | 1            | 页码                                |
| `per_page`    | number | 否   | 20           | 每页数量 (最大 100)                 |

### 目标类型 (target_type)

| 值        | 描述          |
| --------- | ------------- |
| `agent`   | AI Agent 评分 |
| `task`    | 任务评分      |
| `feature` | 功能特性评分  |
| `project` | 项目评分      |
| `overall` | 整体评分      |

### 请求示例

```bash
# 获取 Agent 评分列表
curl -X GET "https://7zi.com/api/ratings?target_type=agent&page=1&per_page=10" \
  -H "Authorization: Bearer your-jwt-token"

# 获取特定用户的评分
curl -X GET "https://7zi.com/api/ratings?user_id=user-001&sort_by=rating&sort_order=desc" \
  -H "Authorization: Bearer your-jwt-token"

# 获取高分评分
curl -X GET "https://7zi.com/api/ratings?rating_min=4&rating_max=5" \
  -H "Authorization: Bearer your-jwt-token"
```

```javascript
// 使用 fetch
const response = await fetch('/api/ratings?target_type=agent&page=1&per_page=20', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

const data = await response.json()
console.log(data.ratings)
```

### 响应格式

```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": "rating-001",
        "user_id": "user-001",
        "target_type": "agent",
        "target_id": "agent-architect",
        "rating": 5,
        "title": "非常高效！",
        "description": "这个 AI 助手很好地完成了任务",
        "verified": true,
        "helpful_count": 42,
        "not_helpful_count": 3,
        "created_at": "2026-03-29T10:00:00Z",
        "updated_at": "2026-03-29T10:00:00Z",
        "metadata": {}
      }
    ],
    "meta": {
      "total": 100,
      "page": 1,
      "per_page": 20,
      "total_pages": 5
    },
    "stats": {
      "average": 4.2,
      "total": 100,
      "byRating": {
        "1": 5,
        "2": 8,
        "3": 12,
        "4": 30,
        "5": 45
      }
    }
  }
}
```

### 响应字段说明

| 字段                          | 类型    | 描述           |
| ----------------------------- | ------- | -------------- |
| `ratings`                     | array   | 评分列表       |
| `ratings[].id`                | string  | 评分唯一 ID    |
| `ratings[].user_id`           | string  | 用户 ID        |
| `ratings[].target_type`       | string  | 目标类型       |
| `ratings[].target_id`         | string  | 目标 ID        |
| `ratings[].rating`            | number  | 评分 (1-5)     |
| `ratings[].title`             | string  | 标题           |
| `ratings[].description`       | string  | 描述           |
| `ratings[].verified`          | boolean | 是否已验证     |
| `ratings[].helpful_count`     | number  | 有帮助票数     |
| `ratings[].not_helpful_count` | number  | 无帮助票数     |
| `meta`                        | object  | 分页信息       |
| `stats`                       | object  | 统计信息       |
| `stats.average`               | number  | 平均评分       |
| `stats.byRating`              | object  | 各评分数量分布 |

---

## POST /api/ratings

创建新评分。同一用户对同一目标只能有一个评分，重复提交会更新现有评分。

### 请求体

```typescript
interface CreateRatingDto {
  target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall'
  target_id: string
  rating: number // 1-5
  title?: string // 最多 100 字符
  description?: string // 最多 1000 字符
  user_id?: string // 可选，默认从 Token 获取
  verified?: boolean
  metadata?: Record<string, unknown>
}
```

### 请求示例

```bash
curl -X POST "https://7zi.com/api/ratings" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "target_type": "agent",
    "target_id": "agent-architect",
    "rating": 5,
    "title": "非常高效！",
    "description": "这个 AI 助手很好地完成了任务，代码质量很高。"
  }'
```

```javascript
// 使用 fetch
const response = await fetch('/api/ratings', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    target_type: 'agent',
    target_id: 'agent-architect',
    rating: 5,
    title: '非常高效！',
    description: '这个 AI 助手很好地完成了任务。',
  }),
})

const data = await response.json()
console.log(data)
```

### 响应格式

**成功响应 (201 Created)**:

```json
{
  "success": true,
  "data": {
    "id": "rating-001",
    "user_id": "user-001",
    "target_type": "agent",
    "target_id": "agent-architect",
    "rating": 5,
    "title": "非常高效！",
    "description": "这个 AI 助手很好地完成了任务。",
    "verified": false,
    "helpful_count": 0,
    "not_helpful_count": 0,
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:00:00Z"
  }
}
```

**更新现有评分 (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "rating-001",
    "user_id": "user-001",
    "target_type": "agent",
    "target_id": "agent-architect",
    "rating": 4,
    "title": "更新后的标题",
    "description": "更新后的描述",
    "verified": false,
    "helpful_count": 42,
    "not_helpful_count": 3,
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T11:00:00Z"
  }
}
```

### 反垃圾检测

系统会对标题和描述进行反垃圾检测。如果被判定为垃圾内容，返回 401 错误：

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Rating rejected due to spam detection"
  }
}
```

---

## GET /api/ratings/:id

获取单个评分详情。

### 请求示例

```bash
curl -X GET "https://7zi.com/api/ratings/rating-001" \
  -H "Authorization: Bearer your-jwt-token"
```

### 响应格式

```json
{
  "success": true,
  "data": {
    "id": "rating-001",
    "user_id": "user-001",
    "target_type": "agent",
    "target_id": "agent-architect",
    "rating": 5,
    "title": "非常高效！",
    "description": "这个 AI 助手很好地完成了任务。",
    "verified": true,
    "helpful_count": 42,
    "not_helpful_count": 3,
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:00:00Z",
    "metadata": {}
  }
}
```

---

## DELETE /api/ratings/:id

删除评分。用户只能删除自己的评分，管理员可以删除所有评分。

### 权限要求

- 评分所有者
- 或管理员权限

### 请求示例

```bash
curl -X DELETE "https://7zi.com/api/ratings/rating-001" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "X-User-Id: user-001"
```

### 响应格式

**成功响应**:

```json
{
  "success": true,
  "data": {
    "id": "rating-001",
    "message": "Rating deleted successfully"
  }
}
```

**错误响应 (无权限)**:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only delete your own ratings"
  }
}
```

---

## POST /api/ratings/:id/helpful

标记评分是否有帮助。每个用户对每个评分只能投票一次，重复投票会更新现有投票。

### 请求体

```typescript
interface HelpfulVoteDto {
  is_helpful: boolean
}
```

### 请求示例

```bash
# 标记为有帮助
curl -X POST "https://7zi.com/api/ratings/rating-001/helpful" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"is_helpful": true}'

# 标记为无帮助
curl -X POST "https://7zi.com/api/ratings/rating-001/helpful" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"is_helpful": false}'
```

```javascript
const response = await fetch('/api/ratings/rating-001/helpful', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ is_helpful: true }),
})

const data = await response.json()
console.log(data)
```

### 响应格式

```json
{
  "success": true,
  "data": {
    "id": "rating-001",
    "rating": 5,
    "helpful_count": 43,
    "not_helpful_count": 3,
    "user_vote": true
  }
}
```

---

## 错误码

| HTTP 状态码 | 错误码             | 描述                   |
| ----------- | ------------------ | ---------------------- |
| 400         | `VALIDATION_ERROR` | 参数验证失败           |
| 401         | `UNAUTHORIZED`     | 未授权或反垃圾检测失败 |
| 403         | `FORBIDDEN`        | 无权限                 |
| 404         | `NOT_FOUND`        | 评分不存在             |
| 500         | `INTERNAL_ERROR`   | 服务器内部错误         |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rating must be between 1 and 5",
    "details": {
      "field": "rating",
      "value": 6
    }
  }
}
```

---

## 数据模型

### Rating

```typescript
interface Rating {
  id: string
  user_id: string
  target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall'
  target_id: string
  rating: number // 1-5
  title?: string
  description?: string
  verified: boolean
  helpful_count: number
  not_helpful_count: number
  created_at: string // ISO 时间戳
  updated_at: string // ISO 时间戳
  metadata?: Record<string, unknown>
}
```

### RatingFilters

```typescript
interface RatingFilters {
  user_id?: string
  target_type?: string
  target_id?: string
  rating_min?: number
  rating_max?: number
  status?: string
  start_date?: string
  end_date?: string
  sort_by?: 'created_at' | 'rating'
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}
```

---

## 限流策略

| 端点                            | 限制          | 说明     |
| ------------------------------- | ------------- | -------- |
| `GET /api/ratings`              | 100 请求/分钟 | 查询操作 |
| `POST /api/ratings`             | 20 请求/分钟  | 创建操作 |
| `DELETE /api/ratings/:id`       | 10 请求/分钟  | 删除操作 |
| `POST /api/ratings/:id/helpful` | 30 请求/分钟  | 投票操作 |

---

## 最佳实践

### 1. 分页查询

```javascript
// 使用分页避免一次加载过多数据
const fetchRatings = async (page = 1, perPage = 20) => {
  const response = await fetch(`/api/ratings?page=${page}&per_page=${perPage}`)
  return response.json()
}
```

### 2. 错误处理

```javascript
try {
  const response = await fetch('/api/ratings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ratingData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error.message)
  }

  const data = await response.json()
  console.log('Rating created:', data)
} catch (error) {
  console.error('Failed to create rating:', error.message)
}
```

### 3. 防重复提交

```javascript
// 使用 loading 状态防止重复提交
const [isSubmitting, setIsSubmitting] = useState(false)

const submitRating = async ratingData => {
  if (isSubmitting) return

  setIsSubmitting(true)
  try {
    await fetch('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    })
  } finally {
    setIsSubmitting(false)
  }
}
```

---

## 相关文档

- [API.md](../API.md) - API 完整文档
- [WEBSOCKET.md](../WEBSOCKET.md) - WebSocket API
- [SEARCH.md](./search.md) - 搜索 API

---

**维护者**: 📚 咨询师 (AI 团队)
**最后更新**: 2026-03-29
