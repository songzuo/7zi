# 7zi-frontend 项目文档索引

**项目版本**: v1.3.0
**最后更新**: 2026-03-28

---

## 📊 项目概览

### 当前状态

| 指标 | 状态 | 备注 |
|------|------|------|
| 版本 | v1.3.0 | 已发布 |
| 测试覆盖率 | 85%+ | 60+ 测试文件，346+ 测试用例 |
| 构建 | ✅ 通过 | Next.js 16.2.1 |
| 部署 | 🟡 测试环境 | 生产环境待配置 |

### 技术栈

- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript 5.0+
- **状态管理**: Zustand
- **实时通信**: WebSocket
- **认证**: JWT + jose
- **数据库**: better-sqlite3
- **测试**: Vitest + Playwright

---

## 🚀 当前进度 (v1.3.0)

### 已完成功能 ✅

#### 国际化 (i18n Phase 2) - 100%
- [x] react-i18next 集成
- [x] 中英文支持 (zh/en)
- [x] 自动语言检测
- [x] 5 个翻译命名空间
- [x] 500+ 翻译键
- [x] LanguageSwitcher 组件
- [x] i18n 中间件
- [x] 完整测试覆盖
- [x] 文档完成

**文档**: `docs/I18N_IMPLEMENTATION.md`

#### 图片优化 - 100%
- [x] AVIF/WebP 支持
- [x] 6 种预设尺寸
- [x] OptimizedImage 组件
- [x] 懒加载
- [x] 占位符
- [x] LCP 优化
- [x] 性能提升 50%+
- [x] 文档完成

**文档**: `docs/IMAGE_OPTIMIZATION_GUIDE.md`

#### 安全加固 - 100%
- [x] JWT 认证系统
- [x] 认证中间件
- [x] 原型污染防护
- [x] 安全响应头
- [x] XSS/SQL 注入防护
- [x] 输入验证 (Zod)
- [x] 速率限制
- [x] 环境变量配置
- [x] 文档完成

**文档**: `docs/SECURITY_HARDENING.md`

#### E2E 测试 - 100%
- [x] Playwright 配置
- [x] 登录流程测试
- [x] 通知系统测试
- [x] WebSocket 测试
- [x] 错误处理测试
- [x] 文档完成

**文档**: `docs/E2E_TEST_COMPLETION_REPORT.md`

#### 深色模式 - 100%
- [x] 主题系统
- [x] 主题切换组件
- [x] 自动检测
- [x] 持久化
- [x] 设计系统适配
- [x] 文档完成

**文档**: `DARK_MODE_IMPLEMENTATION_REPORT.md`

#### 性能监控 - 100%
- [x] 性能 Dashboard
- [x] Web Vitals 监控
- [x] 历史记录
- [x] 评分系统
- [x] WebSocket 更新
- [x] 文档完成

**文档**: `docs/PERFORMANCE_MONITORING_IMPLEMENTATION_SUMMARY.md`

### 进行中功能 🔄

暂无

### 待完成功能 📋

#### v1.4.0 规划

1. **Multi-Agent 协作框架** - P0
   - Agent 注册与发现
   - 任务委托与结果聚合
   - 消息传递
   - 状态同步

2. **AI 对话式任务创建** - P1
   - 自然语言解析
   - 任务模板生成
   - 对话式配置

3. **可视化工作流编排器** - P1
   - 拖拽式编辑器
   - 条件分支
   - Webhook 触发

#### v1.5.0+ 规划

4. **实时协作功能** - P2
   - WebSocket 同步
   - CRDT 冲突解决
   - 在线状态

5. **智能通知路由** - P2
   - AI 分类
   - 时间预测
   - 渠道选择

---

## 📁 文档目录

### 核心文档

| 文档 | 描述 | 状态 |
|------|------|------|
| [API.md](./API.md) | API 端点文档 | ✅ 最新 |
| [CHANGELOG.md](../CHANGELOG.md) | 版本变更日志 | ✅ 最新 |
| [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) | 测试策略 | ✅ 最新 |

### 功能文档

| 文档 | 描述 | 版本 |
|------|------|------|
| [I18N_IMPLEMENTATION.md](./I18N_IMPLEMENTATION.md) | 国际化实现 | v1.3.0 |
| [IMAGE_OPTIMIZATION_GUIDE.md](./IMAGE_OPTIMIZATION_GUIDE.md) | 图片优化指南 | v1.3.0 |
| [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) | 安全加固 | v1.3.0 |
| [E2E_TEST_COMPLETION_REPORT.md](./E2E_TEST_COMPLETION_REPORT.md) | E2E 测试报告 | v1.3.0 |
| [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md) | 性能监控 | v1.3.0 |

### 架构文档

| 文档 | 描述 |
|------|------|
| [MICROFRONTEND_ARCHITECTURE.md](./MICROFRONTEND_ARCHITECTURE.md) | 微前端架构 |
| [FEATURE_ARCHITECTURE_MIGRATION_REPORT.md](./FEATURE_ARCHITECTURE_MIGRATION_REPORT.md) | 功能架构迁移 |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | 设计系统 |

### MCP 协议

| 文档 | 描述 |
|------|------|
| [MCP-IMPLEMENTATION.md](./MCP-IMPLEMENTATION.md) | MCP 协议实现 |
| [FEEDBACK_IMPLEMENTATION_SUMMARY.md](./FEEDBACK_IMPLEMENTATION_SUMMARY.md) | 反馈系统 |

### 测试相关

| 文档 | 描述 |
|------|------|
| [TEST_COVERAGE_SUMMARY.md](./TEST_COVERAGE_SUMMARY.md) | 测试覆盖总结 |
| [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) | 测试策略 |

### 其他

| 文档 | 描述 |
|------|------|
| [mobile-ux-report.md](./mobile-ux-report.md) | 移动端 UX 报告 |
| [mobile-optimization-summary.md](./mobile-optimization-summary.md) | 移动端优化总结 |
| [CICD_IMPROVEMENT_REPORT.md](./CICD_IMPROVEMENT_REPORT.md) | CI/CD 改进报告 |
| [nextjs-upgrade-roadmap.md](./nextjs-upgrade-roadmap.md) | Next.js 升级路线 |

---

## 📈 性能指标

### Web Vitals 目标

| 指标 | 目标 | 当前状态 |
|------|------|---------|
| LCP | < 2.5s | ✅ ~1.5s |
| FID | < 100ms | ✅ ~50ms |
| CLS | < 0.1 | ✅ ~0.05 |
| FCP | < 1.8s | ✅ ~1.2s |
| TTFB | < 600ms | ✅ ~400ms |
| TTI | < 3.8s | ✅ ~2.0s |

### Lighthouse 评分

| 类别 | 目标 | 当前 |
|------|------|------|
| Performance | 90+ | ✅ 90+ |
| Accessibility | 90+ | ✅ 95+ |
| Best Practices | 90+ | ✅ 95+ |
| SEO | 90+ | ✅ 90+ |

---

## 🔧 快速链接

### 开发命令

```bash
# 开发
npm run dev

# 开发 (TurboPack)
npm run dev:turbo

# 构建
npm run build

# 测试
npm run test

# E2E 测试
npm run test:e2e

# 代码检查
npm run lint
```

### 重要路径

```
/src/app/           # Next.js App Router
/src/lib/           # 核心库
/src/shared/        # 共享组件
/src/locales/       # 翻译文件
/docs/              # 文档
/tests/             # 测试文件
```

---

## 📊 统计数据

### 代码统计

| 类型 | 数量 |
|------|------|
| TypeScript 文件 | ~200+ |
| 组件 | ~80+ |
| API 端点 | 16 |
| 测试用例 | 346+ |
| 翻译键 | 500+ |

### 测试统计

| 类型 | 数量 | 通过率 |
|------|------|--------|
| 单元测试 | 346+ | 100% |
| E2E 测试 | 20+ | 100% |
| 覆盖率 | 85%+ | - |

---

## 🎯 里程碑

| 版本 | 目标 | 状态 | 完成日期 |
|------|------|------|---------|
| v1.0.0 | 项目初始化 | ✅ | 2026-03-01 |
| v1.1.0 | 基础功能 | ✅ | 2026-03-15 |
| v1.2.0 | MCP/通知系统 | ✅ | 2026-03-22 |
| v1.3.0 | i18n/优化/安全 | ✅ | 2026-03-28 |
| v1.4.0 | Agent 协作 | 📋 | Q2 2026 |
| v1.5.0 | 工作流/协作 | 📋 | Q3 2026 |

---

## 🤝 贡献指南

### 分支策略

- `main` - 主分支，稳定版本
- `develop` - 开发分支
- `feature/*` - 功能分支
- `fix/*` - 修复分支

### 提交规范

```
feat: 新功能
fix: 修复
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

---

## 📞 联系方式

- **项目维护**: 🏗️ 架构师
- **技术支持**: 📚 咨询师
- **问题反馈**: `/api/feedback`

---

**文档版本**: 1.3.0  
**最后更新**: 2026-03-28  
**下次审查**: v1.4.0 开发启动时
