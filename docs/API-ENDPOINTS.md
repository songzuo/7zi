# 7zi Project API Endpoints Summary

**Generated**: 2026-03-21
**Version**: 0.2.0

## Quick Reference

| Endpoint                 | Method | Description                | Auth    |
| ------------------------ | ------ | -------------------------- | ------- |
| `/api/status`            | GET    | Public status page data    | No      |
| `/api/health`            | GET    | Basic health check         | No      |
| `/api/health/live`       | GET    | Kubernetes liveness probe  | No      |
| `/api/health/ready`      | GET    | Kubernetes readiness probe | No      |
| `/api/health/detailed`   | GET    | Detailed health check      | No      |
| `/api/csrf-token`        | GET    | Generate CSRF token        | No      |
| `/api/database/health`   | GET    | Database health stats      | No      |
| `/api/database/optimize` | POST   | Optimize database          | No      |
| `/api/github/commits`    | GET    | Get repository commits     | Proxy\* |
| `/api/github/issues`     | GET    | Get repository issues      | Proxy\* |
| `/api/a2a/jsonrpc`       | POST   | A2A JSON-RPC endpoint      | No\*\*  |

**Note**: Proxy endpoints use server-side GITHUB_TOKEN, no client auth required.
**Note**: Consider adding authentication for A2A endpoint in production.

---

## By Category

### Health & Status (5 endpoints)

- `GET /api/status` - Public status page
- `GET /api/health` - Basic health check
- `GET /api/health/live` - Liveness probe
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/detailed` - Detailed health

### Security (1 endpoint)

- `GET /api/csrf-token` - CSRF token generation

### Database (2 endpoints)

- `GET /api/database/health` - Database stats
- `POST /api/database/optimize` - Database optimization

### GitHub Integration (2 endpoints)

- `GET /api/github/commits` - Repository commits
- `GET /api/github/issues` - Repository issues (no PRs)

### A2A Protocol (1 endpoint, 6 methods)

- `POST /api/a2a/jsonrpc` - JSON-RPC 2.0 endpoint
  - `message/send` - Send message to agent
  - `message/stream` - Stream message events
  - `tasks/get` - Get task by ID
  - `tasks/list` - List tasks with filters
  - `tasks/cancel` - Cancel running task
  - `agent/getCard` - Get agent metadata
  - `agent/getExtendedCard` - Get extended agent card

---

## Total Count

- **Total Routes**: 65+ API routes
- **API Modules**: 26 API modules
- **Total Methods**: 65+ HTTP endpoints
- **Protocols**: REST (65), WebSocket (via `/api/ws`), JSON-RPC (1)

> **Note**: The project has expanded significantly since v0.1.0. The API now includes modules for:
>
> - Analytics (metrics, export)
> - Backup (jobs, statistics, scheduling)
> - CSP violation reporting
> - Database health & optimization
> - Feedback (notifications, ratings)
> - Health checks (live, ready, detailed)
> - Multimodal (image, audio)
> - Performance metrics
> - RBAC permissions
> - Search functionality
> - User management
> - Web Vitals
> - WebSocket real-time communication (`/api/ws`)

Full endpoint list available in [API-COMPLETE-REFERENCE.md](./API-COMPLETE-REFERENCE.md).

---

## File Structure

```
src/app/api/
├── status/
│   └── route.ts
├── health/
│   ├── route.ts
│   ├── live/
│   │   └── route.ts
│   ├── ready/
│   │   └── route.ts
│   └── detailed/
│       └── route.ts
├── csrf-token/
│   └── route.ts
├── database/
│   └── health/
│       └── route.ts
├── github/
│   ├── commits/
│   │   └── route.ts
│   └── issues/
│       └── route.ts
└── a2a/
    └── jsonrpc/
        └── route.ts
```

---

## Documentation

Full API documentation available at: `docs/API-DOCUMENTATION.md`
