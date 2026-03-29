# Playwright E2E 测试套件

7zi-Frontend 项目的端到端测试，使用 Playwright 实现。

## 目录结构

```
e2e/
├── fixtures/              # 测试夹具和类型定义
│   ├── test.fixtures.ts   # 自定义测试夹具
│   └── types.ts           # 类型定义和页面对象
├── helpers/               # 测试辅助函数
│   └── test-helpers.ts    # 通用测试工具
├── *.spec.ts              # 测试文件
├── playwright.config.ts   # Playwright 配置
└── README.md             # 本文件
```

## 测试覆盖

### 1. 登录流程 (login-flow.spec.ts)
- ✅ 表单显示和验证
- ✅ 用户名/密码格式验证
- ✅ 成功登录和跳转
- ✅ 登录失败处理
- ✅ 会话持久化
- ✅ 登出功能
- ✅ Token 过期处理
- ✅ 网络错误处理
- ✅ 登录尝试限制
- ✅ 记住我功能
- ✅ 键盘导航支持

### 2. 通知系统 (notifications.spec.ts)
- ✅ 通知接收和显示
- ✅ 通知中心交互
- ✅ 标记已读/未读
- ✅ 删除通知
- ✅ 清除所有通知
- ✅ 实时通知接收
- ✅ 通知分组
- ✅ 通知搜索
- ✅ 通知偏好设置
- ✅ 桌面通知开关
- ✅ 通知类型过滤
- ✅ 大量通知处理
- ✅ 虚拟滚动

### 3. WebSocket 连接 (websocket.spec.ts)
- ✅ 连接建立和状态显示
- ✅ 消息收发
- ✅ Echo 响应
- ✅ 连接详情显示
- ✅ 延迟统计
- ✅ 手动断开/重连
- ✅ 自动重连机制
- ✅ 指数退避策略
- ✅ 重连次数限制
- ✅ 心跳机制
- ✅ 心跳超时检测
- ✅ 消息队列
- ✅ 性能监控
- ✅ 安全连接 (WSS)

### 4. 错误处理 (error-handling.spec.ts)
- ✅ 网络连接失败
- ✅ 网络重试机制
- ✅ 请求超时
- ✅ 离线状态处理
- ✅ 400 Bad Request
- ✅ 401 Unauthorized
- ✅ 403 Forbidden
- ✅ 404 Not Found
- ✅ 500 Internal Server Error
- ✅ 503 Service Unavailable
- ✅ 表单验证错误
- ✅ 错误边界捕获
- ✅ WebSocket 连接错误
- ✅ localStorage 配额
- ✅ 图片加载错误
- ✅ 文件上传错误
- ✅ 并发请求错误
- ✅ 错误日志上报

## 运行测试

### 安装依赖

```bash
npm install
```

### 安装 Playwright 浏览器

```bash
npx playwright install
```

### 运行所有 E2E 测试

```bash
npm run test:e2e
```

### UI 模式运行（推荐用于调试）

```bash
npm run test:e2e:ui
```

### 调试模式

```bash
npm run test:e2e:debug
```

### 运行特定测试文件

```bash
npx playwright test login-flow.spec.ts
```

### 运行特定测试用例

```bash
npx playwright test -g "应该成功登录"
```

### 运行特定浏览器

```bash
# Chrome
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# Safari
npx playwright test --project=webkit
```

### 无头模式运行

```bash
npx playwright test --headed=false
```

## 查看测试报告

### HTML 报告

```bash
npx playwright show-report
```

报告会自动打开浏览器显示。

### JSON 报告

测试运行后会在 `test-results/results.json` 生成 JSON 报告。

## 测试夹具

### authenticatedPage
已认证的页面实例，自动完成登录。

```typescript
test('应该显示用户信息', async ({ authenticatedPage }) => {
  await expect(authenticatedPage.getByText('欢迎')).toBeVisible();
});
```

### user
模拟用户数据。

```typescript
test('应该使用用户数据', async ({ user }) => {
  expect(user.email).toBe('test@example.com');
});
```

### mockAPI
API 模拟函数。

```typescript
test('应该模拟 API', async ({ mockAPI }) => {
  await mockAPI('/api/users', [{ id: 1, name: 'Test' }]);
});
```

## 页面对象

### LoginPage
登录页面的页面对象。

```typescript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login('user@example.com', 'password');
```

### NotificationPage
通知页面的页面对象。

```typescript
const notifPage = new NotificationPage(page);
await notifPage.openNotificationCenter();
const count = await notifPage.getNotificationCount();
```

### WebSocketPage
WebSocket 页面的页面对象。

```typescript
const wsPage = new WebSocketPage(page);
await wsPage.sendMessage('Hello');
await wsPage.expectConnected();
```

## 辅助函数

### checkToast(page, message)
验证 Toast 消息显示。

```typescript
await checkToast(page, '登录成功');
```

### fillForm(page, fields)
填充表单字段。

```typescript
await fillForm(page, {
  '用户名': 'testuser',
  '邮箱': 'test@example.com',
});
```

### takeScreenshot(page, name)
截取屏幕截图。

```typescript
await takeScreenshot(page, 'login-scenario');
```

### setAuthToken(page, token)
设置认证 token。

```typescript
await setAuthToken(page, 'test_token_123');
```

## 测试最佳实践

### 1. 使用页面对象模式
```typescript
// ✅ 好的做法
const loginPage = new LoginPage(page);
await loginPage.login(email, password);

// ❌ 差的做法
await page.getByLabel('用户名').fill(email);
await page.getByLabel('密码').fill(password);
await page.getByRole('button').click();
```

### 2. 使用可访问选择器
```typescript
// ✅ 好的做法
await page.getByRole('button', { name: '登录' }).click();
await page.getByLabel('用户名').fill('test');

// ❌ 差的做法
await page.locator('#login-btn').click();
await page.locator('.username-input').fill('test');
```

### 3. 等待元素可见
```typescript
// ✅ 好的做法
await expect(page.getByText('登录成功')).toBeVisible();

// ❌ 差的做法
await page.waitForTimeout(1000);
```

### 4. 使用测试夹具
```typescript
// ✅ 好的做法
test('应该显示数据', async ({ authenticatedPage }) => {
  // 已自动登录
  await expect(authenticatedPage.getByText('用户名')).toBeVisible();
});

// ❌ 差的做法
test('应该显示数据', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('test');
  // ... 登录逻辑
  await expect(page.getByText('用户名')).toBeVisible();
});
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 调试技巧

### 1. 使用 Playwright Inspector
```bash
npx playwright test --debug
```

### 2. 生成测试代码
运行时自动录制操作生成代码。

### 3. 查看追踪文件
```bash
npx playwright show-trace trace.zip
```

### 4. 慢动作模式
```javascript
test.use({ actionTimeout: 10000 });
```

## 测试数据管理

### 使用固定测试数据
```typescript
const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  password: 'Test123456!',
};
```

### 生成随机数据
```typescript
const email = generateEmail();
const username = generateUsername();
```

### Mock API 响应
```typescript
await page.route('**/api/users', async (route) => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ users: [] }),
  });
});
```

## 故障排除

### 测试超时
增加超时时间：
```typescript
test.setTimeout(60000);
```

### 浏览器启动失败
重新安装浏览器：
```bash
npx playwright install --force
```

### 端口冲突
修改配置中的端口或关闭占用端口的进程。

---

**维护者**: 🧪 测试员
**更新日期**: 2026-03-28
