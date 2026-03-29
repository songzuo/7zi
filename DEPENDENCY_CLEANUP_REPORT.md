# 依赖项清理分析报告

## 执行时间
2026-03-29

## 项目统计
- TypeScript 文件数: 1,142
- 生产依赖: 29 个
- 开发依赖: 23 个
- 总依赖: 52 个

---

## 生产依赖分析

### 核心框架 (必需 - 保留)
- `next`: ^16.2.1 - Next.js 框架 ✓
- `react`: ^19.2.4 - React 核心库 ✓
- `react-dom`: ^19.2.4 - React DOM ✓
- `react-is`: ^19.2.4 - React 工具库 ✓

### 状态管理 (使用中 - 保留)
- `zustand`: ^5.0.12 - 状态管理，用于 stores/ ✓

### 3D 图形库 (使用中 - 保留)
- `@react-three/fiber`: ^9.5.0 - React Three.js 绑定 ✓
- `@react-three/drei`: ^10.7.7 - Three.js 辅助组件 ✓
- `three`: ^0.183.2 - 3D 图形库 ✓

### 工具库 (使用中 - 保留)
- `lucide-react`: ^0.577.0 - 图标库 ✓
- `zod`: ^4.3.6 - Schema 验证 ✓
- `fuse.js`: ^7.1.0 - 模糊搜索 ✓

### 数据库 (使用中 - 保留)
- `better-sqlite3`: ^12.8.0 - SQLite 数据库 ✓

### 实时通信 (使用中 - 保留)
- `socket.io-client`: ^4.8.3 - WebSocket 客户端 ✓

### 图像处理 (使用中 - 保留)
- `sharp`: ^0.34.5 - 图像优化 ✓

### 文件导出 (使用中 - 保留)
- `exceljs`: ^4.4.0 - Excel 导出 ✓

### 安全 (使用中 - 保留)
- `isomorphic-dompurify`: ^3.6.0 - XSS 防护 ✓

### 认证 (使用中 - 保留)
- `jose`: ^6.2.1 - JWT 处理 ✓

### 测试相关 (使用中 - 保留)
- `@testing-library/jest-dom`: ^6.9.1 - Jest DOM 匹配器 ✓
- `@jest/globals`: ^30.3.0 - Jest 全局 ✓

### MCP (使用中 - 保留)
- `@modelcontextprotocol/sdk`: ^1.27.1 - MCP SDK ✓

### 工具 (使用中 - 保留)
- `commander`: ^14.0.3 - CLI 工具 ✓
- `uuid`: ^13.0.0 - UUID 生成 ✓
- `glob`: ^13.0.6 - 文件匹配 ✓
- `undici`: ^7.24.6 - HTTP 客户端 ✓
- `web-vitals`: ^5.1.0 - 性能指标 ✓
- `next-intl`: ^4.8.3 - 国际化 ✓
- `recharts`: ^3.8.0 - 图表库 ✓
- `ioredis`: ^5.10.1 - Redis 客户端 ✓

**结论**: 所有生产依赖都在使用中，无需删除。

---

## 开发依赖分析

### Next.js 相关 (必需 - 保留)
- `@next/bundle-analyzer`: ^16.2.1 - Bundle 分析 ✓
- `eslint-config-next`: ^16.2.1 - ESLint 配置 ✓

### 测试框架 (使用中 - 保留)
- `@playwright/test`: ^1.58.2 - E2E 测试 ✓
- `@testing-library/react`: ^16.3.2 - React 测试 ✓
- `@testing-library/user-event`: ^14.6.1 - 用户事件模拟 ✓
- `@vitejs/plugin-react`: ^6.0.1 - Vite React 插件 ✓
- `vitest`: ^4.1.2 - 测试框架 ✓
- `@vitest/coverage-v8`: ^4.1.2 - 测试覆盖率 ✓
- `msw`: ^2.12.14 - Mock Service Worker ✓
- `supertest`: ^7.2.2 - API 测试 ✓

### 代码质量 (使用中 - 保留)
- `eslint`: ^9 - Linting ✓
- `eslint-plugin-storybook`: ^10.3.3 - Storybook ESLint ✓

### TypeScript (必需 - 保留)
- `typescript`: ^5 - TypeScript 编译器 ✓

### 工具 (使用中 - 保留)
- `madge`: ^8.0.0 - 循环依赖检测 ✓

### 类型定义 (需检查)
- `@types/node`: ^25.5.0 - Node.js 类型 ✓
- `@types/react`: ^19 - React 类型 ✓
- `@types/react-dom`: ^19 - React DOM 类型 ✓
- `@types/better-sqlite3`: ^7.6.12 - SQLite 类型 ✓
- `@types/commander`: ^2.12.5 - Commander 类型 ✓
- `@types/nodemailer`: ^7.0.11 - Nodemailer 类型 ✓
- `@types/supertest`: ^7.2.0 - Supertest 类型 ✓

### Tailwind (使用中 - 保留)
- `@tailwindcss/postcss`: ^4.2.2 - Tailwind PostCSS ✓

### WebSocket 服务端 (需检查)
- `socket.io`: ^4.8.3 - Socket.io 服务端 ✓

**可疑依赖**:
1. `@types/nodemailer`: ^7.0.11 - 未发现 nodemailer 使用
2. `socket.io`: ^4.8.3 - 服务端依赖，但可能用于测试

---

## ts-prune 输出分析

从 ts-prune-output.txt 分析：
- 大量导出被标记为 "(used in module)"
- 这些导出在其他模块中被导入使用
- 大多数函数/类型都是被使用的

---

## 安全删除检查

### 候选删除列表

#### 1. @types/nodemailer
**检查命令**:
```bash
grep -r "nodemailer" src/ --include="*.ts" --include="*.tsx"
```

#### 2. socket.io (devDependency)
**检查命令**:
```bash
grep -r "socket.io" src/ --include="*.ts" --include="*.tsx"
```

---

## 下一步操作

1. 手动检查可疑依赖的使用情况
2. 如确认未使用，创建 package.json 更新
3. 运行构建测试验证
4. 生成最终报告

