# 配置保护事件报告 - 2026-03-04

## 事件概述

**时间**: 2026-03-04 05:16 UTC  
**影响范围**: 3 台节点（7zi.com、bot3.szspd.cn、bot6.szspd.cn）  
**问题**: 自动管理程序修改配置文件，引入无效键导致服务异常

## 问题详情

### 受影响的配置

| 节点 | 问题 | 修复 |
|------|------|------|
| 7zi.com (bot7) | `claw-mesh.config` 包含无效属性 | 清理配置，只保留 `memberName` |
| bot6 | `agents.defaults.provider` 是无效键 | 移除 `provider` 键 |
| bot3 | Node.js 版本过旧 (v20.19.2) + DingTalk 禁用 + `commands.ownerDisplay` 无效 | 升级 Node.js 到 v22.22.0，启用 DingTalk，运行 `doctor --fix` |

### 根因分析

配置的无效键可能来自：
1. 手动修改配置文件时引入错误
2. OpenClaw 版本更新后不再支持某些旧配置项
3. 跨版本配置迁移时未清理废弃字段
4. **自动管理程序未经充分验证就修改配置**

## 紧急响应

### 1. 停止自动管理服务

```bash
# 停止服务
systemctl stop autonomous-agent.service
systemctl stop node-self-recovery.service

# 禁用开机自启
systemctl disable autonomous-agent.service
systemctl disable node-self-recovery.service
```

### 2. 清理 cron 任务

移除以下自动任务：
- `*/15 * * * * self_think.py --auto` - 自主思考
- `*/5 * * * * unified-watchdog.sh` - 监控脚本

保留：
- `*/30 * * * * swapoff -a && swapon -a` - 内存管理
- `0 2 * * * config-guardian backup` - 配置备份

### 3. 禁用脚本文件

```bash
mv /opt/cluster-agent/start-autonomy.sh .disabled
mv /opt/cluster-agent/unified-watchdog.sh .disabled
mv /opt/cluster-agent/watchdog.sh .disabled
```

### 4. 创建配置保护文档

- `/root/.openclaw/workspace/CONFIG_PROTECTION.md` - 配置保护策略
- 更新 `HEARTBEAT.md` - 添加配置安全规则
- 更新 `MEMORY.md` - 记录事件和教训

## 修复后状态

### 服务状态
- `autonomous-agent.service`: ✅ inactive (disabled)
- `node-self-recovery.service`: ✅ inactive (disabled)
- `/opt/cluster-agent/*.sh`: ✅ 已禁用

### 节点配置状态
| 节点 | OpenClaw 配置 | Picoclaw 配置 | 服务状态 |
|------|-------------|--------------|----------|
| 7zi.com | ✅ 有效 JSON | ✅ 有效 JSON | picoclaw active |
| bot3.szspd.cn | ✅ 有效 JSON | ✅ 有效 JSON | picoclaw active |
| bot6.szspd.cn | ✅ 有效 JSON | ✅ 有效 JSON | picoclaw active |

## 后续措施

### 立即执行 ✅
- [x] 停止所有自动管理服务
- [x] 清理 cron 任务
- [x] 禁用自动管理脚本
- [x] 创建配置保护文档
- [x] 更新 HEARTBEAT.md 和 MEMORY.md

### 长期改进
- [ ] 审查所有配置修改脚本，添加验证逻辑
- [ ] 实施配置变更审批流程
- [ ] 添加配置键白名单验证
- [ ] 建立配置回滚机制

## 配置修改流程（新规则）

任何配置修改必须遵循：

1. **备份**: `config-guardian backup`
2. **审核**: 人工确认修改内容
3. **执行**: 使用增量修改（jq 或 Python）
4. **验证**: `config-guardian validate && openclaw status`

## 教训

1. **自动管理风险**: 未经充分验证的自动配置修改可能引入严重问题
2. **版本兼容性**: 配置键可能随版本更新而废弃，需要定期审查
3. **保护机制**: 必须建立配置修改的审批和验证流程
4. **最小权限**: 自动脚本不应有直接修改生产配置的权限

---
**报告生成时间**: 2026-03-04 05:22 UTC  
**执行人**: 集群主管
