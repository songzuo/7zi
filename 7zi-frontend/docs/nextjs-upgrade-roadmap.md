# Next.js 15 App Router 升级路线图

**项目**: 7zi-frontend
**当前版本**: Next.js 16.2.1 + React 18.2.0
**文档生成**: 2026-03-28
**评估结论**: ✅ **项目已超越 Next.js 15，无需"升级"，建议优化现有配置**

---

## 📋 执行摘要

### 重要发现

**好消息**: 7zi-frontend 项目当前运行在 **Next.js 16.2.1**，这是比 Next.js 15 更新的版本！因此，传统意义上的"升级到 Next.js 15"并不适用。

**当前状态评估**:

- ✅ Next.js 16.2.1（超越 15）
- ✅ React 18.2.0（最新稳定版）
- ✅ App Router 已启用
- ✅ TypeScript 配置完整
- ✅ Turbopack 已配置
- ✅ 国际化支持（7种语言）
- ✅ React Compiler 已启用

### 核心建议

虽然不需要"升级"，但以下优化可以进一步提升项目质量：

| 优化项                  | 优先级 | 预期收益           | 工作量 |
| ----------------------- | ------ | ------------------ | ------ |
| 启用 Turbopack 生产构建 | 🟢 高  | 构建速度 2-5x 提升 | 1-2 天 |
| 迁移剩余同步 API 到异步 | 🟡 中  | 消除废弃警告       | 2-3 天 |
| 启用类型化路由          | 🟡 中  | 完整类型安全       | 1 天   |
| 优化缓存策略            | 🟢 高  | 性能提升 20-30%    | 2-3 天 |
| 实验性功能评估          | 🟡 中  | 提前体验新特性     | 1-2 天 |

---

## 一、当前项目分析

### 1.1 技术栈现状

| 技术           | 版本       | 状态    | 说明                  |
| -------------- | ---------- | ------- | --------------------- |
| Next.js        | **16.2.1** | ✅ 超前 | 比 Next.js 15 更新    |
| React          | **18.2.0** | ✅ 最新 | 稳定版本              |
| TypeScript     | **5.x**    | ✅ 良好 | 完整类型支持          |
| Node.js        | **22.x**   | ✅ 良好 | 满足最低要求 (18.18+) |
| next-intl      | **4.8.3**  | ✅ 良好 | 国际化支持            |
| Turbopack      | 已配置     | ⚠️ 部分 | 开发已用，生产未启用  |
| React Compiler | 已启用     | ✅ 良好 | 自动优化              |

### 1.2 App Router 使用情况

✅ **已完全采用 App Router**:

- 使用 `src/app/` 目录结构
- 57 个 API 路由
- 国际化路由支持：`[locale]/`
- Server Actions 已实现
- 动态路由和静态生成混用

### 1.3 项目规模

- **代码行数**: ~2,949 行 TypeScript/TSX（仅 src/app 目录）
- **API 路由**: 57 个
- **国际化**: 7 种语言（zh, en, ja, ko, es, fr, de）
- **测试覆盖**: 94.2% 通过率

### 1.4 当前配置亮点

#### next.config.ts 优秀配置

```typescript
const nextConfig: NextConfig = {
  // ✅ React Compiler 已启用
  reactCompiler: true,

  // ✅ Standalone 输出模式（Docker 友好）
  output: 'standalone',

  // ✅ 图片优化配置完整
  images: {
    remotePatterns: [...],
    formats: ['image/avif', 'image/webp'],
  },

  // ✅ 实验性功能配置合理
  experimental: {
    optimizePackageImports: [...],
    optimizeCss: true,
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    turbopackTreeShaking: true,
  },

  // ✅ Turbopack 配置
  turbopack: {
    resolveAlias: {
      '@/': path.join(__dirname, 'src/'),
    },
  },
};
```

### 1.5 代码迁移状态

#### 同步 API 使用情况

**cookies() API**:

- ✅ **已迁移**: 3 处已正确使用 `await cookies()`
- 示例：`src/app/api/csrf-token/route.ts`

**headers() API**:

- ✅ 未使用（无需迁移）

**params 和 searchParams**:

- ⚠️ **需要检查**: 动态路由参数是否正确处理

**Route Handlers**:

- ✅ GET 方法可能需要缓存策略调整

---

## 二、Next.js 15/16 最佳实践对照

### 2.1 已实现的最佳实践 ✅

| 实践           | 状态 | 实现                         |
| -------------- | ---- | ---------------------------- |
| React 18       | ✅   | React 18.2.0 已安装          |
| React Compiler | ✅   | `reactCompiler: true` 已启用 |
| next.config.ts | ✅   | 使用 TypeScript 配置文件     |
| App Router     | ✅   | 完全采用 App Router          |
| Server Actions | ✅   | 已实现服务器端操作           |
| TypeScript     | ✅   | 完整类型支持                 |
| 国际化         | ✅   | next-intl 4.8.3              |
| 图片优化       | ✅   | AVIF/WebP 格式支持           |
| 代码分割       | ✅   | 已配置 splitChunks           |
| 缓存优化       | ✅   | SWC Minify, optimizeCss      |

### 2.2 可优化的实践 ⚠️

| 实践               | 当前状态 | 优化建议                 |
| ------------------ | -------- | ------------------------ |
| Turbopack 生产构建 | 仅开发   | 启用生产构建             |
| 类型化路由         | 未启用   | 启用 `typedRoutes: true` |
| 客户端缓存         | 默认配置 | 根据 use case 调整       |
| ISR 缓存           | 部分     | 扩展静态生成             |
| unstable_after     | 未使用   | 评估适用性               |
| 静态路由指示器     | 未配置   | 启用开发时可视化         |

### 2.3 未实现的实验性功能 🔬

| 功能               | 状态            | 建议优先级 |
| ------------------ | --------------- | ---------- |
| Turbopack 生产构建 | ⚠️ Beta         | 高         |
| typedRoutes        | 🔬 Experimental | 中         |
| unstable_after     | 🔬 Experimental | 低-中      |
| advancedStaticGen  | 🔬 Experimental | 低         |

---

## 三、优化路线图

### 阶段 1: Turbopack 生产构建（1-2 天）

#### 目标

启用 Turbopack 生产构建，提升构建性能。

#### 预期收益

- **构建速度**: 2-5x 提升
- **大型项目**: 最高 5x（30 核机器）
- **中小型项目**: 2-4x

#### 实施步骤

**1. 当前状态确认**:

```bash
# 检查当前构建脚本
cat package.json | grep "build"
```

已有脚本：

- `build:turbo`: 已配置，但需要验证

**2. 启用 Turbopack 构建**:

```bash
# 使用 Turbopack 构建进行测试
npm run build:turbo

# 对比构建时间
time npm run build
time npm run build:turbo
```

**3. 验证构建产物**:

```bash
# 检查构建输出
ls -lh .next/

# 对比包大小
# 使用 bundle analyzer
npm run build:analyze:turbo
```

**4. 更新 CI/CD**:

- 修改 GitHub Actions 使用 `build:turbo`
- 验证部署流程
- 监控生产环境

#### 风险和缓解

| 风险             | 影响  | 缓解措施           |
| ---------------- | ----- | ------------------ |
| CSS 顺序不同     | 低-中 | 充分的视觉回归测试 |
| 边缘场景打包差异 | 低    | Webpack 作为备用   |
| 小项目收益不明显 | 中    | 基准测试决定       |

#### 验收标准

- [ ] Turbopack 构建成功
- [ ] 构建时间减少 >30%
- [ ] 所有测试通过
- [ ] 生产环境稳定运行 1 周
- [ ] E2E 测试无回归

---

### 阶段 2: 异步 API 完整迁移（2-3 天）

#### 目标

确保所有 Request APIs 正确使用异步模式，消除废弃警告。

#### 实施步骤

**1. 代码审计**:

```bash
# 搜索所有可能的使用
grep -r "cookies()" src/app/
grep -r "headers()" src/app/
grep -r "params" src/app/ --include="*.tsx"
grep -r "searchParams" src/app/ --include="*.tsx"
```

**2. 应用 codemod**:

```bash
# 应用官方 codemod
npx @next/codemod@canary next-async-request-api .
```

**3. 手动检查**:

检查以下文件类型：

- `src/app/[locale]/**/page.tsx`
- `src/app/[locale]/**/layout.tsx`
- `src/app/api/**/route.ts`
- `src/app/actions/**/*`

**4. 类型更新**:

```typescript
// ✅ 正确的 params 类型
type Params = Promise<{ id: string }>

export async function Page({ params }: { params: Params }) {
  const { id } = await params
  // ...
}

// ✅ 正确的 searchParams 类型
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  // ...
}
```

#### 验收标准

- [ ] 无废弃警告
- [ ] TypeScript 类型检查通过
- [ ] 所有测试通过
- [ ] 开发环境无警告日志

---

### 阶段 3: 类型化路由（1 天）

#### 目标

启用 Next.js 16+ 的类型化路由，实现完整的类型安全。

#### 预期收益

- 编译时类型检查所有路由
- 防止无效链接
- IDE 自动补全和错误提示

#### 实施步骤

**1. 启用配置**:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  typedRoutes: true, // 启用类型化路由
}

export default nextConfig
```

**2. 生成类型**:

```bash
# 手动生成类型
npx next typegen

# 或运行开发服务器
npm run dev
```

**3. 更新组件**:

```typescript
// ✅ 使用 LayoutProps 类型
export default function DashboardLayout(props: LayoutProps<'/dashboard'>) {
  return (
    <div>
      {props.children}
      {/* 完全类型的并行路由插槽 */}
      {props.analytics}
      {props.team}
    </div>
  );
}
```

**4. 验证类型安全**:

```typescript
// ❌ 这会报错
<Link href="/invalid-route">Broken Link</Link>

// ✅ 这会通过
<Link href="/dashboard/analytics">Analytics</Link>
```

#### 验收标准

- [ ] 类型生成成功
- [ ] TypeScript 编译无错误
- [ ] 无效链接被捕获
- [ ] IDE 自动补全正常

---

### 阶段 4: 缓存策略优化（2-3 天）

#### 目标

根据实际使用情况，优化客户端路由缓存和 API 缓存策略。

#### 实施步骤

**1. 审计当前缓存行为**:

```typescript
// next.config.ts - 检查当前配置
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30, // 当前值
      static: 180,
    },
  },
}
```

**2. 分析页面特性**:

| 页面类型 | 推荐策略           | 说明             |
| -------- | ------------------ | ---------------- |
| 仪表盘   | `staleTime: 0`     | 实时数据，不缓存 |
| 博客文章 | `staleTime: 30-60` | 内容更新不频繁   |
| 设置页面 | `staleTime: 300`   | 很少变化         |
| 公共主页 | `force-static`     | 完全静态         |

**3. 配置精细缓存**:

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0, // 动态页面始终最新
      static: 180, // 静态页面缓存 3 分钟
    },
  },
}
```

**4. API 缓存策略**:

```typescript
// API 路由 - 明确缓存行为
export const dynamic = 'force-static' // 或 'force-dynamic'
export const revalidate = 3600 // 1 小时重新验证

export async function GET() {
  // ...
}
```

**5. Fetch 缓存控制**:

```typescript
// 服务端组件
const data = await fetch('https://api.example.com/data', {
  cache: 'force-cache', // 或 'no-store'
  next: {
    revalidate: 3600, // 1 小时
  },
})
```

#### 验收标准

- [ ] 缓存配置符合业务需求
- [ ] 首次加载性能提升 >20%
- [ ] 导航性能提升 >30%
- [ ] 数据新鲜度满足要求

---

### 阶段 5: 实验性功能评估（1-2 天）

#### unstable_after（响应后执行）

**适用场景**:

- 日志记录
- 分析数据发送
- 第三方系统同步

**实施示例**:

```typescript
// 1. 启用配置
// next.config.ts
const nextConfig = {
  experimental: {
    after: true,
  },
};

// 2. 使用 API
import { unstable_after as after } from 'next/server';
import { logAnalytics } from '@/app/utils';

export default function Page() {
  // 次要任务（响应完成后执行）
  after(() => {
    logAnalytics();
  });

  // 主要任务（立即返回）
  return <div>Page Content</div>;
}
```

**评估**:

- ✅ 适合: 性能监控、分析
- ⚠️ 谨慎使用: 关键数据同步（可能失败）

#### 静态路由指示器

**配置**:

```typescript
// next.config.ts
const nextConfig = {
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
}
```

**好处**:

- 开发时可视化静态/动态路由
- 帮助性能优化决策

#### 验收标准

- [ ] 不稳定功能按需启用
- [ ] 文档记录实验性 API
- [ ] 监控实验性功能影响

---

## 四、回滚策略

### 4.1 Turbopack 回滚

```bash
# 如果 Turbopack 构建出现问题
# 切换回 Webpack
npm run build:webpack

# 或修改 package.json 的默认构建脚本
```

### 4.2 类型化路由回滚

```bash
# 如果类型化路由导致问题
# 1. 禁用配置
# next.config.ts - 删除 typedRoutes: true

# 2. 清理生成类型
rm -rf .next/types

# 3. 重启开发服务器
npm run dev
```

### 4.3 缓存策略回滚

```bash
# 恢复默认缓存行为
# next.config.ts - 删除或调整 staleTimes 配置

# 或临时恢复旧行为
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,  // Next.js 14 默认值
    },
  },
};
```

### 4.4 完整回滚

```bash
# 如果所有优化都失败
git checkout <升级前 commit>
npm install
npm run build
npm run test
```

---

## 五、风险评估与缓解

| 风险项             | 严重程度 | 可能性 | 缓解措施                    |
| ------------------ | -------- | ------ | --------------------------- |
| Turbopack CSS 差异 | 中-高    | 低-中  | 视觉回归测试 + Webpack 备用 |
| 类型化路由类型错误 | 中       | 低     | 渐进式启用 + 严格类型检查   |
| 缓存策略不当       | 中       | 中     | A/B 测试 + 监控             |
| 构建失败           | 低       | 低     | 充分测试 + CI 检查          |
| 生产性能回归       | 高       | 低     | 性能基准 + 灰度发布         |

---

## 六、实施时间线

### 第 1 周：评估和准备

- [ ] 代码审计（同步 API 使用）
- [ ] 性能基准建立
- [ ] 文档更新
- [ ] 团队培训

### 第 2 周：核心优化

- [ ] Turbopack 生产构建（优先级 1）
- [ ] 异步 API 完整迁移（优先级 2）

### 第 3 周：类型安全和缓存

- [ ] 类型化路由（优先级 3）
- [ ] 缓存策略优化（优先级 4）

### 第 4 周：验证和部署

- [ ] 全面测试
- [ ] 性能验证
- [ ] 灰度发布
- [ ] 监控和调整

---

## 七、预期收益总结

### 性能提升

| 指标         | 预期提升 | 说明               |
| ------------ | -------- | ------------------ |
| **构建时间** | 2-5x     | Turbopack 生产构建 |
| **首次加载** | 20-30%   | 缓存策略优化       |
| **导航速度** | 30-40%   | 客户端缓存优化     |
| **类型安全** | 100%     | 类型化路由         |

### 开发体验

| 指标         | 预期改善 | 说明                        |
| ------------ | -------- | --------------------------- |
| **构建速度** | 2-5x     | Turbopack                   |
| **类型检查** | 编译时   | 类型化路由                  |
| **错误提示** | 即时     | 类型化路由                  |
| **代码质量** | 提升     | React Compiler + TypeScript |

### 维护性

| 指标         | 预期改善 | 说明     |
| ------------ | -------- | -------- |
| **重构风险** | 降低     | 类型安全 |
| **Bug 发现** | 更早     | 类型检查 |
| **代码审查** | 更高效   | 类型提示 |

---

## 八、最佳实践建议

### 8.1 Turbopack 最佳实践

✅ **建议启用的情况**:

- 项目模块数 > 10K
- 构建时间 > 5 分钟
- 使用多核 CPU 服务器
- 需要频繁构建

⚠️ **谨慎使用的情况**:

- 小型项目（模块数 < 5K）
- 开发机器资源有限
- 对 CSS 顺序有严格要求
- 依赖特定的 Webpack 插件

### 8.2 缓存策略建议

```typescript
// 推荐的缓存层次
const nextConfig = {
  // 1. 静态内容：完全静态生成
  // 2. 准静态：ISR（增量静态再生成）
  // 3. 动态内容：按需渲染
  // 4. 实时数据：始终重新获取
}
```

### 8.3 类型安全建议

- **始终启用** `strict: true` 在 tsconfig
- **使用** `satisfies` 操作符验证 props
- **避免** `any` 类型
- **优先** 类型守卫而非类型断言

### 8.4 性能监控建议

```typescript
// 使用 Web Vitals 监控
export function reportWebVitals(metric) {
  // 发送到分析服务
  // 跟踪 FCP, LCP, FID, CLS, TTFB, INP
}
```

---

## 九、工具和命令

### 升级和迁移工具

```bash
# 自动升级 CLI（不适用，已是最新）
# npx @next/codemod@canary upgrade latest

# 异步 API codemod
npx @next/codemod@canary next-async-request-api .

# 类型生成
npx next typegen

# 类型检查
tsc --noEmit

# 构建分析
npm run build:analyze
npm run build:analyze:turbo
```

### 开发工具

```bash
# 开发服务器（Turbopack）
npm run dev:turbo

# 开发服务器（Webpack）
npm run dev:webpack

# 构建
npm run build
npm run build:turbo

# 测试
npm test
npm run test:coverage
npm run test:e2e
```

### 监控和调试

```bash
# Lighthouse CI
npx lighthouse http://localhost:3000

# Bundle 分析
npm run build:analyze

# 性能追踪
npm run test:performance
```

---

## 十、结论和建议

### 最终结论

**核心发现**: 7zi-frontend 项目已经运行在 **Next.js 16.2.1 + React 18.2.0**，这是一个现代化的技术栈，**不需要进行传统的"升级到 Next.js 15"**。

### 推荐行动

**立即行动（高优先级）**:

1. ✅ 启用 Turbopack 生产构建
2. ✅ 完整迁移异步 API
3. ✅ 优化缓存策略

**短期行动（中优先级）**: 4. ✅ 启用类型化路由 5. ✅ 实验性功能评估

**长期行动（低优先级）**: 6. ✅ 性能监控增强 7. ✅ 文档和培训

### 关键成功因素

1. **渐进式优化**: 不要一次性改变所有内容
2. **充分测试**: 自动化测试覆盖率 > 80%
3. **性能基准**: 建立基准并持续监控
4. **团队协作**: 及时沟通和知识共享
5. **回滚准备**: 始终保持可回滚状态

### 下一步

**立即开始**:

```bash
# 1. 创建优化分支
git checkout -b optimize/nextjs-performance

# 2. 建立基准
npm run build
time npm run build

# 3. 启用 Turbopack
npm run build:turbo
time npm run build:turbo

# 4. 对比结果
```

---

## 附录：参考资料

### 官方文档

- [Next.js 16 文档](https://nextjs.org/docs)
- [Next.js 15 升级指南](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [React 19 升级指南](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Turbopack 文档](https://nextjs.org/docs/app/api-reference/turbopack)

### 社区资源

- [Next.js GitHub](https://github.com/vercel/next.js)
- [React GitHub](https://github.com/facebook/react)
- [Vercel 社区](https://github.com/vercel/vercel/discussions)

### 相关文档

- `/UPGRADE_NEXT15.md` - 之前的升级评估
- `REACT_OPTIMIZATION_SUMMARY.md` - React 优化总结
- `BUNDLE_OPTIMIZATION_IMPLEMENTATION.md` - Bundle 优化

---

**文档版本**: 1.0
**最后更新**: 2026-03-28
**作者**: 📚 咨询师 AI Agent
**审核**: 待主管审核
��
