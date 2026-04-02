# AgentStatusPanel 组件文档

## 概述

AgentStatusPanel 是一个用于实时监控所有 AI Agent 运行状态的 Dashboard 组件。

## 功能特性

### ✅ 核心功能

1. **实时状态展示** - 显示所有 11 位 Agent 的状态（可用/忙碌/离线）
2. **负载可视化** - 显示每个 Agent 的当前负载 (0-100%)
3. **能力雷达图** - 展示 Agent 的能力评分（点击展开）
4. **角色筛选** - 支持按角色筛选（架构师/Executor/测试员等）
5. **自动刷新** - 每 30 秒自动更新数据
6. **响应式设计** - 支持移动端和桌面端

### 📊 Agent 能力雷达图

雷达图展示 6 个维度：

- 并发能力
- 成功率
- 响应速度
- 技术栈
- 任务类型
- 负载均衡

### 🎨 UI 组件

- **StatusIndicator** - 状态指示灯（绿色=可用，黄色=忙碌，红色=离线）
- **LoadBar** - 负载进度条（动态颜色变化）
- **AgentCard** - Agent 卡片（包含所有信息）
- **StatisticsSummary** - 统计摘要（总览数据）

## 使用方法

```tsx
import { AgentStatusPanel } from '@/lib/agent-scheduler/dashboard/AgentStatusPanel'

export default function DashboardPage() {
  return (
    <div>
      <AgentStatusPanel />
    </div>
  )
}
```

## 数据源

组件从 Zustand store (`scheduler-store`) 获取数据：

- `agents` - 所有 Agent 列表
- `tasks` - 所有任务列表
- `isLoading` - 加载状态
- `initialize()` - 初始化调度器
- `refresh()` - 刷新数据

## 11 位 Agent

| Agent ID       | 名称           | 角色               | Emoji |
| -------------- | -------------- | ------------------ | ----- |
| `agent-expert` | 智能体世界专家 | 视角转换、未来布局 | 🌟    |
| `consultant`   | 咨询师         | 研究分析           | 📚    |
| `architect`    | 架构师         | 架构设计           | 🏗️    |
| `executor`     | Executor       | 执行实现           | ⚡    |
| `sysadmin`     | 系统管理员     | 运维部署           | 🛡️    |
| `tester`       | 测试员         | 测试调试           | 🧪    |
| `designer`     | 设计师         | UI设计             | 🎨    |
| `promoter`     | 推广专员       | 推广SEO            | 📣    |
| `sales`        | 销售客服       | 销售客服           | 💼    |
| `finance`      | 财务           | 财务会计           | 💰    |
| `media`        | 媒体           | 媒体宣传           | 📺    |

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式
- **Recharts** - 雷达图可视化
- **Zustand** - 状态管理
- **Lucide React** - 图标库

## 测试

组件包含完整的单元测试：

```bash
npm test -- src/lib/agent-scheduler/dashboard/AgentStatusPanel.spec.tsx
```

**测试覆盖**:

- 组件渲染
- 统计摘要显示
- 筛选下拉框
- 刷新按钮
- 初始化调用
- 刷新功能

## 文件位置

- **组件**: `src/lib/agent-scheduler/dashboard/AgentStatusPanel.tsx`
- **测试**: `src/lib/agent-scheduler/dashboard/AgentStatusPanel.spec.tsx`
- **文档**: `src/lib/agent-scheduler/dashboard/README.md`

## 验收标准

- [x] 展示所有 11 位 Agent
- [x] 实时负载显示
- [x] 按角色筛选功能
- [x] 雷达图展示能力
- [x] 响应式布局
- [x] 无 console error
- [x] 测试全部通过
- [x] TypeScript 类型检查通过

## 下一步

根据 V140_PLANNING_20260329.md，接下来的任务是：

- Day 6: 开发 `TaskQueueView.tsx` - 任务队列视图
- Day 7: 性能监控异常检测启动

## 作者

🎨 设计师 - v1.4.0 Sprint 1 Day 5

**完成时间**: 2026-03-29
