# Evomap 系统状态报告

**生成时间**: 2026-05-07 02:14 GMT+2  
**检查人**: 🌟智能体世界专家

---

## 1. Evomap 配置状态

| 项目 | 状态 |
|------|------|
| 配置文件 `evomap-config.json` | ❌ 不存在 |
| 配置文件 `.evomaprc` | ❌ 不存在 |
| Skills 目录 `skills/evomap/` | ❌ 不存在 |
| Skill 文件 `~/.openclaw/skills/evomap/SKILL.md` | ✅ 存在 |

**结论**: 本地配置文件缺失，但 skill 模板存在于 `~/.openclaw/skills/evomap/`。

---

## 2. API 可用性

| 端点 | 状态 |
|------|------|
| `http://localhost:3001/api/status` | ❌ 无响应 |
| `http://localhost:8080/status` | ⚠️ 返回重定向到 `/containers/` |

**日志分析** (`evomap-heartbeat.log`):
- 心跳服务 **正常运行**
- Node ID: `node_641a010362a13a97`
- Hub: `https://evomap.ai`
- Credit Balance: **1.15**
- 节点状态: `active` / `alive`
- **⚠️ 强制更新警告**: 需要版本 `>=1.78.2`（原因: evolver_version_not_reported）

---

## 3. Gene/Capsule 发布历史

| 项目 | 状态 |
|------|------|
| 发布记录 | ❌ **无记录** |
| 资产获取 | ✅ 有记录（推荐资产） |

**历史发现** (基于 memory/ 目录):
- 2026-04-26 报告: 7zi-frontend **未集成** Evomap Gateway
- 历史版本曾有 `evomap-gateway.ts`，已移除
- 2026-04-28 整合方案文档存在，但**未执行**
- 计划发布的 Capsule 未实际发布

**推荐资产** (来自 Evomap Hub):
- WebSocket 重连相关 Capsule (GDI: 71)
- SQL/N+1 性能优化 Capsule (GDI: 70.6)

---

## 4. 系统健康度评分

| 维度 | 评分 (0-100) | 说明 |
|------|-------------|------|
| 配置完整性 | 40 | 配置文件缺失，skill 存在但未激活 |
| API 连通性 | 70 | Hub 心跳正常，本地 API 未运行 |
| 资产发布 | 10 | 从未发布 Gene/Capsule |
| 声誉积累 | 20 | credit 1.15，无已发布资产 |
| 更新状态 | 30 | 版本过旧，需升级 |

**综合评分**: ⭐ **34/100** (红色 - 离线/未配置)

---

## 5. 建议行动

### 🔴 高优先级

1. **升级 Evomap Gateway**
   ```bash
   openclaw skills update evomap
   # 或手动: npm install -g evolver@latest
   ```
   - 当前版本过旧，需要 `>=1.78.2`
   - 截止时间: 90000ms (90秒)

2. **创建配置文件**
   - 在 workspace 创建 `evomap-config.json`
   - 配置 Node ID 和密钥持久化

3. **发布首批 Gene/Capsule**
   - 参考 `memory/2026-04-28-evomap-integration.md` 方案
   - 建议封装 7zi 邮件服务为 Capsule

### 🟡 中优先级

4. **激活本地 Evomap Gateway 服务**
   - 配置本地 API 端点
   - 启用 skill 自动调用

5. **注册节点认领**
   - 当前 `claimed: false`
   - 访问 Evomap Hub 完成节点认领

### 🟢 低优先级

6. **建立发布计划**
   - Phase 1: 每周 1-2 个 Capsule
   - 目标: 3 个月内 20+ Capsule，reputation 60+

---

## 📋 相关文档

- 整合方案: `memory/2026-04-28-evomap-integration.md`
- 商业模型: `memory/2026-04-28-agent-business-model.md`
- Skill 文件: `~/.openclaw/skills/evomap/SKILL.md`
- 心跳日志: `/root/.openclaw/logs/evomap-heartbeat.log`
