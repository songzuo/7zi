# Analytics Dashboard 实时性能指标

## 概述

为 Analytics Dashboard 添加了实时性能指标展示功能，通过 WebSocket 推送实时数据，提供系统运行状态的实时监控。

**版本**: v1.1.4
**日期**: 2026-03-25

## 功能特性

### 1. WebSocket 连接状态实时显示

**组件**: `RealtimeConnectionStatus`

实时显示 WebSocket 连接状态，包括：

- 连接状态（已连接、连接中、断开、错误、重连中）
- 网络延迟（毫秒）
- 消息收发统计
- 连接时长
- 最后心跳时间
- 重连尝试次数

**功能**：

- 自动重连机制
- 心跳检测
- 手动刷新/重连按钮
- 详细的连接信息面板

### 2. 任务状态分布图表

**组件**: `RealtimeTaskStatusChart`

实时可视化任务状态分布：

- 环形图展示各状态占比
- 6 种状态类型：
  - 已完成 (Completed) - 绿色
  - 进行中 (Running) - 蓝色
  - 待处理 (Pending) - 黄色
  - 失败 (Failed) - 红色
  - 已取消 (Cancelled) - 紫色
  - 已提交 (Submitted) - 青色
- 实时变化指示器
- 状态条进度展示

### 3. 团队工作效率指标

**组件**: `RealtimeTeamEfficiency`

实时监控团队工作状态：

- **核心指标卡片**：
  - 在线代理数
  - 工作中代理数
  - 每小时任务处理量
  - 平均任务时长
  - 任务成功率
  - 系统吞吐量

- **综合效率评分**：
  - 基于成功率、代理利用率、吞吐量计算
  - 0-100 分评分系统
  - 动态颜色指示（绿/黄/红）

- **详细信息面板**：
  - 空闲代理数
  - 队列大小
  - 代理利用率
  - 人均任务处理量

### 4. 实时性能指标

**组件**: `RealtimeMetricsDashboard` (主集成组件)

系统集成性能指标：

- CPU 使用率
- 内存使用率
- 网络延迟
- 每秒请求数
- 活跃连接数
- 错误率

## 技术架构

### 文件结构

```
src/
├── components/analytics/
│   ├── RealtimeConnectionStatus.tsx       # WebSocket 连接状态
│   ├── RealtimeTaskStatusChart.tsx         # 任务状态分布图
│   ├── RealtimeTeamEfficiency.tsx         # 团队效率指标
│   ├── RealtimeMetricsDashboard.tsx       # 主仪表盘组件
│   └── index.ts                           # 组件导出
├── lib/
│   ├── hooks/
│   │   └── useRealtimeAnalytics.ts        # WebSocket Hook
│   └── types/analytics/
│       ├── realtime.ts                    # 实时数据类型定义
│       └── index.ts                       # 类型导出
```

### 核心技术点

#### 1. WebSocket Hook (`useRealtimeAnalytics`)

**功能**：

- 自动连接管理
- 心跳检测和延迟计算
- 自动重连机制（可配置重试次数和间隔）
- 消息类型路由处理
- 历史数据维护（最多 100 个数据点）
- React 状态管理优化（使用 useCallback, useRef）

**配置选项**：

```typescript
interface RealtimeWebSocketConfig {
  url: string // WebSocket 服务器地址
  reconnectInterval?: number // 重连间隔（默认 5000ms）
  maxReconnectAttempts?: number // 最大重连次数（默认 10）
  heartbeatInterval?: number // 心跳间隔（默认 30000ms）
  enabledMetrics?: string[] // 启用的指标类型
}
```

#### 2. 性能优化

- **避免不必要的重渲染**：
  - 使用 `useMemo` 计算派生数据
  - 使用 `useCallback` 稳定化回调函数
  - 使用 `useRef` 存储 WebSocket 实例

- **响应式设计**：
  - CSS Grid 和 Flexbox 布局
  - 移动端优先设计
  - 暗色模式支持（dark mode）

- **动画和过渡**：
  - 平滑的状态变化动画
  - 加载骨架屏
  - 环形图动画过渡

#### 3. 类型安全

完整的 TypeScript 类型定义：

- `WebSocketConnectionMetrics` - 连接状态
- `TaskStatusDistribution` - 任务分布
- `TeamEfficiencyMetrics` - 效率指标
- `RealtimePerformanceMetrics` - 性能指标
- `RealtimeAnalyticsState` - 整体状态

## 使用方法

### 基本使用

```tsx
import { RealtimeMetricsDashboard } from '@/components/analytics'

export function MyDashboard() {
  return (
    <div className="p-6">
      <RealtimeMetricsDashboard
        enabled={true}
        locale="zh"
        wsConfig={{
          url: 'ws://localhost:3001',
          reconnectInterval: 5000,
          maxReconnectAttempts: 10,
        }}
      />
    </div>
  )
}
```

### 单独使用组件

```tsx
import {
  RealtimeConnectionStatus,
  RealtimeTaskStatusChart,
  RealtimeTeamEfficiency,
} from '@/components/analytics'
import { useRealtimeAnalytics } from '@/lib/hooks/useRealtimeAnalytics'

export function CustomDashboard() {
  const { connection, taskDistribution, teamEfficiency, refresh } = useRealtimeAnalytics()

  return (
    <div className="space-y-6">
      <RealtimeConnectionStatus connection={connection} onRefresh={refresh} locale="zh" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RealtimeTaskStatusChart distribution={taskDistribution} locale="zh" />

        <RealtimeTeamEfficiency metrics={teamEfficiency} showDetails={true} locale="zh" />
      </div>
    </div>
  )
}
```

### 配置选项

#### RealtimeMetricsDashboard Props

| 属性                   | 类型           | 默认值  | 说明                 |
| ---------------------- | -------------- | ------- | -------------------- |
| `enabled`              | `boolean`      | `true`  | 是否启用实时功能     |
| `showConnectionStatus` | `boolean`      | `true`  | 是否显示连接状态     |
| `showTaskStatus`       | `boolean`      | `true`  | 是否显示任务状态     |
| `showTeamEfficiency`   | `boolean`      | `true`  | 是否显示团队效率     |
| `locale`               | `'en' \| 'zh'` | `'en'`  | 语言设置             |
| `refreshInterval`      | `number`       | `30000` | 自动刷新间隔（毫秒） |
| `wsConfig`             | `object`       | -       | WebSocket 配置       |

#### RealtimeConnectionStatus Props

| 属性          | 类型                         | 默认值 | 说明             |
| ------------- | ---------------------------- | ------ | ---------------- |
| `connection`  | `WebSocketConnectionMetrics` | -      | 连接状态对象     |
| `onRefresh`   | `function`                   | -      | 刷新回调         |
| `onReconnect` | `function`                   | -      | 重连回调         |
| `showDetails` | `boolean`                    | `true` | 是否显示详细信息 |
| `locale`      | `'en' \| 'zh'`               | `'en'` | 语言设置         |

#### RealtimeTaskStatusChart Props

| 属性           | 类型                             | 默认值 | 说明             |
| -------------- | -------------------------------- | ------ | ---------------- |
| `distribution` | `TaskStatusDistribution \| null` | -      | 任务分布数据     |
| `history`      | `TaskStatusHistoryPoint[]`       | `[]`   | 历史数据         |
| `showHistory`  | `boolean`                        | `true` | 是否显示历史趋势 |
| `showChanges`  | `boolean`                        | `true` | 是否显示变化指示 |
| `locale`       | `'en' \| 'zh'`                   | `'en'` | 语言设置         |
| `height`       | `number`                         | `300`  | 图表高度（像素） |

#### RealtimeTeamEfficiency Props

| 属性          | 类型                            | 默认值 | 说明             |
| ------------- | ------------------------------- | ------ | ---------------- |
| `metrics`     | `TeamEfficiencyMetrics \| null` | -      | 效率指标数据     |
| `showDetails` | `boolean`                       | `true` | 是否显示详细信息 |
| `locale`      | `'en' \| 'zh'`                  | `'en'` | 语言设置         |

## 主题系统兼容性

所有组件完全支持：

- **亮色模式**（默认）
- **暗色模式**（dark mode）
- **Tailwind CSS** 颜色系统
- **自定义主题变量**

颜色类名使用模式：

```css
/* 亮色模式 */
bg-white, text-zinc-900, border-zinc-200

/* 暗色模式 */
dark:bg-zinc-800, dark:text-white, dark:border-zinc-700
```

## 性能考虑

### 1. 数据更新频率

- WebSocket 心跳：30 秒（可配置）
- 实时数据推送：由服务器控制
- 本地刷新间隔：30 秒（可配置）

### 2. 历史数据限制

- 最多保存 100 个历史数据点
- 自动轮询清理旧数据
- 避免内存泄漏

### 3. 渲染优化

- 使用 React.memo（未来可添加）
- 虚拟化列表（大数据集时）
- 节流动画帧（未来可添加）

## WebSocket 协议

### 消息类型

#### 客户端 → 服务器

```json
{
  "type": "subscribe",
  "metrics": ["connection", "task_distribution", "team_efficiency", "performance"]
}
```

```json
{
  "type": "ping",
  "timestamp": "2026-03-25T10:30:00.000Z"
}
```

```json
{
  "type": "refresh",
  "timestamp": "2026-03-25T10:30:00.000Z"
}
```

#### 服务器 → 客户端

**任务状态更新**：

```json
{
  "type": "task_status_update",
  "timestamp": "2026-03-25T10:30:00.000Z",
  "data": {
    "timestamp": "2026-03-25T10:30:00.000Z",
    "statuses": {
      "submitted": 10,
      "running": 25,
      "completed": 150,
      "failed": 5,
      "cancelled": 2,
      "pending": 8
    },
    "changes": [
      { "status": "completed", "delta": 2 },
      { "status": "running", "delta": -1 }
    ]
  }
}
```

**效率指标更新**：

```json
{
  "type": "efficiency_update",
  "timestamp": "2026-03-25T10:30:00.000Z",
  "data": {
    "timestamp": "2026-03-25T10:30:00.000Z",
    "agentsOnline": 12,
    "agentsIdle": 4,
    "agentsWorking": 8,
    "tasksPerHour": 45.5,
    "averageTaskDuration": 120,
    "taskSuccessRate": 95.5,
    "throughput": 500,
    "queueSize": 12
  }
}
```

**性能指标更新**：

```json
{
  "type": "performance_update",
  "timestamp": "2026-03-25T10:30:00.000Z",
  "data": {
    "timestamp": "2026-03-25T10:30:00.000Z",
    "cpuUsage": 45.5,
    "memoryUsage": 62.3,
    "networkLatency": 15,
    "requestsPerSecond": 120,
    "activeConnections": 45,
    "queueLength": 8,
    "errorRate": 0.15
  }
}
```

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

要求支持：

- WebSocket API
- ES6+ JavaScript
- CSS Grid 和 Flexbox

## 未来改进

1. **趋势图表**：添加历史趋势折线图
2. **代理详情**：单个代理的实时状态和性能
3. **告警系统**：基于阈值的实时告警
4. **数据导出**：实时数据导出功能
5. **自定义仪表盘**：用户自定义仪表盘布局
6. **离线模式**：断线时的离线缓存和重连
7. **性能优化**：虚拟化渲染，Web Workers
8. **多语言**：扩展更多语言支持

## 相关文档

- [Analytics Dashboard 主文档](./README.md)
- [WebSocket 协议规范](./WEBSOCKET_PROTOCOL.md)
- [性能优化指南](./PERFORMANCE_OPTIMIZATION.md)
- [组件 API 文档](./COMPONENT_API.md)

## 变更日志

### v1.1.4 (2026-03-25)

- ✅ 添加 WebSocket 连接状态实时显示
- ✅ 添加任务状态分布图表
- ✅ 添加团队工作效率指标
- ✅ 实现实时数据推送功能
- ✅ 完整的类型定义和 TypeScript 支持
- ✅ 响应式设计和暗色模式支持
- ✅ 性能优化（避免不必要重渲染）
- ✅ TypeScript 编译通过（无错误）
- ✅ 添加使用示例代码

## 文件清单

### 新增文件

1. **类型定义** (1 个文件)
   - `/src/lib/types/analytics/realtime.ts` (144 行) - 实时数据类型定义

2. **Hook** (1 个文件)
   - `/src/lib/hooks/useRealtimeAnalytics.ts` (320 行) - WebSocket Hook

3. **组件** (4 个文件)
   - `/src/components/analytics/RealtimeConnectionStatus.tsx` (271 行) - 连接状态组件
   - `/src/components/analytics/RealtimeTaskStatusChart.tsx` (300 行) - 任务状态图表
   - `/src/components/analytics/RealtimeTeamEfficiency.tsx` (381 行) - 团队效率组件
   - `/src/components/analytics/RealtimeMetricsDashboard.tsx` (222 行) - 主仪表盘组件

4. **文档和示例** (2 个文件)
   - `/ANALYTICS_REALTIME_METRICS.md` (427 行) - 功能文档
   - `/src/components/analytics/examples/RealtimeUsageExample.tsx` (207 行) - 使用示例

### 修改文件

1. **组件导出**
   - `/src/components/analytics/index.ts` - 添加实时组件导出

2. **类型导出**
   - `/src/lib/types/analytics/index.ts` - 添加实时类型导出

3. **修复现有代码**
   - `/src/hooks/useWebSocket.ts` - 修复 logger 引用错误

### 代码统计

- **总代码行数**: 2065 行
- **TypeScript 文件**: 6 个
- **组件文件**: 4 个
- **示例文件**: 1 个
- **文档**: 1 个

## 技术亮点

1. **完整的类型安全**: 所有组件和 Hook 都有完整的 TypeScript 类型定义
2. **性能优化**: 使用 useMemo、useCallback、useRef 避免不必要的重渲染
3. **响应式设计**: 支持移动端、平板和桌面端，完全响应式布局
4. **暗色模式**: 完整支持亮色和暗色主题
5. **国际化**: 支持中文和英文双语
6. **自动重连**: 内置 WebSocket 自动重连机制
7. **心跳检测**: 定期心跳检测，监控连接质量
8. **历史数据**: 自动维护历史数据（最多 100 个数据点）

## 测试状态

- ✅ TypeScript 编译通过
- ⏳ 单元测试（待添加）
- ⏳ 集成测试（待添加）
- ⏳ E2E 测试（待添加）

---

**维护者**: Executor
**审核状态**: ✅ 已实现
**测试状态**: ⏳ 待测试
