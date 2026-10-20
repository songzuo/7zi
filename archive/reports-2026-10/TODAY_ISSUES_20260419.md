# 📋 今日问题汇总 - 2026-04-19

**整理时间**: 2026-04-19 19:03 GMT+2  
**整理角色**: 📚 文档专员  

---

## 🔴 严重问题（需立即处理）

### 1. 7zi.com 显示错误内容
- **状态**: 未解决（21+小时）
- **现象**: 主站显示错误页面或异常内容
- **服务**: 7zi-main (PM2 cluster, 端口3000)
- **最后检查**: 2026-04-19 08:20
- **建议**: 查看 PM2 日志 `/root/.pm2/logs/7zi-main-error-0.log`

### 2. ai.7zi.com 无响应或错误
- **状态**: 部分响应（307重定向正常）
- **服务**: ai-site (PM2 fork, 端口3001)
- **说明**: 307重定向为 next-intl 正常行为
- **建议**: 确认语言重定向后的页面是否正常

### 3. 217 个测试失败，182 通过
- **状态**: 未解决
- **位置**: `7zi-frontend/` 测试套件
- **说明**: 大量测试失败需排查

---

## ⚠️ 警告问题（需关注）

### 4. npm audit: 1 个高危漏洞 (xlsx)
- **状态**: 未解决
- **模块**: `xlsx` 相关包
- **风险**: 高危
- **建议**: 检查 `src/lib/export/xlsx-wrapper.ts` 和 `xlsx` 依赖版本

### 5. 本地代码落后 origin/main 71 commits
- **状态**: ⚠️ 需确认是否已同步
- **当前状态**: git 显示 "Your branch is up to date with 'origin/main'"
- **说明**: 可能已在其他会话同步

---

## 📊 生产环境健康状况

来自 `PROD-HEALTH-REPORT-2026-04-19.md`:

| 服务 | 状态 | 说明 |
|------|------|------|
| Nginx | ✅ | master + 8 workers |
| 7zi-main | ✅ 在线 | PM2 cluster, uptime 18h, **重启16次** |
| ai-site | ✅ 在线 | PM2 fork, 端口3001 |
| visa.7zi.com | ❌ | 端口3003无服务监听 |

### 生产问题详情

1. **7zi-main 重启过多**: 16次重启，需排查日志
2. **visa.7zi.com 上游失败**: `connect() failed while connecting to upstream`
3. **SSL handshake 错误**: `SSL_do_handshake() failed (bad key share)` - Cloudflare兼容问题

---

## 🔧 今日已完成的更新

### 依赖更新 (CHANGELOG.md 记录)
- `@ducanh2912/next-pwa` 10.2.6 → 10.2.9
- `next` 16.2.3 → 16.2.4
- ESLint 配置重构

### 安全修复
- ScreenshotAnnotation CSRF 安全加固

### 测试更新
- WorkflowEditor 组件测试（8个测试文件）
- error-handling API 测试增强

### Evomap 集成
- 节点已注册 (node_909148eee8a8816a)
- GEP-A2A Heartbeat 验证通过
- 节点未认领 (claimed: false)
- 积分余额: 0 credits

---

## 📝 待办事项

- [ ] 排查 7zi-main 16次重启原因
- [ ] 检查 7zi.com 错误内容
- [ ] 启动端口3003服务或修复 visa.7zi.com 配置
- [ ] 修复 xlsx 高危漏洞
- [ ] 修复 217 个测试失败
- [ ] 认领 Evomap 节点

---

## 📚 相关文档

- `PROD-HEALTH-REPORT-2026-04-19.md` - 生产环境健康报告
- `evomap-integration-report-0419.md` - Evomap 集成进展
- `CI-OPTIMIZATION-REPORT.md` - CI 优化报告
