# Workflow Engine v1.10.0 - Quick Start Guide

## 5-Minute Quick Start

### 1. Clone and Install

```bash
cd /root/.openclaw/workspace/workflow-engine

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start the Engine

```bash
# Make start script executable
chmod +x start.sh

# Start both frontend and backend
./start.sh
```

Or manually:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 3. Access the Application

Open your browser: **http://localhost:3000**

## Create Your First Workflow

### Step 1: Choose a Template

1. Click "Templates" in the navigation
2. Browse available templates
3. Click "Use Template" on any template

### Step 2: Design Your Workflow

1. Drag nodes from the left panel to the canvas
2. Connect nodes by dragging from one node's handle to another
3. Click a node to edit its properties in the right panel

### Step 3: Save and Execute

1. Click "Save" to save your workflow
2. Click "Execute" to run it
3. Monitor execution in real-time

## Example: Simple API Workflow

```json
{
  "name": "API Integration",
  "nodes": [
    {
      "type": "start",
      "position": { "x": 100, "y": 100 }
    },
    {
      "type": "http",
      "data": {
        "method": "GET",
        "url": "https://api.example.com/data"
      },
      "position": { "x": 300, "y": 100 }
    },
    {
      "type": "end",
      "position": { "x": 500, "y": 100 }
    }
  ],
  "edges": [
    { "source": "start", "target": "http" },
    { "source": "http", "target": "end" }
  ]
}
```

## Node Types Reference

| Type | Description | Use Case |
|------|-------------|----------|
| **Start** | Workflow entry point | Every workflow needs one |
| **End** | Workflow exit point | Mark workflow completion |
| **Task** | Custom action | Execute business logic |
| **Condition** | Branch logic | If/else decisions |
| **Loop** | Iterate over items | Process arrays/lists |
| **Parallel** | Run tasks in parallel | Speed up execution |
| **Delay** | Wait before next step | Rate limiting, scheduling |
| **HTTP** | Make HTTP requests | API integrations |
| **AI** | AI processing | Content generation, analysis |

## API Usage

### Execute Workflow via API

```bash
curl -X POST http://localhost:3001/api/workflows/{workflowId}/execute \
  -H "Content-Type: application/json" \
  -d '{"variables": {"key": "value"}}'
```

### Check Execution Status

```bash
curl http://localhost:3001/api/executions/{executionId}
```

### Create Workflow via API

```bash
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d @workflow.json
```

## Common Workflows

### 1. API Integration

```
Start → HTTP Request → Check Response → Transform → End
```

### 2. Data Processing

```
Start → Extract Data → Transform → Validate → Save → End
```

### 3. AI Content Generation

```
Start → AI Generate → Format → End
```

### 4. Notification System

```
Start → Check Conditions → Send Email → Send Slack → End
```

## Tips and Tricks

### Retry Failed Tasks

Add retry configuration to any node:

```json
{
  "retry": {
    "maxAttempts": 3,
    "backoffStrategy": "exponential",
    "initialDelay": 1000
  }
}
```

### Set Timeouts

Prevent long-running tasks:

```json
{
  "timeout": 30
}
```

### Use Variables

Pass data between nodes:

```json
{
  "variables": {
    "apiKey": "your-key",
    "endpoint": "https://api.example.com"
  }
}
```

Reference variables in nodes:

```
${variables.apiKey}
${output.data}
```

### Parallel Execution

Speed up by running tasks in parallel:

```json
{
  "type": "parallel",
  "data": {
    "branches": ["task1", "task2", "task3"]
  }
}
```

## Troubleshooting

### Backend won't start

```bash
# Check if port is in use
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Frontend build fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Workflow execution fails

1. Check execution logs in Monitor tab
2. Verify node configurations
3. Check API endpoints are accessible
4. Review error messages

## Next Steps

- 📚 Read the [API Documentation](docs/API.md)
- 🚀 Check [Deployment Guide](DEPLOYMENT.md)
- 🎨 Explore [Template Market](http://localhost:3000)
- 🤖 Try AI-powered workflow generation

## Support

For issues and questions:
- Check logs in `logs/` directory
- Review API documentation
- Create an issue in the repository

---

**Happy Automating! 🚀**