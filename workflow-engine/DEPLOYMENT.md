# Workflow Engine v1.10.0 Deployment Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Minimax API access (for AI features)

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Create `.env` file in backend directory:

```env
PORT=3001
MINIMAX_API_KEY=your_api_key_here
MINIMAX_API_URL=https://api.minimax.chat
```

### 3. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the application at: http://localhost:3000

## Production Deployment

### Build Frontend

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

### Start Backend

```bash
cd backend
NODE_ENV=production npm start
```

### Docker Deployment

Create `Dockerfile.backend`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

EXPOSE 3001

CMD ["node", "server.js"]
```

Create `Dockerfile.frontend`:

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - MINIMAX_API_KEY=${MINIMAX_API_KEY}
    volumes:
      - ./data:/app/data

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  data:
```

Run:

```bash
docker-compose up -d
```

## Configuration Options

### Backend Configuration

| Option | Default | Description |
|--------|---------|-------------|
| PORT | 3001 | Server port |
| MAX_PARALLEL_TASKS | 10 | Maximum parallel tasks |
| CHECKPOINT_INTERVAL | 5000 | Checkpoint interval (ms) |
| DEFAULT_TIMEOUT | 3600 | Default execution timeout (s) |

### Frontend Configuration

Edit `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3001/health
```

### Logs

Backend logs are written to stdout. Use a log aggregator in production:

```bash
# Using PM2
pm2 start server.js --name workflow-engine
pm2 logs workflow-engine
```

## Scaling

### Horizontal Scaling

1. Use a load balancer (nginx, HAProxy)
2. Share state with Redis:

```javascript
const redis = require('redis');
const client = redis.createClient();

// Store execution state
await client.set(`exec:${id}`, JSON.stringify(execution));
```

### Vertical Scaling

Adjust `maxParallelTasks` based on server resources:

```javascript
const engine = new WorkflowEngine({
  maxParallelTasks: process.env.MAX_PARALLEL_TASKS || 10
});
```

## Security

### Production Checklist

- [ ] Enable HTTPS
- [ ] Implement authentication
- [ ] Add rate limiting
- [ ] Validate all inputs
- [ ] Sanitize user-provided code
- [ ] Set proper CORS headers
- [ ] Use environment variables for secrets
- [ ] Enable request logging
- [ ] Set up monitoring and alerts

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -i :3001
kill -9 <PID>
```

**Build fails:**
```bash
rm -rf node_modules
npm install
```

**API errors:**
Check Minimax API key and quota.

## Support

For issues and feature requests, please create an issue in the repository.