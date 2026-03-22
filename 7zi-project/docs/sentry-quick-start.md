# Sentry 快速开始指南

本指南将帮助您快速设置和使用 Sentry 错误监控。

## 前提条件

1. 拥有 Sentry 账户（可在 [sentry.io](https://sentry.io) 免费注册）
2. 已创建 Sentry 项目
3. 项目使用 Next.js

## 快速设置

### 步骤 1: 获取 Sentry DSN

1. 登录 [Sentry.io](https://sentry.io/)
2. 进入项目设置
3. 导航到 **Client Keys (DSN)**
4. 复制 DSN URL（格式：`https://xxx@sentry.io/xxx`）

### 步骤 2: 配置环境变量

编辑 `.env.production.sentry` 文件：

```bash
# 应用版本
NEXT_PUBLIC_APP_VERSION=1.0.8

# Sentry DSN（替换为你的实际 DSN）
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id

# 服务端 DSN（可选，如果与客户端不同）
SENTRY_DSN=https://your-dsn@sentry.io/your-project-id

# Sentry Auth Token（用于发布跟踪）
SENTRY_AUTH_TOKEN=your-auth-token

# Sentry Organization
SENTRY_ORG=your-org-slug

# Sentry Project
SENTRY_PROJECT=7zi-frontend
```

### 步骤 3: 验证配置

运行验证脚本：

```bash
./scripts/verify-sentry-config.sh
```

预期输出：
- ✅ 所有配置文件已创建
- ✅ 环境变量已配置
- ✅ 包已安装

### 步骤 4: 测试 Sentry

#### 方式 1: 使用测试页面

1. 启动开发服务器：
```bash
npm run dev
```

2. 访问测试页面：
```
http://localhost:3000/test-error-boundary
```

3. 点击测试按钮验证错误捕获

#### 方式 2: 使用 API 端点

```bash
# 测试 Sentry 配置
curl http://localhost:3000/api/health/test-sentry

# 测试异常捕获
curl -X POST http://localhost:3000/api/health/test-sentry \
  -H "Content-Type: application/json" \
  -d '{"type":"exception","message":"Test error"}'
```

#### 方式 3: 手动触发错误

在代码中添加测试错误：

```typescript
import { captureException } from '@/lib/monitoring/sentry.client.config';

// 捕获异常
try {
  throw new Error('Test error');
} catch (error) {
  captureException(error, { context: 'test' });
}
```

### 步骤 5: 查看 Sentry 仪表板

1. 登录 [Sentry.io](https://sentry.io/)
2. 选择您的项目
3. 查看 **Issues** 标签页
4. 应该能看到测试错误

## 使用示例

### 自动错误捕获（无需配置）

Sentry 会自动捕获以下错误：

- 未捕获的异常
- Promise rejections
- 组件渲染错误
- 网络错误
- API 错误

### 手动错误捕获

```typescript
import {
  captureException,
  captureMessage,
  setSentryUser,
  addBreadcrumb,
} from '@/lib/monitoring/sentry.client.config';

// 1. 设置用户上下文
setSentryUser({
  id: 'user-123',
  email: 'user@example.com',
  username: 'john',
});

// 2. 捕获异常
try {
  // 你的代码
} catch (error) {
  captureException(error, {
    component: 'MyComponent',
    action: 'submit-form',
  });
}

// 3. 捕获消息
captureMessage('User completed action', 'info', {
  action: 'submit',
  success: true,
});

// 4. 添加面包屑（用户操作跟踪）
addBreadcrumb('User clicked button', 'user-action', 'info', {
  button: 'submit',
  page: '/dashboard',
});
```

### 使用 Error Boundary

```tsx
import { ErrorBoundary, withErrorBoundary } from '@/components/ErrorBoundary';

// 方式 1: 包裹组件
function Dashboard() {
  return (
    <ErrorBoundary componentName="Dashboard">
      <YourComponent />
    </ErrorBoundary>
  );
}

// 方式 2: 使用 HOC
const SafeComponent = withErrorBoundary(YourComponent, {
  componentName: 'YourComponent',
  fallback: <CustomErrorUI />,
});

// 方式 3: 全局错误处理（自动）
// 已在 src/app/global-error.tsx 中配置
```

### API 路由错误跟踪

```typescript
import { withApiRouteTracking } from '@/lib/monitoring/sentry.server.config';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withApiRouteTracking('/api/health', async (req: NextRequest) => {
  // 你的 API 逻辑
  return NextResponse.json({ status: 'ok' });
});
```

### 服务端函数跟踪

```typescript
import { withSentryTracking } from '@/lib/monitoring/sentry.server.config';

async function fetchUserData(userId: string) {
  // 你的逻辑
  return { id: userId, name: 'John' };
}

const safeFetchUserData = withSentryTracking('fetchUserData', fetchUserData);

// 使用
const user = await safeFetchUserData('user-123');
```

## 生产部署

### Vercel 部署

1. 在 Vercel 项目设置中添加环境变量：
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_DSN`
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`

2. 部署应用：
```bash
npm run build
vercel deploy --prod
```

### Docker 部署

1. 在 `docker-compose.yml` 中添加环境变量：
```yaml
environment:
  - NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
  - SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
  - NEXT_PUBLIC_APP_VERSION=1.0.8
```

2. 构建并启动：
```bash
docker-compose up -d
```

### 传统服务器部署

1. 创建 `.env.production` 文件：
```bash
cp .env.production.sentry .env.production
```

2. 编辑 `.env.production`，填入实际的 DSN

3. 构建并运行：
```bash
npm run build
npm start
```

## 告警配置

### 快速设置告警

1. 登录 Sentry.io
2. 进入项目设置
3. 导航到 **Alerts**
4. 点击 **New Alert Rule**

### 推荐告警规则

```json
{
  "name": "High Error Rate",
  "query": "is:error",
  "aggregate": "count()",
  "timePeriod": "5m",
  "threshold": 10,
  "actions": [
    {
      "type": "email",
      "target": "tech-alerts@7zi.studio"
    }
  ]
}
```

详见 [docs/sentry-alert-rules.md](docs/sentry-alert-rules.md)

## 故障排除

### 问题：错误未出现在 Sentry

**检查清单**：
- [ ] DSN 是否正确配置？
- [ ] 网络连接是否正常？
- [ ] 控制台是否有错误？
- [ ] Sentry DSN 是否有效？

**调试步骤**：
```bash
# 测试 API 端点
curl http://localhost:3000/api/health/test-sentry

# 检查环境变量
echo $NEXT_PUBLIC_SENTRY_DSN
```

### 问题：某些错误被过滤

**原因**：可能匹配了过滤规则

**解决方案**：
- 检查 `beforeSend` 过滤器
- 检查 `denyUrls` 配置
- 查看浏览器控制台

### 问题：性能影响

**解决方案**：
- 降低采样率
- 减少面包屑数量
- 禁用不必要的集成

## 配置优化

### 开发环境

```typescript
// 100% 采样
sampleRate: 1.0
tracesSampleRate: 1.0

// 启用调试
debug: true
```

### 生产环境

```typescript
// 10% 错误采样
sampleRate: 0.1

// 5% 性能采样
tracesSampleRate: 0.05

// 禁用调试
debug: false
```

## 性能监控

### Web Vitals

Sentry 自动收集：
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)

### 自定义性能追踪

```typescript
import { startTransaction } from '@/lib/monitoring/sentry.client.config';

const transaction = startTransaction('user-action', 'ui.interaction');

try {
  // 你的代码
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

## 发布跟踪

### 关联发布与错误

1. 设置环境变量：
```bash
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=7zi-frontend
```

2. 在 CI/CD 中标记发布：
```bash
# 使用 Sentry CLI
sentry-cli releases new $VERSION
sentry-cli releases deploy $VERSION -e production
```

## 最佳实践

1. **始终设置用户上下文**：错误追踪更有价值
2. **使用有意义的标签**：便于错误分类和过滤
3. **添加面包屑**：重现问题的上下文
4. **合理配置采样率**：平衡监控需求和性能
5. **定期审查错误**：优化应用质量
6. **设置合理的告警**：避免告警疲劳

## 相关资源

- [完整实现报告](reports/sentry-error-monitoring-implementation.md)
- [告警规则配置](docs/sentry-alert-rules.md)
- [Sentry 官方文档](https://docs.sentry.io/)
- [Next.js Sentry 集成](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

## 获取帮助

如有问题，请：
1. 查看故障排除部分
2. 阅读完整实现报告
3. 访问 Sentry 官方文档
4. 联系技术团队

---

**Happy monitoring! 🎉**
