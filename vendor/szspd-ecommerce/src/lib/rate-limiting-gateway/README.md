# Rate Limiting Gateway

Enterprise-grade API Gateway rate limiting system for v1.10.0.

## Features

- **Token Bucket Algorithm** - Supports burst traffic with configurable refill rates
- **Sliding Window Counter** - Precise rate limiting without boundary effects
- **Multi-Layer Architecture** - Global, IP, API Key, and User layers
- **Redis Distributed** - Supports standalone and cluster modes
- **IETF Standard Headers** - X-RateLimit-* headers following draft standard
- **Management API** - Query, adjust, and monitor rate limits
- **TypeScript Native** - Full type safety and IntelliSense support

## Installation

```bash
# Already included in the project
# Dependencies: ioredis, express
```

## Quick Start

### Basic Usage

```typescript
import express from 'express'
import { createRateLimitingGateway } from '@/lib/rate-limiting-gateway'

const app = express()

// Create gateway with Redis
const gateway = createRateLimitingGateway({
  redisUrl: process.env.REDIS_URL
})

// Apply middleware
app.use(gateway.expressMiddleware)

// Or use quick setup
const basicGateway = createRateLimitingGateway.quickSetup.basic()
app.use(basicGateway.expressMiddleware)
```

### Multi-Layer Configuration

```typescript
import { createRateLimitMiddleware } from '@/lib/rate-limiting-gateway'

app.use(createRateLimitMiddleware({
  // Layer 1: Global rate limit
  global: {
    enabled: true,
    algorithm: 'token-bucket',
    rate: 1000,      // 1000 requests per second
    burst: 2000      // Allow bursts up to 2000
  },

  // Layer 2: IP-based rate limit
  ip: {
    enabled: true,
    algorithm: 'sliding-window',
    windowMs: 60000,  // 1 minute
    maxRequests: 100, // 100 requests per minute
    whitelist: ['127.0.0.1', '::1'],
    blacklist: ['192.168.1.100']
  },

  // Layer 3: API Key rate limit with tiers
  apiKey: {
    enabled: true,
    algorithm: 'token-bucket',
    defaultTier: 'free',
    tiers: {
      free: { name: 'free', rate: 2, burst: 10, dailyLimit: 1000 },
      basic: { name: 'basic', rate: 10, burst: 30, dailyLimit: 10000 },
      pro: { name: 'pro', rate: 50, burst: 150, dailyLimit: 100000 },
      enterprise: { name: 'enterprise', rate: 200, burst: 500, dailyLimit: 1000000 }
    }
  },

  // Layer 4: User rate limit
  user: {
    enabled: true,
    algorithm: 'sliding-window',
    windowMs: 60000,
    maxRequests: 200
  }
}))
```

## Algorithms

### Token Bucket

Best for APIs that need to handle burst traffic.

```typescript
import { TokenBucket, RedisAdapter } from '@/lib/rate-limiting-gateway'

const storage = new RedisAdapter({ url: 'redis://localhost:6379' })
const bucket = new TokenBucket(storage)

const result = await bucket.check({
  key: 'user:123',
  capacity: 100,   // Max 100 tokens (burst)
  refillRate: 10   // 10 tokens per second
})

// result: { allowed: boolean, remaining: number, resetTime: number, ... }
```

### Sliding Window Counter

Best for precise rate limiting without boundary effects.

```typescript
import { SlidingWindow, RedisAdapter } from '@/lib/rate-limiting-gateway'

const storage = new RedisAdapter({ url: 'redis://localhost:6379' })
const window = new SlidingWindow(storage)

const result = await window.check({
  key: 'ip:192.168.1.1',
  limit: 100,        // Max 100 requests
  windowSeconds: 60  // Per 60 seconds
})
```

## Response Headers

Following IETF draft standard (draft-ietf-httpapi-ratelimit-headers):

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
X-RateLimit-Policy: 100;60;sliding-window
Retry-After: 30
```

### Error Response

```json
{
  "error": {
    "type": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "layer": "ip",
      "limit": 100,
      "retryAfter": 30,
      "resetAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Management API

```typescript
import { createManagementApi, mountManagementApi } from '@/lib/rate-limiting-gateway'

// Create API
const api = createManagementApi({
  storage,
  middleware,
  apiKey: 'admin-secret-key'
})

// Mount on Express app
mountManagementApi(app, {
  storage,
  middleware
}, '/api/rate-limit')

// Available endpoints:
// GET  /api/rate-limit/health           - Health check
// GET  /api/rate-limit/stats            - Get statistics
// GET  /api/rate-limit/keys             - List rate limit keys
// GET  /api/rate-limit/status/:layer/:id - Get status for a key
// POST /api/rate-limit/adjust           - Adjust rate limit
// POST /api/rate-limit/reset/:layer/:id  - Reset rate limit
```

## Presets

```typescript
import { presets } from '@/lib/rate-limiting-gateway'

// For authentication endpoints
app.use('/auth', createRateLimitMiddleware(presets.strict()))

// For general API endpoints
app.use('/api', createRateLimitMiddleware(presets.moderate()))

// For read-heavy endpoints
app.use('/api/public', createRateLimitMiddleware(presets.relaxed()))

// For public APIs with API keys
app.use('/api/v1', createRateLimitMiddleware(presets.apiKeyFocused()))
```

## Redis Cluster Support

```typescript
import { createRateLimitingGateway } from '@/lib/rate-limiting-gateway'

const gateway = createRateLimitingGateway({
  redisClusterNodes: [
    { host: 'redis-cluster-1', port: 6379 },
    { host: 'redis-cluster-2', port: 6379 },
    { host: 'redis-cluster-3', port: 6379 }
  ]
})
```

## Environment Variables

```bash
# Redis connection
REDIS_URL=redis://localhost:6379
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379

# Rate limit key prefix
RATE_LIMIT_KEY_PREFIX=rl:

# Layer-specific configuration
RATE_LIMIT_GLOBAL_RATE=1000
RATE_LIMIT_GLOBAL_BURST=2000
RATE_LIMIT_IP_MAX=100
RATE_LIMIT_USER_MAX=200
```

## Performance

Target metrics:
- Latency: < 5ms P99
- Throughput: > 10,000 requests/second
- Memory: Minimal overhead with Redis storage

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Request                           │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│ Layer 1: Global Rate Limit (Token Bucket)           │
│ - Applies to all requests                           │
│ - Protects overall system capacity                   │
└─────────────────────┬────────────────────────────────┘
                      │ ✓
                      ▼
┌──────────────────────────────────────────────────────┐
│ Layer 2: IP Rate Limit (Sliding Window)             │
│ - Per-IP rate limiting                              │
│ - Protects against single-source attacks            │
└─────────────────────┬────────────────────────────────┘
                      │ ✓
                      ▼
┌──────────────────────────────────────────────────────┐
│ Layer 3: API Key Rate Limit (Token Bucket)          │
│ - Per-API-key rate limiting                         │
│ - Tier-based limits (free/basic/pro/enterprise)     │
└─────────────────────┬────────────────────────────────┘
                      │ ✓
                      ▼
┌──────────────────────────────────────────────────────┐
│ Layer 4: User Rate Limit (Sliding Window)           │
│ - Per-user rate limiting                            │
│ - Protects user accounts                            │
└─────────────────────┬────────────────────────────────┘
                      │ ✓
                      ▼
┌──────────────────────────────────────────────────────┐
│                  Backend Service                     │
└──────────────────────────────────────────────────────┘
```

## API Reference

See [types/index.ts](./types/index.ts) for full TypeScript definitions.

### Main Exports

| Export | Description |
|--------|-------------|
| `createRateLimitingGateway` | Factory function for complete setup |
| `createRateLimitMiddleware` | Express middleware factory |
| `MultiLayerMiddleware` | Multi-layer rate limiting class |
| `TokenBucket` | Token bucket algorithm |
| `SlidingWindow` | Sliding window algorithm |
| `RedisAdapter` | Redis storage adapter |
| `MemoryAdapter` | In-memory storage adapter |
| `createManagementApi` | Management API factory |

## License

MIT
