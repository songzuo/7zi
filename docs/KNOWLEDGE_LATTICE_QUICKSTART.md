# 智能体知识晶格系统 - 快速入门

## 🎯 什么是知识晶格？

知识晶格是为智能体量身定制的知识管理系统，采用晶格结构（Lattice）来组织和表达知识。它能更好地表达知识的层次关系和交叉关联。

## 🚀 5分钟快速体验

### 1. 查看演示页面

```bash
# 启动开发服务器
npm run dev

# 访问演示页面
# http://localhost:3000/knowledge-lattice
```

演示页面包含：
- ✨ 交互式 3D 可视化
- 🎨 三种布局切换（力导向、圆形、分层）
- 📊 实时统计信息
- 🔍 节点详情查看
- 📚 预置示例数据（8个节点，7条边）

### 2. API 快速测试

```bash
# 添加一个知识节点
curl -X POST http://localhost:3000/api/knowledge/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "content": "React是一个用于构建用户界面的JavaScript库",
    "type": "concept",
    "weight": 0.9,
    "confidence": 0.95,
    "source": "user",
    "tags": ["前端", "JavaScript"]
  }'

# 查询所有概念节点
curl -X POST http://localhost:3000/api/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{
    "type": "concept",
    "minWeight": 0.8
  }'

# 获取完整晶格
curl http://localhost:3000/api/knowledge/lattice?includeStats=true
```

### 3. 代码中使用

```typescript
import { KnowledgeLattice, KnowledgeType, KnowledgeSource } from '@/lib/agents/knowledge-lattice';

// 创建知识晶格
const lattice = new KnowledgeLattice();

// 添加知识节点
const nodeId = lattice.addNode({
  content: '机器学习是人工智能的一个分支',
  type: KnowledgeType.CONCEPT,
  weight: 0.9,
  confidence: 0.95,
  source: KnowledgeSource.USER,
  tags: ['AI', '技术'],
});

// 添加关系
lattice.addEdge({
  from: nodeId,
  to: otherNodeId,
  type: 'association',
  weight: 0.8,
});

// 查询知识
const result = lattice.query({
  type: KnowledgeType.CONCEPT,
  minWeight: 0.8,
});

// 执行推理
const inference = lattice.infer(nodeId, 3);

// 获取统计
const stats = lattice.getStats();
console.log(`共有 ${stats.totalNodes} 个知识节点`);
```

## 📦 核心功能

### 知识类型（7种）

| 类型 | 说明 | 示例 |
|------|------|------|
| `concept` | 概念 | 人工智能、机器学习 |
| `rule` | 规则 | 如果X则Y |
| `experience` | 经验 | 实践中学到的教训 |
| `skill` | 技能 | 会做某事的能力 |
| `fact` | 事实 | 客观存在的信息 |
| `preference` | 偏好 | 个人喜好 |
| `memory` | 记忆 | 过去的事件 |

### 关系类型（5种）

| 类型 | 说明 |
|------|------|
| `partial-order` | 偏序关系（更具体/更抽象） |
| `equivalence` | 等价关系 |
| `complement` | 互补关系 |
| `association` | 语义关联 |
| `causal` | 因果关系 |

### 主要操作

```typescript
// 节点操作
lattice.addNode(node)           // 添加节点
lattice.getNode(id)             // 获取节点
lattice.updateNode(id, updates) // 更新节点
lattice.deleteNode(id)          // 删除节点

// 边操作
lattice.addEdge(edge)           // 添加边
lattice.getEdge(id)             // 获取边
lattice.deleteEdge(id)          // 删除边

// 查询操作
lattice.query(filters)          // 查询
lattice.infer(nodeId, depth)    // 推理
lattice.findNearestNeighbors(id) // 最近邻

// 统计操作
lattice.getStats()              // 获取统计
lattice.export()                // 导出
lattice.import(data)            // 导入
```

## 🎨 3D 可视化

```typescript
import KnowledgeLattice3D from '@/components/knowledge-lattice/KnowledgeLattice3D';

<KnowledgeLattice3D
  nodes={nodes}
  edges={edges}
  onNodeClick={(node) => console.log('Clicked:', node)}
  onNodeHover={(node) => console.log('Hovered:', node)}
  layout="force"  // force | circular | hierarchical
/>
```

## 🌐 Evomap 集成

```typescript
import EvomapGateway from '@/lib/agents/evomap-gateway';

const gateway = new EvomapGateway({
  hubUrl: 'https://evomap.ai',
  agentName: 'MyAgent',
  agentType: 'knowledge-worker',
}, lattice);

// 注册节点
await gateway.register();

// 发布知识
await gateway.publishLattice();

// 获取外部知识
const capsules = await gateway.importCapsules({
  type: KnowledgeType.CONCEPT,
  limit: 10,
});
```

## 📚 API 端点

### 节点操作
- `GET /api/knowledge/nodes` - 列出节点
- `POST /api/knowledge/nodes` - 添加节点
- `GET /api/knowledge/nodes/[id]` - 获取详情
- `PUT /api/knowledge/nodes/[id]` - 更新节点
- `DELETE /api/knowledge/nodes/[id]` - 删除节点

### 边操作
- `GET /api/knowledge/edges` - 列出边
- `POST /api/knowledge/edges` - 添加边

### 晶格操作
- `GET /api/knowledge/lattice` - 获取完整晶格
- `POST /api/knowledge/query` - 查询
- `POST /api/knowledge/inference` - 推理

## ✅ 运行测试

```bash
npm test -- src/lib/agents/knowledge-lattice.test.ts
```

测试结果：✅ 17/17 通过（24ms）

## 📊 项目统计

| 项目 | 数量 |
|------|------|
| 代码文件 | 12 |
| 代码行数 | ~2,300 |
| API 端点 | 8 |
| 测试用例 | 17 |
| 知识类型 | 7 |
| 关系类型 | 5 |

## 🎯 应用场景

### 1. 学习与记忆
- 从对话中提取知识
- 组织成结构化的晶格
- 支持回忆和检索

### 2. 推理与决策
- 在晶格上进行推理
- 找到相关知识和规则
- 支持决策制定

### 3. 知识进化
- 自动更新知识权重
- 合并冲突信息
- 发现知识盲区

### 4. 跨智能体协作
- 共享知识晶格
- 协同推理
- 集体智慧

## 🚀 下一步

1. **探索演示页面**: `/knowledge-lattice`
2. **阅读完整文档**: `docs/KNOWLEDGE_LATTICE.md`
3. **查看使用指南**: `src/lib/agents/README.md`
4. **运行测试**: 验证所有功能
5. **集成到你的项目**: 使用提供的 API 和组件

## 💡 提示

- 💾 知识晶格支持导入导出，可以持久化存储
- 🎯 使用标签和元数据更好地组织知识
- 🔄 监听事件响应知识更新
- 🌐 通过 Evomap 与其他智能体共享知识
- 🎨 3D 可视化支持多种布局，选择最适合你的

---

**开始构建你的智能体知识系统吧！** 🎉