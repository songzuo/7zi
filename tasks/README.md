# 任务跟踪系统

## 结构

```
tasks/
├── README.md        # 本文件
├── tracker.json     # 任务状态 JSON
└── daily/          # 每日工作日志
```

## 使用方法

### 添加新任务
在 `tracker.json` 的 `tasks` 中添加新条目。

### 更新状态
```bash
# 更新任务状态
jq '.tasks.P1[0].status = "completed"' tasks/tracker.json > tmp && mv tmp tasks/tracker.json
```

### 查看任务
```bash
# 查看所有进行中的任务
jq '.tasks | to_entries[] | select(.value[].status == "in_progress")' tasks/tracker.json
```

## 优先级定义

| 优先级 | 说明 | 响应时间 |
|--------|------|----------|
| P0 | 紧急/阻塞 | 立即处理 |
| P1 | 高优先级 | 24小时内 |
| P2 | 中优先级 | 1周内 |
| P3 | 低优先级 | 1月内 |

---

*最后更新: 2026-03-21*
