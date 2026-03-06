# E2E 测试指南

本目录包含 7zi-frontend 项目的端到端测试。

## 测试文件结构

```
e2e/
├── snapshots/              # 视觉回归测试基线截图
├── integration/            # 集成测试
│   └── user-flow.spec.ts   # 用户流程测试
├── home.spec.ts            # 首页测试
├── navigation.spec.ts      # 导航测试
├── pages.spec.ts           # 页面导航测试
├── form.spec.ts            # 表单测试
├── dashboard.spec.ts       # Dashboard 测试
├── team.spec.ts            # 团队页面测试（新增）
├── i18n.spec.ts            # 多语言测试（新增）
├── visual-regression.spec.ts  # 视觉回归测试（新增）
├── responsive.spec.ts      # 响应式测试
└── theme.spec.ts           # 主题测试
```

## 运行测试

### 运行所有测试
```bash
npm run test:e2e
```

### 运行特定测试文件
```bash
npx playwright test e2e/home.spec.ts
```

### 运行特定浏览器
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 运行视觉回归测试
```bash
npx playwright test --project=visual-regression
```

### 更新视觉回归基线
```bash
npx playwright test --update-snapshots
```

### 调试模式
```bash
npx playwright test --debug
```

### UI 模式
```bash
npx playwright test --ui
```

### 生成报告
```bash
npx playwright show-report
```

## 测试覆盖的关键路径

### 1. 首页加载和导航
- ✅ 首页正确加载
- ✅ 导航栏显示
- ✅ 页脚显示
- ✅ 页面加载性能

### 2. 多语言切换
- ✅ 中文/英文页面加载
- ✅ URL 语言前缀
- ✅ 语言切换器功能
- ✅ 内容本地化
- ✅ 语言持久化

### 3. 团队页面展示
- ✅ 团队成员显示
- ✅ 成员卡片信息
- ✅ 响应式布局
- ✅ 交互效果

### 4. 联系表单提交
- ✅ 表单验证
- ✅ 错误处理
- ✅ 提交反馈
- ✅ 无障碍访问

### 5. Dashboard 加载
- ✅ 统计卡片显示
- ✅ 成员状态展示
- ✅ 刷新功能
- ✅ 响应式布局

### 6. 视觉回归测试
- ✅ 首页截图（桌面/移动/平板）
- ✅ 团队页面截图
- ✅ Dashboard 截图
- ✅ 联系页面截图
- ✅ 深色模式截图

## 测试原则

1. **测试用户关键路径** - 优先测试用户最常用的功能
2. **断言要明确和有意义** - 每个断言都应该验证具体的功能
3. **避免不稳定的测试** - 使用适当的等待和超时
4. **可维护性** - 使用 Page Object 模式组织代码
5. **可重复性** - 测试应该是确定性的

## 视觉回归测试

视觉回归测试使用 Playwright 的截图比较功能。

### 添加新的视觉回归测试

```typescript
test('页面截图', async ({ page }) => {
  await page.goto('/path');
  await expect(page).toHaveScreenshot('page-name.png', {
    fullPage: true,
    maxDiffPixels: 100,
  });
});
```

### 更新基线截图

当设计变更时，运行：
```bash
npx playwright test --update-snapshots
```

### 审查差异

测试失败时，查看 `test-results/` 目录中的差异截图。

## 测试报告

测试完成后，报告生成在：
- HTML 报告：`playwright-report/index.html`
- JSON 结果：`test-results/test-results.json`
- JUnit XML: `test-results/junit-results.xml`

查看报告：
```bash
npx playwright show-report
```

## CI/CD 集成

在 CI 环境中运行测试：
```bash
# 安装 Playwright 浏览器
npx playwright install --with-deps chromium

# 运行测试
npm run test:e2e
```

## 常见问题

### 测试失败：超时
增加超时时间或优化等待策略：
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // 等待动画
```

### 视觉回归测试失败
检查是否是预期的设计变更。如果是，更新基线：
```bash
npx playwright test --update-snapshots
```

### 测试不稳定
- 使用明确的等待条件
- 避免硬编码的等待时间
- 使用 data-testid 属性定位元素

## 最佳实践

1. **使用 data-testid** - 为关键元素添加测试 ID
2. **Page Object 模式** - 封装页面操作
3. **Fixture 复用** - 使用 beforeEach 设置通用状态
4. **有意义的断言** - 验证业务逻辑，不仅是 DOM 存在
5. **并行执行** - 利用 Playwright 的并行能力

## 资源

- [Playwright 文档](https://playwright.dev)
- [Playwright 测试指南](https://playwright.dev/docs/test-intro)
- [视觉回归测试](https://playwright.dev/docs/test-snapshots)
