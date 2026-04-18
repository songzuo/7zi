# Evomap 智能体世界布局策略研究报告

**报告日期：** 2026-04-18  
**分析师角色：** 📚 咨询师  
**模型：** minimax/MiniMax-M2.7  
**参考文档：** AGENT_WORLD_STRATEGY_v200.md, evomap/SKILL.md

---

## 一、Evomap 系统深度分析

### 1.1 GEP-A2A 协议架构

Evomap 采用 **GEP-A2A (General Evolvable Protocol - Agent to Agent)** 协议，当前版本 v1.0.0：

**协议信封结构：**
```json
{
  "protocol": "gep-a2a",
  "protocol_version": "1.0.0",
  "message_type": "hello|heartbeat|publish|fetch|report|revoke",
  "message_id": "msg_<timestamp>_<random>",
  "sender_id": "node_<hex>",
  "timestamp": "ISO8601",
  "payload": { ... }
}
```

**核心端点：**
| 端点 | 方法 | 用途 |
|------|------|------|
| `/a2a/hello` | POST | 节点注册，获取 node_secret |
| `/a2a/heartbeat` | POST | 维持在线状态 |
| `/a2a/publish` | POST | 发布 Gene/Capsule/EvolutionEvent |
| `/a2a/fetch` | POST | 获取资产和任务 |
| `/a2a/report` | POST | 提交验证报告 |
| `/a2a/revoke` | POST | 撤回资产 |

### 1.2 Gene/Capsule 资产系统

**Gene（基因）：**
- 资产的核心元数据
- 包含 `signals_match`（触发信号匹配）
- Schema v1.5.0
- 通过 SHA256 规范化计算 asset_id

**Capsule（胶囊）：**
- 资产的完整内容载体
- 包含 `content`（详细解决方案）
- 包含 `confidence`（置信度 0-1）
- 包含 `blast_radius`（影响范围）
- 关联到对应的 Gene

**EvolutionEvent（进化事件）：**
- 记录资产的生命周期
- 包含 `intent`（repair/optimize/innovate）
- 追踪 `mutations_tried` 和 `total_cycles`
- 用于 Evomap 系统的进化算法

**资产关系：**
```
Gene ──asset_id──> Capsule
Capsule ──asset_id──> EvolutionEvent
EvolutionEvent ──genes_used──> [Gene, ...]
```

### 1.3 任务系统

Evomap Hub 提供悬赏任务机制：
- **listTasks** - 获取可用任务列表
- **claimTask** - 领取任务（获得唯一 task_id）
- **completeTask** - 提交 solution asset 完成任务
- **getMyTasks** - 查看已领取任务

**积分机制：** 完成任务获取积分，可在 Hub 内兑换服务或提升声誉。

### 1.4 节点注册与身份

**节点注册流程（hello）：**
1. 发送 capabilities、gene_count、env_fingerprint
2. Hub 返回 node_secret（需持久化保存）
3. 可选返回 claim_code/claim_url（用于认领节点）

**身份认证：** node_secret 作为 Bearer Token 认证后续请求。

---

## 二、7zi 项目整合机会分析

### 2.1 当前 7zi 能力 vs Evomap 需求

| 7zi 已有能力 | Evomap 整合切入点 |
|-------------|------------------|
| A2A Protocol v2 (`src/lib/a2a/`) | 协议层兼容，可扩展为 GEP-A2A |
| MultiAgentOrchestrator | 可作为 Evomap 节点的能力引擎 |
| Learning Optimizer (~33,500 行) | 可生成高质量修复 Gene |
| Task Decomposer | 任务领取和分解机制已有 |
| Error Repair 能力 | 与 Gene 的 signals_match 高度契合 |

### 2.2 四大战略维度对齐

**v2.0 战略维度与 Evomap 的协同：**

| 维度 | 7zi v2.0 目标 | Evomap 整合价值 |
|------|--------------|----------------|
| 多智能体协作进化 | 群体智能、动态团队组建 | Hub 可作为跨节点协作媒介 |
| 自学习能力深化 | 增量学习、元学习 | EvolutionEvent 追踪进化轨迹 |
| 长期记忆系统 | 四层记忆架构 | Hub 可作为外部知识市场 |
| 主动服务架构 | 预见式服务 | Capsule 作为可复用解决方案 |

### 2.3 具体整合机会

**机会 1：Error Repair Gene 市场**

7zi 的 Learning Optimizer 和 Error Repair 模块可生成大量修复方案：
- 将成功修复发布为 Capsule
- 从 Hub 获取他人发布的修复方案
- 形成 Error Repair Gene 知识网络

**机会 2：跨节点任务协作**

当前 MultiAgentOrchestrator 仅限本地：
- 通过 Evomap Hub 承接外部任务
- 将复杂任务分解后发布到 Hub
- 形成跨节点的层级协作网络

**机会 3：资产变现与积分获取**

- 7zi 开发者发布高质量 Capsule 赚取 Hub 积分
- 积分可兑换 Evomap 提供的增值服务
- 形成良性生态循环

---

## 三、竞争格局与 Evomap 定位

### 3.1 类似平台对比

| 平台 | 定位 | 与 Evomap 差异 |
|------|------|---------------|
| **Anthropic Claude** | 基础模型 + Tool Use | 非资产市场 |
| **OpenAI GPTs** | 单 Agent 定制 | 无多 Agent 协作 |
| **AutoGen/CrewAI** | 开源多 Agent 框架 | 无资产变现机制 |
| **Evomap** | 协作进化市场 | 唯一资产+任务双市场 |

### 3.2 Evomap 的差异化价值

1. **进化算法驱动**：通过 Gene/Capsule/EvolutionEvent 实现解决方案的优胜劣汰
2. **信号匹配机制**：Capsule 的 `signals_match` 实现精准推荐
3. **节点网络效应**：节点越多，资产越丰富，协作越高效
4. **零成本启动**：节点注册无需付费，积分通过贡献获取

---

## 四、3-5 个具体可落地行动建议

### 建议 1：Evomap 节点集成（P0）

**行动：** 将 `evomap-service.js` 集成到 7zi 主服务，实现：
- 启动时自动执行 `hello()` 注册
- 每 15 分钟发送 `heartbeat()`
- 每 4 小时执行 `_sync()` 同步资产

**代码路径：** `src/lib/evomap/gateway-service.ts`

**价值：** 7zi 节点加入 Evomap Hub 网络，获得任务入口和资产来源

**预计工时：** 1-2 天

---

### 建议 2：自动发布 Error Repair Capsule（P0）

**行动：** 在 Learning Optimizer 成功修复 bug 后，自动调用 `publishFix()`：
```typescript
// 修复成功后
await evomapService.publishSolution({
  signals: ['TypeError', 'undefined is not a function', errorStackPattern],
  summary: `修复 ${errorType}: ${errorMessage.substring(0, 100)}`,
  content: fixContent,
  confidence: successRate,
  blastRadius: { files: changedFiles.length, lines: changedLines },
  diff: gitDiff,
  intent: 'repair'
});
```

**价值：** 积累 Evomap 资产，提升 Hub 声誉，获取积分

**预计工时：** 2-3 天

---

### 建议 3：任务领取与自动执行工作流（P1）

**行动：** 实现任务领取自动化：
1. 每小时调用 `listTasks()` 获取高积分任务
2. 匹配 7zi Agent 能力与任务需求
3. 匹配成功则 `claimTask()`
4. 任务分解后执行，结果 `completeTask()`

**价值：** 7zi 具备持续赚取 Hub 积分的自动化能力

**预计工时：** 3-4 天

---

### 建议 4：Capsule 回流学习（P1）

**行动：** Hub 同步回来的 Capsule 自动入知识库：
1. 解析 Capsule 的 `signals` 和 `content`
2. 提取可复用的 error pattern 到 Learning Optimizer
3. 验证有效后纳入 Agent 技能库

**价值：** 7zi 持续吸收全网最佳修复方案，加速自我进化

**预计工时：** 2-3 天

---

### 建议 5：构建 7zi-Gene 标准（P2）

**行动：** 制定 7zi 专属 Gene 规范，与 Evomap 协议对齐：
- 扩展 signals_match 覆盖 7zi 特有错误类型
- 定义 Capsule 的 `env_requirements` 明确适用场景
- 建立 7zi Hub 节点联盟（可选）

**价值：** 7zi 在 Evomap 生态中形成差异化品牌，吸引同类节点协作

**预计工时：** 1 周（需架构师参与）

---

## 五、风险评估

| 风险 | 影响 | 应对 |
|------|------|------|
| Evomap Hub 不可用 | 节点离线，无法同步 | 本地缓存 + 重试机制 |
| 资产质量不佳影响声誉 | Hub 评分下降 | 仅发布验证通过的修复 |
| 任务复杂度超出能力 | 任务失败扣分 | 严格筛选 + 预评估 |
| GEP-A2A 协议升级 | 需同步更新 | 监控协议版本变更 |

---

## 六、结论

Evomap 为 7zi 提供了**进入多智能体协作市场**的战略入口。通过 GEP-A2A 协议，7zi 可以：

1. **资产变现** - 将 Error Repair 能力转化为 Hub 积分
2. **能力引入** - 获取全网高质量修复方案
3. **生态共建** - 成为 Evomap 节点网络的重要参与者

**建议优先级：**
- 🔴 P0：建议 1（节点集成）+ 建议 2（自动发布）
- 🟡 P1：建议 3（任务领取）+ 建议 4（Capsule 回流）
- 🟢 P2：建议 5（7zi-Gene 标准）

---

*报告生成时间：2026-04-18 02:40 GMT+2*  
*分析师：📚 咨询师*  
*任务标签：evomap-research-0418*
