# E2E 测试套件 README

本目录包含 7zi 项目的端到端（E2E）测试套件，使用 Playwright 框架实现。

## 测试文件

### 新增测试文件（2026-03-29）

| 文件 | 描述 | 测试数 |
|------|------|--------|
| `homepage.spec.ts` | 首页加载和渲染测试 | 21 |
| `navigation.spec.ts` | 导航菜单功能测试 | 30 |
| `language-switching.spec.ts` | 语言切换功能测试 | 35 |
| `core-interactions.spec.ts` | 核心交互元素测试 | 40 |

### 现有测试文件

项目还有其他 E2E 测试文件，包括：
- `auth-flow.spec.ts` - 认证流程测试
- `dashboard-analytics.spec.ts` - 仪表板分析测试
- `dashboard.spec.ts` - 仪表板功能测试
- `form.spec.ts` - 表单交互测试
- `notifications.spec.ts` - 通知功能测试
- `permissions-roles.spec.ts` - 权限角色测试
- 等等...

## 运行测试

### 运行新增测试

```bash
# 运行所有新增测试
npx playwright test homepage.spec.ts navigation.spec.ts language-switching.spec.ts core-interactions.spec.ts

# 运行单个测试文件
npx playwright test homepage.spec.ts

# UI 模式运行
npx playwright test homepage.spec.ts --ui

# 调试模式
npx playwright test homepage.spec.ts --debug
```

### 运行所有 E2E 测试

```bash
# 运行所有测试（包括新增和现有）
npm run test:e2e

# 仅 Chromium
npm run test:e2e:chromium

# UI 模式
npm run test:e2e:ui

# 查看报告
npm run test:e2e:report
```

### 按项目运行

```bash
# 仅 Chromium（桌面端）
npx playwright test --project=chromium

# 仅移动端 Chrome
npx playwright test --project="Mobile Chrome"

# 视觉回归测试
npx playwright test --project=visual-regression
```

## 测试统计

### 新增测试统计

- **总测试数**: 126
- **覆盖功能**: 4 个关键模块
- **支持语言**: 中文、英文
- **支持设备**: 桌面端、移动端

### 测试分类

- **首页测试**: 21 个测试
- **导航测试**: 30 个测试
- **语言切换测试**: 35 个测试
- **核心交互测试**: 40 个测试

## 测试覆盖范围

### 首页加载和渲染 ✅

- 根路径重定向
- 中/英文页面加载
- 导航栏显示
- 语言/主题切换器
- 性能加载时间
- 响应式适配
- SEO 元数据

### 导航菜单功能 ✅

- 桌面端导航
- 移动端菜单
- 页面跳转
- 浏览器历史
- 可访问性

### 语言切换功能 ✅

- 语言切换器界面
- 切换功能
- 内容本地化
- URL 结构
- 持久化
- 可访问性
- 边界情况

### 核心交互元素 ✅

- 主题切换
- 按钮交互
- 链接交互
- 表单交互
- 滚动交互
- 触摸交互
- 错误处理
- 可访问性
- 性能优化

## 配置

Playwright 配置文件位于项目根目录的 `playwright.config.ts`。

主要配置：
- **测试目录**: `./e2e`
- **并行运行**: 完全并行
- **CI 重试**: 2 次
- **超时**: 10s（操作），30s（导航）
- **浏览器**: Chromium（桌面）、Mobile Chrome（移动）

## 报告

测试运行后会生成多种格式的报告：

- **HTML 报告**: `playwright-report/`
- **JSON 报告**: `test-results/test-results.json`
- **JUnit 报告**: `test-results/junit-results.xml`

查看 HTML 报告：
```bash
npm run test:e2e:report
# 或
npx playwright show-report
```

## 维护

### 添加新测试

1. 在 `e2e/` 目录创建新的 `.spec.ts` 文件
2. 使用 `test.describe()` 组织测试套件
3. 使用 `test()` 定义测试用例
4. 运行测试验证

### 最佳实践

- 每个测试独立运行，不依赖其他测试
- 使用稳定的元素选择器（如 `aria-label`）
- 合理使用 `waitForLoadState` 和 `waitForTimeout`
- 为测试添加清晰的描述
- 使用 `beforeEach` 设置初始状态

### 调试技巧

```bash
# 调试模式
npx playwright test --debug

# UI 模式
npx playwright test --ui

# 查看详细日志
DEBUG=pw:api npx playwright test

# 运行单个测试
npx playwright test -g "测试名称"
```

## 相关文档

- [完整测试计划](../docs/e2e-test-plan.md)
- [Playwright 官方文档](https://playwright.dev/)
- [项目 README](../README.md)

## 支持

如有问题或需要帮助，请查看：
1. [Playwright 故障排除](https://playwright.dev/docs/troubleshooting)
2. [常见问题](../docs/e2e-test-plan.md#常见问题)
3. 项目团队

---

**最后更新**: 2026-03-29
**维护者**: 7zi 测试团队
