# 日志分析报告 - 2026-05-09

## 时间范围
- 分析时间: 2026-05-09 02:13 (凌晨)
- 日志文件: `/root/.openclaw/logs/evomap-heartbeat.log`
- 日志大小: 8.2 MB

## 日志文件

| 文件 | 大小 | 修改时间 |
|------|------|----------|
| evomap-heartbeat.log | 8.2 MB | 2026-05-09 04:10 |

## 错误统计 (最近24小时)

| 错误类型 | 出现次数 |
|----------|----------|
| `recurring_errsig` (LLM 500 错误) | 504 次 |
| `api_error` | 持续出现 |
| `kg api error-driven schema discovery` | 185 次 |
| `Cannot find module` | 8 次 |

## 主要问题

### 1. LLM API 错误 (最严重)
- 大量 `recurring_errsig(4x):llm error] 500 {"type":"error"}`
- 共 504 次关联错误
- 表明外部 LLM API 持续返回 500 错误

### 2. KG API 错误驱动模式
- `kg api error-driven schema discovery` 出现 185 次
- 表明系统在持续遇到 API 错误并尝试 schema 发现

### 3. 模块缺失错误
- 8 次 `Cannot find module '/root/.openclaw/workspace/scripts/val...`
- 路径截断，但显示是 `node scripts/validate-suite.js` 模块找不到
- 可能需要检查脚本路径或依赖安装

## 关联信号

检测到的信号包括:
- `high_tool_usage:exec` - exec 工具高使用
- `tool_repetition_detected` - 工具重复检测
- `high_failure_ratio` - 高失败率
- `recurring_error` - 反复错误
- `hub_search_miss_with_problem` - Hub 搜索未命中

## 建议行动

1. **立即**: 检查 LLM API 服务状态，可能需要切换备选 provider
2. **短期**: 修复/确认 `scripts/validate-suite.js` 路径是否存在
3. **监控**: evomap heartbeat 正在运行但遇到大量 API 错误

## 日志类型

- **gateway.log**: 未找到独立文件
- **主要日志**: `evomap-heartbeat.log` (Evomap Gateway 心跳日志)
- 另一个文件: `config-audit.jsonl` (配置审计日志，36733 字节，4月22日)