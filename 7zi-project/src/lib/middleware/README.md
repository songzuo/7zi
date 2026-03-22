# Rate Limiting and Anti-Crawler System

Comprehensive API protection system for the 7zi-project, featuring rate limiting, crawler detection, and user-based quota management.

## Features

### 1. IP-Based Rate Limiting
- **Sliding window algorithm** for accurate rate limiting
- **LRU cache** for efficient memory management
- **Configurable limits** per endpoint
- **Automatic cleanup** of expired entries
- **Rate limit headers** (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After)

### 2. User-Based Rate Limiting (JWT/API Key)
- **JWT token authentication** for user identification
- **API key support** (`sk_agent_*` format)
- **Role-based limits** (admin, moderator, user, guest, agent, worker, executor)
- **Per-user quota tracking**
- **Usage statistics** per user

### 3. Anti-Crawler System
- **User-Agent detection** (known bots, suspicious bots, normal browsers)
- **Request frequency analysis** (burst detection, high-frequency detection)
- **IP reputation checking** (blacklist/whitelist support)
- **Configurable modes** (block, monitor, passive)
- **Known bot patterns** (Googlebot, Bingbot, etc.)
- **Suspicious bot patterns** (Scrapy, curl, wget, etc.)

## Installation

The middleware is already integrated into the project. Import from:

```typescript
import {
  withRateLimit,
  withCrawlerDetection,
  getUserIdentifier,
  checkUserRateLimit,
} from '@/lib/middleware';
```

## Quick Start

### IP-Based Rate Limiting

```typescript
import { withRateLimit } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const handler = withRateLimit(
    async (req) => {
      return NextResponse.json({ success: true });
    },
    {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,     // 30 requests per minute
    }
  );

  return handler(request);
}
```

### User-Based Rate Limiting

```typescript
import { getUserIdentifier, checkUserRateLimit } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const { userId } = await getUserIdentifier(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitCheck = checkUserRateLimit(userId, 'user', {
    windowMs: 60 * 1000,
    maxRequests: 100,
  });

  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': limitCheck.remaining.toString(),
          'X-RateLimit-Reset': new Date(limitCheck.resetTime).toISOString(),
        },
      }
    );
  }

  return NextResponse.json({ success: true });
}
```

### Anti-Crawler Detection

```typescript
import { withCrawlerDetection } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const handler = withCrawlerDetection(
    async (req) => {
      return NextResponse.json({ success: true });
    },
    {
      mode: 'block',           // Block suspicious requests
      checkUserAgent: true,     // Validate user agents
      checkFrequency: true,     // Analyze request patterns
      checkIpReputation: true,  // Check IP blacklist/whitelist
    }
  );

  return handler(request);
}
```

## Configuration

### Rate Limit Config

```typescript
interface RateLimitConfig {
  windowMs: number;              // Time window in milliseconds
  maxRequests: number;           // Max requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;  // Don't count failed requests
}
```

### User Rate Limit Config

```typescript
interface UserRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  role?: string;  // Optional: admin, moderator, user, guest, agent, worker, executor
}
```

### Crawler Detection Config

```typescript
interface CrawlerDetectionConfig {
  // User-Agent validation
  checkUserAgent?: boolean;
  blockUnknownBots?: boolean;
  allowedBots?: string[];
  blockedBots?: string[];

  // Request frequency analysis
  checkFrequency?: boolean;
  maxRequestsPerMinute?: number;
  maxRequestsPerSecond?: number;
  suspiciousThreshold?: number;

  // IP reputation
  checkIpReputation?: boolean;
  blacklist?: string[];
  whitelist?: string[];

  // Action mode
  mode: 'block' | 'monitor' | 'passive';
}
```

## Role-Based Limits

Default rate limits by role:

| Role       | Requests/Minute | Window |
|------------|-----------------|--------|
| admin      | 1,000           | 1 min  |
| moderator  | 500             | 1 min  |
| user       | 60              | 1 min  |
| guest      | 30              | 1 min  |
| agent      | 200             | 1 min  |
| worker     | 100             | 1 min  |
| executor   | 80              | 1 min  |

## Pre-Configured Endpoint Limits

| Endpoint                    | Requests/Minute |
|-----------------------------|-----------------|
| `/api/health`               | 100             |
| `/api/auth/login`           | 10              |
| `/api/auth/register`        | 5               |
| `/api/github/commits`       | 30              |
| `/api/csrf-token`           | 100             |
| `/api/a2a/jsonrpc`          | 50              |

## Advanced Usage

### Combining Multiple Protections

```typescript
import { withCrawlerDetection, withRateLimit } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  // Layer 1: Crawler detection
  const protectedHandler = withCrawlerDetection(
    // Layer 2: IP-based rate limiting
    withRateLimit(
      // Layer 3: User authentication
      async (req) => {
        const { userId } = await getUserIdentifier(req);

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Layer 4: User-based rate limiting
        const limitCheck = checkUserRateLimit(userId, 'user');

        if (!limitCheck.allowed) {
          return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        return NextResponse.json({ success: true, userId });
      },
      {
        windowMs: 60 * 1000,
        maxRequests: 20,
      }
    ),
    {
      mode: 'block',
      checkUserAgent: true,
      checkFrequency: true,
    }
  );

  return protectedHandler(request);
}
```

### Batch Operations with Quota

```typescript
export async function POST(request: NextRequest) {
  const { userId } = await getUserIdentifier(request);
  const { operations } = await request.json();

  const operationsCount = operations.length;

  // Check if user has quota
  const limitCheck = checkUserRateLimit(userId, 'user', {
    windowMs: 60 * 1000,
    maxRequests: 1000,
  });

  const remainingQuota = Math.max(0, limitCheck.remaining - operationsCount);

  if (remainingQuota < 0) {
    return NextResponse.json(
      {
        error: `Insufficient quota. Requested: ${operationsCount}, Available: ${limitCheck.remaining}`,
      },
      { status: 429 }
    );
  }

  // Process batch operations
  const results = operations.map((op) => ({ ...op, processed: true }));

  return NextResponse.json({
    processed: operationsCount,
    remainingQuota,
    results,
  });
}
```

## API Routes Examples

See `src/lib/middleware/__tests__/api-examples.test.ts` for complete examples:

- Public endpoint with IP-based rate limiting
- Protected endpoint with JWT authentication
- Admin endpoint with multi-layer protection
- Sensitive data endpoint with strict limits
- Batch operations with quota management
- Rate limit status endpoint
- Emergency rate limit override

## Testing

Run the test suite:

```bash
# Run all middleware tests
npm test -- src/lib/middleware/__tests__/

# Run specific test file
npm test -- src/lib/middleware/__tests__/rate-limit.test.ts
npm test -- src/lib/middleware/__tests__/crawler-detection.test.ts
npm test -- src/lib/middleware/__tests__/user-rate-limit.test.ts
```

### Test Coverage

- **Rate limiting**: 20 tests covering sliding window, limits, headers, cleanup
- **Crawler detection**: 25 tests covering user agents, frequency, IP reputation
- **User rate limiting**: Comprehensive tests for JWT/API key authentication

## Utility Functions

### Rate Limiting

```typescript
import {
  getRateLimitStats,
  clearRateLimit,
  clearAllRateLimits,
  startPeriodicCleanup,
  stopPeriodicCleanup,
} from '@/lib/middleware';

// Get statistics
const stats = getRateLimitStats();
console.log(stats.totalEntries, stats.trackedPaths);

// Clear specific limit
clearRateLimit('/api/test:192.168.1.1');

// Clear all limits
clearAllRateLimits();

// Manual cleanup control
startPeriodicCleanup(5 * 60 * 1000); // Every 5 minutes
stopPeriodicCleanup();
```

### User Rate Limiting

```typescript
import {
  getUserRateLimitStatus,
  getUserRateLimitStats,
  clearUserRateLimit,
  clearAllUserRateLimits,
} from '@/lib/middleware';

// Get user status
const status = getUserRateLimitStatus('user123');
console.log(status.count, status.remaining, status.resetTime);

// Get statistics
const stats = getUserRateLimitStats();
console.log(stats.totalUsers, stats.roleBreakdown);

// Clear user limit
clearUserRateLimit('user123');
```

### Crawler Detection

```typescript
import {
  getFrequencyStats,
  getCrawlerDetectionStats,
  blacklistIP,
  whitelistIP,
} from '@/lib/middleware';

// Get frequency stats for IP
const stats = getFrequencyStats('192.168.1.1');

// Get detection statistics
const crawlerStats = getCrawlerDetectionStats();
console.log(crawlerStats.suspiciousIPs, crawlerStats.highFrequencyIPs);

// Manage IP lists
blacklistIP('10.0.0.99');
whitelistIP('10.0.0.88');
```

## Response Headers

### Rate Limit Headers

All rate-limited responses include:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when window resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)

### Crawler Detection Headers

When crawler is detected (monitor/block mode):

- `X-Crawler-Detected`: `true` if crawler detected
- `X-Crawler-Type`: `known` | `suspicious` | `unknown`
- `X-Crawler-Reason`: Reason for detection

## Error Responses

### Rate Limit Exceeded (429)

```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 60,
      "windowMs": 60000,
      "resetAt": "2024-03-21T10:30:00.000Z"
    }
  }
}
```

### Access Denied (403)

```json
{
  "success": false,
  "error": {
    "type": "ACCESS_DENIED",
    "message": "Bot access denied",
    "details": {
      "reason": "Suspicious bot detected"
    }
  }
}
```

## Performance Considerations

1. **Memory Usage**: LRU cache limits memory usage (default: 10,000 entries)
2. **Automatic Cleanup**: Expired entries are cleaned up periodically
3. **In-Memory Storage**: For production, consider Redis for distributed rate limiting
4. **Efficient Algorithms**: Sliding window algorithm provides accurate limits without high memory overhead

## Security Best Practices

1. **Layered Protection**: Use IP-based, user-based, and crawler detection together
2. **Different Limits**: Set appropriate limits for different user roles
3. **Monitor Mode**: Use monitor mode in development to fine-tune detection
4. **Known Bots**: Allow legitimate crawlers (Google, Bing, etc.) for SEO
5. **Sensitive Endpoints**: Apply stricter limits to sensitive operations
6. **Regular Audits**: Review detection statistics and adjust thresholds

## Troubleshooting

### Users Being Blocked Legitimately

1. Check the response headers for `X-Crawler-Reason`
2. Adjust `maxRequestsPerMinute` or `maxRequestsPerSecond` thresholds
3. Consider adding the user's IP to the whitelist
4. Monitor mode to understand the pattern without blocking

### Rate Limit Too Strict

1. Increase `maxRequests` for the endpoint
2. Use role-based limits for authenticated users
3. Implement exponential backoff in clients
4. Set appropriate `windowMs` for your use case

### Memory Usage High

1. Reduce the LRU cache size
2. Decrease cleanup interval
3. Use Redis for distributed storage
4. Monitor `getRateLimitStats()` and `getUserRateLimitStats()`

## Migration from Previous Version

If you're upgrading from a previous rate limiting system:

1. Replace `withRateLimit` with the new implementation
2. Add `withCrawlerDetection` for anti-bot protection
3. Implement user-based rate limiting with JWT/API keys
4. Update error handling for new response format
5. Add rate limit headers to your frontend for better UX

## License

MIT License - Part of the 7zi-project

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
