# 7zi-frontend API 文档

> 最后更新: 2026-03-07

本文档描述了 7zi-frontend 项目的所有 API 端点。

---

## 目录

- [概览](#概览)
- [状态 API](#状态-api)
  - [GET /api/status](#get-apistatus)
- [健康检查 API](#健康检查-api)
  - [GET /api/health](#get-apihealth)
  - [GET /api/health/live](#get-apihealthlive)
  - [GET /api/health/ready](#get-apihealthready)
  - [GET /api/health/detailed](#get-apihealthdetailed)
- [错误处理](#错误处理)
- [使用示例](#使用示例)

---

## 概览

| 端点 | 方法 | 用途 | 认证 |
|------|------|------|------|
| `/api/status` | GET | 公开状态页面信息 | 无需 |
| `/api/health` | GET | 基础健康检查 | 无需 |
| `/api/health/live` | GET | Kubernetes 存活探针 | 无需 |
| `/api/health/ready` | GET | Kubernetes 就绪探针 | 无需 |
| `/api/health/detailed` | GET | 详细健康检查（含依赖） | 无需 |

---

## 状态 API

### GET /api/status

返回公开的系统状态信息，用于状态页面展示。

#### 请求

```http
GET /api/status
```

**参数**: 无

#### 响应

**成功响应 (200 OK)**

```json
{
  "status": "operational",
  "lastUpdated": "2026-03-07T00:20:00.000Z",
  "services": [
    {
      "name": "Website",
      "status": "operational",
      "uptime": 99.98,
      "responseTime": 120
    },
    {
      "name": "API",
      "status": "operational",
      "uptime": 99.99,
      "responseTime": 85
    },
    {
      "name": "CDN",
      "status": "operational",
      "uptime": 99.99,
      "responseTime": 45
    }
  ],
  "metrics": {
    "requests": 125000,
    "errors": 23,
    "avgResponseTime": 142,
    "p95ResponseTime": 380
  },
  "incidents": [],
  "maintenance": []
}
```

#### 字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| `status` | string | 整体状态: `operational` \| `degraded` \| `outage` |
| `lastUpdated` | string | ISO 8601 时间戳 |
| `services` | array | 服务列表 |
| `services[].name` | string | 服务名称 |
| `services[].status` | string | 服务状态 |
| `services[].uptime` | number | 30天正常运行率 (%) |
| `services[].responseTime` | number | 响应时间 (ms) |
| `metrics` | object | 过去24小时指标 |
| `metrics.requests` | number | 总请求数 |
| `metrics.errors` | number | 错误数 |
| `metrics.avgResponseTime` | number | 平均响应时间 (ms) |
| `metrics.p95ResponseTime` | number | P95 响应时间 (ms) |
| `incidents` | array | 近30天事件列表 |
| `maintenance` | array | 计划维护列表 |

---

## 健康检查 API

### GET /api/health

基础健康检查端点，用于 Kubernetes/Docker 健康检查和负载均衡器探测。

#### 请求

```http
GET /api/health
```

**参数**: 无

**注意**: 此端点禁用缓存 (`force-dynamic`)

#### 响应

**健康 (200 OK)**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "memory": {
      "status": "ok",
      "used": 128,
      "limit": 512
    },
    "node": {
      "status": "ok",
      "version": "v22.22.0"
    }
  }
}
```

**不健康 (503 Service Unavailable)**

```json
{
  "status": "unhealthy",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "error": "Health check failed"
}
```

#### 字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| `status` | string | `healthy` \| `unhealthy` |
| `timestamp` | string | ISO 8601 时间戳 |
| `uptime` | number | 进程运行时间 (秒) |
| `version` | string | 应用版本 |
| `checks.memory` | object | 内存检查结果 |
| `checks.memory.used` | number | 已用堆内存 (MB) |
| `checks.memory.limit` | number | 内存限制 (MB)，默认 512MB |
| `checks.node` | object | Node.js 检查结果 |
| `checks.node.version` | string | Node.js 版本 |

#### 健康判定逻辑

- **健康**: 堆内存使用 < 90% 限制 (默认 < 460.8MB)
- **不健康**: 堆内存使用 >= 90% 限制

---

### GET /api/health/live

Kubernetes **存活探针** (Liveness Probe)。

用于判断容器是否需要重启。如果进程正在运行，总是返回 200。

#### 请求

```http
GET /api/health/live
```

#### 响应

**成功 (200 OK)**

```json
{
  "status": "alive"
}
```

#### Kubernetes 配置示例

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

---

### GET /api/health/ready

Kubernetes **就绪探针** (Readiness Probe)。

用于判断容器是否准备好接收流量。只有当所有关键依赖可用时才返回 200。

#### 请求

```http
GET /api/health/ready
```

#### 响应

**就绪 (200 OK)**

```json
{
  "status": "ok",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 120
    },
    "emailService": {
      "status": "ok",
      "latency": 85
    }
  }
}
```

**降级 (200 OK)**

```json
{
  "status": "degraded",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 120
    },
    "emailService": {
      "status": "error",
      "message": "Resend API returned status 500"
    }
  }
}
```

**不可用 (503 Service Unavailable)**

```json
{
  "status": "error",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "error",
      "message": "Network timeout"
    },
    "emailService": {
      "status": "error",
      "message": "Connection refused"
    }
  }
}
```

#### 检查的依赖

| 依赖 | 检查方式 | 超时 |
|------|----------|------|
| GitHub API | GET https://api.github.com/zen | 5s |
| Resend API | GET https://api.resend.com/domains | 5s |

**注意**: 如果未配置 `RESEND_API_KEY` 环境变量，邮件服务检查将被跳过。

#### Kubernetes 配置示例

```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 10
  failureThreshold: 3
```

---

### GET /api/health/detailed

详细健康检查，返回完整的服务状态和依赖检查结果。

#### 请求

```http
GET /api/health/detailed
```

#### 响应

与 `/api/health/ready` 响应格式相同，但包含更详细的检查信息。

**成功 (200 OK)**

```json
{
  "status": "ok",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 120
    },
    "emailService": {
      "status": "ok",
      "message": "Resend API key not configured"
    }
  }
}
```

#### 状态判定

| 整体状态 | 条件 |
|----------|------|
| `ok` | 所有检查通过 |
| `degraded` | 部分检查失败 |
| `error` | 所有检查失败 |

---

## 错误处理

### HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功，服务健康 |
| 503 | Service Unavailable | 服务不健康或不可用 |

### 错误响应格式

```json
{
  "status": "unhealthy",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "error": "Health check failed"
}
```

---

## 使用示例

### cURL

```bash
# 获取系统状态
curl https://your-domain.com/api/status

# 基础健康检查
curl https://your-domain.com/api/health

# Kubernetes 存活探针
curl https://your-domain.com/api/health/live

# Kubernetes 就绪探针
curl https://your-domain.com/api/health/ready

# 详细健康检查
curl https://your-domain.com/api/health/detailed
```

### JavaScript (fetch)

```javascript
// 获取系统状态
async function getStatus() {
  const response = await fetch('/api/status');
  const data = await response.json();
  console.log('System status:', data.status);
  console.log('Services:', data.services);
  return data;
}

// 健康检查
async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      const data = await response.json();
      console.log('Health:', data.status);
      console.log('Memory:', data.checks.memory);
    } else {
      console.error('Service unhealthy');
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
}
```

### 负载均衡器配置 (Nginx)

```nginx
upstream backend {
  server 127.0.0.1:3000;
}

server {
  location /health {
    proxy_pass http://backend/api/health;
    access_log off;  # 不记录健康检查日志
  }
}
```

### Docker Compose 健康检查

```yaml
services:
  web:
    image: 7zi-frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 监控脚本

```bash
#!/bin/bash
# health-monitor.sh - 定期检查健康状态

URL="https://your-domain.com/api/health/detailed"
ALERT_WEBHOOK="https://hooks.slack.com/services/xxx"

response=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$response" != "200" ]; then
  curl -X POST "$ALERT_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"⚠️ Health check failed: HTTP $response\"}"
  exit 1
fi

echo "Health check passed"
```

---

## 环境变量

健康检查 API 依赖以下环境变量：

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `NEXT_PUBLIC_SENTRY_RELEASE` | 应用版本号 | 否 |
| `NODE_ENV` | 运行环境 | 否 (默认: development) |
| `RESEND_API_KEY` | Resend API 密钥 | 否 |
| `npm_package_version` | NPM 包版本 | 否 |

---

## 相关文档

- [Kubernetes 探针配置](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Docker 健康检查](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
