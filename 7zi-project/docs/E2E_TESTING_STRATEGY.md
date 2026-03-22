# E2E 测试策略

> 7zi 项目端到端测试完整策略

## 📋 目录

- [测试目标](#测试目标)
- [测试覆盖范围](#测试覆盖范围)
- [测试工具链](#测试工具链)
- [测试架构](#测试架构)
- [测试组织](#测试组织)
- [测试最佳实践](#测试最佳实践)
- [执行策略](#执行策略)
- [CI/CD 集成](#cicd-集成)
- [故障排除](#故障排除)

---

## 🎯 测试目标

### 主要目标

1. **确保核心用户流程稳定可靠**
   - 登录/登出流程
   - 任务创建和管理
   - 导航和页面访问
   - 表单验证和提交

2. **验证跨浏览器兼容性**
   - Chrome、Firefox、Safari (桌面)
   - iOS Safari、Android Chrome (移动端)

3. **保证视觉一致性**
   - 响应式布局正确
   - 主题切换正常
   - 动画和过渡效果

4. **提升用户体验**
   - 加载状态正确显示
   - 错误信息清晰友好
   - 交互反馈及时

### 非目标

- **性能测试**（使用专门的性能测试工具）
- **安全测试**（使用安全扫描工具）
- **负载测试**（使用负载测试工具）

---

## 📊 测试覆盖范围

### 关键用户流程

| 流程 | 优先级 | 测试文件 | 状态 |
|------|--------|----------|------|
| 用户登录 | P0 | `auth-flow.spec.ts` | ✅ |
| 用户登出 | P0 | `auth-flow.spec.ts` | ✅ |
| 创建任务 | P0 | `task-creation.spec.ts` | ✅ |
| 查看任务列表 | P0 | `dashboard.spec.ts` | ✅ |
| 导航主要页面 | P0 | `navigation.spec.ts` | ✅ |
| 编辑任务 | P1 | `task-creation.spec.ts` | ✅ |
| 删除任务 | P1 | `task-creation.spec.ts` | ✅ |
| 搜索任务 | P1 | `dashboard.spec.ts` | ✅ |
| 筛选任务 | P1 | `dashboard.spec.ts` | ✅ |
| 团队页面 | P2 | `team.spec.ts` | ✅ |
| 设置页面 | P2 | `settings.spec.ts` | - |
| 联系表单 | P2 | `form.spec.ts` | ✅ |
| 博客页面 | P2 | `blog.spec.ts` | - |

### 视觉回归测试

| 页面 | 视口 | 主题 | 状态 |
|------|------|------|------|
| 首页 | 全部 | Light/Dark | ✅ |
| Dashboard | 全部 | Light/Dark | ✅ |
| 团队页面 | 全部 | Light/Dark | ✅ |
| 关于页面 | 全部 | Light/Dark | ✅ |
| 联系页面 | 全部 | Light | ✅ |
| 博客页面 | 全部 | Light | ✅ |

### 跨浏览器测试

| 浏览器 | 版本 | 视口 | 状态 |
|---------|------|------|------|
| Chromium | Latest | Desktop | ✅ |
| Firefox | Latest | Desktop | ✅ |
| WebKit | Latest | Desktop | ✅ |
| Chrome | Latest | Mobile (Pixel 5) | ✅ |
| Safari | Latest | Mobile (iPhone 12) | ✅ |

---

## 🛠️ 测试工具链

### 核心工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Playwright** | 1.58.2 | E2E 测试框架 |
| **TypeScript** | 5.x | 类型安全 |
| **POM Pattern** | - | 页面对象模型 |

### 为什么选择 Playwright？

- ✅ **跨浏览器支持** - Chrome、Firefox、Safari、Edge
- ✅ **快速执行** - 并行测试运行
- ✅ **自动等待** - 智能等待元素可见和可交互
- ✅ **强大定位** - 灵活的元素定位策略
- ✅ **内置工具** - 录制、调试、trace viewer
- ✅ **视觉回归** - 内置截图对比
- ✅ **网络拦截** - Mock API 响应
- ✅ **移动端支持** - 设备模拟和地理位置

---

## 🏗️ 测试架构

### Page Object Model (POM)

使用页面对象模式来组织测试代码，提高可维护性。

```
e2e/
├── pages/                    # 页面对象
│   ├── index.ts             # 导出所有页面
│   ├── login-page.ts        # 登录页面对象
│   ├── dashboard-page.ts    # Dashboard 页面对象
│   ├── task-creation-page.ts # 任务创建页面对象
│   └── navigation-page.ts   # 导航页面对象
├── fixtures/                # 测试 fixtures
│   └── test-data.ts         # 测试数据工厂
├── helpers/                 # 辅助函数
│   └── test-helpers.ts      # 测试辅助工具
└── *.spec.ts               # 测试文件
```

### POM 优势

- **封装性** - 页面细节与测试分离
- **可复用性** - 页面对象在多个测试中复用
- **可维护性** - UI 变化只需修改页面对象
- **可读性** - 测试代码更接近业务语言

---

## 📁 测试组织

### 测试文件命名

- `*-flow.spec.ts` - 端到端流程测试
- `*-pom.spec.ts` - 使用 POM 的测试
- `visual-regression.spec.ts` - 视觉回归测试
- `responsive.spec.ts` - 响应式测试

### 测试结构

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from './pages';

test.describe('功能名称', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await loginPage.goto();

    // Act
    await loginPage.login('user@example.com', 'password');

    // Assert
    expect(page.url()).toContain('/dashboard');
  });
});
```

---

## ✅ 测试最佳实践

### DO ✅

1. **使用页面对象模型**
   ```typescript
   const loginPage = new LoginPage(page);
   await loginPage.login('user@example.com', 'password');
   ```

2. **等待页面稳定**
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(500); // 等待动画
   ```

3. **使用语义化定位器**
   ```typescript
   // ✅ 好的定位器
   page.locator('button:has-text("提交")')
   page.getByRole('button', { name: '提交' })
   page.getByLabel('Email')

   // ❌ 避免 CSS 选择器
   page.locator('.submit-btn.primary')
   ```

4. **编写描述性测试名称**
   ```typescript
   test('should display error when email is invalid') {}
   ```

5. **使用测试数据工厂**
   ```typescript
   const taskData = testData.generateTaskTitle();
   ```

6. **清理测试状态**
   ```typescript
   test.afterEach(async ({ page }) => {
     // 清理创建的数据
     await cleanupTestData();
   });
   ```

### DON'T ❌

1. **不要硬编码等待时间**
   ```typescript
   // ❌ 避免
   await page.waitForTimeout(5000);

   // ✅ 使用智能等待
   await page.waitForSelector('.loading', { state: 'hidden' });
   ```

2. **不要过度使用截图**
   - 只在关键点截图
   - 视觉回归测试单独组织

3. **不要测试第三方服务**
   - Mock 外部 API
   - 使用测试数据库

4. **不要编写脆弱的选择器**
   ```typescript
   // ❌ 脆弱的选择器
   page.locator('div > div > button')

   // ✅ 稳定的选择器
   page.getByRole('button', { name: 'Submit' })
   ```

5. **不要在测试中共享状态**
   - 每个测试独立运行
   - 使用 `beforeEach` 清理状态

---

## 🚀 执行策略

### 本地开发

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定测试文件
npm run test:e2e -- login-flow-pom.spec.ts

# 运行特定测试
npm run test:e2e -g "should login"

# 使用 UI 模式
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug
```

### CI 环境

```bash
# 运行所有测试（无头模式）
npm run test:e2e

# 只运行 Chromium
npm run test:e2e:chromium

# 并行运行（多浏览器）
npm run test:e2e -- --workers=4
```

### 测试分片

```bash
# 分片 1
npm run test:e2e -- --shard=1/3

# 分片 2
npm run test:e2e -- --shard=2/3

# 分片 3
npm run test:e2e -- --shard=3/3
```

---

## 🔄 CI/CD 集成

### GitHub Actions 工作流

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 测试报告

- **HTML 报告** - `playwright-report/index.html`
- **JSON 报告** - `test-results/test-results.json`
- **JUnit 报告** - `test-results/junit-results.xml`

---

## 🔧 故障排除

### 常见问题

#### 1. 测试超时

**问题**: 测试在等待元素时超时

**解决方案**:
```typescript
// 增加超时时间
test.setTimeout(60000);

// 使用更智能的等待
await page.waitForSelector('.element', { timeout: 30000 });
```

#### 2. 元素未找到

**问题**: 选择器找不到元素

**解决方案**:
```typescript
// 使用 Playwright Inspector 查找正确的选择器
// npx playwright codegen http://localhost:3000

// 使用更灵活的选择器
await page.locator('button:has-text("Submit")').click();
```

#### 3. 测试不稳定（Flaky）

**问题**: 测试有时通过，有时失败

**解决方案**:
```typescript
// 等待网络空闲
await page.waitForLoadState('networkidle');

// 等待动画完成
await page.waitForTimeout(500);

// 使用重试
test('should do something', async ({ page }) => {
  // 测试逻辑
}, { retries: 3 });
```

#### 4. 视觉回归失败

**问题**: 截图对比失败

**解决方案**:
```bash
# 更新基线截图
npx playwright test --update-snapshots

# 检查差异
npx playwright show-report
```

#### 5. 浏览器崩溃

**问题**: 浏览器在测试过程中崩溃

**解决方案**:
```bash
# 清理缓存
rm -rf test-results/

# 重新安装浏览器
npx playwright install --force
```

### 调试技巧

```typescript
// 1. 使用 Playwright Inspector
npm run test:e2e:debug

// 2. 暂停执行
await page.pause();

// 3. 截图调试
await page.screenshot({ path: 'debug.png' });

// 4. 检查控制台错误
page.on('console', msg => console.log(msg.text()));

// 5. 慢速模式（逐步执行）
npx playwright test --headed --slowMo=1000
```

---

## 📚 参考资源

- [Playwright 官方文档](https://playwright.dev/)
- [Page Object Model 指南](https://playwright.dev/docs/pom)
- [最佳实践](https://playwright.dev/docs/best-practices)
- [测试组织](https://playwright.dev/docs/organizing-tests)

---

*最后更新: 2026-03-21*
