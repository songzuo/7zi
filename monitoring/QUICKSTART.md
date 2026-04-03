# 监控系统快速启动指南

## 一键部署

```bash
# 1. 进入监控目录
cd /root/.openclaw/workspace/monitoring

# 2. 配置告警通知 (可选)
cat > .env << EOF
SMTP_PASSWORD=your_smtp_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
EOF

# 3. 启动监控栈
./scripts/deploy.sh deploy

# 4. 验证服务
./scripts/health-check.sh
```

## 访问地址

| 服务 | 地址 | 凭据 |
|------|------|------|
| Grafana | http://localhost:3001 | admin / 7zi_monitor_2026 |
| Prometheus | http://localhost:9090 | - |
| AlertManager | http://localhost:9093 | - |
| cAdvisor | http://localhost:8080 | - |

## 常用命令

```bash
# 查看服务状态
./scripts/deploy.sh status

# 查看日志
./scripts/deploy.sh logs prometheus

# 停止监控栈
./scripts/deploy.sh stop

# 重启监控栈
./scripts/deploy.sh restart

# 健康检查
./scripts/health-check.sh
```

## 应用集成

```typescript
// app/api/metrics/route.ts
import { GET } from '@/lib/monitoring/metrics-exporter'
export { GET }
```

## 下一步

1. 配置告警通知渠道 (编辑 .env)
2. 导入自定义仪表盘
3. 添加更多监控目标
4. 配置远程服务器监控
