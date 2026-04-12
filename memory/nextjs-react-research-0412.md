# Next.js 和 React 最新动态研究报告

**研究日期：** 2026-04-12  
**数据来源：** nextjs.org/blog、react.dev/blog 官方博客

---

## 一、Next.js 16

**发布时间：** 2025 年 10 月 21 日（Next.js Conf 2025 期间）

### 1.1 主要新特性

#### Cache Components（核心新功能）
- 引入 `"use cache"` 指令，可缓存页面、组件和函数
- 由编译器自动生成缓存 key，实现显式缓存
- App Router 默认改为动态（请求时执行），缓存完全为可选项
- 完成了 2023 年提出的 Partial Prerendering（PPR）愿景
- 配置方式：
  ```ts
  const nextConfig = {
    cacheComponents: true,
  };
  ```

#### Next.js DevTools MCP
- 集成 Model Context Protocol（MCP），支持 AI 辅助调试
- 为 AI 智能体提供：Next.js 路由/缓存/渲染知识、统一浏览器+服务端日志、自动错误堆栈跟踪、活跃路由上下文感知

#### `proxy.ts`（取代 `middleware.ts`）
- `middleware.ts` → 重命名为 `proxy.ts`
- 明确网络边界，运行在 Node.js 运行时
- `middleware.ts`（Edge）已弃用，未来版本将移除

#### 日志改进
- 开发请求日志新增耗时分析（Compile 路由编译、Render 代码执行和 React 渲染）
- 构建日志分步骤显示耗时

### 1.2 Beta → Stable 的功能

#### Turbopack（稳定）
- 开发和生产构建均已稳定，成为所有新项目的默认打包工具
- 效果：生产构建提速 2–5×，Fast Refresh 提速最高 10×
- 采用率：50%+ 开发会话、20%+ 生产构建已使用 Turbopack

#### Turbopack 文件系统缓存（Beta）
- 开发环境缓存编译器产物，重启后编译时间大幅缩短
- 需手动开启：
  ```ts
  experimental: { turbopackFileSystemCacheForDev: true }
  ```

#### React Compiler 支持（稳定）
- 内置集成，自动 memoization

#### Build Adapters API（Alpha）
- 可在构建过程中注入自定义适配器，修改构建配置和输出

### 1.3 增强路由
- Layout 去重（layout deduplication）
- 增量预取（incremental prefetching）

### 1.4 改进的缓存 API
- `updateTag()` 新增
- `revalidateTag()` 优化

### 1.5 React 19.2 特性整合
- View Transitions（页面过渡动画）
- `useEffectEvent()`
- `<Activity />` 组件

### 1.6 破坏性变更
- Async params（异步参数）
- `next/image` 默认值变更
- 更多见官方升级指南

### 1.7 升级方式
```bash
npx @next/codemod@canary upgrade latest
# 或
npm install next@latest react@latest react-dom@latest
```

---

## 二、React 生态最新动态

### 2.1 React Foundation 成立（重大里程碑）

**时间：** 2026 年 2 月 24 日正式发布

- React、React Native、JSX **不再归 Meta 所有**，转交给 React Foundation（Linux Foundation 托管）
- **铂金创始成员（8家）：** Amazon、Callstack、Expo、Huawei、Meta、Microsoft、Software Mansion、Vercel
- 执行董事：Seth Webster
- 技术方向由贡献者社区独立治理
- 正在完成：仓库/网站/基础设施迁移、技术治理结构最终化、生态支持计划、下一届 React Conf 筹备

### 2.2 React 19.2（2025 年 10 月 1 日）

#### `<Activity />` 组件
- 将应用拆分为可控制和优先级的"活动"
- 两种模式：`visible` / `hidden`
- `hidden`：隐藏子组件、卸载副作用、延迟更新直到 React 空闲
- 用途：预加载用户可能访问的页面、保存导航离开时的状态（如输入框内容）
- 未来计划支持更多模式

#### `useEffectEvent` Hook
- 解决 Effect 中"事件"回调的依赖问题
- 概念上类似 DOM 事件——始终获取最新的 props 和 state
- 例子：聊天连接成功通知，`theme` 变化不会导致重连
- **注意：** 不应加入依赖数组，需升级 `eslint-plugin-react-hooks@latest`

#### `cacheSignal`
- 仅用于 React Server Components
- 感知 `cache()` 生命周期何时结束（渲染完成/中断/失败），用于清理或中止工作

#### React Performance Tracks
- Chrome DevTools Performance 面板新增自定义 tracks
- **Scheduler track：** 展示不同优先级的工作（blocking/transition）、事件调度、阻塞等待信息
- **Components track：** 展示组件树渲染和副作用运行的树状结构，帮助识别性能问题

#### Partial Pre-rendering（部分预渲染）
- 新 API：`prerender()` → `resume()` 或 `resumeAndPrerender()`
- 预渲染静态部分并从 CDN 提供，后续填充动态内容
- 支持 Web Streams 和 Node Streams

### 2.3 React Compiler v1.0（2025 年 10 月 7 日）

- React Compiler 首个稳定版发布
- 功能：自动 memoization、理解 React 代码的新 lint 规则
- Vite、Next.js、Expo **默认支持**
- 迁移指南已提供

### 2.4 React Conf 2025（2025 年 10 月 7-8 日）

#### 主要发布
- React Foundation 宣布
- React Compiler v1.0
- React 19.2 新功能
- View Transitions（Canary）：`<ViewTransition />` 组件用于页面过渡动画
- Fragment Refs（Canary）：与 Fragment 包装的 DOM 节点交互的新方式

#### React Native 更新
- React Native 0.82：**仅支持 New Architecture**
- 实验性 Hermes V1 支持
- 新 Web 对齐 DOM APIs
- React Native 周下载量 **400 万**（同比翻倍）
- 知名迁移：Shopify、Zalando、HelloFresh；AI 应用：Mistral、Replit、v0

### 2.5 安全漏洞（紧急）

- **CVE-2025-66478（2025年12月3日）：** React Server Components 远程代码执行漏洞，CVSS 10.0，React 19.0.1/19.1.2/19.2.1 已修复
- **CVE-2025-55184/55183（2025年12月11日）：** React Server Components DoS + 源码泄露，所有 Next.js 13.x-16.x 用户需升级

---

## 三、值得关注的技术趋势

| 趋势 | 说明 |
|------|------|
| **AI 优先开发** | Next.js DevTools MCP、浏览器内 AI Agent、Agentic Future |
| **缓存显式化** | Next.js 16 从隐式缓存转向 "use cache" 显式缓存 |
| **React 治理开源化** | React Foundation 成立，Meta 放权，社区主导 |
| **编译时优化** | React Compiler 稳定，Turbopack 取代 Webpack |
| **Activity/可见性控制** | `<Activity>` 实现细粒度渲染控制，预加载和状态保持 |
| **跨平台一致** | React Native New Architecture only，DOM APIs 对齐 Web |

---

## 四、建议

1. **立即行动：** 修复安全漏洞，升级到最新补丁版本
2. **短期：** 评估 Next.js 16 的 Cache Components，考虑 `proxy.ts` 迁移
3. **中期：** 引入 React Compiler v1.0 试用，`<Activity>` 组件进行预加载优化
4. **长期：** 关注 React Foundation 技术治理演进、Async React 路线图
