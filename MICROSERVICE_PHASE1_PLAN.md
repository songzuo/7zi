# 7zi 微服务迁移第一阶段计划

**文档版本**: v1.0  
**创建日期**: 2026-10-21  
**架构师**: 🏗️ 架构师  
**计划周期**: 2-4 周  
**目标**: 将核心模块拆分为独立可部署服务

---

## 1. 执行摘要

### 1.1 当前架构状态

```
┌─────────────────────────────────────────────────────────────┐
│                      7zi 单体应用                            │
├─────────────────────────────────────────────────────────────┤
│  Next.js Frontend (TypeScript Strict)                       │
│  ├── /app/api/* (40+ API Routes)                           │
│  ├── /lib/* (43 个模块目录)                                 │
│  └── 依赖: WebSocket Client, Workflow Engine                │
├─────────────────────────────────────────────────────────────┤
│  7zi-backend (Plain JavaScript)                             │
│  ├── websocket-server.js (774行) — Socket.IO 服务           │
│  └── workflow-engine/server.js (521行) — 工作流引擎         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Phase 1 目标
> **进度更新 (2026-10-21)**: WebSocket Service 目录结构已创建，代码提取完成 ✅

| 优先级 | 服务名称 | 拆分原因 | 预期收益 | 状态 |
|--------|----------|----------|----------|------|
| P0 | **WebSocket Service** | 已经是独立进程，可正式拆分 | 独立扩缩容、独立部署 | 🟡 进行中 |
| P0 | **Workflow Engine Service** | CPU 密集型，独立部署便于资源隔离 | 更好的性能和稳定性 | ⬜ 等待中 |
| P1 | **Analytics Service** | 数据压力大，报表查询影响主业务 | 读写分离、查询性能提升 | ⬜ 等待中 |

将以下模块从单体中拆分为独立服务：

| 优先级 | 服务名称 | 拆分原因 | 预期收益 |
|--------|----------|----------|----------|
| P0 | **WebSocket Service** | 已经是独立进程，可正式拆分 | 独立扩缩容、独立部署 |
| P0 | **Workflow Engine Service** | CPU 密集型，独立部署便于资源隔离 | 更好的性能和稳定性 |
| P1 | **Analytics Service** | 数据压力大，报表查询影响主业务 | 读写分离、查询性能提升 |

---

## 2. 技术债务分析

### 2.1 从 TECH_DEBT_REVIEW_20261021.md 识别的关键问题

| 优先级 | 问题 | 影响 | 关联服务 |
|--------|------|------|----------|
| P0 | JWT Secret 硬编码 `demo-secret-key` | 安全风险 | WebSocket Service |
| P0 | better-sqlite3 客户端打包 | 构建/运行时错误 | Database Layer |
| P0 | nodemailer 客户端打包 | SMTP 凭据暴露 | Email Service |
| P1 | 大文件单体问题 (automation-engine.ts 1236行) | 可维护性差 | Workflow Service |
| P1 | 两个 WebSocket 实现 | 重复维护 | WebSocket Service |
| P1 | 后端无 TypeScript | 类型安全缺失 | All Backend |

### 2.2 从 ARCHITECTURE_IMPROVEMENT_PLAN_P0.md 识别的循环依赖

| 模块 | 循环依赖数 | 解决方案 |
|------|-----------|----------|
| `db/` | 5 | 移除 barrel export，显式导入 |
| `monitoring/` | 1 | 分离 React hooks 到独立目录 |

---

## 3. Phase 1 服务边界设计

### 3.1 服务边界图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              7zi 微服务架构 (Phase 1)                          │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   Frontend   │    │  API Gateway │    │   Analytics  │    │  Notification│
  │  (Next.js)   │    │   (Next.js)  │    │   Service    │    │   Service    │
  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
         │                   │                   │                   │
         │    REST/WebSocket │                   │    REST/WebSocket │
         ▼                   ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Service Mesh (内部通信)                          │
│                    HTTP/REST + WebSocket + gRPC (未来)                       │
└─────────────────────────────────────────────────────────────────────────────┘
         │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  WebSocket   │    │   Workflow   │    │  PostgreSQL  │
│   Service    │    │   Engine     │    │  + Redis     │
│  (Node.js)   │    │  (Node.js)   │    │  (Shared)    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 3.2 服务详细规格

#### 3.2.1 WebSocket Service

**当前状态**: `7zi-backend/websocket/websocket-server.js` (独立进程)

**拆分理由**:
- 已独立运行，只是共享代码库
- 实时通信负载与 API 负载模式不同
- 需要独立的扩缩容策略

**API 契约**:

```typescript
// WebSocket Service API
interface WebSocketServiceAPI {
  // 连接管理
  'connection:authenticate': (token: string) => Promise<User>;
  'connection:disconnect': () => void;
  
  // 房间管理
  'room:join': (roomId: string) => Promise<RoomState>;
  'room:leave': (roomId: string) => void;
  'room:state': () => RoomState;
  
  // 实时协作
  'collab:cursor': (data: CursorData) => void;
  'collab:operation': (data: OTOperation) => void;
  'collab:typing': (data: TypingIndicator) => void;
  
  // 用户状态
  'presence:update': (data: PresenceData) => void;
  'presence:list': () => UserPresence[];
}

// HTTP API
POST   /api/v1/ws/rooms          // 创建房间
GET    /api/v1/ws/rooms/:id      // 获取房间状态
DELETE /api/v1/ws/rooms/:id      // 删除房间
GET    /api/v1/ws/health         // 健康检查
GET    /api/v1/ws/metrics        // 实时指标
```

**数据模型**:

```typescript
interface Room {
  id: string;
  name: string;
  type: 'meeting' | 'document' | 'collaboration';
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

interface UserPresence {
  userId: string;
  roomId: string;
  status: 'active' | 'idle' | 'away';
  cursor?: { x: number; y: number };
  lastSeen: Date;
}
```

**部署配置**:

```yaml
# docker-compose.ws-service.yml
services:
  websocket-service:
    build:
      context: ./services/websocket
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - LOG_LEVEL=${WS_LOG_LEVEL}
    depends_on:
      - redis
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/api/v1/ws/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 3.2.2 Workflow Engine Service

**当前状态**: `7zi-backend/workflow-engine/server.js` (独立进程)

**拆分理由**:
- CPU 密集型任务（工作流执行）
- 与 API 服务资源竞争
- 需要独立的状态管理和错误恢复

**API 契约**:

```typescript
// Workflow Engine Service API
interface WorkflowEngineAPI {
  // 工作流管理
  'workflow:create': (definition: WorkflowDefinition) => Promise<WorkflowInstance>;
  'workflow:execute': (instanceId: string, trigger: TriggerData) => Promise<ExecutionResult>;
  'workflow:pause': (instanceId: string) => void;
  'workflow:resume': (instanceId: string) => void;
  'workflow:cancel': (instanceId: string) => void;
  'workflow:status': (instanceId: string) => WorkflowStatus;
  
  // 执行历史
  'execution:history': (workflowId: string, limit?: number) => ExecutionRecord[];
  'execution:logs': (instanceId: string) => LogEntry[];
  
  // 节点操作
  'node:execute': (instanceId: string, nodeId: string) => Promise<NodeResult>;
  'node:skip': (instanceId: string, nodeId: string) => void;
}

// HTTP API
POST   /api/v1/workflow/definitions        // 创建工作流定义
GET    /api/v1/workflow/definitions/:id    // 获取定义
POST   /api/v1/workflow/instances          // 创建实例
GET    /api/v1/workflow/instances/:id      // 获取实例状态
POST   /api/v1/workflow/instances/:id/execute  // 触发执行
GET    /api/v1/workflow/instances/:id/history  // 执行历史
DELETE /api/v1/workflow/instances/:id      // 取消实例
GET    /api/v1/workflow/health             // 健康检查
GET    /api/v1/workflow/metrics            // 执行指标
```

**数据模型**:

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: VariableDefinition[];
  triggers: TriggerDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionVersion: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentNodeId: string | null;
  variables: Record<string, unknown>;
  executionHistory: ExecutionRecord[];
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

interface WorkflowNode {
  id: string;
  type: 'task' | 'condition' | 'parallel' | 'loop' | 'subworkflow';
  config: NodeConfig;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}
```

**部署配置**:

```yaml
# docker-compose.workflow-service.yml
services:
  workflow-service:
    build:
      context: ./services/workflow
      dockerfile: Dockerfile
    ports:
      - "3003:3003"
    environment:
      - PORT=3003
      - DATABASE_URL=postgresql://user:pass@postgres:5432/workflow
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/api/v1/workflow/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 3.2.3 Analytics Service

**当前状态**: Next.js API Routes (`/app/api/analytics/*`, `/app/api/reports/*`)

**拆分理由**:
- 数据密集型查询，影响 API 响应时间
- 需要独立的数据库连接池
- 报表生成是 CPU/IO 密集型
- 可以实现读写分离

**API 契约**:

```typescript
// Analytics Service API
interface AnalyticsAPI {
  // 实时指标
  'analytics:realtime': (metric: string) => MetricValue;
  'analytics:batch': (metrics: string[]) => Record<string, MetricValue>;
  
  // 历史数据
  'analytics:query': (params: QueryParams) => QueryResult;
  'analytics:aggregate': (params: AggregateParams) => AggregateResult;
  
  // 报表
  'report:generate': (reportId: string, params: ReportParams) => Promise<Report>;
  'report:download': (reportId: string, format: 'pdf' | 'excel' | 'csv') => Buffer;
}

// HTTP API
GET    /api/v1/analytics/events              // 事件分析
GET    /api/v1/analytics/funnels             // 漏斗分析
GET    /api/v1/analytics/retention           // 留存分析
GET    /api/v1/analytics/realtime            // 实时指标
POST   /api/v1/analytics/query               // 自定义查询
GET    /api/v1/reports/:id                   // 获取报表
POST   /api/v1/reports/:id/generate          // 生成报表
GET    /api/v1/reports/:id/download          // 下载报表
GET    /api/v1/analytics/health              // 健康检查
GET    /api/v1/analytics/metrics             // 服务指标
```

**数据模型**:

```typescript
interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId: string | null;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  metadata: {
    userAgent: string;
    ip: string;
    country: string;
  };
}

interface Report {
  id: string;
  name: string;
  type: 'funnel' | 'cohort' | 'retention' | 'custom';
  parameters: ReportParameters;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  createdAt: Date;
  completedAt: Date | null;
  dataUrl: string | null;
}
```

**部署配置**:

```yaml
# docker-compose.analytics-service.yml
services:
  analytics-service:
    build:
      context: ./services/analytics
      dockerfile: Dockerfile
    ports:
      - "3004:3004"
    environment:
      - PORT=3004
      - DATABASE_URL=postgresql://user:pass@postgres:5432/analytics
      - CACHE_URL=redis://redis:6379
      - REPORT_STORAGE=/data/reports
    depends_on:
      - postgres
      - redis
    volumes:
      - report-data:/data/reports
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 4. 迁移路线图

### 4.1 周计划 (2-4 周)

```
Week 1: 基础设施准备
├── Day 1-2: 创建服务仓库结构
│   ├── services/
│   │   ├── websocket-service/
│   │   ├── workflow-service/
│   │   └── analytics-service/
│   └── 统一的基础设施配置
├── Day 3-4: WebSocket Service 拆分
│   ├── 提取 websocket-server.js 到独立服务
│   ├── 添加 TypeScript
│   ├── 修复 JWT Secret 硬编码问题 (P0)
│   └── 编写单元测试
└── Day 5: WebSocket Service 部署验证
    ├── Docker 镜像构建
    ├── 部署到测试环境
    └── 集成测试

Week 2: Workflow Engine 拆分
├── Day 1-2: Workflow Service 拆分
│   ├── 提取 workflow-engine 到独立服务
│   ├── 添加 TypeScript
│   ├── 拆分大文件 (automation-engine.ts)
│   └── 修复循环依赖
├── Day 3-4: Workflow Service 测试
│   ├── 单元测试补充
│   ├── 集成测试
│   └── 性能基准测试
└── Day 5: Workflow Service 部署验证

Week 3: Analytics Service 拆分
├── Day 1-2: Analytics Service 拆分
│   ├── 提取 analytics API routes
│   ├── 设计数据模型和迁移脚本
│   └── 实现读写分离
├── Day 3-4: Analytics Service 测试
│   ├── 数据迁移验证
│   ├── 报表功能测试
│   └── 性能测试
└── Day 5: Analytics Service 部署验证

Week 4: 收尾和文档
├── Day 1-2: 统一 API Gateway
│   ├── 配置路由规则
│   ├── 实现熔断和限流
│   └── 统一日志和监控
├── Day 3-4: 全量集成测试
│   ├── 端到端测试
│   ├── 性能测试
│   └── 故障恢复测试
└── Day 5: 文档和培训
    ├── 更新架构文档
    ├── 编写运维手册
    └── 团队培训
```

### 4.2 里程碑

| 里程碑 | 完成日期 | 验收标准 |
|--------|----------|----------|
| M1: WebSocket Service 独立部署 | Week 1 Day 5 | 服务独立运行，连接稳定性 > 99.9% |
| M2: Workflow Service 独立部署 | Week 2 Day 5 | 工作流执行正常，无内存泄漏 |
| M3: Analytics Service 独立部署 | Week 3 Day 5 | 报表生成正常，查询性能提升 50% |
| M4: 统一 API Gateway | Week 4 Day 2 | 所有服务通过统一入口访问 |
| M5: Phase 1 完成 | Week 4 Day 5 | 全量测试通过，文档完整 |

---

## 5. API 契约设计

### 5.1 服务间通信协议

```typescript
// 统一响应格式
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    requestId: string;
    timestamp: number;
    duration: number;
  };
}

// 服务发现
interface ServiceRegistry {
  services: {
    name: string;
    url: string;
    version: string;
    endpoints: string[];
  }[];
}

// 熔断器配置
interface CircuitBreakerConfig {
  failureThreshold: number;      // 失败次数阈值
  successThreshold: number;      // 成功次数阈值
  timeout: number;               // 超时时间 (ms)
  resetTimeout: number;          // 重置时间 (ms)
}
```

### 5.2 各服务 API 端点汇总

| 服务 | 协议 | 端口 | 主要端点 |
|------|------|------|----------|
| WebSocket | Socket.IO + HTTP | 3002 | `/api/v1/ws/*` |
| Workflow | HTTP REST | 3003 | `/api/v1/workflow/*` |
| Analytics | HTTP REST | 3004 | `/api/v1/analytics/*`, `/api/v1/reports/*` |
| API Gateway | HTTP | 3000 | `/*` (路由到各服务) |

---

## 6. 数据迁移策略

### 6.1 数据库分离计划

```
Phase 1 共享数据库 → Phase 2 分离数据库

当前状态 (共享):
┌─────────────────────────────────────────┐
│  PostgreSQL (单实例)                     │
│  ├── public (主业务)                    │
│  ├── websocket (WebSocket 数据)         │
│  ├── workflow (工作流数据)              │
│  └── analytics (分析数据)               │
└─────────────────────────────────────────┘

目标状态 (分离):
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │ PostgreSQL  │  │ PostgreSQL  │
│ (主业务)    │  │ (Workflow)  │  │ (Analytics) │
└─────────────┘  └─────────────┘  └─────────────┘
```

### 6.2 迁移步骤

1. **只读副本** (Week 1-2)
   - 为 Analytics 创建只读副本
   - 验证数据一致性

2. **双写** (Week 3)
   - 写入主库 + Analytics 副本
   - 监控数据延迟

3. **切换读流量** (Week 3-4)
   - Analytics 读取切换到副本
   - 验证查询性能

4. **完全分离** (Phase 2)
   - Workflow 和 WebSocket 数据完全分离

---

## 7. 监控和可观测性

### 7.1 统一监控架构

```yaml
# monitoring/docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "6831:6831"    # Agent
```

### 7.2 关键指标

| 服务 | 关键指标 | 告警阈值 |
|------|----------|----------|
| All | CPU 使用率 | > 80% |
| All | 内存使用率 | > 85% |
| All | 请求延迟 P99 | > 500ms |
| WebSocket | 连接数 | > 10000 |
| WebSocket | 断开率 | > 1% |
| Workflow | 队列长度 | > 100 |
| Workflow | 执行失败率 | > 5% |
| Analytics | 查询队列 | > 50 |
| Analytics | 报表生成时间 | > 60s |

---

## 8. 风险和缓解措施

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 服务间通信延迟增加 | 中 | 高 | 本地网络部署、连接池复用 |
| 数据一致性问题 | 高 | 中 | 事务性消息、最终一致性设计 |
| 部署复杂性增加 | 中 | 高 | IaC 自动化、标准化部署流程 |
| 调试难度增加 | 低 | 中 | 统一日志、分布式追踪 |
| 团队需要学习新技能 | 低 | 中 | 培训、文档、示例代码 |

---

## 9. 成功标准

### 9.1 技术成功标准

- [ ] 所有服务独立部署和扩缩容
- [ ] 服务间调用延迟 < 50ms (同网络)
- [ ] 端到端测试覆盖率 > 80%
- [ ] 无循环依赖
- [ ] 所有 P0 安全问题修复

### 9.2 业务成功标准

- [ ] API 响应时间 P99 降低 30%
- [ ] WebSocket 连接稳定性 > 99.9%
- [ ] 工作流执行吞吐量提升 50%
- [ ] 报表生成时间降低 50%

### 9.3 运维成功标准

- [ ] 部署时间 < 10 分钟
- [ ] 故障恢复时间 < 5 分钟
- [ ] 监控覆盖所有服务
- [ ] 文档完整率 100%

---

## 10. 后续阶段预览

### Phase 2 (Week 5-8)
- **Auth Service** — 认证授权服务拆分
- **Notification Service** — 通知服务独立
- **Search Service** — 搜索服务独立

### Phase 3 (Week 9-12)
- **File Service** — 文件存储和处理
- **AI/ML Service** — AI 推理服务
- **CDN Integration** — 静态资源分离

---

## 附录

### A. 目录结构

```
7zi/
├── services/
│   ├── websocket-service/       # WebSocket 服务
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── handlers/
│   │   │   ├── rooms/
│   │   │   └── presence/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── workflow-service/        # 工作流引擎服务
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── executor/
│   │   │   ├── nodes/
│   │   │   └── scheduler/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── analytics-service/       # 分析服务
│       ├── src/
│       │   ├── index.ts
│       │   ├── queries/
│       │   ├── reports/
│       │   └── pipelines/
│       ├── test/
│       ├── Dockerfile
│       └── package.json
├── infrastructure/
│   ├── docker-compose.yml
│   ├── nginx/
│   │   └── gateway.conf
│   └── monitoring/
└── docs/
    └── microservices/
```

### B. 参考文档

- [ARCHITECTURE_IMPROVEMENT_PLAN_P0.md](./ARCHITECTURE_IMPROVEMENT_PLAN_P0.md)
- [TECH_DEBT_REVIEW_20261021.md](./TECH_DEBT_REVIEW_20261021.md)
- [A2A_PROTOCOL_V2_IMPLEMENTATION.md](./A2A_PROTOCOL_V2_IMPLEMENTATION.md)
