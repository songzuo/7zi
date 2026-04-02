# 文档侧边栏配置

此文件定义文档导航的侧边栏结构。

---

## 侧边栏结构

```yaml
docs:
  - "📖 介绍":
    - "README.md"
    - "CHANGELOG.md"

  - "🚀 快速开始":
    - "QUICKSTART.md"
    - "DEPLOYMENT.md"

  - "🏗️ 架构设计":
    - "ARCHITECTURE.md"
    - "ARCHITECTURE_DIAGRAMS.md"
    - "ARCHITECTURE_REVIEW.md"
    - "microservice-design.md"
    - "mcp-server-architecture.md"
    - "ADR/README.md"

  - "📡 API 文档":
    - "API.md"
    - "api/ratings.md"
    - "api/search.md"
    - "api/websocket.md"
    - "api/agent-scheduler.md"
    - "API-REFERENCE.md"
    - "REST-API.md"

  - "🧩 组件文档":
    - "COMPONENTS.md"
    - "HOOKS.md"
    - "PAGE-STRUCTURE.md"

  - "🎨 设计与优化":
    - "DESIGN_OPTIMIZATION.md"
    - "PERFORMANCE.md"
    - "PERFORMANCE_OPTIMIZATION.md"
    - "PERFORMANCE_AUDIT.md"

  - "🔄 通信与集成":
    - "WEBSOCKET.md"
    - "LOADING-SYSTEM.md"
    - "GITHUB-INTEGRATION.md"
    - "GMAIL-INTEGRATION.md"
    - "TELEGRAM-BOT.md"

  - "🤖 AI 与代理系统":
    - "DIRECTOR.md"
    - "SUBAGENTS.md"
    - "TEAM-MEETING.md"

  - "🧪 测试与开发":
    - "TESTING.md"
    - "DEVELOPMENT.md"
    - "CODE_STYLE.md"
    - "ERROR-HANDLING.md"
    - "E2E_TESTING_STRATEGY.md"

  - "🔒 安全与运维":
    - "SECURITY-AUDIT-REPORT.md"
    - "MONITORING.md"
    - "MONITORING_DESIGN.md"
    - "OPERATIONS_MANUAL.md"
    - "PERMISSIONS.md"
    - "RBAC_IMPLEMENTATION.md"

  - "📦 部署与 CI/CD":
    - "DEPLOYMENT-GUIDE.md"
    - "CI-CD-SETUP.md"
    "ENVIRONMENT.md"
    - "ENVIRONMENT-VARIABLES.md"

  - "🌍 国际化与本地化":
    - "I18N.md"
    - "I18N_ARCHITECTURE.md"

  - "📊 监控与分析":
    - "ANALYTICS_DASHBOARD.md"
    - "NOTIFICATION_SYSTEM.md"

  - "🎯 专项功能":
    - "SEARCH-ENHANCEMENT.md"
    - "ANIMATED_PROGRESS_BAR.md"
    - "LOADING-SYSTEM.md"

  - "🎨 UI/UX":
    - "RESPONSIVE_IMPLEMENTATION_GUIDE.md"
    - "RESPONSIVE_OPTIMIZATION_REPORT.md"
    - "UI_REVIEW.md"
    - "UX-ANALYSIS.md"

  - "📊 数据库优化":
    - "DATABASE_OPTIMIZATIONS.md"
    - "DATABASE_OPTIMIZATION_IMPLEMENTATION_GUIDE.md"

  - "🔄 状态管理":
    - "state-management-analysis-detailed.md"
    - "STATE_MANAGEMENT_MIGRATION.md"

  - "🛣️ 路线图":
    - "ROADMAP.md"
    - "feature-roadmap.md"
    - "future-roadmap.md"
    - "tech-evolution.md"

  - "📊 分析与报告":
    - "COMPETITION_ANALYSIS.md"
    - "COMPETITOR_ANALYSIS.md"
    - "PROJECT_SUMMARY.md"
    - "TECH_DEBT.md"
    - "PORTFOLIO_OPTIMIZATION_REPORT.md"
    - "WEB_VITALS_IMPLEMENTATION_SUMMARY.md"
    - "WEB_VITALS_OPTIMIZATION.md"
    - "VERIFICATION_REPORT.md"

  - "🔐 错误处理与安全":
    - "ERROR-IMPLEMENTATION-SUMMARY.md"
    - "ERROR_HANDLING_REVIEW.md"
    - "ERROR_HANDLING_GUIDE_COMPLETION_REPORT.md"
    - "PERFORMANCE-OPTIMIZATION-REPORT.md"
    - "XLSX_VULNERABILITY_ASSESSMENT.md"
    - "CSP_CONFIGURATION_GUIDE.md"
    - "CSP_IMPLEMENTATION_REPORT.md"

  - "📖 示例与参考":
    - "EXAMPLES.md"
    - "FEATURES.md"
    - "SCRIPTS.md"

  - "🌐 其他":
    - "API_QUICK_REFERENCE.ts"
    - "API_STRUCTURE_DIAGRAM.ts"
    - "ARCHITECTURE_SUMMARY.md"
    - "API_REFACTORING.md"
    - "API_REFACTORING_SUMMARY.md"
    - "ALERT_RULES.yaml"
    - "CACHE_CONFIG.md"
    - "REDIS_CLIENT.md"
    - "SERVERS.md"
    - "SSH-SETUP.md"
    - "SSH-TROUBLESHOOTING.md"
    - "dependency-audit.md"

  - "🔄 WebSocket 相关":
    - "WEBSOCKET.md"
    - "WEBSOCKET_TESTING_GUIDE.md"
    - "WEBSOCKET_UI_INTEGRATION.md"
    - "websocket-integration.md"
    - "websocket-status.md"
    - "websocket-implementation-summary.md"
```

---

## 使用方式

### VitePress

在 `.vitepress/config.ts` 中使用：

```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  themeConfig: {
    sidebar: [
      {
        text: '介绍',
        items: [
          { text: '项目介绍', link: '/README.md' },
          { text: '变更日志', link: '/CHANGELOG.md' },
        ],
      },
      {
        text: 'API 文档',
        items: [
          { text: 'API 完整文档', link: '/API.md' },
          { text: '评分 API', link: '/api/ratings.md' },
          { text: '搜索 API', link: '/api/search.md' },
          { text: 'WebSocket API', link: '/api/websocket.md' },
          { text: 'Agent 调度系统', link: '/api/agent-scheduler.md' },
        ],
      },
      // ... 其他分组
    ],
  },
})
```

### Docusaurus

在 `sidebars.js` 中使用：

```javascript
module.exports = {
  someSidebar: [
    'intro',
    {
      type: 'category',
      label: 'API 文档',
      items: ['API', 'api/ratings', 'api/search', 'api/websocket', 'api/agent-scheduler'],
    },
    // ... 其他分组
  ],
}
```

### Docsify

在 `index.html` 中使用：

```html
<script>
  window.$docsify = {
    loadSidebar: true,
    subMaxLevel: 2,
    auto2top: true,
  }
</script>
<script src="//unpkg.com/docsify-sidebar-collapse/dist/docsify-sidebar-collapse.min.js"></script>
```

创建 `_sidebar.md` 文件：

```markdown
- 介绍
  - [项目介绍](README.md)
  - [变更日志](CHANGELOG.md)

- API 文档
  - [API 完整文档](API.md)
  - [评分 API](api/ratings.md)
  - [搜索 API](api/search.md)
  - [WebSocket API](api/websocket.md)
  - [Agent 调度系统](api/agent-scheduler.md)
```

---

## 图标说明

| 图标 | 用途           |
| ---- | -------------- |
| 📖   | 介绍和概览     |
| 🚀   | 快速开始和入门 |
| 🏗️   | 架构和设计     |
| 📡   | API 和通信     |
| 🧩   | 组件和模块     |
| 🎨   | 设计和优化     |
| 🔄   | 通信和集成     |
| 🤖   | AI 和代理系统  |
| 🧪   | 测试和开发     |
| 🔒   | 安全和运维     |
| 📦   | 部署和 CI/CD   |
| 🌍   | 国际化         |
| 📊   | 监控和分析     |
| 🎯   | 专项功能       |
| 🛣️   | 路线图         |
| 🌐   | 其他文档       |

---

## 分组说明

### 介绍 (📖)

项目概述、快速了解项目

### 快速开始 (🚀)

快速部署、环境配置

### 架构设计 (🏗️)

系统架构、设计决策、架构图

### API 文档 (📡)

所有 API 相关文档

### 组件文档 (🧩)

React 组件库、自定义 Hooks

### 设计与优化 (🎨)

设计指南、性能优化

### 通信与集成 (🚀)

实时通信、第三方集成

### AI 与代理系统 (🤖)

AI 主管、子代理系统

### 测试与开发 (🧪)

测试策略、开发指南

### 安全与运维 (🔒)

安全审计、监控、运维

### 部署与 CI/CD (📦)

部署配置、CI/CD 流程

### 国际化与本地化 (🌍)

多语言支持

### 监控与分析 (📊)

监控仪表板、数据分析

### 专项功能 (🎯)

特定功能的详细文档

### UI/UX (🎨)

用户体验、响应式设计

### 数据库优化 (📊)

数据库性能、查询优化

### 状态管理 (🔄)

Zustand、状态迁移

### 路线图 (🛣️)

功能规划、技术演进

### 分析与报告 (📊)

竞品分析、技术债务

### 错误处理与安全 (🔐)

错误处理、安全配置

### 示例与参考 (📖)

代码示例、参考文档

### 其他 (🌐)

未分类的其他文档

---

## 维护说明

1. **添加新文档**: 在相应的分组下添加新条目
2. **移动文档**: 使用新的分组名称
3. **删除文档**: 移除对应的条目
4. **更新链接**: 确保所有链接正确指向实际文件

---

**维护者**: 📚 咨询师 (AI 团队)
**最后更新**: 2026-03-29
