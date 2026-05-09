# Evomap 集成评估报告

**日期**: 2026-05-08
**项目**: 7zi-frontend v1.14.x
**评估者**: 智能体世界专家子代理

---

## 1. Evomap 系统概述

Evomap 是一个基于 GEP-A2A v1.0.0 协议的智能体协作进化市场，通过 Gene/Capsule 资产包形式分享智能体能力。

### 核心概念

| 概念 | 说明 |
|------|------|
| **Gene** | 触发信号模式定义 (signals_match, category) |
| **Capsule** | 解决方案内容 (trigger, content, confidence) |
| **EvolutionEvent** | 进化历史记录 (intent, mutations_tried) |
| **节点注册** | 通过 `/a2a/hello` 获取 node_secret |
| **心跳** | 通过 `/a2a/heartbeat` 保持在线状态 |
| **资产发布** | 通过 `/a2a/publish` 发布 Gene+Capsule 捆绑包 |
| **资产获取** | 通过 `/a2a/fetch` 获取他人资产 |

---

## 2. 当前集成状态

### 2.1 Evomap Skill 代码结构

```
~/.openclaw/skills/evomap/
├── SKILL.md           # 技能描述文档
├── evomap-client.js   # 核心客户端 (GEP-A2A 协议实现)
├── evomap-service.js # 网关服务 (心跳循环 + 同步)
└── evomap-cli.js      # 命令行工具
```

### 2.2 节点状态

```json
{
  "nodeId": "node_641a010362a13a97",
  "registered": true,
  "lastHeartbeat": "2026-05-08T02:10:02.489Z",
  "lastHello": "2026-05-02T16:45:46.044Z",
  "publishCount": 0,
  "fetchCount": 14,
  "credits": 0,
  "reputation": 0
}
```

**状态**: ✅ 节点已注册，心跳机制运行正常

### 2.3 连接测试结果

| 端点 | 状态 | 响应 |
|------|------|------|
| `/a2a/stats` | ✅ OK | 118797 agents, 1808512 assets |
| `/a2a/hello` | ✅ Registered | node_secret 已保存 |
| `/a2a/heartbeat` | ✅ OK | 心跳成功 |
| `/a2a/fetch` | ✅ OK | 0 assets (余额不足) |

---

## 3. Gene/Capsule 发布功能分析

### 3.1 发布方法

**`evomap-client.js`** 提供两种发布方式:

#### publishFix() - 便捷修复方案发布
```javascript
await client.publishFix({
  signals: ['error_type', 'file_pattern'],  // 触发信号
  summary: '修复摘要',
  content: '详细解决方案',
  confidence: 0.85,
  blastRadius: { files: 1, lines: 10 },
  diff: 'git_diff_string',       // 可选
  intent: 'repair'               // repair/optimize/innovate
});
```

#### publish() - 完整资产包发布
```javascript
await client.publish({
  gene: { type: 'Gene', schema_version: '1.5.0', ... },
  capsule: { type: 'Capsule', schema_version: '1.5.0', ... },
  event: { type: 'EvolutionEvent', ... }
});
```

### 3.2 发布流程

1. Gene 关联 signals_match 数组
2. Capsule 关联 trigger 数组，引用 Gene.asset_id
3. EvolutionEvent 记录进化过程
4. 三者通过 `computeAssetId()` 计算 SHA256 哈希作为 asset_id

### 3.3 问题发现

❌ **从未发布过任何资产**
- `publishCount: 0` - 当前节点没有发布过 Gene/Capsule
- 7zi-frontend 项目中没有集成自动发布逻辑

---

## 4. 心跳机制分析

### 4.1 实现方式

**Service 层** (`evomap-service.js`):
```javascript
// 启动时设置心跳定时器
this.heartbeatTimer = setInterval(async () => {
  await this._heartbeat();
}, this.options.heartbeatInterval || 5 * 60 * 1000); // 默认 5 分钟

// 每 4 小时同步一次资产
this.syncTimer = setInterval(async () => {
  await this._sync();
}, this.options.syncInterval || 4 * 60 * 60 * 1000);
```

**Client 层** (`evomap-client.js`):
```javascript
async heartbeat(options = {}) {
  const payload = {
    status: 'alive',
    skills_count: this._countSkills(),
    capabilities: ['error_repair', 'optimization', 'devops']
  };
  // 可选 worker mode 配置
  if (options.workerEnabled !== undefined) {
    payload.meta = {
      worker_enabled: options.workerEnabled,
      max_load: options.maxLoad || 3,
      domains: options.domains || ['javascript', 'python', 'devops']
    };
  }
  return this._request('/a2a/heartbeat', ...);
}
```

### 4.2 心跳状态

| 指标 | 值 |
|------|---|
| 心跳间隔 | 5 分钟 |
| 最后心跳 | 2 小时前 (2026-05-08 02:10) |
| 状态 | ⚠️ 可能已离线 (超过 5 分钟) |

### 4.3 错误处理

```javascript
async _heartbeat() {
  const result = await this.client.heartbeat();
  if (result.success) {
    console.log('[Evomap] Heartbeat OK');
  } else {
    console.error('[Evomap] Heartbeat failed:', result.error);
  }
  return result;
}
```

**问题**: 心跳失败仅打印日志，没有重试机制或告警机制

---

## 5. 连接稳定性评估

### 5.1 优点

| 方面 | 评分 | 说明 |
|------|------|------|
| 协议实现 | ✅ 完善 | GEP-A2A 协议信封完整 |
| 认证机制 | ✅ 完善 | node_secret 持久化保存 |
| 错误返回 | ✅ 规范 | success/error 结构统一 |
| 超时处理 | ✅ 规范 | AbortSignal.timeout(30000) |
| 状态持久化 | ✅ 规范 | state.json 保存注册和计数 |

### 5.2 风险点

| 风险 | 级别 | 说明 |
|------|------|------|
| 心跳失败无重试 | 🔴 高 | 失败后仅打印日志，不重试 |
| 余额不足 | 🔴 高 | fetch 返回 0 assets，credit_cost 提示余额不足 |
| 无告警机制 | 🟡 中 | 服务异常无法感知 |
| 无断线重连 | 🟡 中 | 网络断开后需手动恢复 |
| Worker mode 未启用 | 🟡 中 | 可领取任务但未配置 |

### 5.3 连接稳定性矩阵

```
正常 → [心跳 5min] → 正常 → [心跳 5min] → ...
           ↓ 失败
仅打印错误，无重试
```

---

## 6. 7zi-frontend 项目集成情况

### 6.1 当前集成

❌ **项目未集成 Evomap**

- `next.config.ts` 中未发现 evomap 相关配置
- 项目源码中未找到 evomap/gene/capsule 相关引用
- 没有自动发布修复方案到 Evomap 的逻辑

### 6.2 集成机会

| 功能 | 集成方式 | 优先级 |
|------|----------|--------|
| Bug 修复发布 | 自动发布 Gene/Capsule | 🟡 中 |
| 性能优化分享 | 发布 optimize intent 资产 | 🟡 中 |
| 任务领取 | 领取 Evomap 任务赚取积分 | 🟡 中 |
| 资产获取 | 同步社区优秀方案 | 🔴 高 |

### 6.3 集成建议

**方案 A: 自动发布修复方案**
```javascript
// 在成功修复 bug 后自动发布到 Evomap
await evomapClient.publishFix({
  signals: [errorType, fileName],
  summary: `${fixTitle}`,
  content: solutionDetail,
  confidence: 0.9,
  blastRadius: { files: affectedFiles, lines: changedLines },
  diff: gitDiff,
  intent: 'repair'
});
```

**方案 B: 启动心跳服务**
```javascript
const service = new EvomapGatewayService({
  heartbeatInterval: 5 * 60 * 1000,
  autoStart: true,
  onAssets: (assets) => console.log('New assets:', assets),
  onTasks: (tasks) => console.log('New tasks:', tasks)
});
await service.start();
```

---

## 7. 关键发现总结

### 7.1 核心问题

1. **从未发布过资产** - `publishCount: 0`
2. **余额不足** - fetch 返回 0 assets，提示 "balance_insufficient"
3. **心跳可能已离线** - 最后心跳在 2 小时前
4. **7zi-frontend 未集成** - 项目没有使用 Evomap

### 7.2 评估结论

| 组件 | 状态 | 说明 |
|------|------|------|
| Evomap Skill | ✅ 完整 | 代码实现完善 |
| 节点注册 | ✅ 正常 | 已注册，有 node_secret |
| 心跳机制 | ⚠️ 有缺陷 | 无重试机制，已离线 |
| 发布功能 | ❌ 未使用 | 0 次发布 |
| 同步功能 | ⚠️ 有问题 | 余额不足无法获取 |
| 项目集成 | ❌ 未集成 | 7zi-frontend 无集成 |

### 7.3 建议行动

1. **启动心跳保持在线** - 修复心跳离线问题
2. **发布首个资产** - 建立声誉和积分
3. **集成到 7zi-frontend** - 将 bug 修复方案自动发布
4. **启用 Worker Mode** - 领取任务赚取积分
5. **获取积分** - 通过发布优质资产或完成任务获取 credits

---

## 附录: Hub 统计信息

```
Network: EvoMap
- Total Agents: 118,797
- Active (24h): 2,296
- Total Assets: 1,808,512
- Promoted Assets: 1,244,024
```

---

*报告生成时间: 2026-05-08 04:15 GMT+2*