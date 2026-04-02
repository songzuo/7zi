# Performance Monitoring Setup Guide

# 性能监控设置指南

本指南将帮助你在 7zi 项目中集成性能监控和告警系统。

## 概述

监控系统提供以下功能：

- **API 响应时间追踪** - 自动记录所有 API 请求的响应时间
- **错误率统计** - 实时计算 API 和操作的成功/失败率
- **用户操作延迟监控** - 追踪关键用户操作的执行时间
- **告警机制** - 当指标超过阈值时自动告警
- **性能仪表板** - 可视化展示系统性能数据

## 快速开始

### 1. 安装依赖

监控系统使用以下已安装的依赖：

- `uuid` - 生成唯一标识符
- `lucide-react` - 图标库

如果未安装，运行：

```bash
cd 7zi-frontend
npm install uuid lucide-react
```

### 2. 基本使用

#### 在页面中添加仪表板

在任何 Next.js 页面中添加性能仪表板：

```tsx
import { PerformanceDashboard } from '@/components/PerformanceDashboard'

export default function DashboardPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <PerformanceDashboard refreshInterval={5000} showAlarms={true} />
    </div>
  )
}
```

或使用简化版本（不需要额外依赖）：

```tsx
import { SimplePerformanceDashboard } from '@/components/SimplePerformanceDashboard'

export default function DashboardPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <SimplePerformanceDashboard />
    </div>
  )
}
```

## 集成方式

### 1. 监控 API 请求

使用 `monitoredFetch` 包装你的 fetch 调用：

```typescript
import { monitoredFetch } from '@/lib/monitoring'

// 使用方式与原生 fetch 完全相同
const response = await monitoredFetch('/api/users', {
  method: 'GET',
  metadata: {
    userId: '123',
    // 添加任何额外的上下文
  },
})

// 返回的是标准的 Response 对象
const data = await response.json()
```

### 2. 监控异步操作

使用 `withPerformanceTracking` 包装异步函数：

```typescript
import { withPerformanceTracking } from '@/lib/monitoring'

async function fetchUserData(userId: string) {
  return withPerformanceTracking(
    'fetch_user_data',
    async () => {
      const response = await fetch(`/api/users/${userId}`)
      return response.json()
    },
    {
      userId, // 可选的元数据
    }
  )
}
```

### 3. 手动追踪操作

使用 `monitor` 实例手动追踪：

```typescript
import { monitor } from '@/lib/monitoring'

// 开始追踪
const operationId = monitor.startOperation('data_processing')

try {
  // 执行你的操作
  await processData()

  // 结束追踪（成功）
  await monitor.endOperation(operationId, true, {
    itemsProcessed: 100,
  })
} catch (error) {
  // 结束追踪（失败）
  await monitor.endOperation(operationId, false, {
    error: error.message,
  })

  // 记录错误
  await monitor.trackError('ProcessingError', error.message, error.stack)
}
```

### 4. 监控 React 错误

在错误边界中使用：

```typescript
import { trackReactError } from '@/lib/monitoring'

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    trackReactError(error, errorInfo)

    // 其他错误处理逻辑
  }
}
```

### 5. 自定义指标

记录自定义性能指标：

```typescript
import { monitor } from '@/lib/monitoring'

// 记录任何自定义指标
await monitor.trackCustomMetric('database_query_time', 150, 'ms', {
  queryType: 'SELECT',
  tableName: 'users',
})
```

## 配置

### 环境特定配置

监控会根据环境自动调整：

**开发环境** (NODE_ENV=development):

- 采样率: 100%
- 错误率阈值: 10%
- 响应时间阈值: 5000ms
- 操作时间阈值: 10000ms

**生产环境** (NODE_ENV=production):

- 采样率: 10% (降低性能开销)
- 错误率阈值: 2%
- 响应时间阈值: 1000ms
- 操作时间阈值: 2000ms

### 自定义配置

如需自定义配置，修改配置文件：

```typescript
// src/lib/monitoring/config.ts

export const CUSTOM_CONFIG: Partial<MonitoringConfig> = {
  enabled: true,
  sampleRate: 0.5, // 50% 采样
  retentionPeriodMs: 48 * 60 * 60 * 1000, // 保留 48 小时
  alarms: {
    errorRate: {
      metric: 'errorRate',
      threshold: 0.03, // 3%
      windowMs: 10 * 60 * 1000, // 10 分钟窗口
      enabled: true,
    },
    // ... 其他配置
  },
}
```

运行时更新配置：

```typescript
import { monitor } from '@/lib/monitoring'

monitor.updateConfig({
  sampleRate: 0.2,
  enabled: true,
})
```

## 数据存储

### 内存存储（默认）

数据存储在内存中，页面刷新后清空。适用于开发和测试。

### LocalStorage 存储

数据存储在浏览器的 localStorage 中，刷新后保留。适用于长期监控。

```typescript
// 在 src/lib/monitoring/config.ts 中修改
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  storageType: 'localStorage', // 改为 localStorage
  // ... 其他配置
}
```

### 自定义存储

实现 `MonitoringStorage` 接口以支持自定义存储后端：

```typescript
import { MonitoringStorage, PerformanceMetric, AlarmEvent } from '@/lib/monitoring'

class CustomStorage implements MonitoringStorage {
  async saveMetric(metric: PerformanceMetric): Promise<void> {
    // 发送到你的后端
    await fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify(metric),
    })
  }

  // ... 实现其他方法
}
```

## 告警

告警会在以下情况触发：

1. **错误率超过阈值** - 在指定时间窗口内错误率超过配置的阈值
2. **平均响应时间超过阈值** - API 请求平均响应时间超过阈值
3. **平均操作时间超过阈值** - 操作执行平均时间超过阈值

### 告警级别

- **Critical** - 阈值的 2 倍以上
- **High** - 超过阈值但不到 2 倍
- **Medium** - 预留（未使用）
- **Low** - 预留（未使用）

### 查看告警

告警会：

1. 在浏览器控制台中显示警告
2. 存储在监控系统中
3. 在仪表板组件中显示

## 性能影响

监控对性能的影响：

- **CPU 开销**: 可忽略不计（< 1%）
- **内存开销**: 每个指标约 200-500 字节
- **网络开销**: 如果使用自定义存储发送到后端，会有额外网络请求

### 优化建议

1. **调整采样率** - 生产环境使用较低的采样率（10-20%）
2. **限制保留时间** - 设置合理的 `retentionPeriodMs`
3. **使用内存存储** - 如果不需要持久化，使用内存存储
4. **批量发送** - 如果发送到后端，考虑批量发送指标

## 示例：完整集成示例

```typescript
// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { monitoredFetch, monitor, withPerformanceTracking } from '@/lib/monitoring';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';

export default function DashboardPage() {
  const [users, setUsers] = useState([]);

  // 使用监控的 fetch
  const loadUsers = async () => {
    try {
      const response = await monitoredFetch('/api/users', {
        metadata: { operation: 'load_users' },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      await monitor.trackError('LoadUsersError', error.message);
    }
  };

  // 使用监控包装的函数
  const exportData = async () => {
    await withPerformanceTracking('export_data', async () => {
      // 导出逻辑
      await monitoredFetch('/api/export', { method: 'POST' });
    });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <PerformanceDashboard />

      <h1 className="text-2xl font-bold mt-8">User Management</h1>
      <button
        onClick={loadUsers}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Refresh
      </button>
      <button
        onClick={exportData}
        className="bg-green-500 text-white px-4 py-2 rounded ml-2"
      >
        Export
      </button>

      {/* 用户列表 */}
    </div>
  );
}
```

## 故障排查

### 仪表板不显示数据

1. 检查监控是否启用：`monitor.updateConfig({ enabled: true })`
2. 确认已正确集成 `monitoredFetch` 或其他追踪方法
3. 检查浏览器控制台是否有错误

### 数据未持久化

1. 确认存储类型配置为 `localStorage`
2. 检查 localStorage 是否可用（某些浏览器在隐私模式下禁用）
3. 查看存储配额是否已满

### 告警未触发

1. 确认告警已启用：检查配置中的 `enabled: true`
2. 验证阈值设置是否合理
3. 确认时间窗口内有足够的数据

## 下一步

- 考虑集成后端存储（如 Redis、InfluxDB）
- 添加更详细的性能分析图表
- 实现告警通知（Email、Slack 等）
- 添加性能趋势分析
- 集成 APM 工具（如 Sentry、New Relic）

## 技术支持

如有问题或建议，请查看：

- 源代码: `src/lib/monitoring/`
- 类型定义: `src/lib/monitoring/types.ts`
- 配置文件: `src/lib/monitoring/config.ts`
