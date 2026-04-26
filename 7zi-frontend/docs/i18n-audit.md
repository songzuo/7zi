# 7zi Frontend i18n 国际化审计报告

**审计日期**: 2026-04-25  
**审计人**: 咨询师（i18n 审计子代理）  
**项目**: 7zi-frontend

---

## 一、i18n 现状概览

### 1.1 已有的 i18n 配置

| 项目 | 状态 | 详情 |
|------|------|------|
| i18n 库 | ✅ 已集成 | `i18next@^26.0.4`, `react-i18next@^17.0.2`, `next-i18next@^16.0.5` |
| 翻译资源 | ✅ 已有基础 | `src/locales/zh/` 和 `src/locales/en/` 各 7 个 JSON 文件 |
| i18n 中间件 | ✅ 已实现 | `src/middleware.i18n.ts` 支持 Cookie/Accept-Language 检测 |
| i18n Provider | ✅ 已实现 | `src/app/providers/I18nProvider.tsx` |
| 客户端实例 | ✅ 已实现 | `src/lib/i18n/client.ts` |
| 服务端实例 | ✅ 已实现 | `src/lib/i18n/server.ts` |
| 语言分割打包 | ✅ 已配置 | next.config.ts 中配置了 `i18n-libs` 和 `i18n-resources` bundle |

### 1.2 翻译文件统计

| 文件 | keys 数 | zh 翻译完整性 |
|------|---------|--------------|
| common.json | 159 | ✅ 完整 |
| navigation.json | 111 | ✅ 完整 |
| errors.json | 72 | ✅ 完整 |
| auth.json | 6 | ✅ 完整 |
| feedback.json | 19 | ✅ 完整 |
| dashboard.json | 19 | ✅ 完整 |
| rooms.json | 1 | ⚠️ 仅 1 key（不足） |
| **总计** | **387 keys** | 基础通用翻译已覆盖 |

### 1.3 已使用 useTranslation 的组件（部分）

以下组件已在使用 i18n hook，但覆盖范围有限：
- `src/app/dashboard/AgentStatusPanel.tsx` ✅
- `src/app/admin/rate-limit/page.tsx` (使用 `next-intl` 的 `useTranslations`) ⚠️
- `src/components/rooms/RoomPanel.tsx` ✅
- `src/components/rooms/RoomCreateModal.tsx` ✅
- `src/components/rooms/InviteCodeModal.tsx` ✅
- `src/components/feedback/MultiStepFeedbackForm.tsx` ✅
- `src/components/feedback/EmotionSelector.tsx` ✅
- `src/components/feedback/FeedbackStatusTracker.tsx` ✅

---

## 二、硬编码中文文本清单

### 2.1 高优先级问题：alert() 弹窗中的中文

以下 `alert()` 调用包含硬编码中文，用户体验不友好，且无法被翻译：

| 文件 | 行号 | 中文文本 |
|------|------|---------|
| `src/app/feedback/page.tsx` | 47 | `感谢您的反馈！我们会尽快处理。` |
| `src/app/feedback/page.tsx` | 49 | `提交失败：` |
| `src/app/feedback/page.tsx` | 53 | `提交失败，请稍后重试` |
| `src/app/rooms/page.tsx` | 95 | `离开房间失败` |
| `src/components/feedback/FeedbackModal.tsx` | 140 | `请填写标题和描述` |
| `src/components/feedback/FeedbackModal.tsx` | 163 | `提交失败，请稍后重试` |
| `src/components/feedback/FeedbackModal.tsx` | 191 | `文件大小不能超过 5MB` |
| `src/components/feedback/FeedbackModal.tsx` | 209 | `您的浏览器不支持截图功能` |
| `src/components/feedback/FeedbackModal.tsx` | 242 | `截图失败，请重试` |
| `src/components/feedback/ScreenshotAnnotation.tsx` | 212 | `文件大小不能超过 5MB` |
| `src/components/feedback/ScreenshotAnnotation.tsx` | 233 | `您的浏览器不支持截图功能` |
| `src/components/feedback/ScreenshotAnnotation.tsx` | 265 | `截图失败，请重试` |
| `src/components/feedback/FeedbackAdminPanel.tsx` | 231 | `更新失败，请重试` |
| `src/components/feedback/FeedbackAdminPanel.tsx` | 271 | `发送失败，请重试` |
| `src/components/feedback/FeedbackAdminPanel.tsx` | 301 | `导出失败，请重试` |
| `src/components/feedback/FeedbackAdminPanel.tsx` | 329 | `删除失败，请重试` |
| `src/components/rooms/ParticipantList.tsx` | 82 | `修改角色失败` |
| `src/components/rooms/ParticipantList.tsx` | 95 | `踢出失败` |
| `src/components/WorkflowEditor/examples.tsx` | 27 | `保存失败` |
| `src/components/WorkflowEditor/examples.tsx` | 30 | `工作流已保存` |
| `src/components/WorkflowEditor/examples.tsx` | 149 | `保存成功` |
| `src/components/WorkflowEditor/examples.tsx` | 153 | `保存失败: ` |
| `src/components/webhook/WebhookConfigPanel.tsx` | 183 | `密钥已复制到剪贴板` |
| `src/components/webhook/WebhookConfigPanel.tsx` | 185 | `复制失败，请手动复制` |

### 2.2 中优先级问题：页面级硬编码文本

#### `src/app/feedback/page.tsx` — 反馈页面（整个页面未使用 i18n）

包含大量硬编码中文：
- `欢迎反馈` (h1 标题)
- `您的意见对我们非常重要...` (描述段落)
- `反馈已提交成功！` (成功消息)
- `问题报告`、`功能建议`、`改进建议`、`表扬与感谢`、`投诉`、`其他反馈` (卡片标题)
- `报告您遇到的问题...`、`提出新的功能想法...` 等卡片描述
- `反馈小贴士` (h2)
- 4条小贴士内容

#### `src/app/pricing/page.tsx` — 定价页面（自建翻译系统）

使用 `zhTranslations` / `enTranslations` 对象手动切换，**未接入 i18next**：
- 642 行代码，使用 `const t = language === 'zh' ? zhTranslations : enTranslations` 手动判断
- 语言切换逻辑不依赖框架，体验不佳
- 建议：迁移至 i18next

#### `src/app/[locale]/login/page.tsx` — 登录页

硬编码中文文本：
- `登录 - 7zi Frontend` (document.title)
- `请输入邮箱或用户名`、`请输入密码`、`密码长度至少6位` (验证错误)
- `登录`、`欢迎回来，请登录您的账户` (标题)
- `用户名或邮箱`、`请输入邮箱或用户名` (Input label/placeholder)
- `密码`、`请输入密码` (Input label/placeholder)
- `记住我`
- `登录中...`
- `忘记密码？`
- `还没有账户？立即注册`

### 2.3 低优先级：代码注释中的中文

类型定义文件（如 `src/types/performance.ts`）中的中文注释不影响用户界面，无需国际化。

---

## 三、i18n 覆盖率评估

### 3.1 覆盖率估算

| 类别 | 估算覆盖率 |
|------|----------|
| 通用/导航/错误 翻译文件 | ~95%（387 keys 完整） |
| 核心业务组件（rooms/feedback/dashboard） | ~60%（部分组件已接入） |
| 示例页面（pricing、feedback page 等） | ~10% |
| alert/confirm 弹窗 | ~0%（完全硬编码） |

**整体估算**：前端可见文本中，约 **35-45%** 已通过 i18next 管理，**55-65%** 仍为硬编码。

### 3.2 关键差距

1. **alert() 系统**：最严重 — 所有用户反馈类消息均通过 `alert()` 弹出，无法翻译
2. **pricing page**：自建翻译系统，与项目主流方案不一致
3. **login page**：在 `[locale]` 路由下但仍硬编码中文
4. **房间管理组件**：部分已接入，但状态提示类文本未翻译

---

## 四、i18n 实施方案建议

### 4.1 紧急修复（P0）

**将 alert() 替换为 i18n key + Toast 组件**

当前所有反馈消息用 `alert()` 阻塞用户体验，应替换为：
1. 在 `locales/zh/errors.json` / `locales/en/errors.json` 中补充缺失的 key
2. 替换所有 `alert('中文')` 为 `toast(t('errors.submitFailed'))`
3. 项目已有 Toast/notification 组件，无须引入新依赖

**示例修改**：
```tsx
// Before
alert('提交失败，请稍后重试')

// After
import { useToast } from '@/components/ui/useToast'
const { toast } = useToast()
toast({ title: t('errors.submitFailed'), variant: 'destructive' })
```

### 4.2 重要优化（P1）

**迁移 pricing page 至 i18next**

当前使用手动 `zhTranslations/enTranslations` 对象，改为：
```tsx
import { useTranslation } from '@/lib/i18n/client'
const { t } = useTranslation('pricing')
// t('title'), t('tiers.pro.name') ...
```

**翻译文件扩展**：
- 创建 `locales/zh/pricing.json` / `locales/en/pricing.json`
- 将 `zhTranslations` 对象内容迁移为 JSON 格式

**login page i18n 化**：
- 将硬编码文本替换为 `useTranslation('auth')` 调用
- 验证错误消息移至 `locales/zh/errors.json`

### 4.3 持续改进（P2）

**补充 rooms.json 翻译 key**：当前 rooms.json 仅 1 key，需要扩展

**PWA 组件国际化**：`src/components/pwa/PWASettings.tsx` 中 7 处 `alert()` 需处理

**示例页面清理**：`/mobile-optimization-demo`、`/notification-demo` 等 demo 页面如有硬编码文本可选择性修复

### 4.4 翻译管理建议

1. **添加 lint 规则**：使用 `eslint-plugin-i18next` 检测未翻译的硬编码字符串
2. **命名空间分离**：按页面/功能模块分离翻译文件，避免单文件过大
3. **复数/性别支持**：部分文本需支持复数（如 `N 个文件`）
4. **RTL 预留**：未来如需阿拉伯语等 RTL 语言，注意 CSS 布局兼容性

---

## 五、总结

| 维度 | 评分 | 说明 |
|------|------|------|
| i18n 基础设施 | ⭐⭐⭐⭐ | 框架完整，bundle 分割合理 |
| 核心翻译覆盖 | ⭐⭐⭐⭐ | 387 keys 通用翻译较完整 |
| 组件接入率 | ⭐⭐⭐ | 部分业务组件已接入 |
| 用户可见文本 i18n 率 | ⭐⭐ | 约 35-45%，alert/页面文本大部分硬编码 |
| 架构一致性 | ⭐⭐⭐ | pricing page 使用自建方案需统一 |

**整体评级**: 基础良好，但用户可见文本覆盖率偏低，需优先解决 alert() 系统和关键页面（feedback、pricing、login）的国际化。

---

*报告生成时间: 2026-04-25*
