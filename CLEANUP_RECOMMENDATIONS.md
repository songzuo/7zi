# 代码清理建议报告

**生成时间**: 2026-03-22
**项目**: 7zi AI 团队管理平台 (Next.js 16 + React 19 + TypeScript)
**任务**: 未使用代码分析及清理建议

---

## 执行摘要

本报告基于 `unused-code-analysis-report.json` 的分析结果，提供了详细的代码清理建议。

### 分析概览

| 类别                 | 数量 | 说明                    |
| -------------------- | ---- | ----------------------- |
| 总文件数             | 897  | 项目中所有文件          |
| 未使用导入的文件     | 107  | 包含未使用导入的文件    |
| 未使用导出的文件     | 376  | 导出但未被引用的文件    |
| 包含死代码的文件     | 362  | 有未使用函数/常量的文件 |
| **Archive 目录文件** | 162  | 归档的旧文件            |

---

## 1. 安全删除建议

### 1.1 Archive 目录清理 (可释放 ~2MB 空间)

Archive 目录包含大量旧报告和已归档的代码，建议按以下策略清理：

#### 🟢 可直接删除 (优先级: 高)

以下为明显过时的临时报告和测试文件：

```
archive/reports/ - 1.7MB (大部分可清理)
├── CODE_CLEANUP_SESSION.md (已完成)
├── BUGFIX_SESSION.md (临时会话记录)
├── BUILD_ERROR_FIX.md (临时修复记录)
├── DEPLOY.md (已过时)
├── GCP-CONFIG.md (配置迁移后过时)
├── HEARTBEAT.md (临时文档)
├── dependency-cleanup-report.md (已完成)
├── dependency-cleanup-improved-report.md (重复)
├── TEST_TYPESCRIPT_FIXES.md (已完成)
├── TODO_SUMMARY.md (临时待办)
├── UNDICI_AUDIT.md (临时审计)
├── FIX_SUMMARY.md (临时总结)
└── INTL_FIX_SUMMARY.md (已完成)

archive/architecture/ - 124KB (已归档设计文档)
└── ai-team-dashboard/ (旧架构设计，已迁移)

archive/moltbook-gateway/ - 240KB (已废弃项目)
└── 完整的 moltbook-gateway 代码
```

#### 🟡 需要评估后删除 (优先级: 中)

这些报告可能仍有参考价值，建议迁移到文档中心：

- 各类 `*_IMPLEMENTATION_REPORT.md` (实现完成)
- 各类 `*_OPTIMIZATION_SUMMARY.md` (优化总结)
- 各类 `*_AUDIT_REPORT.md` (审计报告)
- `智能体世界专家视角分析报告.md` (分析报告)

**建议操作**：

1. 将有价值的分析报告迁移到 `docs/reports/`
2. 删除临时性和重复性的报告
3. 保留最重要的系统文档

---

## 2. 代码清理建议

### 2.1 未使用的导入清理

#### 高优先级清理 (107 个文件)

以下文件包含大量未使用的导入，建议立即清理：

#### 页面级组件 (未使用的服务端导入)

```typescript
// src/app/[locale]/about/page.tsx
// 未使用: MobileMenu, setRequestLocale, getTranslations, Locale, locales, Link,
//        LanguageSwitcher, ThemeToggle, StructuredData

// src/app/[locale]/contact/page.tsx
// 未使用: MobileMenu, setRequestLocale, getTranslations, Locale, locales, Link,
//        LanguageSwitcher, ThemeToggle, StructuredData, ContactForm, SocialLinks

// src/app/[locale]/team/page.tsx
// 未使用: MobileMenu, setRequestLocale, getTranslations, Locale, locales, Link,
//        LanguageSwitcher, ThemeToggle, StructuredData

// src/app/[locale]/portfolio/page.tsx
// 未使用: MobileMenu, setRequestLocale, getTranslations, Locale, locales, Link,
//        LanguageSwitcher, ThemeToggle, StructuredData, Suspense
```

**清理命令**：

```bash
cd /root/.openclaw/workspace/7zi-project
npx eslint --fix "src/app/**/page.tsx"
```

#### API 路由 (未使用的类型导入)

```typescript
// src/app/api/analytics/export/route.ts
// 未使用: type ExportOptions, type ExportFormat, type AnalyticsFilters,
//        type TimeSeriesDataPoint, type AnalyticsResponse

// src/app/api/analytics/metrics/route.ts
// 未使用: type AnalyticsMetrics, type AnalyticsFilters, type TimeSeriesDataPoint,
//        type AnalyticsResponse, type PaginatedResponse

// src/app/api/database/health/route.ts
// 未使用: type DatabaseHealthResult, type PerformanceReport

// src/app/api/database/optimize/route.ts
// 未使用: type PoolConfig
```

**清理命令**：

```bash
npx eslint --fix "src/app/api/**/*.ts"
```

#### 组件层 (未使用的 React Hooks)

```typescript
// src/components/Analytics.tsx
// 未使用: useEffect

// src/components/Footer.tsx
// 未使用: useMemo

// src/components/ResponsiveComponents.tsx
// 未使用: type FC

// src/components/TeamActivityTracker.tsx
// 未使用: LoadingSpinner
```

**清理命令**：

```bash
npx eslint --fix "src/components/**/*.tsx"
```

---

### 2.2 未使用的导出清理

#### 🔴 高优先级：组件导出 (376 个文件)

许多组件导出了未被使用的函数，建议重构为内部函数：

```typescript
// src/components/AIChat.tsx
// 未使用导出: AIChat (default) - 整个组件未被引用

// src/components/ActivityLog.tsx
// 未使用导出: ActivityLog

// src/components/BackupList.tsx
// 未使用导出: BackupList

// src/components/HealthDashboard.tsx
// 未使用导出: HealthDashboard

// src/components/Hero3D.tsx
// 未使用导出: Hero3D

// src/components/GitHubActivity.tsx
// 未使用导出: GitHubActivity
```

**建议操作**：

```bash
# 1. 检查是否有动态导入使用这些组件
grep -r "AIChat\|ActivityLog\|BackupList" --include="*.ts" --include="*.tsx" src/

# 2. 如果确认未使用，可以删除整个文件
# 或将导出改为内部函数
```

#### 🟡 中优先级：库函数导出

```typescript
// src/lib/utils.ts
// 未使用导出: generateId, isEmpty, isValidEmail, debounce, throttle,
//             LRUCache (但可能在其他地方通过其他导出使用)

// src/lib/api/validation.ts
// 未使用导出: validateBody, withQueryValidation (可能被中间件使用)

// src/lib/auth/middleware-rbac.ts
// 未使用导出: hasPermission, hasAllRoles
```

**注意**：这些函数可能在其他文件中通过不同路径导入，需要谨慎清理。

---

### 2.3 死代码清理 (362 个文件)

#### API 路由中的未使用处理程序

```typescript
// src/app/api/a2a/jsonrpc/route.ts
// 未使用函数: POST, OPTIONS (导出但路由未调用)

// src/app/api/analytics/export/route.ts
// 未使用函数: POST, GET (可能被其他路由处理器覆盖)

// src/app/api/feedback/route.ts
// 未使用函数: GET_FEEDBACK, DELETE_FEEDBACK (定义但未使用)
```

#### 组件中的未使用函数

```typescript
// src/app/[locale]/dashboard/DashboardClient.tsx
// 未使用函数: DashboardClient, StatCard, MemberStatus
// 未使用常量: REFRESH_INTERVAL, GITHUB_OWNER, GITHUB_REPO, AI_MEMBERS

// src/components/RatingForm.tsx
// 未使用函数: handleImageSelect, handleRemoveImage, handleHelpful, formatDate

// src/components/TeamActivityTracker.tsx
// 未使用函数: TeamActivityTracker
```

#### Hook 中的未使用函数

```typescript
// src/hooks/useDashboardData.ts
// 未使用导出: useDashboardData

// src/hooks/useGitHubData.ts
// 未使用导出: useGitHubData, getMockCommits, getMockStats, getMockIssues

// src/hooks/useGlobalLoading.tsx
// 未使用导出: GlobalLoadingProvider, useGlobalLoading, useScopedLoading
```

---

## 3. 优化建议

### 3.1 代码重构建议

#### 统一导入路径

```typescript
// 问题：同一组件通过不同路径导入
import { validateEmail } from '@/lib/utils'
import { validateEmail } from '@/lib/utils/validation'

// 建议：统一导入路径
import { validateEmail } from '@/lib/validation'
```

#### 合并相似组件

```typescript
// src/components/OptimizedImage.tsx
// src/components/OptimizedImageWithWebP.tsx
// src/components/optimized/LazyImage.optimized.tsx

// 建议：合并为单一组件，通过 props 控制行为
```

#### 删除重复的工具函数

```typescript
// 存在多个日期格式化函数
// src/lib/date.ts
// src/lib/date-i18n.ts
// src/lib/i18n/utils.ts

// 建议：统一到 src/lib/date-i18n.ts
```

---

### 3.2 性能优化建议

#### 懒加载未使用的组件

```typescript
// 当前：直接导入但未使用
import { Hero3D } from '@/components/Hero3D';

// 建议：按需加载
const LazyHero3D = dynamic(() => import('@/components/Hero3D'), {
  loading: () => <LoadingSpinner />,
});
```

#### Tree-shaking 优化

```typescript
// 问题：导出大量未使用的函数
export * from './utils'
export * from './validation'
export * from './api'

// 建议：仅导出公开 API
export { validateEmail, isValidUrl } from './validation'
export { createSuccessResponse, createErrorResponse } from './api'
```

---

## 4. 执行计划

### 阶段 1：安全清理 (1-2 小时)

```bash
# 1. 清理 archive 目录
cd /root/.openclaw/workspace/7zi-project/archive

# 删除明显的临时报告
rm -f reports/CODE_CLEANUP_SESSION.md \
      reports/BUGFIX_SESSION.md \
      reports/BUILD_ERROR_FIX.md \
      reports/DEPLOY.md \
      reports/GCP-CONFIG.md \
      reports/HEARTBEAT.md \
      reports/dependency-cleanup-*.md \
      reports/TODO_SUMMARY.md

# 2. 删除已归档的项目
rm -rf architecture/ai-team-dashboard
rm -rf moltbook-gateway
```

### 阶段 2：自动化清理 (30 分钟)

```bash
# 1. 清理未使用的导入
npx eslint --fix "src/**/*.{ts,tsx}"

# 2. 运行 TypeScript 类型检查
npm run type-check

# 3. 运行测试确保没有破坏
npm run test
```

### 阶段 3：手动清理 (2-4 小时)

```bash
# 1. 检查未使用的导出
# 查找未被引用的组件
grep -r "export.*from" src/components | grep -v "index"

# 2. 确认后删除未使用的文件
# 注意：先在 Git 中备份
git add .
git commit -m "Backup before cleanup"

# 3. 逐个确认并删除未使用的组件
```

### 阶段 4：验证 (30 分钟)

```bash
# 1. 完整构建测试
npm run build

# 2. 类型检查
npm run type-check

# 3. 运行所有测试
npm run test

# 4. 检查构建产物大小
npm run analyze
```

---

## 5. 风险评估

### 🔴 高风险操作

- 删除 Archive 目录中的报告 (可能丢失历史信息)
- 删除整个组件文件 (可能有动态导入)
- 删除 API 路由 (可能被其他服务调用)

### 🟡 中风险操作

- 清理未使用的导入 (ESLint 自动修复相对安全)
- 清理未使用的导出 (需要确认引用关系)
- 合并相似组件 (需要全面测试)

### 🟢 低风险操作

- 删除临时报告和会话记录
- 清理注释掉的代码
- 格式化代码

---

## 6. 预期收益

### 代码质量提升

| 指标       | 当前     | 清理后    | 改善  |
| ---------- | -------- | --------- | ----- |
| 未使用导入 | 107 文件 | ~10 文件  | 91% ↓ |
| 未使用导出 | 376 文件 | ~50 文件  | 87% ↓ |
| 死代码     | 362 文件 | ~100 文件 | 72% ↓ |
| 文件总数   | 897      | ~730      | 19% ↓ |

### 构建性能提升

- **Bundle 大小**: 预计减少 10-15%
- **构建时间**: 预计减少 5-10%
- **TypeScript 类型检查**: 预计减少 20-30%

### 维护成本降低

- **代码清晰度**: 显著提升
- **新开发者理解成本**: 降低
- **重构难度**: 降低
- **Bug 定位**: 更容易

---

## 7. 后续建议

### 定期清理

```bash
# 添加到 package.json scripts
{
  "scripts": {
    "cleanup:imports": "eslint --fix src/**/*.{ts,tsx}",
    "cleanup:unused": "ts-unused-exports tsconfig.json",
    "analyze:unused": "npx knip"
  }
}

# 每月执行一次
npm run cleanup:imports
npm run cleanup:unused
npm run analyze:unused
```

### CI/CD 集成

```yaml
# .github/workflows/cleanup-check.yml
name: Code Cleanup Check
on: [pull_request]
jobs:
  check-unused:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run cleanup:imports
      - run: npm run cleanup:unused
```

### 文档维护

- 建立 Code of Conduct，规范代码提交
- 定期更新 README 和文档
- 建立 Architecture Decision Records (ADR)

---

## 8. 附录

### 8.1 工具推荐

```bash
# 未使用导入检测
npm install -D eslint-plugin-unused-imports

# 未使用导出检测
npm install -D ts-unused-exports

# 综合分析
npm install -D knip

# 重复代码检测
npm install -D jscpd
```

### 8.2 快速清理脚本

```javascript
// scripts/cleanup.js
const { execSync } = require('child_process')

console.log('🧹 Starting code cleanup...\n')

console.log('1. Cleaning unused imports...')
execSync('npx eslint --fix "src/**/*.{ts,tsx}"', { stdio: 'inherit' })

console.log('\n2. Checking unused exports...')
execSync('npx ts-unused-exports tsconfig.json', { stdio: 'inherit' })

console.log('\n3. Running type check...')
execSync('npm run type-check', { stdio: 'inherit' })

console.log('\n4. Running tests...')
execSync('npm run test', { stdio: 'inherit' })

console.log('\n✅ Cleanup complete!')
```

---

## 结论

本次代码分析发现了大量可以清理的未使用代码和文件。按照本报告的建议执行清理，预计可以：

1. **减少约 20% 的文件数量**
2. **删除约 2MB 的归档文件**
3. **显著改善代码质量**
4. **提升构建性能**

建议按照分阶段执行计划进行，确保每个阶段都经过充分测试后再进入下一阶段。

---

**报告生成**: 📚 咨询师
**审核状态**: 待审核
**下一步**: 开始执行阶段 1 (安全清理)
