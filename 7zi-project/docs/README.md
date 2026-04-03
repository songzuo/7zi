# 7zi 项目文档中心

**版本**: v1.10.1  
**最后更新**: 2026-04-03

---

## 📚 文档目录

### 核心模块文档

| 文档 | 描述 | 更新日期 |
|------|------|----------|
| [Multi-Agent Orchestrator](./multi-agent-orchestrator.md) | 多智能体协作编排器 | 2026-04-03 |
| [Performance Monitoring](./performance-monitoring.md) | 性能监控与异常检测 | 2026-04-03 |
| [v1.11 Roadmap](./v111_ROADMAP.md) | v1.11 版本规划 | 2026-04-03 |

### 分析报告

| 文档 | 描述 | 更新日期 |
|------|------|----------|
| [UI/UX 分析报告](./ui-ux-analysis.md) | 前端界面设计分析 | 2026-03-30 |
| [竞品分析报告](./competitor-analysis.md) | 7-Zip 等竞品分析 | 2026-03-30 |
| [SSL 检查报告](./ssl-check-report.md) | SSL 证书状态检查 | 2026-03-30 |

---

## 🏗️ 模块架构

```
src/lib/
├── a2a/                    # Agent-to-Agent 通信协议
│   ├── A2AProtocol.ts      # 协议核心实现
│   ├── A2AClient.ts        # 客户端
│   └── A2AServer.ts        # 服务端
│
├── agents/                 # 智能体管理
│   └── AgentRegistry.ts    # 智能体注册表
│
├── multi-agent/            # 多智能体编排 ✨ 新模块
│   ├── MultiAgentOrchestrator.ts
│   └── README.md
│
├── performance/            # 性能监控 ✨ 新模块
│   ├── incremental-anomaly-detector.ts
│   ├── alerting/
│   │   └── channels/
│   │       └── slack-enhanced.ts
│   └── README.md
│
├── monitoring/             # 基础监控
│   └── monitor.ts
│
└── utils/                  # 工具函数
    └── formatting.ts
```

---

## 🚀 快速导航

### 新功能模块

#### Multi-Agent Orchestrator

多智能体协作编排器，支持并行执行、串行工作流、动态分配。

```typescript
import { MultiAgentOrchestrator } from '@/lib/multi-agent'

const orchestrator = new MultiAgentOrchestrator()
await orchestrator.executeParallel(agents, task)
```

📖 [完整文档](./multi-agent-orchestrator.md) | [API 参考](../src/lib/multi-agent/README.md)

#### Performance Monitoring

增量式异常检测和智能告警系统。

```typescript
import { StreamingAnomalyDetector } from '@/lib/performance'

const detector = new StreamingAnomalyDetector()
const result = detector.detect(value)
```

📖 [完整文档](./performance-monitoring.md) | [API 参考](../src/lib/performance/README.md)

---

## 📋 开发指南

### 文档编写规范

1. **中英双语** - 关键术语提供中英文对照
2. **代码示例** - 每个功能提供可运行的示例
3. **API 文档** - 类型定义和参数说明
4. **更新日期** - 文档顶部标注最后更新日期

### 模块 README 规范

每个模块目录应包含 `README.md`，内容结构：

```
1. 概述 / Overview
2. 快速开始 / Quick Start
3. 核心 API / Core API
4. 类型定义 / Type Definitions
5. 使用场景 / Use Cases
6. 性能考虑 / Performance
7. 测试 / Testing
```

---

## 🔗 相关链接

- [项目主 README](../README.md)
- [变更日志](../CHANGELOG.md)
- [部署指南](../DEPLOYMENT.md)

---

*维护者: 🎨 设计师 + 📺 媒体*