# 测试实施检查清单

## 快速开始 - 本周任务（Week 1）

### 🔴 高优先级任务

#### Day 1-2: API 测试基础设施

- [ ] **创建 API 测试模板**
  - [ ] 创建 `src/app/api/__tests__/template.route.test.ts`
  - [ ] 包含 GET, POST, PUT, DELETE 测试模式
  - [ ] 添加错误处理测试示例
  - [ ] 添加安全测试示例

- [ ] **CSRF Token API 测试**
  - [ ] 创建 `src/app/api/csrf-token/__tests__/route.test.ts`
  - [ ] 测试 Token 生成
  - [ ] 测试 Cookie 设置
  - [ ] 测试 Token 唯一性
  - [ ] 测试安全性（HTTP Only, Secure 标志）
  - [ ] 运行测试: `npm run test src/app/api/csrf-token/__tests__/route.test.ts`

- [ ] **A2A JSON-RPC API 测试**
  - [ ] 创建 `src/app/api/a2a/jsonrpc/__tests__/route.test.ts`
  - [ ] 测试 JSON-RPC 协议解析
  - [ ] 测试方法调用
  - [ ] 测试错误响应
  - [ ] 测试输入验证

#### Day 3-4: 健康检查 API 测试

- [ ] **Health Endpoints 测试**
  - [ ] 创建 `src/app/api/health/__tests__/routes.test.ts`
  - [ ] 测试 `/health/live` - 存活检查
  - [ ] 测试 `/health/ready` - 就绪检查
  - [ ] 测试 `/health/detailed` - 详细健康信息
  - [ ] 测试 `/health` - 综合健康检查
  - [ ] 测试超时场景
  - [ ] 测试依赖服务检查

- [ ] **GitHub API 集成测试**
  - [ ] 创建 `src/app/api/github/__tests__/integration.test.ts`
  - [ ] 测试 `/api/github/commits` - 获取提交历史
  - [ ] 测试 `/api/github/issues` - 获取 Issues
  - [ ] 测试错误处理（API 失败）
  - [ ] 测试数据格式验证
  - [ ] Mock GitHub API 响应

#### Day 5: CI/CD 集成

- [ ] **GitHub Actions 工作流**
  - [ ] 创建 `.github/workflows/test.yml`
  - [ ] 配置单元测试作业
  - [ ] 配置 E2E 测试作业
  - [ ] 添加覆盖率报告
  - [ ] 添加测试结果报告
  - [ ] 配置失败时通知

- [ ] **覆盖率追踪**
  - [ ] 注册 Codecov 账户
  - [ ] 连接 GitHub 仓库
  - [ ] 配置覆盖率阈值
  - [ ] 设置覆盖率目标（Phase 1: 50%）

---

### 🟡 中优先级任务（Week 2）

#### Chat 组件测试

- [ ] **ChatMessage 组件**
  - [ ] 创建 `src/components/chat/__tests__/ChatMessage.test.tsx`
  - [ ] 测试渲染（用户/AI 消息）
  - [ ] 测试 Markdown 渲染
  - [ ] 测试时间戳格式化
  - [ ] 测试无障碍性
  - [ ] 测试打字指示器

- [ ] **ChatInput 组件**
  - [ ] 创建 `src/components/chat/__tests__/ChatInput.test.tsx`
  - [ ] 测试输入渲染
  - [ ] 测试消息发送
  - [ ] 测试 Enter/Shift+Enter 行为
  - [ ] 测试清空输入
  - [ ] 测试字符限制

- [ ] **ChatHeader 组件**
  - [ ] 创建 `src/components/chat/__tests__/ChatHeader.test.tsx`
  - [ ] 测试标题显示
  - [ ] 测试操作按钮
  - [ ] 测试成员信息
  - [ ] 测试连接状态

- [ ] **MemberSelector 组件**
  - [ ] 创建 `src/components/chat/__tests__/MemberSelector.test.tsx`
  - [ ] 测试成员列表渲染
  - [ ] 测试成员选择
  - [ ] 测试搜索过滤
  - [ ] 测试键盘导航

---

## 📊 测试覆盖率追踪

### 当前状态

| 模块 | 覆盖率 | 目标 | 状态 |
|------|--------|------|------|
| API Routes | 11% | 90% | ❌ 需要改进 |
| Components | 13% | 70% | ❌ 需要改进 |
| Hooks/Stores | 80% | 85% | ✅ 良好 |
| Libs | 125% | 90% | ✅ 优秀 |
| E2E | 基础 | 完整 | ✅ 基础完善 |
| **整体** | **46%** | **80%** | ⚠️ 中等 |

### Phase 1 目标（Week 1-2）

- [ ] API 覆盖率达到 90%
- [ ] Chat 组件覆盖率达到 100%
- [ ] 整体覆盖率达到 55%
- [ ] 所有测试通过
- [ ] CI/CD 集成完成

### Phase 2 目标（Week 3-4）

- [ ] 组件覆盖率达到 70%
- [ ] 页面覆盖率达到 60%
- [ ] 整体覆盖率达到 70%
- [ ] 性能测试基线建立
- [ ] 安全测试套件完成

### Phase 3 目标（Week 5-6）

- [ ] 整体覆盖率达到 80%+
- [ ] 视觉回归测试完成
- [ ] 集成测试完整覆盖
- [ ] 测试文档完善
- [ ] 测试最佳实践文档

---

## 🔧 测试工具配置

### Vitest 配置

- [ ] 更新 `vitest.config.ts`
- [ ] 设置覆盖率阈值（Phase 1: 50%）
- [ ] 配置测试超时（10s）
- [ ] 配置重试次数（2）
- [ ] 配置并行执行

### Playwright 配置

- [ ] 更新 `playwright.config.ts`
- [ ] 配置多个浏览器项目
- [ ] 配置视觉回归测试
- [ ] 配置截图和视频录制
- [ ] 配置报告生成

### 测试环境设置

- [ ] 安装开发依赖
  ```bash
  npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
  ```
- [ ] 创建测试工具库 `src/test/utils.tsx`
- [ ] 创建测试工厂 `src/test/factories.ts`
- [ ] 创建 Mock 工具 `src/test/mocks.ts`

---

## ✅ 测试编写检查清单

### 单元测试

创建测试文件时，确保包含：

- [ ] 测试文件命名正确（`*.test.ts` 或 `*.spec.ts`）
- [ ] 导入必要的测试工具（vitest, @testing-library/react）
- [ ] 遵循 AAA 模式（Arrange, Act, Assert）
- [ ] 使用描述性的测试名称
- [ ] 每个测试只测试一件事
- [ ] 测试正常情况（Happy Path）
- [ ] 测试边界情况
- [ ] 测试错误情况
- [ ] Mock 外部依赖
- [ ] 清理副作用（beforeEach/afterEach）

### 组件测试

- [ ] 测试组件渲染
- [ ] 测试用户交互（点击、输入等）
- [ ] 测试 props 变化
- [ ] 测试状态变化
- [ ] 测试事件回调
- [ ] 测试无障碍性（ARIA 属性）
- [ ] 测试键盘导航
- [ ] 测试响应式行为（如适用）

### API 测试

- [ ] 测试所有 HTTP 方法（GET, POST, PUT, DELETE）
- [ ] 测试成功响应（200, 201）
- [ ] 测试错误响应（400, 404, 500）
- [ ] 测试输入验证
- [ ] 测试响应结构
- [ ] 测试安全头（CORS, CSRF）
- [ ] 测试性能（响应时间）

### E2E 测试

- [ ] 测试关键用户流程
- [ ] 测试表单提交
- [ ] 测试导航
- [ ] 测试跨页面交互
- [ ] 测试错误处理
- [ ] 测试多浏览器兼容性
- [ ] 测试响应式布局

---

## 🚀 快速命令参考

### 运行测试

```bash
# 运行所有单元测试
npm run test

# 运行测试（单次）
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm run test src/components/chat/__tests__/ChatMessage.test.tsx

# 运行匹配模式的测试
npm run test -- --grep "ChatMessage"

# 运行 E2E 测试
npm run test:e2e

# 运行 E2E 测试（UI 模式）
npm run test:e2e:ui

# 运行 E2E 测试（调试模式）
npm run test:e2e:debug

# 运行特定浏览器测试
npm run test:e2e:chromium
```

### 覆盖率报告

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看覆盖率报告（HTML）
open coverage/index.html

# 上传到 Codecov（需要配置）
codecov
```

### Playwright

```bash
# 安装 Playwright 浏览器
npx playwright install

# 安装所有浏览器
npx playwright install --with-deps

# 查看 E2E 测试报告
npm run test:e2e:report

# 更新 Playwright 快照
npx playwright test --update-snapshots
```

---

## 📝 每日检查清单

### 开发者每日任务

- [ ] 运行单元测试: `npm run test`
- [ ] 运行 E2E 测试: `npm run test:e2e`
- [ ] 检查测试覆盖率
- [ ] 为新功能编写测试
- [ ] 修复失败的测试
- [ ] 提交代码前运行完整测试套件

### 测试负责人每日任务

- [ ] 检查 CI/CD 测试结果
- [ ] 审查新测试代码
- [ ] 监控覆盖率趋势
- [ ] 识别测试瓶颈
- [ ] 更新测试计划
- [ ] 优化测试性能

---

## 🐛 故障排除

### 常见问题

**测试运行超时**
```bash
# 增加超时时间
npm run test -- --testTimeout=20000
```

**Mock 不工作**
```typescript
// 确保 mock 在导入之前
vi.mock('@/lib/api', () => ({
  fetchUser: vi.fn(),
}));
```

**测试环境变量缺失**
```typescript
// 在测试中设置环境变量
process.env.NODE_ENV = 'test';
process.env.API_URL = 'http://localhost:3000';
```

**Playwright 浏览器未安装**
```bash
npx playwright install
```

**覆盖率报告不准确**
```bash
# 清理缓存后重新运行
rm -rf coverage
npm run test:coverage
```

---

## 📚 参考资源

### 官方文档

- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [Next.js 测试指南](https://nextjs.org/docs/testing)

### 最佳实践

- [Testing Library 指南](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Google 软件测试原则](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)
- [Testing JavaScript 最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

### 工具和库

- [MSW - API Mocking](https://mswjs.io)
- [Faker.js - 测试数据生成](https://fakerjs.dev)
- [Codecov - 覆盖率追踪](https://codecov.io)
- [Lighthouse CI - 性能测试](https://github.com/GoogleChrome/lighthouse-ci)

---

## 📊 进度追踪

### Week 1 进度（当前）

- [ ] Day 1: API 测试模板
- [ ] Day 2: CSRF Token 测试
- [ ] Day 3: Health API 测试
- [ ] Day 4: GitHub API 测试
- [ ] Day 5: CI/CD 集成

### Week 2 进度

- [ ] Day 1-2: ChatMessage 测试
- [ ] Day 3: ChatInput 测试
- [ ] Day 4: 其他 Chat 组件测试
- [ ] Day 5: 覆盖率审查和优化

### Week 3-4 进度

- [ ] Phase 2 计划制定
- [ ] 用户设置组件测试
- [ ] 表单组件测试
- [ ] 页面集成测试
- [ ] 性能测试

### Week 5-6 进度

- [ ] Phase 3 计划制定
- [ ] 视觉回归测试
- [ ] 集成测试完善
- [ ] 测试文档编写
- [ ] 最佳实践文档

---

## 🎯 成功指标

### Phase 1 成功标准

- ✅ API 覆盖率达到 90%
- ✅ Chat 组件 100% 覆盖
- ✅ 所有测试通过
- ✅ CI/CD 集成完成
- ✅ 测试执行时间 < 5 分钟
- ✅ 测试稳定性 > 95%

### Phase 2 成功标准

- ✅ 组件覆盖率达到 70%
- ✅ 页面覆盖率达到 60%
- ✅ 性能测试基线建立
- ✅ 安全测试套件完成
- ✅ E2E 测试完整覆盖

### Phase 3 成功标准

- ✅ 整体覆盖率达到 80%+
- ✅ 视觉回归测试完整
- ✅ 集成测试完整
- ✅ 测试文档完善
- ✅ 最佳实践文档完成

---

**最后更新**: 2026-03-18
**检查清单版本**: 1.0
**负责人**: AI 测试工程师
