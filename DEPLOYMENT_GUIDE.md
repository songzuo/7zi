# 7zi-frontend 部署文档

## 📋 目录

- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [部署流程](#部署流程)
- [回滚机制](#回滚机制)
- [健康检查](#健康检查)
- [故障排查](#故障排查)
- [多环境支持](#多环境支持)
- [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 前置条件

- 服务器已安装 Docker 和 Docker Compose
- 本地已安装 `sshpass` 和 `rsync`
- 已配置 SSH 访问权限

### 一键部署

```bash
# 生产环境部署
./deploy.sh deploy

# Staging 环境部署
ENVIRONMENT=staging ./deploy.sh deploy

# 开发环境部署
ENVIRONMENT=dev ./deploy.sh deploy
```

### 快速部署（适用于代码小改动）

```bash
./deploy-quick.sh deploy
```

---

## 🔧 环境配置

### 1. 环境变量文件

创建对应环境的配置文件：

```bash
# 生产环境
cat > .env.production << EOF
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 网站统计
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_UMAMI_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
NEXT_PUBLIC_UMAMI_URL=https://analytics.umami.is

# 邮件服务
RESEND_API_KEY=re_xxxxxxxxxxxxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio
EOF

# Staging 环境
cat > .env.staging << EOF
NODE_ENV=staging
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_GA_ID=G-YYYYYYYYYY
EOF

# 开发环境
cat > .env.development << EOF
NODE_ENV=development
PORT=3000
HOSTNAME=0.0.0.0
EOF
```

### 2. Docker Compose 配置

根据环境选择对应的 compose 文件：

- `docker-compose.dev.yml` - 开发环境
- `docker-compose.staging.yml` - Staging 环境
- `docker-compose.zero-downtime.yml` - 生产环境（蓝绿部署）
- `docker-compose.prod.yml` - 生产环境（标准部署）

### 3. 验证配置

```bash
# 检查环境配置
./deploy.sh check

# 查看部署状态
./deploy.sh status

# 查看部署历史
./deploy.sh history
```

---

## 📦 部署流程

### 完整部署流程（零停机）

```bash
# 1. 执行部署
./deploy.sh deploy

# 自动执行以下步骤：
# ✅ 检查前置条件
# ✅ 验证环境配置
# ✅ 同步代码到服务器
# ✅ 创建当前版本备份
# ✅ 确定蓝绿槽位
# ✅ 构建新版本镜像
# ✅ 启动新版本容器
# ✅ 健康检查（失败则自动回滚）
# ✅ 切换流量到新版本
# ✅ 停止旧版本容器
# ✅ 清理旧资源
# ✅ 最终验证
# ✅ 记录部署历史
```

### 蓝绿部署原理

```
流量初始状态:
    Nginx → Blue Container (当前版本)

部署过程:
    1. 构建新版本到 Green Container
    2. 健康检查 Green Container
    3. 切换 Nginx 配置 → Green Container
    4. 停止 Blue Container

回滚过程:
    1. 启动 Blue Container
    2. 健康检查 Blue Container
    3. 切换 Nginx 配置 → Blue Container
    4. 停止 Green Container
```

---

## 🔙 回滚机制

### 备份策略

- **保留数量**: 最近 3 个版本
- **备份位置**: `/opt/backups/7zi-frontend/`
- **备份内容**:
  - `.next` 构建产物
  - 环境变量文件
  - Docker 镜像（导出为 tar 文件）
  - 备份元信息（版本、日期、环境）

### 回滚命令

```bash
# 方式 1: 快速回滚（蓝绿槽位切换）
./deploy.sh rollback-quick

# 方式 2: 回滚到指定版本
./deploy.sh rollback v20250122-143022

# 方式 3: 查看可用备份后回滚
./deploy.sh backups
./deploy.sh rollback <version>
```

### 查看备份

```bash
# 列出所有备份
./deploy.sh backups

# 查看部署历史
./deploy.sh history
```

### 备份目录结构

```
/opt/backups/7zi-frontend/
├── v20250122-143022/
│   ├── .next/                    # 构建产物
│   ├── .env.production           # 环境变量
│   ├── 7zi-frontend-latest.tar   # Docker 镜像
│   └── backup-info.json          # 备份元信息
├── v20250122-120015/
│   └── ...
├── v20250121-180330/
│   └── ...
└── deploy-history.json           # 部署历史记录
```

---

## ✅ 健康检查

### 健康检查流程

部署脚本会自动执行以下健康检查：

```bash
# 1. 容器状态检查
docker ps --filter 'name=7zi-frontend-blue' --filter 'status=running'

# 2. HTTP 基础检查
curl -sf http://localhost:3000/

# 3. API 端点检查
curl -sf http://localhost:3000/api/health

# 4. 关键页面检查
curl -sf http://localhost:3000/works
```

### 手动健康检查

```bash
# 执行健康检查
./deploy.sh health

# 查看详细状态
./deploy.sh status
```

### 健康检查配置

Docker Compose 中的健康检查配置：

```yaml
healthcheck:
  test:
    [
      'CMD',
      'node',
      '-e',
      "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 20s
```

### 自动回滚触发条件

- 健康检查失败（15 次重试）
- 容器无法启动
- HTTP 响应异常
- API 端点不可访问

---

## 🔍 故障排查

### 常见问题

#### 1. SSH 连接失败

**症状**:

```
[ERROR] 服务器连接失败
```

**解决方案**:

```bash
# 检查 SSH 连接
sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no root@7zi.com

# 检查服务器 IP
ping 7zi.com

# 检查防火墙
ssh root@7zi.com "ufw status"
```

#### 2. Docker 镜像构建失败

**症状**:

```
[ERROR] 镜像构建失败
```

**解决方案**:

```bash
# 查看 Docker 构建日志
ssh root@7zi.com "cd /opt/7zi-frontend && docker-compose build --no-cache"

# 检查 Docker 磁盘空间
ssh root@7zi.com "df -h /var/lib/docker"

# 清理 Docker 缓存
ssh root@7zi.com "docker system prune -a -f"
```

#### 3. 健康检查失败

**症状**:

```
[ERROR] 健康检查失败
```

**解决方案**:

```bash
# 查看容器日志
./deploy.sh logs 7zi-frontend-blue

# 手动执行健康检查
ssh root@7zi.com "curl -v http://localhost:3000/"

# 检查容器状态
ssh root@7zi.com "docker ps -a | grep 7zi-frontend"

# 检查端口占用
ssh root@7zi.com "netstat -tlnp | grep 3000"
```

#### 4. Nginx 配置错误

**症状**:

```
nginx: configuration file test failed
```

**解决方案**:

```bash
# 测试 Nginx 配置
ssh root@7zi.com "docker exec 7zi-nginx nginx -t"

# 查看 Nginx 日志
./deploy.sh logs 7zi-nginx

# 检查 upstream 配置
ssh root@7zi.com "cat /opt/7zi-frontend/nginx/conf.d/upstream.conf"
```

#### 5. 容器频繁重启

**症状**:

```
Restarting (1) Less than a second ago
```

**解决方案**:

```bash
# 查看容器退出原因
ssh root@7zi.com "docker inspect 7zi-frontend-blue | grep -A 10 State"

# 查看容器日志
./deploy.sh logs 7zi-frontend-blue

# 检查资源限制
ssh root@7zi.com "docker stats --no-stream"

# 检查内存使用
ssh root@7zi.com "free -h"
```

#### 6. 端口冲突

**症状**:

```
Bind for 0.0.0.0:3000 failed: port is already allocated
```

**解决方案**:

```bash
# 查看端口占用
ssh root@7zi.com "netstat -tlnp | grep 3000"

# 停止占用端口的容器
ssh root@7zi.com "docker stop <container_id>"

# 或修改 Docker Compose 端口映射
```

### 日志查看

```bash
# 查看当前服务日志（默认 100 行）
./deploy.sh logs

# 查看指定服务日志
./deploy.sh logs 7zi-nginx

# 查看更多日志行数
./deploy.sh logs 7zi-frontend-blue 200

# 实时跟踪日志
./deploy.sh logs 7zi-frontend-blue 1000
```

### 调试模式

启用调试输出：

```bash
# 查看脚本执行过程
bash -x ./deploy.sh deploy
```

### 紧急修复

如果所有回滚都失败，可以手动恢复：

```bash
# 1. SSH 登录服务器
ssh root@7zi.com

# 2. 停止所有服务
cd /opt/7zi-frontend
docker-compose -f docker-compose.zero-downtime.yml down

# 3. 手动恢复备份
cp -r /opt/backups/7zi-frontend/v<version>/.next ./

# 4. 重新构建和启动
docker-compose -f docker-compose.zero-downtime.yml build --no-cache
docker-compose -f docker-compose.zero-downtime.yml up -d

# 5. 手动验证
curl http://localhost:3000/
```

---

## 🌍 多环境支持

### 环境说明

| 环境           | 用途       | 域名            | 数据库 | 配置文件           |
| -------------- | ---------- | --------------- | ------ | ------------------ |
| **dev**        | 本地开发   | localhost       | SQLite | `.env.development` |
| **staging**    | 预发布测试 | staging.7zi.com | SQLite | `.env.staging`     |
| **production** | 生产环境   | 7zi.com         | SQLite | `.env.production`  |

### 环境切换

```bash
# 切换到 Staging 环境
ENVIRONMENT=staging ./deploy.sh deploy

# 切换到开发环境
ENVIRONMENT=dev ./deploy.sh deploy

# 切换回生产环境
ENVIRONMENT=production ./deploy.sh deploy
```

### 环境变量差异

不同环境的主要差异：

```bash
# dev 环境特点
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
启用 Source Maps
禁用代码压缩

# staging 环境特点
NODE_ENV=staging
NEXT_PUBLIC_API_URL=https://staging.7zi.com/api
禁用 Source Maps
启用代码压缩

# production 环境特点
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://7zi.com/api
启用 CDN
启用缓存
启用性能监控
```

### 环境验证

部署前验证环境配置：

```bash
# 检查环境变量完整性
./deploy.sh check

# 检查服务状态
./deploy.sh status

# 执行健康检查
./deploy.sh health
```

---

## 💡 最佳实践

### 部署建议

1. **开发阶段**
   - 使用 `dev` 环境进行本地开发
   - 频繁提交代码，小步快跑

2. **测试阶段**
   - 使用 `staging` 环境进行集成测试
   - 部署前在 staging 环境验证

3. **生产部署**
   - 选择低峰期部署
   - 先在 staging 环境测试
   - 使用零停机部署
   - 准备回滚方案

### 监控建议

1. **部署后检查清单**

   ```bash
   # 1. 检查服务状态
   ./deploy.sh status

   # 2. 检查日志
   ./deploy.sh logs

   # 3. 健康检查
   ./deploy.sh health

   # 4. 访问关键页面
   curl https://7zi.com/api/health
   curl https://7zi.com/works
   ```

2. **定期维护**

   ```bash
   # 每周清理旧资源
   ./deploy.sh cleanup

   # 定期检查备份
   ./deploy.sh backups

   # 定期查看部署历史
   ./deploy.sh history
   ```

3. **资源监控**

   ```bash
   # 查看容器资源使用
   ssh root@7zi.com "docker stats --no-stream"

   # 查看 Docker 磁盘使用
   ssh root@7zi.com "docker system df"

   # 查看系统资源
   ssh root@7zi.com "free -h && df -h"
   ```

### 安全建议

1. **环境变量安全**
   - 不要将 `.env.production` 提交到 Git
   - 使用 Git 忽略文件：`.env.*`

2. **SSH 安全**
   - 使用 SSH 密钥而非密码
   - 配置防火墙规则

3. **容器安全**
   - 使用非 root 用户运行容器
   - 限制容器资源
   - 定期更新基础镜像

### 回滚策略

1. **快速回滚**

   ```bash
   # 蓝绿槽位切换（秒级回滚）
   ./deploy.sh rollback-quick
   ```

2. **版本回滚**

   ```bash
   # 回滚到指定版本
   ./deploy.sh rollback v20250122-143022
   ```

3. **回滚验证**
   ```bash
   # 验证回滚后的服务
   ./deploy.sh health
   ./deploy.sh status
   ```

---

## 📞 获取帮助

### 查看帮助信息

```bash
./deploy.sh help
```

### 常用命令速查

```bash
# 部署
./deploy.sh deploy
ENVIRONMENT=staging ./deploy.sh deploy

# 回滚
./deploy.sh rollback-quick
./deploy.sh rollback v20250122-143022

# 状态查看
./deploy.sh status
./deploy.sh health
./deploy.sh logs

# 备份管理
./deploy.sh backups
./deploy.sh history

# 维护
./deploy.sh cleanup
./deploy.sh check
```

---

## 📚 附录

### 目录结构

```
/opt/7zi-frontend/
├── .next/                    # Next.js 构建产物
├── .env.production           # 生产环境变量
├── .env.staging              # Staging 环境变量
├── .env.development          # 开发环境变量
├── Dockerfile                # Docker 镜像定义
├── docker-compose.yml        # 默认 Compose 文件
├── docker-compose.prod.yml  # 生产环境 Compose
├── docker-compose.dev.yml    # 开发环境 Compose
├── docker-compose.staging.yml # Staging 环境 Compose
├── docker-compose.zero-downtime.yml # 零停机部署 Compose
├── nginx/                    # Nginx 配置
│   ├── nginx.conf
│   ├── conf.d/
│   │   └── upstream.conf
│   ├── ssl/
│   └── logs/
└── public/                   # 静态资源
```

### 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Nginx 反向代理配置](https://nginx.org/en/docs/http/load_balancing.html)

---

**文档版本**: 3.0
**最后更新**: 2025-01-22

---

## ⚡ API Rate Limiting Configuration (v1.4.0)

### Overview

v1.4.0 introduces Redis-based distributed API rate limiting with support for sliding window and token bucket algorithms.

### Redis Configuration

Production environment should use Redis for distributed rate limiting:

```bash
# Redis connection configuration
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Enable Redis rate limiting
RATE_LIMIT_REDIS_ENABLED=true
```

Development environment can use in-memory mode (no Redis required):

```bash
# Local development - use memory mode
REDIS_HOST=localhost
RATE_LIMIT_REDIS_ENABLED=false
```

### Rate Limiting Strategies

Default strategies (configured in `src/proxy.ts`):

| API Route      | Limit       | Algorithm      | Description                      |
| -------------- | ----------- | -------------- | -------------------------------- |
| `/api/auth/*`  | 5 req/min   | Sliding Window | Strict limit (login/register)    |
| `/api/tasks/*` | 30 req/min  | Sliding Window | Moderate limit (task operations) |
| `/api/*`       | 100 req/min | Token Bucket   | Lenient limit (general API)      |

### Customizing Rate Limits

To modify rate limiting strategies, edit `src/proxy.ts`:

```typescript
// Change auth limit to 10 req/min
const authRateLimiter = new DistributedRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 requests/minute
  algorithm: 'sliding-window',
  keyGenerator: KeyGenerators.byIP,
})
```

### Rate Limit Headers

All API responses include standard Rate Limit headers:

```
X-RateLimit-Limit: 100        # Request limit
X-RateLimit-Remaining: 95     # Remaining requests
X-RateLimit-Reset: 2026-03-29T12:00:00.000Z  # Reset time
Retry-After: 60               # Retry seconds (429 responses only)
```

### Monitoring Rate Limits

```bash
# Check Redis connection status
ssh root@7zi.com "docker exec -it <redis-container> redis-cli ping"

# View rate limit keys (Redis mode)
ssh root@7zi.com "docker exec -it <redis-container> redis-cli KEYS 'rate-limit:*'"

# View rate limit triggers in API logs
ssh root@7zi.com "docker logs 7zi-frontend-blue | grep 'Rate limit'"
```

### Troubleshooting

**Issue: Rate limiting not working**

```bash
# 1. Check if middleware is loaded
./deploy.sh logs | grep "rate limit"

# 2. Check Redis connection (production)
ssh root@7zi.com "docker exec -it <redis-container> redis-cli ping"

# 3. Check environment variables
ssh root@7zi.com "docker exec -it 7zi-frontend-blue env | grep RATE_LIMIT"
```

**Issue: Rate limiting too strict**

```bash
# Check strategy configuration
cat src/proxy.ts | grep "new DistributedRateLimiter"

# To adjust, modify config and redeploy
./deploy.sh deploy
```

**Redis Fallback**

If Redis is unavailable, the system automatically falls back to in-memory mode:

```
[WARN] Redis connection failed, falling back to in-memory rate limiting
```

---

## 🔄 Environment Updates for v1.4.0

### Rate Limiting Variables

New environment variables added in `.env.example`:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false

# Rate Limiting
RATE_LIMIT_REDIS_ENABLED=false
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_TASKS_MAX=30
RATE_LIMIT_GENERAL_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

### Production Deployment Checklist

When deploying v1.4.0 to production, ensure:

- [ ] Redis is installed and running
- [ ] `RATE_LIMIT_REDIS_ENABLED=true` in `.env.production`
- [ ] Redis connection credentials are correct
- [ ] Test rate limiting endpoints before full deployment
- [ ] Monitor Rate Limit headers in API responses

---

**Updated**: 2026-03-29
**Version**: 1.4.0
