# Architecture Decision Records (ADR)

本目录记录了项目的重要架构决策。每个 ADR 包含决策的背景、理由、权衡和后果。

## ADR 索引

| ADR | 标题 | 状态 | 日期 | 关联功能 |
|-----|------|------|------|---------|
| 0001 | 使用 Zustand 进行状态管理 | Accepted | 2026-01-15 | 全局状态 |
| 0002 | 使用 Socket.IO 实现 WebSocket | Accepted | 2026-02-01 | 实时通信 |
| 0003 | 使用 Redis 进行缓存 | Accepted | 2026-02-15 | 性能优化 |
| 0004 | 启用 TypeScript Strict Mode | Accepted | 2026-03-01 | 类型安全 |
| 0005 | 使用 Vitest 作为测试框架 | Accepted | 2026-03-10 | 测试 |
| 0006 | Agent Scheduler 架构 | Accepted | 2026-03-29 | AI Agent 调度 |
| 0007 | 性能监控架构 | Accepted | 2026-03-29 | 性能监控 |
| 0008 | WebSocket 房间系统设计 | Accepted | 2026-03-29 | WebSocket 高级功能 |
| 0009 | React Compiler 采用策略 | Accepted | 2026-03-29 | 性能优化 |

## ADR 模板

每个 ADR 遵循以下结构：

```markdown
# ADR-XXXX: [标题]

## 状态
Proposed / Accepted / Deprecated / Superseded

## 上下文
描述做出决策的背景和问题。

## 决策
描述实际采取的决策和实现方案。

## 权衡
描述考虑的替代方案及其优缺点。

## 后果
描述决策的后果，包括正面和负面影响。

## 相关决策
列出关联的其他 ADR。
```

## 如何添加新的 ADR

1. **创建新文件**：使用 `docs/adr/YYYY-MM-DD-title.md` 格式
2. **确定编号**：使用下一个可用的四位编号（如 0010）
3. **填写内容**：遵循 ADR 模板
4. **更新索引**：在本 README 中添加新 ADR 的索引条目
5. **关联决策**：如有相关 ADR，在"相关决策"部分列出

## ADR 状态流转

```
Proposed → Accepted → [Deprecated | Superseded]
```

- **Proposed**: 提案阶段，待讨论和批准
- **Accepted**: 已接受并实施
- **Deprecated**: 已废弃但未替换
- **Superseded**: 已被新的 ADR 替换

## 参考资源

- [Michael Nygard's ADR Template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://adr.github.io/)
- [Architecture Decision Records in Practice](https://www.thoughtworks.com/radar/techniques/practices/architecture-decision-records)

## v1.4.0 核心架构决策

以下 ADR 记录了 v1.4.0 的核心架构决策：

- **ADR-0006**: AI Agent 智能调度系统的架构设计
- **ADR-0007**: 性能监控升级的技术选型
- **ADR-0008**: WebSocket 房间系统的设计决策
- **ADR-0009**: React Compiler 作为可选功能的采用策略

这些决策为 v1.4.0 的重要功能提供了架构基础，并考虑了长期可维护性和扩展性。
