# Sentry 告警规则配置

本文档描述了推荐的 Sentry 告警规则和通知渠道配置。

## 告警规则

### 1. 错误率告警

**条件**:
- 在 5 分钟窗口内
- 错误数量 >= 10
- 错误率 >= 1%

**优先级**: 高 (Critical)

**通知渠道**:
- Email: tech-alerts@7zi.studio
- Slack: #tech-alerts

### 2. 关键错误告警

**条件**:
- 错误消息匹配以下关键词:
  - "ChunkLoadError"
  - "Cannot read property"
  - "TypeError"
  - "ReferenceError"
  - "Network Error"
- 在 15 分钟窗口内出现 3 次或更多

**优先级**: 高 (Critical)

**通知渠道**:
- Email: tech-alerts@7zi.studio
- Slack: #tech-alerts
- SMS: +1234567890 (仅生产环境)

### 3. 性能降级告警

**条件**:
- P95 响应时间 > 3 秒
- 在 10 分钟窗口内持续存在

**优先级**: 中 (Warning)

**通知渠道**:
- Email: tech-alerts@7zi.studio
- Slack: #tech-alerts

### 4. API 错误告警

**条件**:
- API 路由错误 (状态码 >= 500)
- 在 5 分钟窗口内错误数量 >= 5

**优先级**: 高 (Critical)

**通知渠道**:
- Email: tech-alerts@7zi.studio
- Slack: #tech-alerts

### 5. 数据库错误告警

**条件**:
- 错误类型包含 "database" 或 "sqlite"
- 在 5 分钟窗口内错误数量 >= 3

**优先级**: 高 (Critical)

**通知渠道**:
- Email: tech-alerts@7zi.studio
- Slack: #tech-alerts

### 6. 认证错误告警

**条件**:
- 认证/授权相关错误
- 错误率 >= 5%
- 在 10 分钟窗口内

**优先级**: 中 (Warning)

**通知渠道**:
- Email: tech-alerts@7zi.studio
- Slack: #tech-alerts

### 7. 浏览器/设备特定错误

**条件**:
- 特定浏览器 (Safari, Firefox, IE)
- 错误率 >= 5%
- 在 15 分钟窗口内

**优先级**: 低 (Info)

**通知渠道**:
- Email: tech-alerts@7zi.studio

### 8. 部署相关问题

**条件**:
- 新部署后错误率增加 > 50%
- 在部署后 1 小时窗口内

**优先级**: 高 (Critical)

**通知渠道**:
- Email: tech-alerts@7zi.studio
- Slack: #tech-alerts
- SMS: +1234567890 (仅生产环境)

## 通知渠道

### Email 通知

**配置**:
- **生产环境**: tech-alerts@7zi.studio
- **测试环境**: tech-alerts-dev@7zi.studio

**频率**:
- Critical 告警: 立即发送
- Warning 告警: 每小时汇总
- Info 告警: 每日汇总

### Slack 通知

**配置**:
- **生产环境**: #tech-alerts
- **测试环境**: #dev-alerts

**频率**:
- Critical 告警: 立即发送
- Warning 告警: 每小时汇总

### SMS 通知

**配置**:
- **仅生产环境**
- **仅 Critical 告警**
- 收件人: +1234567890

## 告警静默规则

### 已知问题静默

对于已知的、暂无法立即修复的问题，可以创建静默规则:

1. **第三库相关错误**
   - 来源: 第三方库（如 Google Maps, Stripe 等）
   - 条件: error.tag.source === "library"
   - 静默时长: 24 小时

2. **浏览器兼容性问题**
   - 条件: browser.name === "Safari" && browser.version < "14"
   - 静默时长: 7 天

3. **网络超时**
   - 条件: error.type === "TimeoutError"
   - 静默时长: 1 小时

### 维护窗口

在计划维护期间，可以临时暂停告警:

1. 进入 Sentry 设置 → Rules
2. 选择要暂停的规则
3. 点击 "Mute rule" 并设置恢复时间

## 告警工作流程

### 1. 告警触发
```
错误发生 → Sentry 检测 → 符合告警条件 → 触发告警
```

### 2. 通知发送
```
Sentry → Email/Slack/SMS → 团队接收
```

### 3. 响应流程
1. **收到告警** (5 分钟内)
   - 确认告警内容
   - 判断影响范围
   - 更新告警状态

2. **初步调查** (15 分钟内)
   - 查看 Sentry 事件详情
   - 检查相关日志
   - 复现问题（如果可能）

3. **修复行动** (根据严重程度)
   - **Critical**: 立即修复或回滚
   - **Warning**: 4 小时内修复
   - **Info**: 下个 Sprint 修复

4. **验证和关闭**
   - 部署修复
   - 验证问题解决
   - 在 Sentry 中关闭问题

## 配置示例

### Sentry UI 配置

1. **创建告警规则**
   ```
   Sentry → Settings → Alerts → New Alert Rule
   ```

2. **错误率告警配置**
   ```
   Issue: New Issue
   Condition: Error Rate
   Threshold: >= 1%
   Time Window: 5 minutes
   ```

3. **性能告警配置**
   ```
   Issue: Transaction Issue
   Condition: p95 duration
   Threshold: > 3000ms
   Time Window: 10 minutes
   ```

### 通过 API 配置

```bash
# 使用 Sentry API 创建告警规则
curl -X POST \
  https://sentry.io/api/0/organizations/{org}/alert-rules/ \
  -H "Authorization: Bearer {SENTRY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Error Rate",
    "environment": "production",
    "aggregate": "count()",
    "query": "is:error",
    "timePeriod": "5m",
    "thresholdType": 0,
    "resolveThreshold": 0,
    "alertThreshold": 10
  }'
```

## 监控仪表板

### 推荐仪表板

1. **错误概览**
   - 错误数量趋势
   - 错误率
   - Top 错误

2. **性能概览**
   - 响应时间 (P50, P95, P99)
   - 事务成功率
   - 慢查询

3. **用户体验**
   - Web Vitals (LCP, FID, CLS)
   - 按浏览器分组
   - 按地区分组

4. **系统健康**
   - 服务器状态
   - 数据库状态
   - 第三方服务可用性

## 最佳实践

1. **设置合理的阈值**: 避免误报和告警疲劳
2. **定期审查规则**: 每季度检查和调整告警规则
3. **使用标签和元数据**: 提高错误的可追溯性
4. **集成 CI/CD**: 在部署时标记 releases
5. **文档化响应流程**: 确保团队了解如何响应告警

## 相关资源

- [Sentry Alerts Documentation](https://docs.sentry.io/product/alerts/)
- [Sentry Alert Rules](https://docs.sentry.io/product/alerts/alert-rules/)
- [Web Performance Monitoring](https://docs.sentry.io/product/performance/)
