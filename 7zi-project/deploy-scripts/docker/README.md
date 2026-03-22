# Docker 部署配置

## 目录结构

```
deploy-scripts/docker/
├── Dockerfile.production    # 生产环境 Dockerfile
├── docker-compose.prod.yml  # 生产环境编排
└── nginx/
    └── nginx.conf           # Nginx 配置
```

## 生产环境 Dockerfile

```dockerfile
# ==========================================
# 多阶段构建 - 生产环境
# ==========================================

# Stage 1: 构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: 运行
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

## Docker Compose (生产环境)

```yaml
version: '3.8'

services:
  app:
    build:
      context: ../app
      dockerfile: ../deploy-scripts/docker/Dockerfile.production
    container_name: ai-team-dashboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    networks:
      - webnet
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - webnet

networks:
  webnet:
    driver: bridge
```

## Nginx 配置

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # HTTP 重定向到 HTTPS
    server {
        listen 80;
        server_name 7zi.com www.7zi.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 配置
    server {
        listen 443 ssl http2;
        server_name 7zi.com www.7zi.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # 静态文件缓存
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 部署命令

### 本地构建和测试

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down
```

### 服务器部署

```bash
# 1. 上传文件
scp -r deploy-scripts/docker/ root@7zi.com:/opt/deploy/

# 2. 在服务器上构建和运行
ssh root@7zi.com
cd /opt/deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

## CI/CD 集成

在 GitHub Actions 中使用：

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: ./app
    file: ./deploy-scripts/docker/Dockerfile.production
    push: true
    tags: |
      user/ai-team-dashboard:latest
      user/ai-team-dashboard:${{ github.sha }}
```

## 健康检查

```bash
# 检查容器状态
docker ps

# 检查应用健康
curl http://localhost:3000/health

# 查看日志
docker logs ai-team-dashboard
```

## 回滚

```bash
# 列出历史版本
docker images ai-team-dashboard

# 回滚到上一版本
docker-compose -f docker-compose.prod.yml down
docker tag user/ai-team-dashboard:previous user/ai-team-dashboard:latest
docker-compose -f docker-compose.prod.yml up -d
```
