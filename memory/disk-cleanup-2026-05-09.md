# 磁盘清理报告 - 2026-05-09

## 执行时间
2026-05-09 04:43 (凌晨)

## 已清理项

### 1. 测试覆盖率文件 (coverage-*.json)
- **删除文件数**: ~712 个
- **释放空间**: ~19 MB
- **位置**: `/root/.openclaw/workspace/coverage/` 及各项目子目录

### 2. 备份文件 (*.bak)
- **删除文件数**: 3 个
- **释放空间**: 很小 (配置文件)
- **位置**: `monitoring/prometheus/rules/`, `monitoring/prometheus/`, `monitoring/alertmanager/`

### 3. 会话临时文件 (sessions.json.*.tmp)
- **结果**: 未发现此类文件

## 总计释放空间
**约 20 MB** (coverage 文件为主)

## 剩余大目录 (需关注)

| 目录 | 大小 | 说明 |
|------|------|------|
| `botmem/` | 1.3 GB | 最大占用 |
| `botmem/mem9/` | 878 MB | openclaw-plugin (610MB node_modules) + dashboard (269MB) |
| `botmem/bot6/` | 118 MB | |
| `logs/archive/` | 236 MB | 历史日志存档，最大单文件 47MB |
| `coverage/` | 0 MB | 已清理 (现存在子项目 .gitignore) |

## 建议后续清理
1. **botmem/mem9/** - 610MB 的 node_modules 可能可精简，但需确认项目是否仍在使用
2. **logs/archive/** - 236MB 历史日志，可按日期清理旧文件
3. **botmem/bot6/** - 118MB，查看是否可归档

## 当前磁盘状态
- 总容量: 145 GB
- 已使用: 72 GB
- 可用: 73 GB
- 使用率: 50%