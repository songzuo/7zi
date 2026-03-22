# 依赖清理报告

生成时间: 2026/3/20 21:39:35

## 📊 摘要

| 指标 | 数量 |
|------|------|
| 总文件数 | 589 |
| 总依赖数 | 43 |
| 已使用依赖 | 26 |
| 未使用生产依赖 | 9 |
| 未使用开发依赖 | 20 |
| 包含未使用导出的文件 | 119 |
| 包含未使用导入的文件 | 2 |
| 包含未使用变量的文件 | 0 |

## 🗑️ 未使用的生产依赖

| 包名 | 版本 |
|------|------|
| @a2a-js/sdk | ^0.3.13 |
| @emailjs/browser | ^4.4.1 |
| @modelcontextprotocol/sdk | ^1.27.1 |
| @sentry/nextjs | ^10.44.0 |
| next-auth | ^4.24.13 |
| react-dom | ^19.2.4 |
| resend | ^6.9.4 |
| undici | ^7.24.5 |
| web-vitals | ^4.2.4 |

### 清理命令

```bash
npm uninstall @a2a-js/sdk
npm uninstall @emailjs/browser
npm uninstall @modelcontextprotocol/sdk
npm uninstall @sentry/nextjs
npm uninstall next-auth
npm uninstall react-dom
npm uninstall resend
npm uninstall undici
npm uninstall web-vitals
```

## 🗑️ 未使用的开发依赖

| 包名 | 版本 |
|------|------|
| @next/bundle-analyzer | ^16.2.1 |
| @playwright/test | ^1.58.2 |
| @tailwindcss/postcss | ^4 |
| @testing-library/dom | ^10.4.1 |
| @testing-library/jest-dom | ^6.9.1 |
| @testing-library/react | ^16.3.2 |
| @testing-library/user-event | ^14.6.1 |
| @types/better-sqlite3 | ^7.6.12 |
| @types/node | ^25.5.0 |
| @types/react | ^19 |
| @types/react-dom | ^19 |
| @types/socket.io | ^3.0.1 |
| @vitejs/plugin-react | ^5.2.0 |
| @vitest/coverage-v8 | ^4.1.0 |
| eslint | ^9 |
| eslint-config-next | ^16.2.1 |
| jsdom | ^29.0.0 |
| playwright | ^1.58.2 |
| tailwindcss | ^4 |
| typescript | ^5 |

### 清理命令

```bash
npm uninstall -D @next/bundle-analyzer
npm uninstall -D @playwright/test
npm uninstall -D @tailwindcss/postcss
npm uninstall -D @testing-library/dom
npm uninstall -D @testing-library/jest-dom
npm uninstall -D @testing-library/react
npm uninstall -D @testing-library/user-event
npm uninstall -D @types/better-sqlite3
npm uninstall -D @types/node
npm uninstall -D @types/react
npm uninstall -D @types/react-dom
npm uninstall -D @types/socket.io
npm uninstall -D @vitejs/plugin-react
npm uninstall -D @vitest/coverage-v8
npm uninstall -D eslint
npm uninstall -D eslint-config-next
npm uninstall -D jsdom
npm uninstall -D playwright
npm uninstall -D tailwindcss
npm uninstall -D typescript
```

## 📤 未使用的导出

### src/app/[locale]/blog/[slug]/page.tsx

- 默认导出: `BlogPostPage`

### src/app/[locale]/blog/page.tsx

- 默认导出: `BlogPage`

### src/app/[locale]/contact/page.tsx

- 默认导出: `ContactPage`

### src/app/[locale]/dashboard/loading.tsx

- 默认导出: `DashboardPageLoading`

### src/app/[locale]/dashboard/page.tsx

- 默认导出: `DashboardPage`

### src/app/[locale]/page.tsx

- 默认导出: `HomePage`

### src/app/[locale]/portfolio/[slug]/page.tsx

- 默认导出: `ProjectDetailPage`

### src/app/[locale]/portfolio/page.tsx

- 默认导出: `PortfolioPage`

### src/app/[locale]/settings/page.tsx

- 默认导出: `SettingsPage`

### src/app/[locale]/tasks/loading.tsx

- 默认导出: `TasksPageLoading`

### src/app/api/users/rbac-example-route.ts

- 命名导出: `GET_ROLES`

### src/app/collaboration-demo/page.tsx

- 默认导出: `CollaborationDemoPage`

### src/app/global-error.tsx

- 默认导出: `GlobalError`

### src/app/not-found.tsx

- 默认导出: `NotFound`

### src/app/page.tsx

- 默认导出: `RootPage`

### src/app/sse-demo/page.tsx

- 默认导出: `SSEDemoPage`

### src/components/BottomNav.tsx

- 命名导出: `BottomNav`, `BottomNavWrapper`

### src/components/ErrorBoundaryWrapper.tsx

- 命名导出: `AsyncErrorBoundary`

### src/components/ErrorDisplay.tsx

- 类型导出: `ErrorVariant`

### src/components/ExportPanel.tsx

- 默认导出: `ExportPanel`
- 命名导出: `ExportPanel`, `QuickExportButton`

*... 还有 99 个文件 *


## 📥 未使用的导入

### src/app/[locale]/layout.tsx

- `import { useGlobalLoading } from '@'`

### src/lib/utils.ts

- `import * as Utils from '@'`


## ⚠️ 注意事项

1. 此报告基于静态分析，可能存在误报
2. 某些依赖可能仅在运行时或构建时使用
3. 类型导入 (import type) 被编译后会移除，不影响运行时
4. 建议在清理前运行完整测试套件
5. 清理后请验证应用功能正常

## 🔧 建议步骤

1. 仔细审查此报告
2. 运行测试: `npm test`
3. 清理未使用的依赖
4. 手动清理未使用的导入/导出
5. 再次运行测试确保一切正常
6. 提交更改

