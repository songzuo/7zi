# OpenClaw 备份策略文档 v2.0

## 备份方案

### 备份内容
| 类别 | 路径 | 说明 |
|------|------|------|
| 工作区 | /root/.openclaw/workspace/ | 所有项目文件（排除 .git, node_modules, .next） |
| 配置 | /root/.openclaw/openclaw.json | OpenClaw 核心配置 |
| 凭据 | /root/.openclaw/credentials/ | 敏感凭据 |
| 技能 | /root/.openclaw/skills/ | 自定义技能 |
| 状态 | /root/.openclaw/state/ | OpenClaw 状态 |
| SSH | ~/.ssh/ | SSH 密钥 |

### 备份位置
- **每日**: `/root/.backup/daily/` (最近 7 份)
- **每周**: `/root/.backup/weekly/` (最近 4 份)
- **每月**: `/root/.backup/monthly/` (最近 12 份)
- **配置**: `/root/.backup/config/` (最近 30 份)

### 自动备份
- **时间**: 每天 03:00
- **监控**: 每天 08:00 检查备份状态
- **恢复测试**: 每月 1 号自动测试

## 备份脚本

| 脚本 | 用途 |
|------|------|
| `/root/.backup/backup.sh` | 执行备份（带校验和） |
| `/root/.backup/restore.sh` | 恢复数据（带验证） |
| `/root/.backup/monitor.sh` | 监控备份状态 |
| `/root/.backup/report.sh` | 生成状态报告 |

## 恢复命令

```bash
# 查看可用备份
ls /root/.backup/daily/
ls /root/.backup/weekly/
ls /root/.backup/monthly/

# 测试恢复（不覆盖，恢复到临时目录）
/root/.backup/restore.sh /root/.backup/daily/workspace_YYYYMMDD_HHMMSS.tar.gz --test

# 恢复到指定目录
/root/.backup/restore.sh <backup_file> /path/to/target

# 生产恢复（需要确认，覆盖原位置）
/root/.backup/restore.sh /root/.backup/daily/workspace_YYYYMMDD_HHMMSS.tar.gz
```

## 验证状态

### 校验和验证
- 所有备份生成 SHA256 校验和
- 存储在 `/root/.backup/daily/CHECKSUMS.txt`
- 恢复时自动验证完整性

### 监控检查
- ✅ 备份年龄检查（>26 小时告警）
- ✅ 备份大小检查（<10MB 告警）
- ✅ 校验和验证
- ✅ 月度恢复测试
- ✅ 磁盘空间检查（>80% 告警）

### 当前状态
- ✅ 自动备份已配置 (crontab)
- ✅ 首次备份完成 (147MB, 27411 文件)
- ✅ 恢复测试通过
- ✅ 监控任务已配置
- ✅ 状态报告已生成

## 保留策略

| 类型 | 保留数量 | 自动清理 |
|------|---------|---------|
| 每日备份 | 7 份 | 是 |
| 每周备份 | 4 份 | 是 |
| 每月备份 | 12 份 | 是 |
| 配置备份 | 30 份 | 是 |

## 自动化任务 (Crontab)

```
0 3 * * *   /root/.backup/backup.sh           # 每日备份
0 8 * * *   /root/.backup/monitor.sh          # 状态监控
```

## 通知配置

监控脚本支持 Telegram 通知（可选）：
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
```

告警触发条件：
- 备份超过 26 小时未更新
- 备份文件过小 (<10MB)
- 校验和验证失败
- 磁盘使用率 >80%
- 恢复测试文件数过少

## 状态报告

每日报告生成在：`/root/.openclaw/workspace/reports/backup-status-YYYY-MM-DD.md`

---
*最后更新：2026-03-06*
