# Evomap Gateway 集成进展报告

**日期：** 2026-04-19  
**角色：** 🌟 智能体世界专家  
**模型：** minimax/MiniMax-M2.7  

---

## 一、节点状态

| 项目 | 状态 |
|------|------|
| **节点ID** | `node_909148eee8a8816a` |
| **节点密钥** | `99827e...`（已持久化） |
| **Hub注册状态** | ✅ 已注册（2026-03-07） |
| **节点存活状态** | ✅ alive |
| **认领状态** | ❌ 未认领（claimed: false） |
| **积分余额** | 0 credits |
| **发布资产数** | 0 |
| **同步次数** | 3 |

---

## 二、GEP-A2A 协议验证

### 2.1 Heartbeat 测试

```
POST /a2a/heartbeat
→ 200 OK
→ node_status: "active"
→ survival_status: "alive"
→ next_heartbeat_ms: 300000 (5分钟)
```

**结论：** ✅ Heartbeat 正常，节点在线。

### 2.2 协议合规性问题

| 问题 | 当前状态 | 要求 |
|------|---------|------|
| Heartbeat 间隔 | ❌ 15 分钟（代码） | ✅ 5 分钟 |
| 协议信封格式 | ✅ 正确 | - |
| node_secret 认证 | ✅ 正确 | - |

**发现：** `evomap-service.js` 中 `heartbeatInterval` 设为 15 分钟，但 Hub 要求 **5 分钟**（300000ms），否则节点 15 分钟后离线。

---

## 三、Hub 资产情况

### 3.1 推荐资产（来自其他节点）

| asset_id (sha256) | 触发信号 | gdi_score | 域 |
|---|---|---|---|
| 3b74edeb... | ws_disconnect, websocket_reconnect... | 70.8 | other |
| dfcf40b8b... | ws_disconnect, websocket_reconnect... | 71.0 | other |
| 5b0b06a5... | docker_build_slow, layer_cache... | 71.35 | other |
| e77f9af0... | ws_disconnect... | 71.0 | other |
| 6321bad1... | n_plus_one, sql_performance... | 71.0 | other |

### 3.2 可用任务

```
available_work: []  ← 目前无任务
```

---

## 四、Skill 代码检查

### 4.1 已有文件

```
evomap/
├── SKILL.md           (1101 bytes) - 技能描述
├── evomap-client.js   (16169 bytes) - 核心客户端
├── evomap-service.js  (5050 bytes) - Gateway 服务
└── evomap-cli.js     (5540 bytes) - CLI 工具
```

### 4.2 已验证功能

| 功能 | 状态 | 备注 |
|------|------|------|
| 节点注册 (hello) | ✅ | node_id + node_secret 已获取 |
| 心跳 (heartbeat) | ✅ | 正常工作 |
| 资产获取 (fetch) | ✅ | 返回推荐资产 |
| 资产发布 (publish) | ⚠️ | 未测试，代码存在 |
| 任务领取 | ⚠️ | 未测试，API 存在 |

### 4.3 缺失项

- ❌ **服务未作为守护进程运行** — 当前无 evomap 进程
- ❌ **未认领节点** — claim_url 未访问
- ❌ **无资产发布记录** — publishCount = 0
- ⚠️ **Heartbeat 间隔需修正** — 15min → 5min

---

## 五、关键发现

### 5.1 紧急问题

1. **Heartbeat 间隔错误** — `evomap-service.js` 第 10 行设为 15 分钟，Hub 要求 5 分钟。节点随时可能离线。
2. **服务未启动** — 没有后台进程运行 evomap-service.js

### 5.2 战略观察

- Hub 运行正常，协议完全合规
- 节点状态 "alive"，说明上次 heartbeat（2026-03-07）后一段时间内在线，但可能已离线
- 无可用任务（available_work=[]），可能是任务池暂时为空或节点未开启 worker 模式
- Hub 推荐资产质量较高（gdi_score 70+），有参考价值

---

## 六、建议行动

| 优先级 | 行动 | 预计工时 |
|--------|------|---------|
| 🔴 P0 | 修正 heartbeat 间隔 15min → 5min | 5 分钟 |
| 🔴 P0 | 启动 evomap-service.js 守护进程 | 10 分钟 |
| 🟡 P1 | 访问 claim_url 认领节点 | 5 分钟 |
| 🟡 P1 | 开启 worker_enabled 获取任务分配 | 30 分钟 |
| 🟢 P2 | 发布第一个 Capsule（测试） | 1 小时 |

---

## 七、结论

Evomap Gateway **集成已完成基础工作**，但**服务未实际运行**。节点已注册，GEP-A2A 协议验证正常，Hub 可访问。下一步需要：

1. 修正 heartbeat 间隔（关键！）
2. 将服务部署为后台守护进程
3. 认领节点获取完整身份

---

*报告生成时间：2026-04-19 08:20 GMT+2*  
*角色：🌟 智能体世界专家*
