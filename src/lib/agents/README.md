# 智能体知识晶格系统 - 使用指南

## 概述

知识晶格系统是为智能体量身定制的知识管理系统，采用晶格结构（Lattice）来组织和表达知识。与传统树形或图形结构不同，晶格结构能够更好地表达知识的层次关系和交叉关联。

## 快速开始

### 1. 查看演示

访问 `/knowledge-lattice` 页面查看交互式 3D 可视化演示：

```
http://localhost:3000/knowledge-lattice
```

### 2. 运行测试

```bash
npm test -- src/lib/agents/knowledge-lattice.test.ts
```

### 3. 使用 API

#### 添加知识节点

```bash
curl -X POST http://localhost:3000/api/knowledge/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "content": "机器学习是人工智能的一个分支",
    "type": "concept",
    "weight": 0.9,
    "confidence": 0.95,
    "source": "user",
    "tags": ["AI", "技术"],
    "metadata": {"category": "core"}
  }'
```

#### 查询节点

```bash
curl -X POST http://localhost:3000/api/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{
    "type": "concept",
    "minWeight": 0.8,
    "limit": 10
  }'
```

#### 获取完整晶格

```bash
curl http://localhost:3000/api/knowledge/lattice?includeStats=true
```

#### 添加关系边

```bash
curl -X POST http://localhost:3000/api/knowledge/edges \
  -H "Content-Type: application/json" \
  -d '{
    "from": "node_1",
    "to": "node_2",
    "type": "association",
    "weight": 0.8
  }'
```

#### 执行推理

```bash
curl -X POST http://localhost:3000/api/knowledge/inference \
  -H "Content-Type: application/json" \
  -d '{
    "startNodeId": "node_1",
    "maxDepth": 3
  }'
```

## 核心 API 端点

### 节点操作

- `GET /api/knowledge/nodes` - 列出所有节点（支持过滤）
- `POST /api/knowledge/nodes` - 添加新节点
- `GET /api/knowledge/nodes/[id]` - 获取节点详情
- `PUT /api/knowledge/nodes/[id]` - 更新节点
- `DELETE /api/knowledge/nodes/[id]` - 删除节点

### 边操作

- `GET /api/knowledge/edges` - 列出所有边（支持过滤）
- `POST /api/knowledge/edges` - 添加新边

### 晶格操作

- `GET /api/knowledge/lattice` - 获取完整晶格结构
- `POST /api/knowledge/query` - 查询知识晶格
- `POST /api/knowledge/inference` - 执行推理

## 数据结构

### 知识节点 (LatticeNode)

```typescript
interface LatticeNode {
  id: string;              // 唯一标识符
  content: string;         // 知识内容
  type: KnowledgeType;     // 知识类型
  weight: number;          // 重要性 0-1
  confidence: number;      // 可信度 0-1
  timestamp: number;       // 时间戳
  source: KnowledgeSource; // 知识来源
  embedding?: number[];    // 向量嵌入
  metadata: Record<string, any>; // 元数据
  tags?: string[];         // 标签
}
```

### 知识类型 (KnowledgeType)

- `concept` - 概念
- `rule` - 规则
- `experience` - 经验
- `skill` - 技能
- `fact` - 事实
- `preference` - 偏好
- `memory` - 记忆

### 关系边 (LatticeEdge)

```typescript
interface LatticeEdge {
  id: string;          // 唯一标识符
  from: string;        // 起始节点 ID
  to: string;          // 目标节点 ID
  type: RelationType;  // 关系类型
  weight: number;      // 关系强度 0-1
  timestamp: number;   // 时间戳
  metadata?: Record<string, any>; // 元数据
}
```

### 关系类型 (RelationType)

- `partial-order` - 偏序关系（更具体/更抽象）
- `equivalence` - 等价关系
- `complement` - 互补关系
- `association` - 语义关联
- `causal` - 因果关系

## 代码示例

### 初始化知识晶格

```typescript
import { KnowledgeLattice, KnowledgeType, KnowledgeSource } from '@/lib/agents/knowledge-lattice';

// 创建实例
const lattice = new KnowledgeLattice();

// 添加节点
const nodeId = lattice.addNode({
  content: '机器学习是人工智能的一个分支',
  type: KnowledgeType.CONCEPT,
  weight: 0.9,
  confidence: 0.95,
  source: KnowledgeSource.USER,
  tags: ['AI', '技术'],
  metadata: { category: 'core' },
});

// 添加关系
const edgeId = lattice.addEdge({
  from: nodeId,
  to: otherNodeId,
  type: RelationType.ASSOCIATION,
  weight: 0.8,
});

// 查询
const result = lattice.query({
  type: KnowledgeType.CONCEPT,
  minWeight: 0.8,
});

// 推理
const inference = lattice.infer(nodeId, 3);

// 获取统计
const stats = lattice.getStats();
```

### 使用 3D 可视化组件

```typescript
import KnowledgeLattice3D from '@/components/knowledge-lattice/KnowledgeLattice3D';

function MyPage() {
  const [nodes, setNodes] = useState<LatticeNode[]>([]);
  const [edges, setEdges] = useState<LatticeEdge[]>([]);

  const handleNodeClick = (node: LatticeNode) => {
    console.log('Node clicked:', node);
  };

  const handleNodeHover = (node: LatticeNode | null) => {
    console.log('Node hovered:', node);
  };

  return (
    <KnowledgeLattice3D
      nodes={nodes}
      edges={edges}
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover}
      layout="force"
    />
  );
}
```

### 集成 Evomap

```typescript
import EvomapGateway from '@/lib/agents/evomap-gateway';

// 创建网关实例
const gateway = new EvomapGateway({
  hubUrl: 'https://evomap.ai',
  agentName: 'MyAgent',
  agentType: 'knowledge-worker',
}, lattice);

// 注册节点
const registration = await gateway.register();

// 发布知识
await gateway.publishLattice();

// 获取外部知识
const capsules = await gateway.importCapsules({
  type: KnowledgeType.CONCEPT,
  limit: 10,
});

// 领取任务
const tasks = await gateway.fetchTasks();
```

## 可视化布局

知识晶格系统支持三种布局算法：

1. **力导向布局 (force)** - 基于物理模拟的自然布局
2. **圆形布局 (circular)** - 节点均匀分布在圆周上
3. **分层布局 (hierarchical)** - 按知识类型分层排列

可以通过组件的 `layout` 属性切换布局。

## 高级功能

### 向量嵌入

可以为节点添加向量嵌入以支持语义相似度计算：

```typescript
const node = {
  content: '机器学习',
  type: KnowledgeType.CONCEPT,
  embedding: [0.1, 0.2, 0.3, ...], // 768 维向量
  // ...
};

lattice.addNode(node);

// 查找语义相似的节点
const neighbors = lattice.findNearestNeighbors(nodeId, 5);
```

### 事件监听

知识晶格是一个 EventEmitter，可以监听各种事件：

```typescript
lattice.on('nodeAdded', (node) => {
  console.log('Node added:', node);
});

lattice.on('edgeAdded', (edge) => {
  console.log('Edge added:', edge);
});

lattice.on('nodeUpdated', (node) => {
  console.log('Node updated:', node);
});

lattice.on('cleared', () => {
  console.log('Lattice cleared');
});
```

### 导入导出

```typescript
// 导出
const data = lattice.export();
console.log('Nodes:', data.nodes.length);
console.log('Edges:', data.edges.length);

// 导入
const newLattice = new KnowledgeLattice();
newLattice.import(data);
```

## 性能优化建议

1. **使用向量数据库** - 对于大规模晶格，建议使用专门的向量数据库存储嵌入
2. **增量更新** - 对于频繁更新的场景，使用增量更新而非全量重建
3. **分页查询** - 使用 API 的分页功能避免一次性加载过多数据
4. **缓存** - 缓存常用查询结果
5. **惰性加载** - 3D 可视化中使用惰性加载策略

## 故障排除

### 节点未显示

确保：
- 节点已正确添加到晶格
- 位置已正确计算
- 渲染组件正确接收数据

### 边未显示

确保：
- 起始和目标节点都存在
- 边已正确添加到晶格
- 布局算法正确计算位置

### API 返回 404

确保：
- 节点或边的 ID 正确
- 资源未被删除

## 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 许可证

MIT License

## 更多信息

- [架构文档](./docs/KNOWLEDGE_LATTICE.md)
- [API 文档](./docs/API.md)
- [测试覆盖](./coverage/)