# 依赖清理报告（改进版）

生成时间: 2026/3/20 21:40:55

## 📊 摘要

| 指标 | 数量 |
|------|------|
| 总文件数 | 589 |
| 总依赖数 | 43 |
| 已使用依赖 | 30 |
| 未使用生产依赖 | 5 |
| 未使用开发依赖 | 4 |
| 需谨慎删除的依赖 | 5 |

## 🔄 动态导入的包

这些包通过动态 import 使用，静态分析可能会漏掉：

- crypto
- @
- stream
- fs
- child_process
- os
- glob
- web-vitals

## ⚙️ 配置文件中使用的包

这些包在配置文件中被引用：

- eslint
- eslint-config-next
- typescript
- vitest
- @vitest/coverage-v8
- playwright
- @playwright/test

## 📜 脚本中使用的包

这些包在 package.json 的 scripts 中被引用：

- eslint
- eslint-config-next
- typescript
- vitest
- @vitest/coverage-v8
- playwright
- @playwright/test

## 🗑️ 未使用的生产依赖

| 包名 | 版本 |
|------|------|
| @a2a-js/sdk | ^0.3.13 |
| @emailjs/browser | ^4.4.1 |
| next-auth | ^4.24.13 |
| resend | ^6.9.4 |
| undici | ^7.24.5 |

### 清理命令

```bash
npm uninstall @a2a-js/sdk
npm uninstall @emailjs/browser
npm uninstall next-auth
npm uninstall resend
npm uninstall undici
```

## 🗑️ 未使用的开发依赖

| 包名 | 版本 |
|------|------|
| @next/bundle-analyzer | ^16.1.7 |
| @testing-library/dom | ^10.4.1 |
| @testing-library/jest-dom | ^6.9.1 |
| jsdom | ^29.0.0 |

### 清理命令

```bash
npm uninstall -D @next/bundle-analyzer
npm uninstall -D @testing-library/dom
npm uninstall -D @testing-library/jest-dom
npm uninstall -D jsdom
```

## ⚠️ 可能可以删除但需要谨慎的依赖

| 包名 | 版本 | 原因 |
|------|------|------|
| @tailwindcss/postcss | ^4 | 配置相关 |
| @types/better-sqlite3 | ^7.6.12 | 配置相关 |
| @types/socket.io | ^3.0.1 | 配置相关 |
| @vitejs/plugin-react | ^5.2.0 | 配置相关 |
| tailwindcss | ^4 | 配置相关 |

这些依赖与配置、构建或测试相关，删除前请确保：
1. 不再需要相应的功能（如 Tailwind CSS、ESLint 等）
2. 已迁移到替代方案
3. 相关配置文件已更新


## 🔒 核心依赖（不应删除）

以下依赖是项目核心必需的，不应删除：

- react
- react-dom
- next
- typescript
- @types/react
- @types/react-dom
- @types/node

## ⚠️ 注意事项

1. 此报告基于静态分析，可能存在误报
2. 某些依赖可能仅在运行时或构建时使用
3. 类型导入 (import type) 被编译后会移除，不影响运行时
4. 某些包可能在环境变量或配置中引用
5. 建议在清理前运行完整测试套件
6. 清理后请验证应用功能正常

## 🔧 建议步骤

1. 仔细审查此报告
2. 运行测试: `npm test`
3. 清理未使用的生产依赖
4. 评估并清理未使用的开发依赖
5. 再次运行测试确保一切正常
6. 提交更改

