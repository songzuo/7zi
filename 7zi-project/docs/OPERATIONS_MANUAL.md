# 监控运维手册

## 快速参考

### 告警级别

| 级别 | 名称 | 响应时间 | 通知方式 |
|------|------|----------|----------|
| P0 | 紧急 | 5 分钟 | 电话 + SMS + Slack + Email |
| P1 | 严重 | 15 分钟 | Slack + Email |
| P2 | 警告 | 1 小时 | Slack |
| P3 | 信息 | 24 小时 | Email |

---

## 常见告警处理流程

### P0: 服务宕机

**症状**: 网站无法访问，健康检查失败

**处理步骤**:

```bash
# 1. 确认问题范围
curl -I https://7zi.studio/api/health

# 2. SSH 登录服务器
ssh root@7zi.com

# 3. 检查 Docker 容器状态
docker ps -a
docker logs 7zi-frontend --tail 100

# 4. 检查系统资源
free -h
df -h
top

# 5. 重启服务
cd /opt/7zi-frontend
docker-compose restart

# 6. 确认恢复
curl -I http://localhost:3000/api/health

# 7. 记录事件
# 在 Sentry 中创建 Issue，记录时间线和根因
```

**回滚方案**:
```bash
# 如果是新版本问题，回滚到上一版本
docker-compose down
docker pull 7zi/frontend:previous-version
docker-compose up -d
```

---

### P0: SSL 证书过期

**症状**: 浏览器显示证书错误

**处理步骤**:

```bash
# 1. 检查证书状态
openssl s_client -connect 7zi.studio:443 -servername 7zi.studio 2>/dev/null | openssl x509 -noout -dates

# 2. 如果使用 Let's Encrypt
certbot renew --force-renewal

# 3. 重启 Nginx
docker-compose restart nginx

# 4. 验证新证书
curl -vI https://7zi.studio 2>&1 | grep -A 5 "SSL certificate"
```

---

### P1: 错误率飙升

**症状**: Sentry 报告大量错误

**处理步骤**:

1. **分析错误**
   - 登录 Sentry Dashboard
   - 查看错误聚合和趋势
   - 确定影响范围（用户数、页面）

2. **判断根因**
   ```
   - 新部署的代码？ → 回滚
   - 第三方服务问题？ → 等待或切换备用
   - 数据问题？ → 修复数据
   ```

3. **代码回滚**（如需要）
   ```bash
   # 查看最近部署
   git log --oneline -10
   
   # 回滚到指定版本
   git revert HEAD
   npm run build
   docker-compose up -d --build
   ```

4. **标记处理**
   - 在 Sentry 中标记 Issue 状态
   - 添加处理说明

---

### P1: 新错误类型

**症状**: Sentry 报告首次出现的错误

**处理步骤**:

1. 查看错误详情
   - 错误堆栈
   - 用户环境（浏览器、OS）
   - 面包屑（用户操作路径）

2. 评估影响
   - 影响多少用户？
   - 是否阻塞关键功能？

3. 决定处理方式
   - **紧急**: 立即修复/回滚
   - **一般**: 创建 JIRA 任务，排期修复
   - **误报**: 添加到忽略列表

---

### P2: 性能下降

**症状**: Web Vitals 超过阈值

**处理步骤**:

1. **分析慢事务**
   - 查看 Sentry Performance
   - 识别慢 API/资源

2. **常见优化**

   ```typescript
   // LCP 优化 - 预加载关键资源
   <link rel="preload" href="/hero.jpg" as="image" />
   
   // FID 优化 - 代码分割
   const HeavyComponent = dynamic(() => import('./Heavy'), {
     loading: () => <Loading />,
   });
   
   // CLS 优化 - 预留空间
   <img src="..." style={{ aspectRatio: '16/9' }} />
   ```

3. **检查服务器**
   ```bash
   # 检查 CPU/内存
   htop
   
   # 检查网络
   mtr api.github.com
   ```

---

### P2: API 响应慢

**症状**: API 响应时间 > 2s

**处理步骤**:

1. 确定慢的端点
2. 检查后端服务
3. 考虑缓存策略
4. 评估是否需要扩容

---

## 监控仪表板

### Sentry
- **Dashboard**: https://sentry.io/organizations/7zi-studio
- **项目**: 7zi-frontend
- **功能**: 错误追踪、性能监控

### UptimeRobot
- **Dashboard**: https://uptimerobot.com
- **监控项**: 
  - 7zi.studio (HTTPS)
  - 7zi.studio/api/health (HTTPS)
  - SSL 证书

### Umami
- **Dashboard**: https://analytics.7zi.studio
- **功能**: 用户行为分析

---

## 健康检查端点

| 端点 | 用途 | 预期响应 |
|------|------|----------|
| `/api/health` | 基础健康检查 | 200 OK |
| `/api/health/detailed` | 详细状态（含依赖） | 200 OK |
| `/api/health/live` | K8s Liveness | 200 OK |
| `/api/health/ready` | K8s Readiness | 200 OK |

---

## 紧急联系

| 角色 | 联系方式 |
|------|----------|
| 主开发 | admin@7zi.studio |
| 运维 | ops@7zi.studio |
| Slack | #alerts-critical |

---

## 部署后检查清单

```bash
# 部署后必须检查

# 1. 健康检查
curl https://7zi.studio/api/health

# 2. 检查 Sentry 无新错误
# https://sentry.io/organizations/7zi-studio/issues

# 3. 检查 UptimeRobot 状态
# https://uptimerobot.com

# 4. 抽查关键页面
curl -I https://7zi.studio/
curl -I https://7zi.studio/en/

# 5. 检查日志无异常
docker logs 7zi-frontend --tail 50
```

---

## 定期维护任务

### 每日
- [ ] 检查 Sentry 错误趋势
- [ ] 检查 UptimeRobot 可用性

### 每周
- [ ] 审查告警噪音，调整规则
- [ ] 检查性能趋势
- [ ] 清理已解决的 Sentry Issues

### 每月
- [ ] 审查 SLA 达成情况
- [ ] 检查 SSL 证书到期
- [ ] 更新依赖版本
- [ ] 备份配置

---

*最后更新: 2026-03-06*