# OpenClaw v1.11.0 容器化部署套件

完整的容器化部署解决方案，支持 Docker、Docker Compose、Kubernetes 和 Helm。

## 📋 目录结构

```
deploy/
├── docker/
│   ├── Dockerfile                    # 多阶段构建，多架构支持
│   ├── docker-compose.dev.yml        # 开发环境配置
│   └── docker-compose.prod.yml       # 生产环境配置
├── kubernetes/
│   ├── deployment.yaml               # Deployment 配置
│   ├── service.yaml                  # Service 配置
│   ├── ingress.yaml                  # Ingress 配置
│   ├── configmap.yaml                # ConfigMap 和 Secret
│   └── hpa.yaml                      # HPA 和 PDB
├── helm/
│   └── openclaw/
│       ├── Chart.yaml                # Helm Chart 元数据
│       ├── values.yaml               # 可配置参数
│       └── templates/
│           ├── _helpers.tpl          # 模板助手
│           └── deployment.yaml       # 部署模板
└── github/
    └── workflows/
        └── ci.yml                    # CI/CD 工作流
```

## 🐳 Docker 部署

### 构建镜像

```bash
# 构建 AMD64 镜像
docker build -f deploy/docker/Dockerfile -t openclaw:v1.11.0 .

# 多架构构建
docker buildx build --platform linux/amd64,linux/arm64 \
  -f deploy/docker/Dockerfile \
  -t openclaw:v1.11.0 .
```

### 开发环境

```bash
# 启动开发环境
docker-compose -f deploy/docker/docker-compose.dev.yml up -d

# 查看日志
docker-compose -f deploy/docker/docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f deploy/docker/docker-compose.dev.yml down
```

开发环境包含：
- OpenClaw 主应用
- PostgreSQL 数据库
- Redis 缓存
- pgAdmin（数据库管理）
- Redis Commander（Redis 管理）

### 生产环境

```bash
# 创建环境变量文件
cp .env.example .env
# 编辑 .env 文件，设置生产配置

# 启动生产环境
docker-compose -f deploy/docker/docker-compose.prod.yml up -d

# 查看状态
docker-compose -f deploy/docker/docker-compose.prod.yml ps

# 停止服务
docker-compose -f deploy/docker/docker-compose.prod.yml down
```

生产环境包含：
- OpenClaw 主应用（3 副本）
- PostgreSQL 数据库（高可用）
- Redis 缓存（持久化）
- Nginx 反向代理
- Prometheus 监控
- Grafana 可视化

## ☸️ Kubernetes 部署

### 前置要求

- Kubernetes >= 1.25
- kubectl 配置正确
- Helm 3.x（可选）
- 持久化存储支持
- Ingress Controller（如 Nginx）
- Cert-Manager（可选，用于 TLS）

### 使用 kubectl 部署

```bash
# 创建命名空间
kubectl apply -f deploy/kubernetes/configmap.yaml

# 部署应用
kubectl apply -f deploy/kubernetes/

# 查看部署状态
kubectl get pods -n openclaw
kubectl get services -n openclaw
kubectl get ingress -n openclaw

# 查看日志
kubectl logs -f deployment/openclaw -n openclaw
```

### 使用 Helm 部署

```bash
# 安装 Chart
helm install openclaw deploy/helm/openclaw \
  --namespace openclaw \
  --create-namespace \
  --set image.tag=v1.11.0 \
  --set ingress.hosts[0].host=openclaw.example.com

# 自定义 values.yaml
helm install openclaw deploy/helm/openclaw \
  --namespace openclaw \
  --values custom-values.yaml

# 升级部署
helm upgrade openclaw deploy/helm/openclaw \
  --namespace openclaw \
  --set image.tag=v1.11.1

# 回滚
helm rollback openclaw -n openclaw

# 卸载
helm uninstall openclaw -n openclaw
```

### Helm Values 配置

主要配置项：

```yaml
# 副本数
replicaCount: 3

# 镜像配置
image:
  repository: openclaw/openclaw
  tag: v1.11.0
  pullPolicy: Always

# 资源限制
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

# 自动扩缩容
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

# Ingress 配置
ingress:
  enabled: true
  hosts:
    - host: openclaw.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: openclaw-tls
      hosts:
        - openclaw.example.com
```

## 🔄 CI/CD 集成

### GitHub Actions 工作流

完整的 CI/CD 流程包括：

1. **代码质量检查**
   - ESLint 检查
   - TypeScript 类型检查
   - 代码格式化检查

2. **测试**
   - 单元测试（多 Node 版本）
   - E2E 测试
   - 测试覆盖率报告

3. **构建**
   - 多架构 Docker 镜像（amd64/arm64）
   - 镜像推送到 GitHub Container Registry

4. **安全扫描**
   - Trivy 漏洞扫描
   - SARIF 报告上传

5. **部署**
   - Helm 部署到 Kubernetes
   - 自动回滚机制

### 配置 GitHub Actions

1. 添加 Secrets：
   - `KUBE_CONFIG`: Kubernetes 配置文件（base64 编码）
   - `GITHUB_TOKEN`: 自动提供

2. 触发条件：
   - Push to main/develop
   - Pull Request
   - Tag（v*）

3. 部署环境：
   - 创建 GitHub Environment：`production`
   - 配置环境保护规则

## 🔒 安全配置

### 网络安全

- NetworkPolicy 限制 Pod 通信
- Ingress TLS 配置
- Rate limiting
- CORS 配置

### 容器安全

- 非 root 用户运行
- 只读文件系统
- 最小化镜像
- 安全上下文配置

### 密钥管理

生产环境建议使用：
- Sealed Secrets
- External Secrets Operator
- HashiCorp Vault

## 📊 监控

### Prometheus 集成

```yaml
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
    path: /api/metrics
```

### Grafana Dashboard

预配置的 Dashboard：
- 应用性能监控
- 资源使用情况
- HTTP 请求统计
- 错误追踪

## 🔧 故障排查

### 常见问题

1. **Pod 启动失败**
```bash
kubectl describe pod <pod-name> -n openclaw
kubectl logs <pod-name> -n openclaw
```

2. **Ingress 无法访问**
```bash
kubectl get ingress -n openclaw
kubectl describe ingress <ingress-name> -n openclaw
```

3. **持久化卷问题**
```bash
kubectl get pvc -n openclaw
kubectl describe pvc <pvc-name> -n openclaw
```

### 健康检查

```bash
# 应用健康
curl https://openclaw.example.com/api/health

# 就绪检查
curl https://openclaw.example.com/api/ready
```

## 📝 版本管理

### 滚动更新

```bash
# 更新镜像版本
kubectl set image deployment/openclaw \
  openclaw=openclaw/openclaw:v1.11.1 \
  -n openclaw

# 查看更新状态
kubectl rollout status deployment/openclaw -n openclaw
```

### 回滚

```bash
# 查看历史
kubectl rollout history deployment/openclaw -n openclaw

# 回滚到上一版本
kubectl rollout undo deployment/openclaw -n openclaw

# 回滚到指定版本
kubectl rollout undo deployment/openclaw -n openclaw --to-revision=2
```

## 🚀 性能优化

### 镜像优化

- 多阶段构建
- Alpine 基础镜像
- 缓存层优化
- 多架构支持

### 资源优化

- HPA 自动扩缩容
- 资源请求和限制
- PDB 保证可用性
- Pod 反亲和性

### 网络优化

- Nginx 反向代理
- Gzip 压缩
- 静态资源缓存
- WebSocket 支持

## 📚 相关文档

- [Kubernetes 部署指南](../DEPLOYMENT.md)
- [API 文档](../API.md)
- [贡献指南](../CONTRIBUTING.md)

## 🆘 支持

- GitHub Issues: https://github.com/openclaw/openclaw/issues
- 文档: https://docs.openclaw.dev
- 社区: https://discord.gg/openclaw

---

**OpenClaw v1.11.0** - Personal AI Assistant Platform