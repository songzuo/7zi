# 代码优化报告 - AI 团队看板项目

**生成时间:** 2026-03-06 11:17 GMT+1  
**审查范围:** components/, lib/, hooks/ 目录

---

## 📊 执行摘要

### Lint 检查结果
- **总警告数:** 23 个
- **严重错误:** 0 个
- **主要问题类别:**
  - `no-console`: 8 处 (开发环境可接受)
  - `no-unused-vars`: 6 处 (未使用变量)
  - `@next/next/no-img-element`: 7 处 (建议使用 Next.js Image 组件)

### TypeScript 类型检查
- **主要错误:** 15 个 (集中在测试文件)
- **生产代码:** 类型安全良好
- **测试文件:** 需要修复导入和类型定义

---

## 🔍 详细问题分析

### 1. TypeScript 类型安全性

#### ✅ 优点
- 主要组件和库文件都有完整的类型定义
- 接口定义清晰 (如 `Notification`, `Message`, `MemberPresence`)
- 泛型使用恰当 (`safeJsonParse<T>`, `debounce<T>`)

#### ⚠️ 需要改进

**问题 1.1:** `lib/users.ts` - `excludePassword` 函数未使用变量
```typescript
// 第 88 行
const { password, ...userWithoutPassword } = user;
return userWithoutPassword;
```
**建议:** 直接返回解构结果，或删除未使用的 `password` 变量声明。

**问题 1.2:** `lib/presence.ts` - `checkExpiredPresence` 未使用参数
```typescript
// 第 174 行
mockMemberPresence.forEach((presence, memberId) => {
```
**建议:** 将 `memberId` 改为 `_memberId` 或删除。

**问题 1.3:** `components/MemberCard.tsx` - 未使用的 `statusBgColors`
```typescript
// 第 27 行
const statusBgColors = { ... }; // 从未使用
```
**建议:** 删除此未使用的对象。

---

### 2. 代码重复和冗余

#### ⚠️ 重复代码模式

**问题 2.1:** `formatTimeAgo` 函数重复定义
- `lib/utils.ts` 已定义
- `ActivityLog.tsx` 又定义了一遍
- `MemberPresenceBoard.tsx` 使用 `useEffect` 内联实现

**建议:** 统一使用 `lib/utils.ts` 的导出，删除重复定义。

**问题 2.2:** 状态颜色映射重复
多个组件定义了相似的状态颜色映射:
- `MemberCard.tsx`: `statusColors`, `statusBgColors`
- `MemberPresenceBoard.tsx`: `statusColors`, `statusLabels`
- `TaskBoard.tsx`: `stateColors`, `stateLabels`

**建议:** 在 `lib/utils.ts` 或新建 `lib/constants.ts` 中统一定义。

**问题 2.3:** 图片错误处理重复
```typescript
// 在多个组件中重复
onError={(e) => {
  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + seed;
}}
```
**建议:** 创建统一的 `ImageWithFallback` 组件。

---

### 3. 性能优化机会

#### ⚠️ 可优化项

**问题 3.1:** 未使用 Next.js Image 组件
Lint 警告 7 处使用 `<img>` 标签，建议使用 `<Image>` 进行自动优化。

**影响:** 
- 更大的带宽消耗
- 缺少自动图片优化
- 可能影响 LCP (Largest Contentful Paint)

**建议:** 替换为 `<Image>` 组件，特别是:
- `MemberCard.tsx` (头像)
- `TaskBoard.tsx` (Issue 分配者头像)
- `TaskComments.tsx` (评论者头像)

**问题 3.2:** `MemberPresenceBoard` 中不必要的轮询
```typescript
// 每 10 秒刷新一次，即使没有新数据
const interval = setInterval(loadPresence, 10000);
```
**建议:** 
- 使用 WebSocket 实时推送代替轮询
- 或实现智能轮询 (仅在可见时刷新)

**问题 3.3:** `useWebSocket` Hook 缺少重连退避策略
当前使用固定间隔重连，可能导致服务器压力。

**建议:** 实现指数退避:
```typescript
const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
```

---

### 4. 错误处理完善性

#### ✅ 优点
- API 调用都有 try-catch
- 错误状态有 UI 展示
- 提供了错误恢复机制 (如 ErrorBoundary)

#### ⚠️ 需要改进

**问题 4.1:** 静默失败
```typescript
// lib/auth.ts
} catch {
  return null; // 没有日志记录
}
```
**建议:** 至少记录错误用于调试:
```typescript
} catch (error) {
  console.error('Token verification failed:', error);
  return null;
}
```

**问题 4.2:** 网络错误未区分类型
```typescript
// TaskComments.tsx
catch (err) {
  setError(err instanceof Error ? err.message : 'Failed to load comments');
}
```
**建议:** 区分网络错误、认证错误、服务器错误:
```typescript
if (err instanceof TypeError && err.message.includes('fetch')) {
  setError('网络连接失败，请检查网络');
} else if (response?.status === 401) {
  setError('认证失败，请重新登录');
}
```

**问题 4.3:** 缺少错误边界测试
`ErrorBoundary.test.tsx` 存在但可能不完整。

**建议:** 添加测试用例:
- 渲染错误捕获
- 重试功能
- 错误报告回调

---

## 📝 具体优化建议

### 高优先级 (建议立即修复)

1. **删除未使用变量** (15 分钟)
   - `MemberCard.tsx`: `statusBgColors`
   - `lib/presence.ts`: `_memberId` 参数
   - `lib/users.ts`: `password` 变量

2. **统一 `formatTimeAgo`** (30 分钟)
   - 删除 `ActivityLog.tsx` 中的重复定义
   - 导入 `lib/utils.ts` 的版本

3. **修复测试文件类型错误** (1 小时)
   - 导出必要的类型定义
   - 修复 `beforeEach`/`afterEach` 导入

### 中优先级 (本周内完成)

4. **创建 `ImageWithFallback` 组件** (2 小时)
   ```typescript
   // components/ui/ImageWithFallback.tsx
   export const ImageWithFallback: React.FC<{
     src: string;
     fallbackSeed: string;
     alt: string;
     className?: string;
   }> = ({ src, fallbackSeed, alt, className }) => {
     const [error, setError] = useState(false);
     return (
       <img
         src={error ? `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackSeed}` : src}
         alt={alt}
         className={className}
         onError={() => setError(true)}
       />
     );
   };
   ```

5. **统一状态常量** (1 小时)
   ```typescript
   // lib/constants.ts
   export const STATUS_COLORS = {
     online: 'bg-green-500',
     busy: 'bg-yellow-500',
     away: 'bg-gray-400',
     offline: 'bg-gray-500',
   };
   ```

6. **改进 WebSocket 重连策略** (2 小时)
   - 实现指数退避
   - 添加最大重连次数配置
   - 添加连接状态回调

### 低优先级 (未来迭代)

7. **迁移到 Next.js Image** (4 小时)
   - 逐步替换 `<img>` 标签
   - 配置图片域名白名单

8. **添加错误监控** (4 小时)
   - 集成 Sentry 或类似服务
   - 添加错误追踪 ID

9. **性能监控** (4 小时)
   - 添加 Web Vitals 监控
   - 实现性能指标上报

---

## 🔧 已识别的测试问题

### 测试文件类型错误

1. **`__tests__/messages-utils.test.ts`**
   - 错误：类型未从 utils 导出
   - 修复：在 `lib/messages/utils.ts` 中导出 `Message` 和 `Conversation`

2. **`__tests__/notifications-utils.test.ts`**
   - 错误：类型未从 utils 导出
   - 修复：在 `lib/notifications/utils.ts` 中导出类型

3. **`__tests__/ProgressBar.test.tsx`**
   - 错误：`Element.style` 类型问题
   - 修复：使用类型断言 `as HTMLElement`

4. **`__tests__/Navigation.test.tsx`**
   - 错误：缺少 `beforeEach`/`afterEach`
   - 修复：从 `vitest` 导入

---

## 📈 代码质量评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 类型安全 | ⭐⭐⭐⭐☆ | 4/5 - 主要代码良好，测试文件需改进 |
| 代码重复 | ⭐⭐⭐☆☆ | 3/5 - 存在重复工具函数和常量 |
| 错误处理 | ⭐⭐⭐⭐☆ | 4/5 - 覆盖全面，细节可改进 |
| 性能优化 | ⭐⭐⭐☆☆ | 3/5 - 有优化空间 (图片、轮询) |
| 可维护性 | ⭐⭐⭐⭐☆ | 4/5 - 结构清晰，注释充分 |

**综合评分:** ⭐⭐⭐⭐☆ (3.6/5)

---

## ✅ 下一步行动

### 立即可执行
```bash
# 1. 运行 lint 自动修复
npm run lint -- --fix

# 2. 修复测试文件类型错误
# (需要手动修改导出)

# 3. 删除未使用变量
# (需要手动修改)
```

### 建议的代码变更文件
1. `components/MemberCard.tsx` - 删除未使用变量
2. `components/ActivityLog.tsx` - 导入 `formatTimeAgo`
3. `lib/messages/utils.ts` - 导出类型
4. `lib/notifications/utils.ts` - 导出类型
5. `__tests__/*.test.ts` - 修复导入和类型

---

**报告完成时间:** 2026-03-06  
**审查者:** 架构师子代理
