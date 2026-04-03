# Workflow Engine API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. In production, implement JWT or API key authentication.

---

## Workflows

### Create Workflow

```http
POST /api/workflows
Content-Type: application/json

{
  "id": "wf_123",
  "name": "My Workflow",
  "version": "1.0.0",
  "description": "Workflow description",
  "nodes": [...],
  "edges": [...]
}
```

### Get All Workflows

```http
GET /api/workflows
```

### Get Workflow

```http
GET /api/workflows/:id
```

### Update Workflow

```http
PUT /api/workflows/:id
Content-Type: application/json

{
  "name": "Updated Workflow",
  "nodes": [...],
  "edges": [...]
}
```

### Delete Workflow

```http
DELETE /api/workflows/:id
```

---

## Executions

### Execute Workflow

```http
POST /api/workflows/:id/execute
Content-Type: application/json

{
  "variables": {
    "key": "value"
  }
}
```

### Get Execution Status

```http
GET /api/executions/:id
```

### Get All Executions

```http
GET /api/executions
```

### Pause Execution

```http
POST /api/executions/:id/pause
```

### Resume Execution

```http
POST /api/executions/:id/resume
Content-Type: application/json

{
  "checkpointId": "checkpoint_123"
}
```

### Cancel Execution

```http
POST /api/executions/:id/cancel
```

---

## Templates

### Get All Templates

```http
GET /api/templates
```

### Create Template

```http
POST /api/templates
Content-Type: application/json

{
  "name": "Template Name",
  "description": "Template description",
  "category": "integration",
  "workflow": {...}
}
```

### Instantiate Template

```http
POST /api/templates/:id/instantiate
Content-Type: application/json

{
  "name": "My Workflow from Template"
}
```

### Export Template

```http
GET /api/templates/:id/export
```

### Import Template

```http
POST /api/templates/import
Content-Type: application/json

{
  "name": "Imported Template",
  "workflow": {...}
}
```

---

## AI Features

### Generate Workflow with AI

```http
POST /api/ai/generate
Content-Type: application/json

{
  "description": "Create a workflow that processes data from an API and sends notifications"
}
```

### Get Optimization Suggestions

```http
POST /api/ai/optimize
Content-Type: application/json

{
  "workflow": {...}
}
```

---

## Health Check

```http
GET /health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

---

## Error Responses

All endpoints may return error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error