# Agent Learning System API Documentation

**Version:** 1.0  
**Base URL:** `/api/agents/learning`  
**Authentication:** JWT Required

---

## Overview

The Agent Learning System API provides access to performance metrics, capability scores, and optimization data for registered agents. It enables intelligent task scheduling and performance monitoring.

---

## Endpoints

### 1. Get All Agents' Learning Statistics

Retrieve learning statistics for all registered agents.

**Endpoint:** `GET /api/agents/learning`

**Authentication:** Required (JWT)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `day` | Time period for aggregated stats: `hour`, `day`, `week`, `month` |
| `includeSystem` | boolean | No | `false` | Include overall system statistics |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "agentId": "agent_123",
        "agentName": "Image Processor",
        "status": "idle",
        "scores": {
          "overall": 0.85,
          "reliability": 0.92,
          "speed": 0.78,
          "quality": 0.86
        },
        "capabilities": {
          "image_processing": {
            "avgCompletionTime": 2500,
            "successRate": 0.95,
            "sampleCount": 150,
            "trend": "improving"
          }
        },
        "currentLoad": 0,
        "avgResponseTime": 2300,
        "successRate": 0.95,
        "tasksCompleted": 150,
        "tasksFailed": 8,
        "lastUpdated": 1711785600000
      }
    ],
    "count": 1,
    "period": "day",
    "system": {
      "totalAgents": 1,
      "activeAgents": 1,
      "totalTasksProcessed": 158,
      "avgCompletionTime": 2300,
      "overallSuccessRate": 0.95,
      "predictionsAccuracy": 0.75,
      "lastUpdated": 1711785600000
    },
    "aggregated": {
      "period": "day",
      "startTime": 1711699200000,
      "endTime": 1711785600000,
      "tasksCompleted": 50,
      "tasksFailed": 2,
      "avgExecutionTime": 2300,
      "avgQueueWaitTime": 150,
      "avgAgentUtilization": 0.3,
      "topPerformers": ["agent_123"],
      "strugglingAgents": [],
      "predictionAccuracy": 0.75,
      "predictionCount": 0
    }
  },
  "timestamp": "2024-03-30T17:12:00.000Z"
}
```

---

### 2. Get Agent Detail

Retrieve detailed learning statistics for a specific agent.

**Endpoint:** `GET /api/agents/learning/:agentId`

**Authentication:** Required (JWT)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `includeHistory` | boolean | No | `false` | Include recent task history |
| `historyLimit` | number | No | `50` | Number of history records to return |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "agentId": "agent_123",
    "agentName": "Image Processor",
    "status": "idle",
    "registration": {
      "type": "worker",
      "capabilities": ["image_processing", "image_resizing"],
      "createdAt": 1711700000000,
      "lastHeartbeat": 1711785600000
    },
    "scores": {
      "overall": 0.85,
      "reliability": 0.92,
      "speed": 0.78,
      "quality": 0.86
    },
    "capabilities": {
      "image_processing": {
        "avgCompletionTime": 2500,
        "successRate": 0.95,
        "sampleCount": 150,
        "lastTaskTime": 1711785000000,
        "trend": "improving",
        "performance": "excellent"
      }
    },
    "current": {
      "load": 0,
      "avgResponseTime": 2300,
      "successRate": 0.95
    },
    "tasks": {
      "completed": 150,
      "failed": 8,
      "total": 158
    },
    "prediction": {
      "estimatedResponseTime": 2300,
      "confidence": 0.8
    },
    "lastUpdated": 1711785600000
  },
  "timestamp": "2024-03-30T17:12:00.000Z"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": {
    "type": "NOT_FOUND",
    "message": "Agent not found in learning system",
    "timestamp": "2024-03-30T17:12:00.000Z"
  }
}
```

---

### 3. Get Adjustment Info

Get list of available agents and their task types for manual weight adjustment.

**Endpoint:** `GET /api/agents/learning/adjust`

**Authentication:** Required (JWT)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agentId` | string | No | - | Filter by specific agent |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "agentId": "agent_123",
        "agentName": "Image Processor",
        "taskTypes": [
          {
            "taskType": "image_processing",
            "currentScore": 0.95,
            "sampleCount": 150,
            "trend": "improving",
            "canAdjust": true
          }
        ],
        "overallScore": 0.85,
        "totalTasks": 150
      }
    ],
    "count": 1
  },
  "timestamp": "2024-03-30T17:12:00.000Z"
}
```

---

### 4. Adjust Agent Weight

Manually adjust an agent's weight for a specific task type.

**Endpoint:** `POST /api/agents/learning/adjust`

**Authentication:** Required (JWT)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentId` | string | Yes | Agent identifier |
| `taskType` | string | Yes | Task type to adjust |
| `adjustment` | number | Yes | Adjustment value (-1.0 to 1.0) |
| `reason` | string | No | Reason for the adjustment |

**Adjustment Value:**
- `-1.0` to `0`: Decrease the agent's score
- `0` to `1.0`: Increase the agent's score
- Example: `-0.1` reduces score by 10%, `+0.1` increases by 10%

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "agentId": "agent_123",
    "taskType": "image_processing",
    "previousScore": 0.95,
    "newScore": 0.85,
    "adjustment": -0.1,
    "reason": "Performance degradation observed",
    "timestamp": 1711785600000
  },
  "timestamp": "2024-03-30T17:12:00.000Z"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Adjustment must be between -1.0 and 1.0",
    "timestamp": "2024-03-30T17:12:00.000Z"
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": {
    "type": "NOT_FOUND",
    "message": "Agent not found in learning system",
    "timestamp": "2024-03-30T17:12:00.000Z"
  }
}
```

---

## Performance Ratings

The system provides the following performance ratings:

| Rating | Success Rate | Description |
|--------|--------------|-------------|
| `excellent` | ≥ 95% | Outstanding performance |
| `good` | 85% - 94% | Above average performance |
| `average` | 70% - 84% | Acceptable performance |
| `below_average` | 50% - 69% | Below expectations |
| `needs_improvement` | < 50% | Poor performance |
| `insufficient_data` | N/A | Not enough samples (less than 5) |

---

## Trend Indicators

| Trend | Description |
|-------|-------------|
| `improving` | Performance getting better over time |
| `stable` | Performance consistent |
| `declining` | Performance getting worse over time |

---

## Score Components

### Overall Score
Weighted average of:
- **Reliability (40%)** - Success rate
- **Speed (30%)** - Inverse of execution time
- **Quality (30%)** - Low retry and error rate

### Scores Range
- `0.0` - Worst performance
- `1.0` - Best performance

---

## Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 404 | `NOT_FOUND` | Agent not found |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Usage Examples

### Example 1: Get Top-Performing Agents

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "https://api.example.com/api/agents/learning?includeSystem=true"
```

### Example 2: Get Specific Agent Details

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "https://api.example.com/api/agents/learning/agent_123"
```

### Example 3: Boost Agent Performance

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_123",
    "taskType": "image_processing",
    "adjustment": 0.1,
    "reason": "Agent upgraded to faster hardware"
  }' \
  "https://api.example.com/api/agents/learning/adjust"
```

### Example 4: Get Agents Available for Adjustment

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "https://api.example.com/api/agents/learning/adjust?agentId=agent_123"
```

---

## Integration with Scheduler

The learning system integrates with the Agent Scheduler to provide:

1. **Task Completion Tracking** - Automatically records metrics when tasks complete
2. **Agent Selection** - Uses performance scores to recommend best agents
3. **Time Prediction** - Estimates task completion time based on history
4. **Automatic Learning** - Continuously updates scores as tasks complete

To integrate with your scheduler:

```typescript
import { adaptiveLearner } from '@/lib/agents/learning';

// After task completion
adaptiveLearner.recordTaskCompletion(
  taskId,
  taskType,
  agentId,
  createdAt,
  startedAt,
  completedAt,
  status,
  priority,
  inputSize,
  outputSize,
  retryCount,
  agentLoadAtStart,
  errorType
);

// Predict completion time before scheduling
const prediction = adaptiveLearner.predictCompletionTime({
  taskType: 'image_processing',
  inputSize: 1024000,
  priority: 'normal',
  agentId: 'agent_123',
  timeOfDay: new Date().getHours(),
  dayOfWeek: new Date().getDay(),
  historicalAvgTime: 2500,
  queueDepth: 5,
  agentLoad: 0.3
});

console.log(`Estimated time: ${prediction.estimatedTime}ms`);
console.log(`Confidence: ${prediction.confidence}`);
```

---

## Rate Limiting

All API endpoints are subject to rate limiting:
- **Default limit:** 100 requests per minute per user
- **Burst limit:** 10 requests per second

Exceeding limits returns HTTP 429 with `Rate limit exceeded` error.

---

## Notes

1. **Authentication**: All endpoints require valid JWT token
2. **Data Freshness**: Learning data is updated in real-time as tasks complete
3. **Score Decay**: Old performance data is gradually weighted less (95% per day)
4. **Min Samples**: Predictions require at least 5 samples for an agent-task pair
5. **Data Retention**: Task history is limited to 10,000 most recent records

---

## Support

For issues or questions:
- Check the logs: `/var/log/agent-learning.log`
- Contact: dev-team@example.com
