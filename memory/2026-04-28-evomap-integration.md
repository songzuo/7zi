# 7zi 平台与 Evomap 深度整合方案

**日期**: 2026-04-28  
**作者**: 智能体世界专家子代理  
**版本**: v1.0

---

## 一、整合背景与目标

### 1.1 Evomap 系统概述

Evomap 是一个基于 GEP-A2A 协议的智能体协作进化市场，核心资产类型：

| 资产类型 | 说明 | 作用 |
|---------|------|------|
| **Gene** | 解决方案的元描述 | 信号匹配、能力分类 |
| **Capsule** | 完整的解决方案包 | 可执行、可复用 |
| **EvolutionEvent** | 进化事件记录 | 成功历史、声誉积累 |

**Hub 统计**（截至 2026-04-28）：
- 总资产: 1,733,629
- 已推广: 1,221,846
- 总调用: 52,759,282
- 活跃节点: 185,918

### 1.2 7zi 平台定位

7zi 是 AI 驱动的团队管理平台，核心模块：
- **Clawmail**: 智能邮件处理
- **通知中心**: 多渠道通知系统
- **AI 主管**: 11 位专业 AI 成员协作

### 1.3 整合目标

1. **资产发布**: 将 7zi 的核心能力封装为 Gene/Capsule 发布到 Evomap 市场
2. **智能体发现**: 从 Evomap 获取优质资产增强 7zi 功能
3. **Credits 计费**: 建立双赢的积分循环系统
4. **声誉提升**: 通过 Evomap 建立 7zi 的行业影响力

---

## 二、当前连接状态

### 2.1 节点状态

| 项目 | 值 |
|------|-----|
| Node ID | `node_641a010362a13a97` |
| Hub URL | `https://evomap.ai` |
| 注册状态 | ✅ 已注册 |
| Reputation | 50 (Level 2) |
| Credits 余额 | 50 |
| Claim Code | 已失效 |

### 2.2 能力等级

**Level 2** (当前):
- ✅ `/a2a/hello`, `/a2a/fetch`, `/a2a/publish`
- ✅ `/task/list`, `/task/claim`, `/task/complete`
- ❌ 高级协作功能 (session/join, deliberation, pipeline)

**Level 3 解锁条件**: reputation ≥ 60

### 2.3 差距分析

| 项目 | 当前状态 | 目标状态 |
|------|---------|---------|
| 发布资产数 | 0 | ≥10 |
| Reputation | 50 | ≥60 |
| Credits 余额 | 50 | ≥200 |
| 资产调用次数 | 0 | ≥100 |

---

## 三、整合方案设计

### 3.1 资产发布策略 (Publish)

#### 3.1.1 封装 7zi 核心能力为 Capsule

建议发布以下 Gene/Capsule 组合：

| Capsule 名称 | 信号 (signals) | 触发场景 | GDI Score 目标 |
|-------------|----------------|---------|----------------|
| **clawmail_intent_classifier** | email_intent, classification, nlp | 邮件意图识别 | 65+ |
| **clawmail_auto_replier** | email_response, auto_reply, ai_response | AI 自动回复邮件 | 65+ |
| **multi_channel_notifier** | notification, webhook, multi_channel | 多渠道通知 | 65+ |
| **7zi_team_coordinator** | agent_coordination, team_management, workflow | AI 团队协调 | 65+ |
| **timezone_resolver** | timezone, scheduling, datetime | 跨时区处理 | 65+ |

#### 3.1.2 发布格式示例

```javascript
// 邮件意图分类 Capsule
const capsule = {
  type: 'Capsule',
  schema_version: '1.5.0',
  trigger: ['email_intent', 'classification', 'nlp'],
  summary: '7zi Clawmail Intent Classifier - AI-powered email intent classification',
  content: {
    model: 'claude-sonnet-4.6',
    capabilities: ['intent_classification', 'multi_language', 'confidence_scoring'],
    input_format: 'email_body + subject',
    output_format: 'intent_label + confidence_score',
    languages: ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de']
  },
  confidence: 0.85,
  blast_radius: { files: 1, lines: 50 },
  outcome: { status: 'success', score: 0.85 }
};

// 对应 Gene
const gene = {
  type: 'Gene',
  schema_version: '1.5.0',
  category: 'email_processing',
  signals_match: ['email_intent', 'classification', 'nlp'],
  summary: 'AI email intent classification using Claude'
};
```

#### 3.1.3 发布频率建议

- **Phase 1**: 每周发布 1-2 个高质量 Capsule
- **Phase 2**: 建立自动化发布流程 (当 7zi 解决用户问题时自动发布)
- **目标**: 3 个月内发布 20+ Capsule，reputation 达到 60+

### 3.2 智能体发现策略 (Fetch)

#### 3.2.1 发现流程

```
7zi 用户请求
    ↓
信号匹配 (Signals Matching)
    ↓
Evomap Fetch API
    ↓
GDI Score 排序
    ↓
质量过滤 (confidence ≥ 0.7)
    ↓
返回结果给用户
```

#### 3.2.2 优先获取的资产类型

| 资产类型 | 用途 | 获取频率 |
|---------|------|---------|
| **email_processing** | 增强 Clawmail | 每日 |
| **notification** | 增强通知中心 | 每周 |
| **timezone** | 跨时区功能 | 按需 |
| **error_repair** | 问题自动修复 | 每日 |
| **optimization** | 性能优化 | 每周 |

#### 3.2.3 Fetch 实现示例

```javascript
// 获取邮件处理相关 Capsule
const result = await client.fetch({
  assetType: 'Capsule',
  signals: ['email', 'notification', 'webhook'],
  limit: 10,
  minGdi: 65,  // 只获取高质量资产
  includeTasks: true
});

// 匹配 7zi 场景
if (result.success) {
  const matchedAssets = result.data.payload.results.filter(
    asset => asset.gdi_score >= 65 && asset.confidence >= 0.7
  );
  // 整合到 7zi 功能中
}
```

### 3.3 Credits 计费系统

#### 3.3.1 积分流向设计

```
┌─────────────────────────────────────────────────────────┐
│                    Credits 循环系统                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Evomap Hub                                            │
│   ┌─────────┐                                           │
│   │ Credits │◀──── 任务悬赏 (bounty)                     │
│   │  Pool   │                                           │
│   └────┬────┘                                           │
│        │ 分发                                           │
│        ▼                                                │
│   ┌─────────┐    赚取      ┌─────────┐                 │
│   │  7zi    │◀───────────│ 其他节点 │                 │
│   │  Node   │              │ (消费者) │                 │
│   └────┬────┘              └─────────┘                 │
│        │                                               │
│        │ 消耗 (Fetch API)                              │
│        ▼                                               │
│   获取资产 + 执行任务                                   │
│        │                                               │
│        ▼                                               │
│   完成任务 ──────▶ 赚取更多 Credits                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3.3.2 Credits 预算规划

| 项目 | 估算成本 | 建议预算 |
|------|---------|---------|
| 每次 Fetch | ~7 credits | 每天 5 次 = 35 credits/天 |
| 每次 Publish | 免费 | - |
| 任务完成奖励 | 20-100 credits | 每天完成 1 个 |
| 月度目标余额 | - | ≥ 500 credits |

#### 3.3.3 变现路径

1. **主动发布资产**: 发布的 Capsule 被其他节点调用时获得积分
2. **完成任务**: 领取 Evomap 任务并完成，获得 bounty
3. **企业定制**: 为企业客户提供付费的 Evomap 资产定制服务

### 3.4 协作功能升级

#### 3.4.1 Level 3 解锁路径

当前 Level 2 → Level 3 需要 reputation ≥ 60

| 指标 | 当前 | 目标 | 提升方法 |
|------|-----|------|---------|
| reputation | 50 | 60 | +10 |
| publishCount | 0 | 10 | 发布 10 个 Capsule |
| success_streak | 0 | 30 | 确保 Capsule 高成功率 |

#### 3.4.2 Level 3 独家功能

- **session/join**: 加入其他节点的协作会话
- **deliberation**: 参与集体决策
- **pipeline**: 构建任务处理管道
- **orchestration**: 任务编排能力

---

## 四、技术实现路径

### 4.1 Phase 1: 基础整合 (Week 1-2)

| 任务 | 负责人 | 交付物 |
|------|-------|--------|
| 注册 Evomap 节点 | 子代理: 系统管理员 | Claim 完成，绑定账户 |
| 发布前 3 个核心 Capsule | 子代理: Executor | clawmail + notifier + coordinator |
| 验证 Fetch 功能 | 子代理: 测试员 | 测试报告 |
| 建立心跳自动化 | 子代理: 系统管理员 | Cron job 配置 |

**代码示例 - 发布 Capsule**:

```javascript
// 封装 7zi 邮件分类能力
const result = await client.publishFix({
  signals: ['email_intent', 'classification', 'nlp'],
  summary: '7zi Clawmail Intent Classifier',
  content: JSON.stringify({
    type: 'clawmail_intent_classifier',
    version: '1.0.0',
    capabilities: ['intent_classification', 'multi_language'],
    model: 'claude-sonnet-4.6',
    input: { email: 'body + subject' },
    output: { intent: 'label', confidence: 0.85 }
  }),
  confidence: 0.85,
  blastRadius: { files: 1, lines: 50 },
  intent: 'repair'
});
```

### 4.2 Phase 2: 功能增强 (Week 3-4)

| 任务 | 负责人 | 交付物 |
|------|-------|--------|
| 集成 Evomap 资产到 Clawmail | 子代理: Executor | 智能推荐功能 |
| 任务系统对接 | 子代理: 架构师 | 任务领取 UI |
| Credits 仪表板 | 子代理: 设计师 | 积分可视化 |
| 自动化发布流程 | 子代理: 系统管理员 | CI/CD 流程 |

### 4.3 Phase 3: 生态建设 (Week 5-8)

| 任务 | 负责人 | 交付物 |
|------|-------|--------|
| 7zi Agent Store 原型 | 子代理: 架构师 | 资产展示页面 |
| 企业定制服务流程 | 子代理: 销售客服 | 服务协议 |
| Level 3 功能集成 | 子代理: Executor | 协作功能 |
| 社区运营启动 | 子代理: 推广专员 | 推广计划 |

### 4.4 关键技术决策

#### 4.4.1 资产存储策略

```
7zi 本地存储:
  ~/.evomap/assets/
    ├── published/     # 我发布的资产
    ├── cached/        # Fetch 缓存
    └── tasks/         # 任务记录
```

#### 4.4.2 缓存策略

- **资产缓存**: TTL 4 小时，避免频繁 API 调用消耗 credits
- **心跳间隔**: 5 分钟 (Hub 要求)
- **Fetch 限制**: 每天最多 50 次，控制 credits 消耗

#### 4.4.3 错误处理

```javascript
// Credits 不足时自动停止 Fetch
if (result.data?.error === 'insufficient_credits') {
  console.warn('[Evomap] Credits 不足，暂停 Fetch');
  // 触发告警通知管理员
}

// 节点离线重连
if (result.data?.status === 'offline') {
  await client.hello(); // 重新注册
}
```

---

## 五、商业价值分析

### 5.1 直接收益

| 收益来源 | 估算月收益 | 说明 |
|---------|-----------|------|
| Capsule 调用 | $50-200 | 高质量 Capsule 被广泛调用 |
| 任务完成 bounty | $100-500 | 定期完成 Evomap 任务 |
| 企业定制 | $500-2000 | 为企业客户提供付费定制 |

### 5.2 间接收益

| 收益类型 | 价值 |
|---------|------|
| **品牌曝光** | Evomap 185k+ 节点中的知名度 |
| **技术验证** | Gene/Capsule 格式的行业认可 |
| **社区资源** | 获取其他节点的优质资产 |
| **生态入口** | 7zi 成为 Evomap 生态的应用层入口 |

### 5.3 竞争壁垒

1. **垂直场景深耕**: 邮件处理是 Evomap 上稀缺的资产类型
2. **中文支持**: 多数 Evomap 节点面向英文，7zi 可填补中文空白
3. **企业级功能**: 数据安全、审计日志等企业特性

---

## 六、风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|-----|------|---------|
| Credits 耗尽 | 中 | 高 | 严格控制 Fetch 频率，建立余额告警 |
| Capsule 质量低被降权 | 中 | 中 | 确保 initial confidence ≥ 0.8 |
| Hub 连接不稳定 | 低 | 高 | 实现本地缓存和离线模式 |
| Level 3 解锁失败 | 中 | 中 | 优先提升 reputation，不追求数量 |
| 资产被竞争对手复制 | 高 | 低 | 持续迭代，保持 GDI Score 领先 |

---

## 七、里程碑

| 阶段 | 时间 | 目标 | 验收标准 |
|------|------|------|---------|
| **M1** | Week 1 | 节点 Claim 完成 | Credits ≥ 150 |
| **M2** | Week 2 | 发布 3 个核心 Capsule | reputation ≥ 55 |
| **M3** | Week 4 | Fetch 集成 Clawmail | 功能内测通过 |
| **M4** | Week 6 | reputation ≥ 60 | Level 3 解锁 |
| **M5** | Week 8 | 7zi Agent Store 上线 | 企业客户 ≥ 3 |

---

## 八、结论与建议

### 8.1 核心建议

1. **立即行动**: 节点已注册，应尽快完成 Claim 并发布首个 Capsule
2. **质量优先**: 首批 Capsule 质量决定后续 GDI Score，应精心打磨
3. **控制成本**: Credits 余额较低，应谨慎控制 Fetch 频率
4. **聚焦邮件**: 邮件处理是 7zi 差异化核心，应深耕此场景

### 8.2 下一步行动

| 优先级 | 行动 | 执行人 |
|--------|------|-------|
| P0 | 完成 Evomap Claim 绑定 | 系统管理员 |
| P0 | 发布 clawmail_intent_classifier Capsule | Executor |
| P1 | 发布 multi_channel_notifier Capsule | Executor |
| P1 | 建立 Credits 余额告警 | 系统管理员 |
| P2 | 集成 Fetch API 到 Clawmail | Executor |

---

*文档生成时间: 2026-04-28 23:45 GMT+2*  
*子代理: 智能体世界专家*  
*任务 ID: agentworld-evomap-v2*
