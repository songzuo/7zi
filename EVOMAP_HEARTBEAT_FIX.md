# EVOMAP_HEARTBEAT_FIX - Heartbeat 间隔修复报告

**日期**: 2026-10-21  
**角色**: 🌟 智能体世界专家  
**任务**: 修复 Evomap 集成紧急问题

---

## 一、发现的问题

### 问题 1: `evomap-cli.js` Loop 命令 heartbeat 间隔错误

| 项目 | 详情 |
|------|------|
| **文件** | `/root/.openclaw/skills/evomap/evomap-cli.js` |
| **位置** | 第 128 行 |
| **问题** | `setInterval` 使用 `15 * 60 * 1000` (15分钟) |
| **要求** | Hub 要求 heartbeat 间隔为 5 分钟 (300000ms) |
| **影响** | 使用 `node evomap-cli.js loop` 命令时节点会离线 |

### 问题 2: 节点 ID 不匹配

| 项目 | 详情 |
|------|------|
| **任务描述** | 验证节点 ID `node_909148eee8a8816a` |
| **实际当前节点** | `node_641a010362a13a97` |
| **说明** | Hub 在重新 hello 时分配了新节点 ID，旧 ID 已失效 |

---

## 二、实施的修复

### 修复 1: `evomap-cli.js` Heartbeat 间隔修正

**修改前**:
```javascript
}, 15 * 60 * 1000); // 15 minutes
```

**修改后**:
```javascript
}, 5 * 60 * 1000); // 5 minutes
```

**文件**: `/root/.openclaw/skills/evomap/evomap-cli.js`  
**行号**: 128

### 已确认正常的配置

| 文件 | 配置 | 状态 |
|------|------|------|
| `evomap-service.js` | `heartbeatInterval: 5 * 60 * 1000` | ✅ 正确 |
| Crontab (心跳) | `*/5 * * * *` | ✅ 正确 |

---

## 三、节点状态验证

### 当前节点信息

```
Node ID:      node_641a010362a13a97
注册状态:     registered: true
最后心跳:     2026-10-21T04:05:04.097Z
存活状态:     survival_status: alive
Claim 状态:   claimed: false
积分余额:     1.15 credits
发布资产数:   0
同步次数:     17
```

### Hub 要求

- **Heartbeat 间隔**: 5 分钟 (300000ms)
- **节点离线时间**: 超过 15 分钟无心跳，节点标记为 offline

---

## 四、后续建议

### 立即建议

1. **更新节点认领**
   - 节点 `node_641a010362a13a97` 已注册但未认领
   - 执行 `node evomap-cli.js hello` 获取 claim URL 并认领

2. **发布首个资产**
   - 当前 `publishCount: 0`，从未发布过任何 Gene/Capsule
   - 建议发布一个旅行规划相关的测试 Capsule

3. **启用 Worker 模式**
   - 当前 heartbeat 未设置 `workerEnabled: true`
   - 如需领取任务，需配置 worker 模式

### 架构建议

1. **清理旧节点 ID**
   - 历史记录中存在 `node_909148eee8a8816a`
   - 该节点 ID 已失效，应以 `node_641a010362a13a97` 为准

2. **统一心跳机制**
   - 当前通过 Crontab + `evomap-cli.js` 维持心跳
   - 建议统一使用 `evomap-service.js` 守护进程

3. **Evomap 集成模块**
   - 建议按 `EVOMAP_INTEGRATION_PLAN.md` 创建 `7zi-backend/evomap/` 模块
   - 实现 Travel Capsule 构造器，将旅行规划发布到 Hub

---

## 五、相关文件路径

| 文件 | 路径 |
|------|------|
| Evomap Skill 根目录 | `/root/.openclaw/skills/evomap/` |
| 核心客户端 | `/root/.openclaw/skills/evomap/evomap-client.js` |
| Gateway 服务 | `/root/.openclaw/skills/evomap/evomap-service.js` |
| CLI 工具 | `/root/.openclaw/skills/evomap/evomap-cli.js` |
| 节点数据目录 | `~/.evomap/` |
| Heartbeat 日志 | `~/.openclaw/logs/evomap-heartbeat.log` |
| 集成方案文档 | `/root/.openclaw/workspace/EVOMAP_INTEGRATION_PLAN.md` |

---

## 六、修复确认

```bash
# 验证 heartbeat 间隔已修正
grep -n "5 \* 60 \* 1000" /root/.openclaw/skills/evomap/evomap-cli.js
# 输出: 128:      }, 5 * 60 * 1000); // 5 minutes

# 检查当前节点状态
node /root/.openclaw/skills/evomap/evomap-cli.js status

# 发送测试心跳
node /root/.openclaw/skills/evomap/evomap-cli.js heartbeat
```

---

*报告生成时间: 2026-10-21 06:15 GMT+2*  
*角色: 🌟 智能体世界专家*
