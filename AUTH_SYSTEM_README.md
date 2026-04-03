# AI 智能体认证和授权系统

企业级 AI 智能体认证和授权系统，为 OpenClaw v1.11.0 提供安全的身份验证和权限管理。

## 功能特性

### 1. JWT Token 管理

- **Token 生成与验证**: 使用 `jose` 库实现安全的 JWT token 签名和验证
- **Token 刷新**: 支持访问令牌和刷新令牌的双令牌机制
- **Token 黑名单**: 实现安全的 token 撤销机制
- **Token 过期处理**: 自动处理过期 token 和刷新逻辑

### 2. 权限模型

- **基于 RBAC**: 支持角色基础的访问控制
- **资源级权限**: 细粒度的资源级别权限控制
- **权限继承**: 支持角色间的权限继承
- **权限组合**: 支持多个角色的权限组合
- **条件权限**: 支持基于时间、IP、属性等条件的动态权限

### 3. 审计日志

- **事件记录**: 记录所有认证和授权事件
- **日志查询**: 支持多维度日志查询
- **日志导出**: 支持 JSON 和 CSV 格式导出
- **异常检测**: 自动检测可疑活动模式
- **统计分析**: 提供审计统计和分析功能

### 4. API 接口

#### POST /api/auth/token
获取访问令牌

**请求体:**
```json
{
  "grant_type": "password",
  "username": "user@example.com",
  "password": "password123"
}
```

**响应:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here"
}
```

#### POST /api/auth/refresh
刷新访问令牌

**请求体:**
```json
{
  "refresh_token": "refresh_token_here"
}
```

#### GET /api/auth/verify
验证令牌

**请求头:**
```
Authorization: Bearer <token>
```

**响应:**
```json
{
  "active": true,
  "sub": "user123",
  "email": "user@example.com",
  "role": "user",
  "permissions": ["read:tasks", "write:tasks"]
}
```

#### GET /api/auth/permissions
获取当前用户权限

**请求头:**
```
Authorization: Bearer <token>
```

**查询参数:**
- `resource`: 检查特定资源
- `action`: 检查特定操作

#### GET /api/auth/audit-logs
查询审计日志（需要管理员权限）

**查询参数:**
- `userId`: 用户 ID
- `agentId`: 智能体 ID
- `eventTypes`: 事件类型（逗号分隔）
- `severity`: 严重级别（逗号分隔）
- `result`: 结果类型（success/failure）
- `startDate`: 开始日期
- `endDate`: 结束日期
- `limit`: 返回数量限制
- `offset`: 偏移量
- `stats`: 是否包含统计信息
- `export`: 导出格式（json/csv）

## 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript
- **JWT 库**: jose (v6+)
- **密码哈希**: bcrypt
- **数据库**: SQLite (better-sqlite3)
- **验证**: Zod
- **测试**: Vitest

## 安装

```bash
# 安装依赖
npm install

# 设置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 JWT_SECRET 等配置
```

## 环境变量

```env
# JWT 配置
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

# 数据库配置
DATABASE_PATH=./data/auth.db

# 安全配置
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900

# 审计配置
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_EXPORT_PATH=./exports
```

## 使用示例

### 用户认证

```typescript
import { loginUser } from '@/lib/auth/service'

// 登录
const result = await loginUser({
  email: 'user@example.com',
  password: 'password123',
  rememberMe: true,
})

if (result.success) {
  console.log('Token:', result.token)
  console.log('User:', result.user)
}
```

### 智能体认证

```typescript
import { authenticateAgent } from '@/lib/agents/core/auth-service'

// 智能体认证
const result = await authenticateAgent({
  apiKey: 'sk_agent_xxxxxxxxxxxxx',
})

if (result) {
  console.log('Agent:', result.agent)
  console.log('Token:', result.token)
}
```

### 权限检查

```typescript
import { checkPermission } from '@/lib/auth/enhanced-permissions'

// 检查权限
const result = await checkPermission({
  userId: 'user123',
  resource: PermissionResource.TASK,
  action: PermissionAction.READ,
})

if (result.allowed) {
  console.log('Permission granted')
}
```

### 审计日志

```typescript
import { logAuditEvent, queryAuditLogs } from '@/lib/auth/audit-logger'

// 记录审计事件
await logAuditEvent({
  eventType: AuditEventType.LOGIN_SUCCESS,
  userId: 'user123',
  ipAddress: '192.168.1.1',
  result: 'success',
})

// 查询审计日志
const logs = await queryAuditLogs({
  userId: 'user123',
  eventTypes: [AuditEventType.LOGIN_SUCCESS],
  limit: 100,
})
```

## 测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- token-blacklist.test.ts
```

### 测试覆盖率

- Token 黑名单服务: > 90%
- 审计日志服务: > 85%
- 增强权限系统: > 85%
- API 集成测试: > 80%

## 安全最佳实践

1. **JWT Secret**: 使用强随机密钥，定期轮换
2. **Token 过期**: 设置合理的过期时间
3. **HTTPS**: 生产环境必须使用 HTTPS
4. **密码策略**: 强制使用强密码
5. **速率限制**: 实现登录速率限制
6. **审计日志**: 定期审查审计日志
7. **异常检测**: 监控可疑活动

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t openclaw-auth:latest .

# 运行容器
docker run -d \
  --name openclaw-auth \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -v ./data:/app/data \
  openclaw-auth:latest
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openclaw-auth
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openclaw-auth
  template:
    metadata:
      labels:
        app: openclaw-auth
    spec:
      containers:
      - name: auth
        image: openclaw-auth:latest
        ports:
        - containerPort: 3000
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: jwt-secret
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: auth-data
```

## 性能优化

1. **数据库索引**: 为常用查询字段添加索引
2. **缓存**: 使用 Redis 缓存权限数据
3. **连接池**: 使用数据库连接池
4. **批量操作**: 批量处理审计日志
5. **定期清理**: 定期清理过期数据

## 监控

### 关键指标

- 登录成功率
- Token 刷新成功率
- 权限检查延迟
- 审计日志写入速率
- 可疑活动检测次数

### 告警规则

- 登录失败率 > 10%
- Token 验证失败率 > 5%
- 权限检查延迟 > 100ms
- 可疑活动检测 > 10 次/小时

## 故障排查

### 常见问题

1. **Token 验证失败**
   - 检查 JWT_SECRET 是否一致
   - 检查 token 是否过期
   - 检查 token 是否在黑名单中

2. **权限检查失败**
   - 检查用户角色和权限配置
   - 检查权限继承规则
   - 检查权限条件

3. **审计日志未记录**
   - 检查数据库连接
   - 检查磁盘空间
   - 检查日志配置

## 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

- 项目主页: https://github.com/openclaw/openclaw
- 问题反馈: https://github.com/openclaw/openclaw/issues
- 文档: https://docs.openclaw.com