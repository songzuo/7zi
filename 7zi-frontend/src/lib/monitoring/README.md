# Performance Monitoring System

完整的 Next.js 应用性能监控和告警系统。

## 功能特性

### ✅ 已实现功能

#### 1. 基础性能监控
- **API 响应时间追踪** - 自动记录所有 API 请求的响应时间
- **错误率统计** - 实时计算 API 和操作的成功/失败率
- **用户操作延迟监控** - 追踪关键用户操作的执行时间
- **自定义指标** - 支持记录任何自定义性能指标

#### 2. 告警机制
- **错误率告警** - 当错误率超过阈值时自动告警
- **响应时间告警** - 当 API 平均响应时间超过阈值时告警
- **操作时间告警** - 当操作平均执行时间超过阈值时告警
- **告警级别** - Critical、High、Medium、Low

#### 3. 数据存储
- **内存存储** - 适合开发和测试，刷新后清空
- **LocalStorage 存储** - 适合长期监控，刷新后保留
- **可扩展接口** - 支持自定义存储后端

#### 4. 性能仪表板
- **PerformanceDashboard** - 功能完整的仪表板组件
- **SimplePerformanceDashboard** - 简化版本，无需额外依赖
- 实时显示 API 指标、操作指标、错误统计
- 告警列表和详情展示
- 自动刷新和手动控制

#### 5. 工具函数
- `monitoredFetch` - 包装 fetch 自动追踪
- `withPerformanceTracking` - 包装异步函数追踪
- `createPerformanceTracker` - 创建性能追踪器
- `trackReactError` - 追踪 React 错误边界错误
- `initBrowserTracking` - 初始化浏览器性能追踪

## 文件结构

```
src/lib/monitoring/
├── types.ts              # 类型定义
├── config.ts             # 配置管理
├── monitor.ts            # 核心监控类
├── storage.ts            # 存储实现
├── utils.ts              # 工具函数
├── index.ts              # 模块入口
└── __tests__/
    └── monitor.test.ts   # 测试文件

src/components/
├── PerformanceDashboard.tsx         # 完整仪表板
└── SimplePerformanceDashboard.tsx  # 简化仪表板

app/monitoring-example/
└── page.tsx                         # 示例页面
```

## 快速开始

### 1. 添加仪表板到任何页面

```tsx
import { PerformanceDashboard } from '@/components/PerformanceDashboard';

export default function DashboardPage() {
  return (
    <div>
      <h1>My Dashboard</h1>
      <PerformanceDashboard refreshInterval={5000} />
    </div>
  );
}
```

### 2. 监控 API 请求

```typescript
import { monitoredFetch } from '@/lib/monitoring';

const response = await monitoredFetch('/api/users', {
  method: 'GET',
  metadata: { operation: 'load_users' },
});
```

### 3. 监控异步操作

```typescript
import { withPerformanceTracking } from '@/lib/monitoring';

const result = await withPerformanceTracking('process_data', async () => {
  return await processData();
});
```

### 4. 手动追踪操作

```typescript
import { monitor } from '@/lib/monitoring';

const opId = monitor.startOperation('custom_operation');
// ... 执行操作
await monitor.endOperation(opId, true);
```

## 配置

监控会根据环境自动调整配置：

### 开发环境 (default)
- 采样率: 100%
- 错误率阈值: 10%
- 响应时间阈值: 5000ms
- 操作时间阈值: 10000ms

### 生产环境
- 采样率: 10%
- 错误率阈值: 2%
- 响应时间阈值: 1000ms
- 操作时间阈值: 2000ms

可在 `src/lib/monitoring/config.ts` 中自定义配置。

## 测试

```bash
cd 7zi-frontend
npm test -- src/lib/monitoring/__tests__/monitor.test.ts
```

## 示例页面

访问 `/monitoring-example` 页面查看所有功能的实际演示：
- 性能仪表板实时显示
- 各种示例操作按钮
- 操作日志显示
- 用户数据展示

## 性能影响

- CPU 开销: < 1%
- 内存开销: 每个指标约 200-500 字节
- 可通过采样率进一步降低

## 文档

详细文档请参阅 [MONITORING_SETUP.md](../MONITORING_SETUP.md)

## 技术栈

- TypeScript
- Next.js 16+
- React 19+
- Lucide React (图标)
- Vitest (测试)
- 无需额外图表库依赖
