# Docker 生产环境配置审计报告

**项目**: 7zi.com
**审计日期**: 2026-03-25
**审计人**: 🛡️ 系统管理员
**版本**: 1.0

---

## 📋 执行摘要

本次审计对 7zi 项目的 Docker 生产环境配置进行了全面审查，包括 Dockerfile、docker-compose 配置、.dockerignore 和 Nginx 配置。整体配置质量**良好**，已包含多项最佳实践，但仍有一些优化空间。

### 关键发现

| 项目                      | 状态        | 优先级 |
| ------------------------- | ----------- | ------ |
| 多阶段构建                | ✅ 已实现   | -      |
| 非 root 用户运行          | ✅ 已实现   | -      |
| 健康检查                  | ✅ 已实现   | -      |
| SSL/TLS 配置              | ✅ 已实现   | -      |
| 资源限制                  | ✅ 已实现   | -      |
| Gzip 压缩                 | ✅ 已实现   | -      |
| **Dockerfile 路径不匹配** | ❌ 需修复   | 🔴 高  |
| **健康检查端点不一致**    | ❌ 需修复   | 🔴 高  |
| 安全标签缺失              | ⚠️ 建议添加 | 🟡 中  |
| 缓存策略优化              | ⚠️ 建议添加 | 🟡 中  |

---

## 🔍 详细分析

### 1. Dockerfile.production 审计

#### ✅ 优点

1. **多阶段构建**：正确实现了 builder、runner-alpine 和 runner-distroless 三个阶段
2. **Alpine 基础镜像**：使用 node:22-alpine，镜像体积小
3. **非 root 用户**：创建了 nextjs 用户（uid 1001）
4. **文件权限**：使用 `--chown=nextjs:nodejs` 正确设置权限
5. **HEALTHCHECK**：实现了健康检查机制
6. **Standalone 模式**：使用 Next.js standalone 输出，减少运行时依赖
7. **BuildKit 缓存**：使用 `--mount=type=cache` 优化构建速度

#### ❌ 问题

##### 问题 1.1: HEALTHCHECK 端点不匹配

**严重程度**: 🔴 高

**问题描述**:

- Dockerfile 中使用 `/api/health` 端点
- Nginx 配置中配置的是 `/health` 端点
- 会导致健康检查失败

**修复建议**:

```dockerfile
# 修改 Dockerfile.production 中的 HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

##### 问题 1.2: distroless 阶段缺少 HEALTHCHECK

**严重程度**: 🟡 中

**问题描述**:

- distroless 镜像没有 shell 和 node 命令
- 无法使用现有 HEALTHCHECK 指令

**修复建议**:
为 distroless 阶段使用外部健康检查（通过 docker-compose）或添加额外的健康检查容器。

#### ⚠️ 改进建议

##### 建议 1.1: 添加安全标签

```dockerfile
# 在 runner-alpine 阶段添加
LABEL security.scan.status="scanned"
LABEL security.scan.date="2026-03-25"
LABEL maintainer="7zi"
LABEL version="3.0"
```

##### 建议 1.2: 优化依赖安装

```dockerfile
# 在 builder 阶段，添加生产依赖锁定
COPY package.json package-lock.json ./
RUN npm ci --only=production --legacy-peer-deps
```

---

### 2. docker-compose.prod.yml 审计

#### ✅ 优点

1. **资源限制**：正确配置了 CPU 和内存限制
2. **健康检查**：两个服务都有健康检查
3. **重启策略**：使用 `unless-stopped`
4. **日志配置**：限制了日志大小和数量
5. **安全选项**：配置了 `no-new-privileges:true`
6. **更新策略**：配置了 update_config
7. **网络隔离**：使用了自定义网络

#### ❌ 问题

##### 问题 2.1: Dockerfile 路径不匹配

**严重程度**: 🔴 高

**问题描述**:

- 配置中使用 `dockerfile: Dockerfile`
- 实际文件名是 `Dockerfile.production`
- 会导致构建失败

**修复建议**:

```yaml
7zi-frontend:
  build:
    context: .
    dockerfile: Dockerfile.production # 修改这里
    target: runner-alpine # 指定使用 Alpine 版本
```

##### 问题 2.2: 健康检查端点不一致

**严重程度**: 🔴 高

**问题描述**:

- docker-compose 中使用根路径 `/` 进行健康检查
- 与 Dockerfile 中的 `/api/health` 不一致

**修复建议**:

```yaml
healthcheck:
  test:
    [
      'CMD',
      'node',
      '-e',
      "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
    ]
```

##### 问题 2.3: Nginx 健康检查依赖不存在的端点

**严重程度**: 🟡 中

**问题描述**:

- Nginx 健康检查使用 `http://localhost/health`
- Nginx 容器本身没有 `/health` 端点

**修复建议**:

```yaml
nginx:
  healthcheck:
    test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost/']
    interval: 30s
    timeout: 10s
    retries: 3
```

#### ⚠️ 改进建议

##### 建议 2.1: 添加只读文件系统

```yaml
7zi-frontend:
  read_only: true
  tmpfs:
    - /tmp
```

##### 建议 2.2: 添加 capabilities 限制

```yaml
7zi-frontend:
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE
```

##### 建议 2.3: 添加更多安全选项

```yaml
7zi-frontend:
  security_opt:
    - no-new-privileges:true
    - apparmor:docker-default
    - seccomp:default.json
```

##### 建议 2.4: 添加资源监控

```yaml
7zi-frontend:
  deploy:
    mode: replicated
    replicas: 2 # 高可用
```

---

### 3. .dockerignore 审计

#### ✅ 优点

1. 排除了 node_modules
2. 排除了构建输出（.next, out, dist）
3. 排除了环境文件
4. 排除了 Git 目录

#### ⚠️ 改进建议

##### 建议 3.1: 添加更多排除项

```dockerignore
# 依赖
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# 构建输出
.next
out
dist
build

# Git
.git
.gitignore
.github

# 环境
.env
.env.*
!.env.production

# 测试
coverage
.nyc_output
*.test.js
*.test.ts
*.spec.js
*.spec.ts

# 文档
docs
*.md
!README.md

# IDE
.vscode
.idea
*.swp
*.swo
*.sublime-*

# OS
.DS_Store
Thumbs.db

# 部署相关
docker-compose.yml
docker-compose.*.yml
Dockerfile
.dockerignore

# CI/CD
.gitlab-ci.yml
.travis.yml
.github
```

---

### 4. Nginx 配置 (7zi-nginx.conf) 审计

#### ✅ 优点

1. **HTTP 到 HTTPS 重定向**：正确实现
2. **SSL/TLS 配置**：使用 TLS 1.2+ 和安全密码套件
3. **安全头**：配置了 HSTS、X-Frame-Options 等
4. **HTTP/2 支持**：启用了 http2
5. **Gzip 压缩**：已启用，级别合理
6. **静态资源缓存**：为静态资源设置了合理的缓存策略
7. **WebSocket 支持**：正确配置了 Upgrade 头

#### ❌ 问题

##### 问题 4.1: Gmail Pub/Sub 回调端点重复配置

**严重程度**: 🟡 中

**问题描述**:

- `/gmail-pubsub` 在 HTTP 和 HTTPS server 块中都配置了
- 配置重复，应该统一

**修复建议**:
保留 HTTP 中的配置，因为 Gmail Pub/Sub 需要 HTTP 回调，HTTPS 中可以删除。

##### 问题 4.2: 日志路径可能不存在

**严重程度**: 🟡 中

**问题描述**:

- 日志输出到 `/var/log/nginx/`
- 如果挂载了本地日志目录，可能不匹配

**修复建议**:
确认日志挂载配置，或使用标准路径。

#### ⚠️ 改进建议

##### 建议 4.1: 添加更多安全头

```nginx
# Content Security Policy（根据实际情况调整）
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://7zi.com; frame-src 'self' https://www.google.com;" always;

# Permissions Policy
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

##### 建议 4.2: 添加速率限制

```nginx
# 在 http 块中添加
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# 在 location 块中使用
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    ...
}

location / {
    limit_req zone=general_limit burst=50 nodelay;
    ...
}
```

##### 建议 4.3: 优化超时设置

```nginx
# 针对不同类型请求设置不同的超时
location /api/gmail {
    proxy_read_timeout 60s;  # 长时间操作
}

location /_next/image {
    proxy_read_timeout 15s;  # 图片请求
}
```

##### 建议 4.4: 添加请求体大小限制

```nginx
client_max_body_size 10M;  # 根据实际需求调整
```

##### 建议 4.5: 添加缓存配置

```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|webp|svg)$ {
    proxy_pass http://7zi-frontend:3000;
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;  # 静态资源不记录访问日志
}

# API 响应不缓存
location /api/ {
    proxy_pass http://7zi-frontend:3000;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

##### 建议 4.6: 添加 SSL Stapling

```nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /web/ssl_unified/chain.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

---

## 🛠️ 修复方案

### 高优先级修复（必须执行）

#### 修复 1: 统一健康检查端点

**文件**: Dockerfile.production

```dockerfile
# 修改 HEALTHCHECK，使用 /health 端点
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

**文件**: docker-compose.prod.yml

```yaml
7zi-frontend:
  healthcheck:
    test:
      [
        'CMD',
        'node',
        '-e',
        "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
      ]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 20s
```

#### 修复 2: 修正 docker-compose 中的 Dockerfile 路径

**文件**: docker-compose.prod.yml

```yaml
7zi-frontend:
  build:
    context: .
    dockerfile: Dockerfile.production # 修改为正确的文件名
    target: runner-alpine # 指定使用 Alpine 版本
```

#### 修复 3: 在 Next.js 中创建健康检查端点

**文件**: app/health/route.ts（创建新文件）

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 })
}
```

---

### 中优先级优化（建议执行）

#### 优化 1: 增强 docker-compose 安全配置

**文件**: docker-compose.prod.yml

```yaml
services:
  7zi-frontend:
    # ... 其他配置 ...
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
      - apparmor:docker-default
      - seccomp:default.json
    deploy:
      mode: replicated
      replicas: 2
```

#### 优化 2: 增强 Nginx 安全配置

**文件**: 7zi-nginx.conf

```nginx
# 在 http 块中添加
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# 在 server 块中添加
client_max_body_size 10M;

# 在 location 块中应用速率限制
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    # ... 其他配置 ...
}

# 添加更多安全头
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none'; base-uri 'self';" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

---

## 📊 对比表：修复前后

| 配置项          | 修复前                        | 修复后                   |
| --------------- | ----------------------------- | ------------------------ |
| Dockerfile 路径 | ❌ Dockerfile                 | ✅ Dockerfile.production |
| 健康检查端点    | ❌ 不一致（/api/health vs /） | ✅ 统一（/health）       |
| 非 root 用户    | ✅ nextjs (uid 1001)          | ✅ nextjs (uid 1001)     |
| 多阶段构建      | ✅ 3 阶段                     | ✅ 3 阶段                |
| 资源限制        | ✅ 限制 2CPU/1G               | ✅ 限制 2CPU/1G          |
| 只读文件系统    | ❌ 未配置                     | ✅ 已配置                |
| Capabilities    | ❌ 未限制                     | ✅ 已限制                |
| 速率限制        | ❌ 未配置                     | ✅ 已配置                |
| 安全标签        | ❌ 缺失                       | ✅ 已添加                |
| 静态资源缓存    | ⚠️ 基本配置                   | ✅ 优化配置              |

---

## 🎯 实施计划

### 阶段 1: 必须修复（立即执行）

1. ✅ 修改 Dockerfile.production 中的 HEALTHCHECK 端点
2. ✅ 修改 docker-compose.prod.yml 中的 Dockerfile 路径
3. ✅ 创建 `/health` API 端点
4. ✅ 统一所有健康检查配置

### 阶段 2: 安全加固（本周内）

1. 添加 read_only 文件系统
2. 配置 capabilities 限制
3. 添加安全标签
4. 增强 Nginx 安全头

### 阶段 3: 性能优化（下周）

1. 配置 Nginx 速率限制
2. 优化静态资源缓存
3. 添加 SSL Stapling
4. 调整超时配置

---

## 📝 后续建议

1. **定期审计**: 建议每季度进行一次配置审计
2. **安全扫描**: 使用 Trivy、Snyk 等工具定期扫描镜像漏洞
3. **性能监控**: 配置 Prometheus + Grafana 监控容器性能
4. **日志分析**: 使用 ELK 或 Loki 分析日志，及时发现问题
5. **备份策略**: 定期备份配置文件和证书
6. **灾难恢复**: 制定容器故障恢复方案

---

## 🔗 参考资源

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [Nginx Security Best Practices](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [OWASP Docker Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

---

**审计完成时间**: 2026-03-25 00:20 GMT+1
**下次审计建议时间**: 2026-06-25
