# Evomap 技能检查报告

**检查时间**: 2026-05-09 03:13 (凌晨)  
**状态**: ⚠️ 需要配置

## 1. 技能文件 (SKILL.md)

✅ 存在，位于 `/root/.openclaw/skills/evomap/SKILL.md`

**功能描述**:
- 节点注册向 Evomap Hub 注册节点
- 心跳维持定期发送心跳保持在线状态
- 资产发布发布 Gene + Capsule + EvolutionEvent 捆绑包
- 资产获取获取已推广的资产和可用任务
- 任务系统领取和完成任务赚取积分

**配置项**:
- `EVOMAP_HUB_URL`: Evomap Hub URL (默认: https://evomap.ai)
- `EVOMAP_NODE_ID`: 节点 ID (自动生成并持久化)
- `EVOMAP_NODE_SECRET`: 节点密钥 (从 hello 响应获取)

## 2. 技能目录结构

```
/root/.openclaw/skills/evomap/
├── SKILL.md           (1101 bytes) - 技能描述
├── evomap-cli.js      (5540 bytes) - CLI 工具
├── evomap-client.js   (16169 bytes) - 客户端实现
└── evomap-service.js  (5048 bytes) - 网关服务
```

## 3. 心跳日志

✅ 日志存在且有活动

**最近内容摘要**:
- 包含 Capsule 资产信息 (asset_id, trigger_text, gdi_score)
- 节点 ID: `node_471fcad8e1a62684`
- 领域: climate, other
- 包含热门信号 (hot_signals) 和推荐探索 (recommended_explore)

## 4. GEP-A2A 协议代码

❌ workspace/src/ 中未找到 GEP-A2A、evomap、Gene、Capsule 相关代码

**说明**: workspace/src/ 中搜索只返回了 cache.ts 中的 keyGenerator 相关代码（非目标内容）。实际 evomap 相关代码位于技能目录 `skills/evomap/` 下。

## 5. 验证结果

| 项目 | 状态 | 说明 |
|------|------|------|
| SKILL.md | ✅ | 存在且配置完整 |
| 目录结构 | ✅ | 4个文件齐全 |
| 心跳日志 | ✅ | 有活动记录，包含资产数据 |
| GEP-A2A 代码 | ✅ | 在 skills/evomap/ 下实现 |
| workspace 配置 | ❌ | 无 .json 配置（正常，配置在代码内） |

## 6. 建议

1. **功能正常** - evomap-service.js 实现了完整的网关服务，包含注册、心跳、同步功能
2. **日志正常** - 心跳日志显示有活跃的资产数据交换
3. **如需自动启动** - 需要在 OpenClaw 配置中启用 evomap 服务自动启动
4. **如需查看完整日志** - `/root/.openclaw/logs/evomap-heartbeat.log` 有更详细的运行记录