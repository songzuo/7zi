# OpenClaw Workflow Engine v1.11.0 - 部署指南

## 系统要求

- Node.js 18.x 或更高版本
- Redis 6.x 或更高版本
- 2GB+ 内存
- 10GB+ 磁盘空间

## 快速开始

### 1. 安装依赖

```bash
cd workflow-engine/v111
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件配置必要的参数
```

### 3. 启动 Redis

```bash
# 使用 Docker
docker run -d -p 6379:6379 redis:7-alpine

# 或使用本地 Redis
redis-server
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

服务将在 `http://localhost:3001` 启动。

---

## Docker 部署

### 单容器部署

```bash
# 构建镜像
docker build -t openclaw-workflow-engine:v1.11.0 .

# 运行容器
docker run -d \
  --name workflow-engine \
  -p 3001:3001 \
  -e REDIS_URL=redis://redis:6379 \
  -e LOG_LEVEL=info \
  openclaw-workflow-engine:v1.11.0
```

### Docker Compose 部署

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  workflow-engine:
    build: .
    container_name: openclaw-workflow-engine
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=info
      - MAX_PARALLEL_TASKS=10
    depends_on:
      - redis
    networks:
      - workflow-network
    volumes:
      - ./logs:/app/logs

  redis:
    image: redis:7-alpine
    container_name: workflow-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - workflow-network

networks:
  workflow-network:
    driver: bridge

volumes:
  redis-data:
```

启动：

```bash
docker-compose up -d
```

---

## Kubernetes 部署

### 1. 创建命名空间

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: workflow-engine
```

### 2. 创建 ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-config
  namespace: workflow-engine
data:
  REDIS_URL: "redis://redis-service:6379"
  LOG_LEVEL: "info"
  MAX_PARALLEL_TASKS: "20"
  CHECKPOINT_INTERVAL: "5000"
```

### 3. 创建 Secret

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: workflow-secrets
  namespace: workflow-engine
type: Opaque
data:
  # Base64 encoded
  OPENAI_API_KEY: <base64-encoded-key>
  MINIMAX_API_KEY: <base64-encoded-key>
```

### 4. 部署 Redis

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: workflow-engine
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: workflow-engine
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

### 5. 部署工作流引擎

```yaml
# workflow-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-engine
  namespace: workflow-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: workflow-engine
  template:
    metadata:
      labels:
        app: workflow-engine
    spec:
      containers:
      - name: workflow-engine
        image: openclaw/workflow-engine:v1.11.0
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: workflow-config
        - secretRef:
            name: workflow-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: workflow-service
  namespace: workflow-engine
spec:
  selector:
    app: workflow-engine
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

### 6. 部署到集群

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f workflow-deployment.yaml
```

---

## 高可用部署

### Redis Sentinel / Cluster

对于生产环境，建议使用 Redis Sentinel 或 Redis Cluster：

```yaml
# redis-sentinel example
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 3
  # ... Redis Sentinel 配置
```

### 工作流引擎集群

```yaml
# 使用 Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workflow-engine-hpa
  namespace: workflow-engine
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workflow-engine
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 监控和日志

### Prometheus 监控

启用 Prometheus metrics：

```yaml
# 在 ConfigMap 中添加
PROMETHEUS_ENABLED: "true"
PROMETHEUS_PORT: "9090"
```

### Grafana Dashboard

导入预配置的 Grafana dashboard：

```bash
# 导入 dashboard
grafana-cli dashboards import openclaw-workflow-engine
```

### 日志聚合

使用 EFK (Elasticsearch, Fluentd, Kibana) 或 Loki：

```yaml
# Fluentd ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*workflow-engine*.log
      pos_file /var/log/fluentd-workflow.pos
      tag workflow-engine
      <parse>
        @type json
      </parse>
    </source>
```

---

## 安全配置

### 1. TLS/HTTPS

使用 cert-manager 配置 TLS：

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: workflow-tls
spec:
  secretName: workflow-tls-secret
  issuerRef:
    name: letsencrypt-prod
  dnsNames:
  - workflow.yourdomain.com
```

### 2. 认证

配置 API Key 认证：

```env
API_KEY_HEADER=x-api-key
API_KEYS=key1,key2,key3
```

### 3. 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: workflow-network-policy
spec:
  podSelector:
    matchLabels:
      app: workflow-engine
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: api-gateway
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

---

## 性能调优

### 1. 节点级别

```env
# 并行任务数
MAX_PARALLEL_TASKS=20

# 检查点间隔（毫秒）
CHECKPOINT_INTERVAL=3000

# Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=2048"
```

### 2. Redis 调优

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. 连接池

```typescript
// 自定义 Redis 连接池
const redisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  family: 4,
  keepAlive: 10000
};
```

---

## 备份和恢复

### Redis 数据备份

```bash
# 手动备份
redis-cli BGSAVE

# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/lib/redis/dump.rdb $BACKUP_DIR/dump_$DATE.rdb
# 保留最近 7 天的备份
find $BACKUP_DIR -name "dump_*.rdb" -mtime +7 -delete
```

### 恢复

```bash
# 停止 Redis
redis-cli SHUTDOWN NOSAVE

# 恢复数据
cp /backups/redis/dump_20260403_120000.rdb /var/lib/redis/dump.rdb

# 启动 Redis
redis-server
```

---

## 故障排查

### 常见问题

1. **Redis 连接失败**
   ```bash
   # 检查 Redis 状态
   redis-cli PING
   
   # 检查网络连接
   telnet redis-host 6379
   ```

2. **任务队列阻塞**
   ```bash
   # 检查队列状态
   curl http://localhost:3001/api/queue/stats
   
   # 清理队列
   curl -X POST http://localhost:3001/api/queue/clean
   ```

3. **内存不足**
   ```bash
   # 检查内存使用
   docker stats workflow-engine
   
   # 增加内存限制
   docker update --memory 2g workflow-engine
   ```

### 日志查看

```bash
# Docker 日志
docker logs -f workflow-engine

# Kubernetes 日志
kubectl logs -f deployment/workflow-engine -n workflow-engine
```

---

## 升级指南

### 从 v1.10.0 升级到 v1.11.0

1. 备份数据
   ```bash
   redis-cli BGSAVE
   ```

2. 停止旧版本
   ```bash
   docker stop workflow-engine
   ```

3. 更新镜像
   ```bash
   docker pull openclaw/workflow-engine:v1.11.0
   ```

4. 启动新版本
   ```bash
   docker-compose up -d
   ```

5. 验证升级
   ```bash
   curl http://localhost:3001/health
   ```

---

## 技术支持

- 文档: https://docs.openclaw.ai/workflow-engine
- GitHub Issues: https://github.com/openclaw/workflow-engine/issues
- 社区支持: https://community.openclaw.ai
