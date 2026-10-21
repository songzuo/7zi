# Workflow Service

Standalone workflow automation engine service for 7zi.

## Features

- Workflow definition, registration, and execution
- Node executors: start, end, task, condition, loop, parallel, subflow, delay, http, transform
- Checkpoint and resume for long-running workflows
- Template management (create, import, export, instantiate)
- AI-assisted workflow generation and optimization
- Health check and metrics endpoints

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run in production
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| NODE_ENV | development | Environment mode |
| LOG_LEVEL | info | Logging level (info, debug) |
| CORS_ORIGIN | * | CORS origin |
| MAX_PARALLEL_TASKS | 10 | Max parallel tasks |
| CHECKPOINT_INTERVAL | 5000 | Checkpoint interval (ms) |
| DEFAULT_TIMEOUT | 3600 | Default timeout (s) |

## API Endpoints

### Workflow Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/workflows | Create workflow |
| GET | /api/workflows | List all workflows |
| GET | /api/workflows/:id | Get workflow |
| PUT | /api/workflows/:id | Update workflow |
| DELETE | /api/workflows/:id | Delete workflow |

### Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/workflows/:id/execute | Execute workflow |
| GET | /api/executions | List all executions |
| GET | /api/executions/:id | Get execution status |
| POST | /api/executions/:id/pause | Pause execution |
| POST | /api/executions/:id/resume | Resume from checkpoint |
| POST | /api/executions/:id/cancel | Cancel execution |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/templates | Create template |
| GET | /api/templates | List templates |
| GET | /api/templates/:id | Get template |
| POST | /api/templates/:id/instantiate | Create workflow from template |
| GET | /api/templates/:id/export | Export template |
| POST | /api/templates/import | Import template |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/generate | Generate workflow from description |
| POST | /api/ai/optimize | Get optimization suggestions |

### Health & Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Simple health check |
| GET | /api/v1/workflow/health | Detailed health check |
| GET | /api/v1/workflow/metrics | Service metrics |

## Docker

```bash
# Build image
docker build -t 7zi/workflow-service .

# Run container
docker run -d -p 3001:3001 \
  --name workflow-service \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  7zi/workflow-service
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Workflow Service                       │
├─────────────────────────────────────────────────────────┤
│  Express Server (port 3001)                             │
│  ├── Workflow Engine                                     │
│  │   ├── Node Executors                                  │
│  │   ├── Execution State                                 │
│  │   └── Checkpoint Manager                             │
│  └── REST API Handlers                                  │
├─────────────────────────────────────────────────────────┤
│  HTTP Endpoints                                         │
│  ├── /health - Health check                             │
│  ├── /api/workflows/* - Workflow CRUD                   │
│  ├── /api/executions/* - Execution control              │
│  ├── /api/templates/* - Template management             │
│  └── /api/v1/workflow/* - Health & metrics             │
└─────────────────────────────────────────────────────────┘
```

## Migration Notes

This service was extracted from `7zi-backend/workflow-engine/` (originally `workflow-engine/backend/`).
The original directory is preserved for backward compatibility.

Key changes in extraction:
- Port: 3001 (unchanged from original `server.js`)
- Entry point: `node src/index.js` (was `node server.js`)
- Source files moved to `src/` subdirectory
- Added `/api/v1/workflow/health` endpoint for service mesh compatibility
- Added `/api/v1/workflow/metrics` endpoint

### Backward Compatibility

The original `workflow-engine/` symlinks still point to the original source:
- `workflow-engine/server.js` → `workflow-engine/backend/server.js`
- `workflow-engine/src/` → `workflow-engine/backend/src/`

To migrate existing deployments:
1. Install dependencies from new `workflow-service/` directory
2. Replace startup command from `node workflow-engine/server.js` to `node workflow-service/src/index.js`
3. Update any hardcoded port references from 3001 to environment variable

## Node Executor Reference

| Type | Description |
|------|-------------|
| start | Entry point of workflow |
| end | Exit point of workflow |
| task | Generic task execution |
| condition | Branch based on conditions |
| loop | Iterate over data |
| parallel | Execute branches in parallel |
| subflow | Execute nested workflow |
| delay | Wait for specified duration |
| http | Make HTTP request |
| transform | Transform data |
