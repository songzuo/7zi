# 🌟 Evomap 集成战略报告 - 7zi 项目可见性提升计划

**日期**: 2026-04-29  
**角色**: 🌟 智能体世界专家  
**目标**: 分析当前集成状态，制定让 7zi 在 Evomap 生态中获取可见性的行动方案  

---

## 一、当前集成状态分析

### 1.1 技能配置 ✅ 完整

| 组件 | 状态 | 路径 |
|------|------|------|
| SKILL.md | ✅ 存在 | `~/.openclaw/skills/evomap/SKILL.md` |
| evomap-client.js | ✅ 存在 | 完整的 GEP-A2A v1.0.0 客户端 |
| evomap-service.js | ✅ 存在 | Gateway 服务(心跳/同步) |
| evomap-cli.js | ✅ 存在 | CLI 工具 |

### 1.2 节点状态 ⚠️ 心跳中断

| 指标 | 值 | 状态 |
|------|-----|------|
| Node ID | `node_641a010362a13a97` | ✅ 已注册 |
| Node Secret | 已存储 | ✅ 有效 |
| 注册状态 | registered: true | ✅ 正常 |
| 最后心跳 | 2026-04-28 02:10 | ❌ **已中断 ~36小时** |
| 已发布资产 | 0 | ❌ **从未发布** |
| 已获取资产 | 12 | ✅ 正常 |

**Hub 统计** (截至 2026-04-28):
- 总资产: 1,728,185
- 已推广资产: 1,218,021 (70.5%)
- 总节点: 184,038
- 今日调用: 454,939

---

## 二、关键差距分析

### Gap 1: 心跳服务已死 🔴 严重

**问题**: `EvomapGatewayService` 未作为后台服务运行，心跳已中断约 36 小时。

**影响**:
- 节点在 Hub 显示为 offline
- 无法自动同步资产
- 无法领取新任务

**根因**: 没有 cron job / systemd / PM2 管理进程

---

### Gap 2: 未发布任何资产 🔴 严重

**问题**: `publishCount: 0` - 7zi 节点从未发布过解决方案到 Evomap 市场。

**影响**:
- 7zi 在 Evomap 生态中完全不可见
- 无法通过 Evomap 被其他节点发现
- 失去了 GEP-A2A 协议的网络效应

**根因**: 不知道如何发布 / 没有值得发布的资产 / 发布流程未集成

---

### Gap 3: 未与 7zi 主系统集成 🟡 中等

**问题**: Evomap 技能只作为独立 CLI 工具存在，`src/lib/` 和 `src/agents/` 中无 Evomap 相关代码。

**影响**:
- 7zi 的智能体无法利用 Evomap 的资产/任务系统
- 无法将 7zi 的能力输出到 Evomap 市场
- 失去了生态合作的机会

**根因**: 集成是可选的，未优先实现

---

### Gap 4: 未认领 Claim URL 🟡 低

**问题**: 节点注册时返回的 `claim_url` 可能未被认领。

**影响**: 可能影响节点在 Hub 的显示和信誉

---

## 三、现有 Gene/Capsule 发布流程分析

根据 SKILL.md，发布流程如下:

1. **构建资产包**:
   - Gene: 核心算法/方法 (如调度算法、特征提取)
   - Capsule: 完整解决方案 (Agent + 配置 + 使用案例)
   - EvolutionEvent: 进化历史记录

2. **发布 API**: `POST /a2a/publish` with GEP-A2A envelope

3. **当前问题**: 
   - 没有自动发布机制
   - 不知道 7zi 的哪些能力适合发布
   - 发布需要高质量、可复用的资产

---

## 四、具体可执行的下一步行动 (Top 3)

### 行动 1: 恢复心跳服务 ⚡ 高优先级

**执行步骤**:
```bash
# 1. 创建 cron job 每 5 分钟发送心跳
(crontab -l 2>/dev/null; echo "*/5 * * * * node ~/.openclaw/skills/evomap/evomap-cli.js heartbeat") | crontab -

# 或者使用 PM2
pm2 start ~/.openclaw/skills/evomap/evomap-service.js --name evomap-gateway
```

**验证**:
```bash
node ~/.openclaw/skills/evomap/evomap-cli.js status
```

**预期结果**: 节点状态变为 online，最后心跳更新为当前时间

---

### 行动 2: 发布 7zi 核心能力到 Evomap 🏆 核心任务

**发布资产候选**:

| 资产类型 | 名称 | 描述 | 价值定位 |
|----------|------|------|----------|
| **Gene** | `multi-agent-orchestrator` | 多智能体协调引擎 | 群体智能基础 |
| **Gene** | `adaptive-scheduler` | 自适应任务调度 | 效率优化 |
| **Gene** | `learning-optimizer` | 机器学习优化器 | 自进化能力 |
| **Capsule** | `7zi-collaboration-platform` | 完整协作平台解决方案 | 一站式构建 |
| **Capsule** | `agent-workflow-engine` | 智能体工作流引擎 | 自动化编排 |

**执行步骤**:
```bash
# 发布 Gene 示例
node ~/.openclaw/skills/evomap/evomap-cli.js publish \
  --type gene \
  --name "7zi-multi-agent-orchestrator" \
  --description "多智能体协调引擎，支持任务分解、并行执行、结果聚合" \
  --capabilities '["task-decomposition", "parallel-execution", "result-aggregation"]' \
  --metrics '{"tasks": 10000, "successRate": 0.95}'

# 发布 Capsule 示例  
node ~/.openclaw/skills/evomap/evomap-cli.js publish \
  --type capsule \
  --name "7zi-agent-workflow-engine" \
  --description "完整的工作流自动化引擎，支持可视化编辑、版本管理、执行追踪"
```

---

### 行动 3: 将 Evomap 集成到 7zi 主系统 🔧 战略投入

**目标**: 让 7zi 的智能体能够:
- 发现和获取 Evomap 上的有用资产
- 将自身能力发布到 Evomap 市场
- 领取和完成任务赚取积分

**实现方案**:

```typescript
// src/lib/evomap-integration.ts
// 集成到 7zi 主系统的 Evomap 模块

import EvomapGatewayService from '~/.openclaw/skills/evomap/evomap-service';

class EvomapIntegration {
  private gateway: EvomapGatewayService;
  
  async initialize() {
    this.gateway = new EvomapGatewayService({
      heartbeatInterval: 5 * 60 * 1000,
      syncInterval: 4 * 60 * 60 * 1000,
      autoStart: true,
      onAssets: (assets) => this.handleNewAssets(assets),
      onTasks: (tasks) => this.handleNewTasks(tasks)
    });
    await this.gateway.start();
  }
  
  // 获取有益资产并应用到 7zi
  async handleNewAssets(assets: Asset[]) {
    for (const asset of assets) {
      if (asset.gdi > 70) {
        // 集成高价值资产
        await this.integrateAsset(asset);
      }
    }
  }
  
  // 发布 7zi 的智能体能力
  async publishCapability(capability: Capability) {
    await this.gateway.publish({
      type: 'gene',
      name: capability.name,
      description: capability.description,
      capabilities: capability.capabilities,
      metrics: capability.metrics
    });
  }
}
```

**集成点**:
1. `src/agents/` - 在智能体初始化时连接 Evomap
2. `src/lib/` - 提供 `EvomapIntegration` 模块
3. 定时任务 - 自动同步和发布

---

## 五、预期成果

| 行动 | 时间线 | 可量化成果 |
|------|--------|-----------|
| 恢复心跳 | 立即 | 节点 online 状态恢复 |
| 发布资产 | 1-2 天 | publishCount: 0 → 3-5 |
| 集成主系统 | 1 周 | 7zi 出现在 Evomap 市场搜索结果中 |

**最终目标**: 7zi 在 Evomap 生态中从"不可见"变为"可发现"，通过 GEP-A2A 协议获得网络效应带来的流量和能力提升。

---

## 六、风险提示

1. **心跳中断太久**: 可能需要重新注册节点
2. **发布质量**: 低质量资产会影响节点声誉
3. **Hub 限制**: 可能有发布频率限制

---

**报告生成时间**: 2026-04-29 12:15 GMT+2  
**下次检查**: 2026-04-30 预期心跳恢复验证