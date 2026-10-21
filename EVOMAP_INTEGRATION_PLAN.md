# Evomap 智能体世界集成方案

**文档版本**: v1.0.0  
**日期**: 2026-10-21  
**角色**: 🌟 智能体世界专家  
**目标**: 7zi 环球旅行平台 × Evomap Gene/Capsule 分发系统

---

## 一、现状分析

### 1.1 Evomap Gateway 现状

| 项目 | 状态 |
|------|------|
| **节点ID** | `node_909148eee8a8816a` |
| **Hub URL** | `https://evomap.ai` |
| **协议版本** | GEP-A2A v1.0.0 |
| **注册状态** | ✅ 已注册 (2026-03-07) |
| **心跳状态** | ⚠️ 有问题（间隔15分钟应为5分钟） |
| **资产发布数** | 0 |
| **可用任务** | 0 |

### 1.2 7zi-backend 现状

| 模块 | 技术栈 | 端口 |
|------|--------|------|
| WebSocket 服务 | Socket.IO + Express | 3002 |
| 工作流引擎 | Express | 3002 |
| **Evomap 集成** | ❌ 无 | - |

### 1.3 关键发现

- ✅ Evomap Gateway 代码已完整（`evomap-client.js` 提供所有 GEP-A2A 端点）
- ✅ 节点已注册，但 heartbeat 间隔配置错误（15min → 应为 5min）
- ✅ `7zi-backend/` 中**完全没有** Evomap/Gene/Capsule 相关代码
- ✅ 7zi 环球旅行平台天然适合 Gene/Capsule 分发模型

---

## 二、Gene/Capsule 在旅行场景的应用设计

### 2.1 旅行智能体的 Gene 模型

```
┌─────────────────────────────────────────────────────────────┐
│                    Travel Gene 结构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   type: "Gene"                                              │
│   schema_version: "1.5.0"                                  │
│   category: "itinerary_generation" | "booking_optimization" │
│             | "destination_recommendation" | "budget_plan"   │
│                                                             │
│   signals_match: [                                          │
│     "travel_planning", "itinerary_request",                 │
│     "multi_city_trip", "budget_sensitive"                   │
│   ]                                                          │
│                                                             │
│   summary: "低成本多城市旅行规划算法 v2"                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 旅行智能体的 Capsule 模型

```
┌─────────────────────────────────────────────────────────────┐
│                   Travel Capsule 结构                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   type: "Capsule"                                           │
│   schema_version: "1.5.0"                                  │
│   trigger: ["travel_planning", "europe_trip"]               │
│   summary: "欧洲14天经典路线，含交通套票"                    │
│                                                             │
│   content: {                                                │
│     itinerary: [...],                                       │
│     estimated_cost: { currency: "CNY", total: 15000 },     │
│     booking_links: [...],                                   │
│     travel_tips: [...]                                      │
│   }                                                          │
│                                                             │
│   confidence: 0.92                                          │
│   blast_radius: { files: 1, lines: 200 }                   │
│                                                             │
│   outcome: {                                                │
│     status: "success",                                      │
│     score: 0.92,                                            │
│     user_rating: 4.8,                                        │
│     completion_rate: 0.95                                  │
│   }                                                          │
│                                                             │
│   env_fingerprint: { platform: "linux", arch: "x64" }       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 EvolutionEvent 模型

```
┌─────────────────────────────────────────────────────────────┐
│                  EvolutionEvent 结构                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   type: "EvolutionEvent"                                   │
│   intent: "itinerary_generation"                           │
│   capsule_id: "sha256:abc123..."                          │
│   genes_used: ["sha256:def456..."]                        │
│                                                             │
│   outcome: {                                                │
│     status: "success",                                     │
│     score: 0.92,                                           │
│     user_satisfaction: 4.8                                  │
│   }                                                          │
│                                                             │
│   mutations_tried: 3                                        │
│   total_cycles: 2                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、集成架构设计

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        7zi 环球旅行平台                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│   │ 旅行规划    │    │ 酒店预订    │    │ 行程优化    │            │
│   │ Agent       │    │ Agent       │    │ Agent       │            │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘            │
│          │                  │                  │                    │
│          └──────────────────┼──────────────────┘                    │
│                             ↓                                       │
│                  ┌─────────────────────┐                            │
│                  │  Evomap Integration │                            │
│                  │      Layer          │                            │
│                  │  (evomap-service)   │                            │
│                  └──────────┬──────────┘                            │
│                             │                                        │
│          ┌──────────────────┼──────────────────┐                    │
│          ↓                  ↓                  ↓                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│   │ Gene Registry│   │Capsule Store│   │ Event Tracker│           │
│   │ (发布/查询) │    │ (存储/检索)  │   │ (进化历史)   │            │
│   └─────────────┘    └─────────────┘    └─────────────┘            │
│                             │                                        │
│                             ↓                                        │
│                  ┌─────────────────────┐                            │
│                  │   GEP-A2A Client    │                            │
│                  │  (evomap-client.js) │                            │
│                  └──────────┬──────────┘                            │
│                             │ HTTPS                                 │
└─────────────────────────────┼───────────────────────────────────────┘
                              ↓
                   ┌─────────────────────┐
                   │   Evomap Hub        │
                   │  https://evomap.ai   │
                   │                     │
                   │  • 资产分发市场       │
                   │  • 节点发现          │
                   │  • 任务系统          │
                   └─────────────────────┘
```

### 3.2 模块清单

| 文件路径 | 职责 |
|----------|------|
| `7zi-backend/evomap/` | 新建 Evomap 集成模块根目录 |
| `7zi-backend/evomap/package.json` | 依赖管理 |
| `7zi-backend/evomap/gep-a2a-client.ts` | GEP-A2A 协议客户端（TypeScript版） |
| `7zi-backend/evomap/gene-registry.ts` | Gene 注册与管理 |
| `7zi-backend/evomap/capsule-store.ts` | Capsule 存储与检索 |
| `7zi-backend/evomap/travel-capsule-builder.ts` | 旅行 Capsule 构造器 |
| `7zi-backend/evomap/event-tracker.ts` | EvolutionEvent 追踪器 |
| `7zi-backend/evomap/daemon.ts` | 后台守护进程 |
| `7zi-backend/evomap/index.ts` | 统一导出 |

---

## 四、具体集成方案

### 4.1 第一步：修复 Heartbeat 间隔（紧急）

**问题**: `evomap-service.js` 中 heartbeat 间隔设为 15 分钟，Hub 要求 5 分钟。

**修复**:
```javascript
// evomap-service.js 第 10 行
const heartbeatInterval = 5 * 60 * 1000; // 5 分钟 (原为 15)
```

### 4.2 第二步：创建 Evomap 集成模块

**目录结构**:
```
7zi-backend/evomap/
├── package.json
├── tsconfig.json
├── src/
│   ├── client.ts           # GEP-A2A 客户端封装
│   ├── gene-registry.ts     # Gene 注册表
│   ├── capsule-store.ts    # Capsule 存储
│   ├── travel-capsule.ts   # 旅行 Capsule 构造器
│   ├── event-tracker.ts    # EvolutionEvent 追踪
│   ├── daemon.ts           # 守护进程
│   └── index.ts
└── examples/
    └── publish-travel-capsule.ts
```

### 4.3 第三步：实现 GEP-A2A 客户端封装

```typescript
// src/client.ts
import EvomapClient from '../../../skills/evomap/evomap-client.js';

export interface EvomapConfig {
  hubUrl?: string;
  nodeId?: string;
  nodeSecret?: string;
}

export class EvomapA2AClient {
  private client: InstanceType<typeof EvomapClient>;
  
  constructor(config: EvomapConfig = {}) {
    this.client = new EvomapClient({
      hubUrl: config.hubUrl || 'https://evomap.ai',
      nodeId: config.nodeId,
      nodeSecret: config.nodeSecret,
    });
  }

  /** 发送心跳（每5分钟） */
  async heartbeat(workerEnabled = true) {
    return this.client.heartbeat({
      workerEnabled,
      maxLoad: 3,
      domains: ['travel_planning', 'booking', 'itinerary']
    });
  }

  /** 发布旅行 Capsule */
  async publishCapsule(bundle: {
    gene: object;
    capsule: object;
    event?: object;
  }) {
    return this.client.publish(bundle);
  }

  /** 发布修复方案（便捷方法） */
  async publishFix(options: {
    signals: string[];
    summary: string;
    content: string;
    confidence: number;
    blastRadius: { files: number; lines: number };
    intent?: string;
  }) {
    return this.client.publishFix(options);
  }

  /** 获取推荐资产 */
  async fetchAssets(options: {
    signals?: string[];
    limit?: number;
    minGdi?: number;
  } = {}) {
    return this.client.fetch({
      ...options,
      includeTasks: true
    });
  }

  /** 获取节点状态 */
  getStatus() {
    return this.client.getStatus();
  }
}
```

### 4.4 第四步：实现旅行 Capsule 构造器

```typescript
// src/travel-capsule.ts

export interface TravelItinerary {
  cities: City[];
  totalDays: number;
  estimatedCost: { amount: number; currency: string };
  highlights: string[];
}

export interface City {
  name: string;
  country: string;
  days: number;
  attractions: string[];
  accommodation?: string;
  transportToNext?: string;
}

export interface TravelCapsuleInput {
  userId: string;
  tripType: 'leisure' | 'business' | 'adventure' | 'cultural';
  destinations: string[];
  duration: number;
  budget?: { min: number; max: number; currency: string };
  travelers: number;
  itinerary: TravelItinerary;
  userRating?: number;
}

export class TravelCapsuleBuilder {
  
  /** 根据旅行类型映射 signals */
  private static mapTripTypeToSignals(tripType: string): string[] {
    const signalMap: Record<string, string[]> = {
      leisure: ['travel_planning', 'relaxation', 'beach_resort'],
      business: ['business_travel', 'efficient_itinerary', 'city_center'],
      adventure: ['adventure_travel', 'hiking', 'off_the_beaten_path'],
      cultural: ['cultural_tourism', 'museums', 'historical_sites']
    };
    return signalMap[tripType] || ['travel_planning'];
  }

  /** 构建旅行 Gene */
  static buildGene(input: TravelCapsuleInput) {
    return {
      type: 'Gene',
      schema_version: '1.5.0',
      category: `travel_${input.tripType}`,
      signals_match: [
        'travel_planning',
        ...this.mapTripTypeToSignals(input.tripType)
      ],
      summary: `${input.tripType}旅行规划: ${input.destinations.join(' → ')} ${input.duration}天`
    };
  }

  /** 构建旅行 Capsule */
  static buildCapsule(input: TravelCapsuleInput) {
    const avgRating = input.userRating || 4.5;
    
    return {
      type: 'Capsule',
      schema_version: '1.5.0',
      trigger: this.mapTripTypeToSignals(input.tripType),
      summary: `${input.tripType}旅行: ${input.destinations.join(',')}`,
      content: {
        trip_type: input.tripType,
        destinations: input.destinations,
        duration: input.duration,
        travelers: input.travelers,
        budget: input.budget,
        itinerary: input.itinerary,
        generated_at: new Date().toISOString()
      },
      confidence: avgRating / 5,
      blast_radius: {
        files: 1,
        lines: Math.ceil(JSON.stringify(input.itinerary).length / 100)
      },
      outcome: {
        status: 'success',
        score: avgRating / 5,
        user_rating: avgRating,
        completion_rate: 0.95
      },
      env_fingerprint: {
        platform: process.platform,
        arch: process.arch,
        service: '7zi-travel'
      }
    };
  }

  /** 构建 EvolutionEvent */
  static buildEvent(input: TravelCapsuleInput) {
    return {
      type: 'EvolutionEvent',
      intent: `travel_${input.tripType}`,
      outcome: {
        status: 'success',
        score: (input.userRating || 4.5) / 5,
        user_satisfaction: input.userRating || 4.5
      },
      mutations_tried: 1,
      total_cycles: 1
    };
  }

  /** 完整构建 bundle */
  static buildBundle(input: TravelCapsuleInput) {
    return {
      gene: this.buildGene(input),
      capsule: this.buildCapsule(input),
      event: this.buildEvent(input)
    };
  }
}
```

### 4.5 第五步：实现 Gene 注册表

```typescript
// src/gene-registry.ts

import { TravelCapsuleInput, TravelCapsuleBuilder } from './travel-capsule.js';
import { EvomapA2AClient } from './client.js';

export interface PublishedAsset {
  assetId: string;
  geneId: string;
  capsuleId: string;
  publishedAt: string;
  signals: string[];
}

export class GeneRegistry {
  private client: EvomapA2AClient;
  private publishedAssets: Map<string, PublishedAsset> = new Map();
  
  // 信号 → 已发布资产缓存（用于快速检索）
  private signalIndex: Map<string, string[]> = new Map();

  constructor(client: EvomapA2AClient) {
    this.client = client;
  }

  /** 发布新的旅行 Capsule */
  async publish(input: TravelCapsuleInput): Promise<PublishedAsset> {
    const bundle = TravelCapsuleBuilder.buildBundle(input);
    
    const result = await this.client.publishCapsule(bundle);
    
    if (result.success) {
      const geneId = (bundle.gene as any).asset_id;
      const capsuleId = (bundle.capsule as any).asset_id;
      
      const asset: PublishedAsset = {
        assetId: capsuleId,
        geneId,
        capsuleId,
        publishedAt: new Date().toISOString(),
        signals: input.tripType ? 
          TravelCapsuleBuilder.mapTripTypeToSignals(input.tripType) : 
          ['travel_planning']
      };
      
      this.publishedAssets.set(capsuleId, asset);
      this.indexBySignal(asset);
      
      return asset;
    }
    
    throw new Error(`Publish failed: ${JSON.stringify(result)}`);
  }

  /** 根据信号查询已有 Capsule */
  async findBySignals(signals: string[]): Promise<PublishedAsset[]> {
    const results: PublishedAsset[] = [];
    
    for (const signal of signals) {
      const assetIds = this.signalIndex.get(signal) || [];
      for (const id of assetIds) {
        const asset = this.publishedAssets.get(id);
        if (asset && !results.includes(asset)) {
          results.push(asset);
        }
      }
    }
    
    return results;
  }

  /** 从 Hub 获取推荐资产 */
  async fetchFromHub(options: {
    signals?: string[];
    limit?: number;
    minGdi?: number;
  } = {}) {
    const result = await this.client.fetchAssets(options);
    
    if (result.success && result.data?.assets) {
      return result.data.assets;
    }
    
    return [];
  }

  /** 建立信号索引 */
  private indexBySignal(asset: PublishedAsset) {
    for (const signal of asset.signals) {
      const existing = this.signalIndex.get(signal) || [];
      if (!existing.includes(asset.capsuleId)) {
        existing.push(asset.capsuleId);
        this.signalIndex.set(signal, existing);
      }
    }
  }
}
```

### 4.6 第六步：实现事件追踪器

```typescript
// src/event-tracker.ts

export interface EvolutionEvent {
  capsuleId: string;
  intent: string;
  outcome: {
    status: 'success' | 'failure' | 'partial';
    score: number;
    userSatisfaction?: number;
  };
  mutationsTried: number;
  totalCycles: number;
  timestamp: string;
}

export class EventTracker {
  private events: EvolutionEvent[] = [];
  
  /** 记录新的进化事件 */
  record(event: Omit<EvolutionEvent, 'timestamp'>) {
    this.events.push({
      ...event,
      timestamp: new Date().toISOString()
    });
  }

  /** 获取某 Capsule 的进化历史 */
  getHistory(capsuleId: string): EvolutionEvent[] {
    return this.events.filter(e => e.capsuleId === capsuleId);
  }

  /** 获取整体进化趋势 */
  getTrends() {
    const total = this.events.length;
    const successful = this.events.filter(e => e.outcome.status === 'success').length;
    const avgScore = this.events.reduce((sum, e) => sum + e.outcome.score, 0) / total;
    
    return {
      totalEvents: total,
      successRate: total > 0 ? successful / total : 0,
      averageScore: avgScore,
      recentEvents: this.events.slice(-10)
    };
  }

  /** 生成 EvolutionEvent 对象（用于发布） */
  toEvolutionEvent(capsuleId: string, intent: string): object {
    const history = this.getHistory(capsuleId);
    const latest = history[history.length - 1];
    
    return {
      type: 'EvolutionEvent',
      intent,
      capsule_id: capsuleId,
      outcome: {
        status: latest?.outcome.status || 'success',
        score: latest?.outcome.score || 0.8,
        user_satisfaction: latest?.outcome.userSatisfaction
      },
      mutations_tried: history.length + 1,
      total_cycles: Math.ceil((history.length + 1) / 3)
    };
  }
}
```

### 4.7 第七步：实现守护进程

```typescript
// src/daemon.ts

import { EvomapA2AClient } from './client.js';
import { GeneRegistry } from './gene-registry.js';
import { EventTracker } from './event-tracker.js';

export class EvomapDaemon {
  private client: EvomapA2AClient;
  private registry: GeneRegistry;
  private tracker: EventTracker;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.client = new EvomapA2AClient();
    this.registry = new GeneRegistry(this.client);
    this.tracker = new EventTracker();
  }

  /** 启动守护进程 */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[EvomapDaemon] Starting...');
    
    // 启动心跳（每5分钟）
    this.startHeartbeat();
    
    console.log('[EvomapDaemon] Started successfully');
  }

  /** 停止守护进程 */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    console.log('[EvomapDaemon] Stopped');
  }

  /** 启动心跳 */
  private startHeartbeat() {
    // 立即发送一次心跳
    this.sendHeartbeat();
    
    // 每5分钟发送一次
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 5 * 60 * 1000);
  }

  /** 发送心跳 */
  private async sendHeartbeat() {
    try {
      const result = await this.client.heartbeat(true);
      
      if (result.success) {
        console.log('[EvomapDaemon] Heartbeat OK', 
          result.data?.node_status || 'active');
      } else {
        console.error('[EvomapDaemon] Heartbeat failed:', result.error);
      }
    } catch (e) {
      console.error('[EvomapDaemon] Heartbeat error:', e);
    }
  }

  /** 发布旅行 Capsule */
  async publishTravelCapsule(input: Parameters<typeof import('./travel-capsule.js').TravelCapsuleBuilder.buildBundle>[0]) {
    const asset = await this.registry.publish(input);
    
    this.tracker.record({
      capsuleId: asset.capsuleId,
      intent: `travel_${input.tripType}`,
      outcome: { status: 'success', score: input.userRating ? input.userRating / 5 : 0.9 },
      mutationsTried: 1,
      totalCycles: 1
    });
    
    return asset;
  }

  /** 获取状态 */
  getStatus() {
    return {
      running: this.isRunning,
      node: this.client.getStatus(),
      trends: this.tracker.getTrends()
    };
  }
}
```

### 4.8 第八步：Express API 路由集成

```typescript
// src/routes.ts
import { Router, Request, Response } from 'express';
import { EvomapDaemon } from './daemon.js';
import { TravelCapsuleInput } from './travel-capsule.js';

const router = Router();
let daemon: EvomapDaemon | null = null;

export function initRoutes(daemonInstance: EvomapDaemon) {
  daemon = daemonInstance;
}

/** POST /api/evomap/publish - 发布旅行 Capsule */
router.post('/publish', async (req: Request, res: Response) => {
  try {
    const input = req.body as TravelCapsuleInput;
    
    if (!input.tripType || !input.destinations || !input.itinerary) {
      return res.status(400).json({ 
        error: 'Missing required fields: tripType, destinations, itinerary' 
      });
    }
    
    const asset = await daemon!.publishTravelCapsule(input);
    
    res.json({ success: true, asset });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/evomap/status - 获取状态 */
router.get('/status', (req: Request, res: Response) => {
  res.json(daemon!.getStatus());
});

/** GET /api/evomap/trends - 获取进化趋势 */
router.get('/trends', (req: Request, res: Response) => {
  res.json(daemon!.getStatus().trends);
});

/** GET /api/evomap/recommendations - 获取 Hub 推荐 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const { signals, limit = 5 } = req.query;
    const signalList = signals ? (signals as string).split(',') : ['travel_planning'];
    
    const assets = await daemon!.registry.fetchFromHub({
      signals: signalList,
      limit: Number(limit)
    });
    
    res.json({ success: true, assets });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
```

---

## 五、集成到 7zi-backend

### 5.1 安装依赖

```bash
cd 7zi-backend
# 创建 evomap 目录
mkdir -p evomap/src evomap/examples

# 初始化 package.json
cd evomap
cat > package.json << 'EOF'
{
  "name": "7zi-evomap",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/daemon.js",
    "dev": "tsc && node dist/daemon.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
EOF

pnpm install
```

### 5.2 启动脚本修改

```bash
# bin/start-evomap.sh (新建)
#!/bin/bash
cd "$(dirname "$0")/.."
node dist/evomap/daemon.js
```

### 5.3 一键启动所有服务

```bash
# bin/start-all.sh 更新
#!/bin/bash
cd "$(dirname "$0")/.."

echo "Starting 7zi Backend Services..."
echo "================================"

# 启动 WebSocket
echo "[1/3] Starting WebSocket Server..."
node websocket/websocket-server.js &
WS_PID=$!

# 启动 Workflow Engine
echo "[2/3] Starting Workflow Engine..."
node workflow-engine/server.js &
WF_PID=$!

# 启动 Evomap Daemon
echo "[3/3] Starting Evomap Gateway..."
node evomap/dist/daemon.js &
EV_PID=$!

echo ""
echo "All services started!"
echo "WebSocket PID: $WS_PID"
echo "Workflow PID: $WF_PID"  
echo "Evomap PID: $EV_PID"
echo ""
echo "Logs:"
tail -f /dev/null
```

---

## 六、使用流程示例

### 6.1 用户请求旅行规划

```typescript
// 前端调用
const response = await fetch('/api/evomap/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    tripType: 'leisure',
    destinations: ['巴黎', '罗马', '巴塞罗那'],
    duration: 14,
    budget: { min: 10000, max: 20000, currency: 'CNY' },
    travelers: 2,
    itinerary: {
      cities: [
        { name: '巴黎', country: '法国', days: 4, attractions: ['埃菲尔铁塔', '卢浮宫'] },
        { name: '罗马', country: '意大利', days: 5, attractions: ['斗兽场', '梵蒂冈'] },
        { name: '巴塞罗那', country: '西班牙', days: 5, attractions: ['圣家堂', '哥特区'] }
      ],
      totalDays: 14,
      estimatedCost: { amount: 18500, currency: 'CNY' },
      highlights: ['经典欧洲三角', '含廉航机票', '三星酒店']
    },
    userRating: 4.8
  })
});

const { asset } = await response.json();
// asset.capsuleId = "sha256:..."
// asset.geneId = "sha256:..."
```

### 6.2 从 Hub 获取推荐

```bash
curl "http://localhost:3002/api/evomap/recommendations?signals=travel_planning,europe_trip&limit=5"
```

---

## 七、实施计划

### 阶段划分

| 阶段 | 时间 | 任务 | 交付物 |
|------|------|------|--------|
| **Phase 1** | Day 1 | 修复 heartbeat 间隔 + 创建模块骨架 | `evomap/` 目录结构 |
| **Phase 2** | Day 2-3 | 实现 GEP-A2A 客户端 + 旅行 Capsule 构造器 | 可发布的 Capsule |
| **Phase 3** | Day 4-5 | 实现 Gene 注册表 + 事件追踪器 + 守护进程 | 后台服务 |
| **Phase 4** | Day 6-7 | 集成到 Express + API 路由 | REST API |
| **Phase 5** | Day 8-10 | 测试 + 部署 | 生产可用 |

### 优先级

1. 🔴 **P0**: 修复 heartbeat 间隔（5分钟）- 防止节点离线
2. 🔴 **P0**: 创建 evomap 模块骨架
3. 🟡 **P1**: 实现 Capsule 构造器 + 发布流程
4. 🟡 **P1**: 启动守护进程
5. 🟢 **P2**: Hub 推荐资产集成
6. 🟢 **P2**: 任务系统集成

---

## 八、关键注意事项

### 8.1 紧急修复

**Heartbeat 间隔问题**必须立即修复：

```javascript
// ~/.openclaw/skills/evomap/evomap-service.js
// 找到并修改：
const heartbeatInterval = 5 * 60 * 1000; // 5 分钟
```

### 8.2 认证问题

当前 `node_secret` 已过期或需要刷新，需要重新执行 `hello` 注册。

### 8.3 依赖复用

直接复用 `~/.openclaw/skills/evomap/evomap-client.js` 而非重新实现，减少维护成本。

---

## 九、结论

7zi 环球旅行平台与 Evomap Gene/Capsule 系统的集成：

1. **天然契合** - 旅行规划是高度可复用的场景，Gene/Capsule 模型完美匹配
2. **技术可行** - Evomap Gateway 代码已完整，只需封装和集成
3. **价值显著** - 可通过 Hub 分发优质旅行方案，形成智能体网络
4. **分步实施** - 按 Phase 1-5 逐步推进，降低风险

**建议立即行动**：从 Phase 1 开始，修复 heartbeat 间隔，创建模块骨架。

---

*报告生成时间: 2026-10-21 05:40 GMT+2*  
*角色: 🌟 智能体世界专家*
