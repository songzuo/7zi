# E2E 测试运行指南

## 📋 快速开始

### 1. 确保开发服务器运行

```bash
# 在项目根目录
npm run dev
```

等待服务器启动在 `http://localhost:3000`

### 2. 运行 E2E 测试

```bash
# 运行所有 E2E 测试（所有浏览器）
npm run test:e2e

# 仅运行 Chromium 测试（推荐，快速）
npm run test:e2e:chromium

# 运行特定测试文件
npx playwright test e2e/critical-path.spec.ts

# 运行单个测试
npx playwright test --grep "首页"
```

### 3. 查看测试报告

```bash
# 生成 HTML 报告
npx playwright test --reporter=html

# 打开报告
npx playwright show-report
```

---

## 🎯 测试文件说明

### 新增测试文件

#### `critical-path.spec.ts` - 关键路径测试 (22 个测试)

测试系统核心功能的端到端流程：

- **首页加载流程** (3 个测试)
  - 首页成功加载
  - 加载时间性能测试
  - 语言路由处理

- **Dashboard 功能** (3 个测试)
  - Dashboard 页面加载
  - 统计数据展示
  - 任务列表显示

- **任务管理流程** (3 个测试)
  - 任务列表加载
  - 新建任务页面
  - 导航返回

- **Portfolio 展示** (2 个测试)
  - Portfolio 列表
  - 项目点击

- **页面测试** (2 个测试)
  - 关于页面
  - 联系页面

- **错误处理** (2 个测试)
  - 404 页面
  - API 错误处理

- **性能测试** (2 个测试)
  - 页面加载性能
  - 网络请求监控

- **用户流程** (3 个测试)
  - 完整访问流程
  - 任务创建流程
  - 导航一致性

- **多浏览器测试** (1 个测试)
  - 浏览器兼容性

- **完整用户流程** (1 个测试)
  - 端到端用户旅程

#### `user-flows.spec.ts` - 用户流程测试 (15 个测试)

测试真实用户场景的完整流程：

- **访客场景** (2 个测试)
  - 首次访问者浏览
  - 移动端用户浏览

- **任务管理场景** (3 个测试)
  - 查看任务列表
  - 创建新任务
  - 任务页面导航

- **Dashboard 场景** (2 个测试)
  - 查看 Dashboard
  - Dashboard 导航

- **表单提交场景** (2 个测试)
  - 联系表单提交
  - 表单验证错误

- **错误恢复场景** (2 个测试)
  - 页面加载失败恢复
  - 网络错误恢复

- **多标签页场景** (1 个测试)
  - 多标签页浏览

- **会话持久性** (1 个测试)
  - 页面状态保持

- **边界情况** (2 个测试)
  - 快速连续导航
  - 深层链接访问

### 现有测试文件

- `home.spec.ts` - 首页基础测试
- `navigation.spec.ts` - 导航功能测试
- `form.spec.ts` - 表单验证和提交测试
- `dashboard.spec.ts` - Dashboard 功能测试
- `pages.spec.ts` - 页面测试
- `responsive.spec.ts` - 响应式布局测试
- `theme.spec.ts` - 主题切换测试

---

## 🔧 配置说明

### Playwright 配置 (playwright.config.ts)

```typescript
{
  testDir: './e2e',           // 测试目录
  testMatch: '**/*.spec.ts',  // 测试文件匹配
  fullyParallel: true,        // 并行运行
  retries: 2,                 // CI 上重试 2 次
  workers: 1,                 // CI 上单 worker
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  projects: [
    'chromium',      // Desktop Chrome
    'firefox',       // Desktop Firefox
    'webkit',        // Desktop Safari
    'Mobile Chrome', // Pixel 5
    'Mobile Safari'  // iPhone 12
  ]
}
```

### 环境变量

```bash
# CI 环境
CI=true  # 启用重试和单 worker 模式

# 自定义基础 URL
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

---

## 📊 测试覆盖率

### 页面覆盖

| 页面 | 测试文件 | 覆盖率 |
|------|---------|--------|
| 首页 (`/`) | home.spec.ts, critical-path.spec.ts | ✅ 高 |
| Dashboard (`/dashboard`) | dashboard.spec.ts, critical-path.spec.ts | ✅ 高 |
| 任务列表 (`/tasks`) | critical-path.spec.ts, user-flows.spec.ts | ✅ 高 |
| 新建任务 (`/tasks/new`) | critical-path.spec.ts, user-flows.spec.ts | ✅ 中 |
| Portfolio (`/portfolio`) | pages.spec.ts, critical-path.spec.ts | ✅ 中 |
| 关于 (`/about`) | pages.spec.ts, critical-path.spec.ts | ✅ 中 |
| 联系 (`/contact`) | form.spec.ts, critical-path.spec.ts | ✅ 高 |

### 功能覆盖

| 功能 | 测试状态 |
|------|---------|
| 页面加载 | ✅ 已覆盖 |
| 导航功能 | ✅ 已覆盖 |
| 表单验证 | ✅ 已覆盖 |
| 表单提交 | ✅ 已覆盖 |
| 错误处理 | ✅ 已覆盖 |
| 响应式布局 | ✅ 已覆盖 |
| 移动端支持 | ✅ 已覆盖 |
| 性能测试 | ✅ 已覆盖 |
| 多浏览器 | ✅ 已覆盖 |

---

## 🐛 故障排查

### 常见问题

#### 1. 测试超时

**症状**: 测试运行超时或卡住

**解决方案**:
```bash
# 检查开发服务器
curl http://localhost:3000

# 重启开发服务器
npm run dev

# 增加超时时间
npx playwright test --timeout=120000
```

#### 2. 浏览器未安装

**症状**: `Browser not installed` 错误

**解决方案**:
```bash
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

#### 3. 端口被占用

**症状**: `EADDRINUSE` 错误

**解决方案**:
```bash
# 查找占用端口的进程
lsof -ti:3000

# 终止进程
lsof -ti:3000 | xargs kill -9

# 或使用不同端口
PORT=3001 npm run dev
```

#### 4. 测试失败

**症状**: 测试断言失败

**解决方案**:
```bash
# 查看详细错误
npx playwright test --reporter=list

# 调试模式
npx playwright test --debug

# 查看截图和录像
npx playwright show-report
```

---

## 📈 最佳实践

### 编写测试

1. **使用有意义的测试名称**
   ```typescript
   test('应该成功加载首页并显示主要内容', async ({ page }) => {
     // ...
   });
   ```

2. **使用 beforeEach 设置前置条件**
   ```typescript
   test.beforeEach(async ({ page }) => {
     await page.goto('/');
   });
   ```

3. **使用有意义的断言**
   ```typescript
   await expect(page).toHaveTitle(/7zi/);
   await expect(page.locator('body')).toBeVisible();
   ```

4. **处理异步操作**
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(1000);
   ```

### 运行测试

1. **本地开发**: 使用 `--project=chromium` 快速测试
2. **CI 环境**: 运行所有浏览器确保兼容性
3. **调试**: 使用 `--debug` 模式逐步执行
4. **报告**: 定期生成 HTML 报告查看趋势

---

## 📝 测试维护

### 更新测试

当功能变更时：
1. 更新相关测试用例
2. 运行测试验证
3. 更新测试文档

### 添加新测试

1. 在对应文件添加测试用例
2. 或创建新的 `.spec.ts` 文件
3. 运行测试验证
4. 更新本文档

---

## 📞 支持

- Playwright 文档：https://playwright.dev
- 测试报告：`playwright-report/index.html`
- 测试日志：`/tmp/e2e-test-output.log`

---

*最后更新：2026-03-08*
