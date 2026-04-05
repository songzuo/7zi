# 7zi 组件库文档 (v1.13.0)

## 📦 概述

7zi 项目组件库提供了丰富的 React 组件，用于构建企业级前端应用。本文档涵盖 v1.13.0 版本的新增和更新组件。

## 🏗️ 组件分类

### 核心功能组件

| 分类 | 组件数 | 状态 |
|------|--------|------|
| **工作流 (Workflow)** | 18 | ✅ |
| **监控 (Monitoring)** | 2 | ✅ |
| **错误处理 (Errors)** | 4 | ✅ |
| **权限管理 (Permissions)** | 1 | ✅ |

## 📊 组件统计

### v1.13.0 新增/更新组件

| 组件名 | 类型 | 版本 | 说明 |
|--------|------|------|------|
| WorkflowCanvas.enhanced | 工作流 | v1.12.3 | 增强版画布（拖拽支持） |
| NodePalette | 工作流 | v1.12.3 | 节点面板 |
| NodeContextMenu | 工作流 | v1.12.3 | 右键菜单 |
| WorkflowToolbar | 工作流 | v1.12.3 | 工具栏 |
| QuickTaskModal | 工作流 | v1.13.0 | 快速任务创建 |
| TaskCreationChat | 工作流 | v1.13.0 | 对话式任务创建 |
| TaskPreviewPanel | 工作流 | v1.13.0 | 任务预览面板 |
| MetricsDashboard | 监控 | v1.13.0 | 监控指标仪表板 |
| PerformanceDashboard | 监控 | v1.13.0 | 性能监控仪表板 |
| error-utils | 错误处理 | v1.13.0 | 错误分析工具函数 |
| PermissionManagementDashboard | 权限 | v1.12.0 | 权限管理界面 |

**总计**: 11 个组件

## 📚 详细文档

点击查看各分类的详细文档：

- [📄 工作流组件文档](./workflow.md) - Workflow 相关组件（18 个）
- [📄 监控组件文档](./monitoring.md) - 监控仪表板组件（2 个）
- [📄 错误处理组件文档](./errors.md) - 错误处理组件（4 个）
- [📄 权限管理组件文档](./permissions.md) - 权限管理组件（1 个）

## 🚀 快速开始

### 基础使用

```tsx
import { WorkflowEditorEnhanced } from '@/components/workflow'
import { MetricsDashboard } from '@/components/monitoring'

function App() {
  return (
    <div className="app-container">
      <WorkflowEditorEnhanced
        initialWorkflow={workflow}
        onChange={handleChange}
        onSave={handleSave}
      />
      <MetricsDashboard />
    </div>
  )
}
```

## 📖 使用示例统计

| 分类 | 示例数量 |
|------|----------|
| 工作流组件 | 12 |
| 监控组件 | 4 |
| 错误处理组件 | 3 |
| 权限管理组件 | 2 |
| **总计** | **21** |

## ⚠️ 注意事项

1. **工作流组件**
   - 使用 HTML5 Drag and Drop API，无需外部依赖
   - 支持无限画布（平移、缩放）
   - 条件节点支持 YES/NO 分支

2. **监控组件**
   - 使用 WebSocket 实时更新
   - 需要后端 API 支持
   - 支持告警通知

3. **错误处理组件**
   - 提供统一的错误类型分析
   - 支持中英文错误消息
   - 自动错误恢复建议

4. **权限管理组件**
   - 基于 RBAC v2.0 模型
   - 支持细粒度权限控制
   - 完整的审计日志

## 🔗 相关资源

- [主项目 README](../../README.md)
- [变更日志](../../CHANGELOG.md)
- [类型定义](../../types/)
- [组件测试](../../src/components/__tests__/)

## 📄 许可证

MIT

---

**文档版本**: v1.13.0
**更新日期**: 2026-04-05
