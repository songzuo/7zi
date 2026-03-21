# E2E Tests

7zi 项目的端到端测试套件，使用 Playwright 测试框架。

## 📁 目录结构

```
e2e/
├── fixtures/                    # 测试 fixtures 和测试数据
│   └── test-data.ts            # 测试数据工厂
├── helpers/                    # 测试辅助函数
│   ├── index.ts               # 辅助函数导出
│   └── test-helpers.ts        # 通用测试工具
├── pages/                      # Page Object Model (POM)
│   ├── index.ts               # 页面对象导出
│   ├── login-page.ts          # 登录页面对象
│   ├── dashboard-page.ts      # Dashboard 页面对象
│   ├── task-creation-page.ts   # 任务创建页面对象
│   └── navigation-page.ts     # 导航页面对象
├── integration/                # 集成测试
│   └── user-flow.spec.ts      # 完整用户流程测试
├── snapshots/                  # 视觉回归基线截图
│   └── visual-regression.spec.ts-snapshots/
├── auth-flow.spec.ts           # 登录/登出流程测试
├── dashboard.spec.ts           # Dashboard 页面测试
├── task-creation.spec.ts      # 任务创建测试
├── navigation.spec.ts          # 导航测试
├── login-flow-pom.spec.ts      # 使用 POM 的登录流程测试
├── task-creation-pom.spec.ts   # 使用 POM 的任务创建测试
├── navigation-pom.spec.ts      # 使用 POM 的导航测试
├── visual-regression.spec.ts   # 视觉回归测试
├── visual-regression-enhanced.spec.ts  # 增强的视觉回归测试
├── team.spec.ts               # 团队页面测试
├── form.spec.ts               # 表单测试
├── home.spec.ts               # 首页测试
├── i18n.spec.ts               # 国际化测试
├── permissions-errors.spec.ts  # 权限错误测试
├── responsive.spec.ts         # 响应式测试
├── theme.spec.ts              # 主题切换测试
└── pages.spec.ts              # 页面测试
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 安装 Playwright 浏览器

```bash
npx playwright install --with-deps
```

### 运行所有 E2E 测试

```bash
npm run test:e2e
```

### 使用运行脚本

```bash
# 运行所有测试
./run-e2e.sh

# 使用 UI 模式
./run-e2e.sh -u

# 运行特定文件
./run-e2e.sh -f login-flow-pom.spec.ts

# 运行匹配的测试
./run-e2e.sh -g "should login"

# 调试模式
./run-e2e.sh -d

# 更新截图
./run-e2e.sh -s

# 查看报告
./run-e2e.sh -r
```

## 📚 测试分类

### 1. 核心用户流程测试

| 测试文件 | 描述 | 状态 |
|---------|------|------|
| `login-flow-pom.spec.ts` | 登录/登出流程 | ✅ |
| `task-creation-pom.spec.ts` | 任务创建和管理 | ✅ |
| `navigation-pom.spec.ts` | 导航和页面访问 | ✅ |
| `integration/user-flow.spec.ts` | 完整用户流程 | ✅ |

### 2. 页面功能测试

| 测试文件 | 描述 | 状态 |
|---------|------|------|
| `dashboard.spec.ts` | Dashboard 功能 | ✅ |
| `team.spec.ts` | 团队页面 | ✅ |
| `form.spec.ts` | 表单功能 | ✅ |
| `home.spec.ts` | 首页功能 | ✅ |
| `pages.spec.ts` | 页面测试 | ✅ |

### 3. 视觉回归测试

| 测试文件 | 描述 | 状态 |
|---------|------|------|
| `visual-regression.spec.ts` | 基础视觉回归 | ✅ |
| `visual-regression-enhanced.spec.ts` | 增强视觉回归 | ✅ |

### 4. 跨浏览器和响应式测试

| 测试文件 | 描述 | 状态 |
|---------|------|------|
| `responsive.spec.ts` | 响应式布局 | ✅ |
| `theme.spec.ts` | 主题切换 | ✅ |
| `i18n.spec.ts` | 国际化 | ✅ |

### 5. 错误和权限测试

| 测试文件 | 描述 | 状态 |
|---------|------|------|
| `permissions-errors.spec.ts` | 权限和错误处理 | ✅ |

## 🏗️ Page Object Model (POM)

### 使用 POM 的优势

- **可维护性** - UI 变化只需修改页面对象
- **可复用性** - 页面对象在多个测试中复用
- **可读性** - 测试代码更接近业务语言
- **封装性** - 页面细节与测试分离

### 示例

```typescript
import { LoginPage, DashboardPage } from './pages';

test('should login and access dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  // Login
  await loginPage.goto();
  await loginPage.login('test@7zi.com', 'test123456');

  // Verify dashboard
  await dashboardPage.waitForLoad();
  expect(await dashboardPage.isOnDashboard()).toBeTruthy();
});
```

## 🎯 测试覆盖范围

### 关键用户流程

- ✅ 用户登录
- ✅ 用户登出
- ✅ 创建任务
- ✅ 编辑任务
- ✅ 删除任务
- ✅ 查看任务列表
- ✅ 搜索任务
- ✅ 筛选任务
- ✅ 导航主要页面
- ✅ 主题切换
- ✅ 语言切换

### 页面覆盖

- ✅ 首页 (`/`)
- ✅ 登录页 (`/login`)
- ✅ Dashboard (`/dashboard`)
- ✅ 任务页面 (`/tasks`)
- ✅ 团队页面 (`/team`)
- ✅ 关于页面 (`/about`)
- ✅ 联系页面 (`/contact`)
- ✅ 博客页面 (`/blog`)
- ✅ 设置页面 (`/settings`)

### 浏览器覆盖

- ✅ Chromium (桌面)
- ✅ Firefox (桌面)
- ✅ WebKit/Safari (桌面)
- ✅ Chrome (移动端 - Pixel 5)
- ✅ Safari (移动端 - iPhone 12)

### 视口覆盖

- ✅ 1920x1080 (桌面)
- ✅ 1366x768 (笔记本)
- ✅ 768x1024 (平板)
- ✅ 375x667 (移动端)

## 🔧 测试配置

### Playwright 配置

配置文件: `playwright.config.ts`

**关键配置项:**

- `baseURL`: `http://localhost:3000`
- `testDir`: `./e2e`
- `fullyParallel`: true (并行运行)
- `retries`: 2 (CI 环境)
- `workers`: 1 (CI 环境)

### 视觉回归配置

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,
    threshold: 0.2,
  },
}
```

## 📊 测试报告

### HTML 报告

运行测试后查看报告:

```bash
npm run test:e2e:report
```

### 其他报告格式

- JSON: `test-results/test-results.json`
- JUnit: `test-results/junit-results.xml`
- HTML: `playwright-report/index.html`

## 🛠️ 调试测试

### 使用 Playwright Inspector

```bash
npx playwright test --debug
```

### 慢速模式

```bash
npx playwright test --slowMo=1000
```

### 暂停执行

```typescript
await page.pause();
```

### 截图调试

```typescript
await page.screenshot({ path: 'debug.png' });
```

## ✅ 最佳实践

1. **使用页面对象模型 (POM)**
   - 封装页面细节
   - 提高代码复用

2. **智能等待**
   - 避免硬编码延迟
   - 使用 `waitForLoadState`

3. **语义化定位器**
   - 优先使用 `getByRole`
   - 避免使用 CSS 类

4. **测试数据隔离**
   - 使用测试数据工厂
   - 每个测试独立运行

5. **清理测试状态**
   - 使用 `afterEach` 清理
   - 避免测试间干扰

## 📚 相关文档

- [E2E 测试策略](/docs/E2E_TESTING_STRATEGY.md)
- [测试文档](/TESTING.md)
- [Playwright 文档](https://playwright.dev/)

## 🤝 贡献

### 添加新测试

1. 确定测试类型（POM、功能测试、视觉回归）
2. 创建测试文件（如 `new-feature.spec.ts`）
3. 编写测试用例
4. 运行测试确保通过
5. 提交 PR

### 添加新页面对象

1. 在 `pages/` 目录创建新文件
2. 实现页面对象类
3. 在 `pages/index.ts` 导出
4. 在测试中使用

## 🐛 故障排除

### 测试超时

```typescript
test.setTimeout(60000);
```

### 元素未找到

```typescript
await page.waitForSelector('.element', { timeout: 30000 });
```

### 测试不稳定

```typescript
test('flaky test', async () => {
  // ...
}, { retries: 3 });
```

### 视觉回归失败

```bash
npx playwright test --update-snapshots
```

---

*最后更新: 2026-03-21*
