# 7zi Project i18n 完善报告

## 1. 当前状态审计

### 1.1 语言文件
- ✅ `en.json` - 完整的英文翻译（约 500+ 翻译键）
- ✅ `zh.json` - 完整的中文翻译（约 500+ 翻译键）
- ✅ 翻译键完全对应，结构一致

### 1.2 配置文件
- ✅ `config.ts` - 支持中文（默认）和英文
- ✅ `routing.ts` - 路由配置正确
- ✅ `request.ts` - 请求处理配置正确
- ✅ `middleware.ts` - 国际化中间件已配置

### 1.3 语言切换器
- ✅ `LanguageSwitcher.tsx` - 完整的下拉式切换器
- ✅ `LanguageSwitcherCompact` - 紧凑版切换器
- ⚠️ 缺少语言偏好持久化到 localStorage
- ⚠️ 缺少浏览器语言自动检测

### 1.4 发现的问题

#### 问题 1: Navigation 组件硬编码中文文本
**位置**: `src/components/Navigation.tsx`
**问题**: 导航项使用硬编码的中文字符串
```typescript
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/dashboard', label: '实时看板', icon: '📊' },
  { href: '/subagents', label: '子代理', icon: '🤖' },
  { href: '/tasks', label: '任务', icon: '📋' },
  { href: '/memory', label: '记忆', icon: '🧠' }
];
```

**影响**: 语言切换时导航菜单不会更新

#### 问题 2: 日期格式化仅支持中文
**位置**: `src/lib/date.ts`
**问题**: `formatTimeAgo` 函数硬编码中文字符串
```typescript
if (diffMins < 1) return '刚刚';
if (diffMins < 60) return `${diffMins}分钟前`;
if (diffHours < 24) return `${diffHours}小时前`;
if (diffDays < 7) return `${diffDays}天前`;
```

**影响**: 英文用户看到中文时间格式

#### 问题 3: 缺少 RTL 语言支持
**位置**: `src/app/globals.css`
**问题**: 没有为 RTL 语言（如阿拉伯语）准备 CSS 变量和规则

#### 问题 4: 缺少语言偏好持久化
**位置**: `LanguageSwitcher.tsx`
**问题**: 切换语言后刷新页面会重置为默认语言

#### 问题 5: 缺少浏览器语言自动检测
**位置**: `middleware.ts` 或 `request.ts`
**问题**: 首次访问时未检测用户浏览器语言偏好

## 2. 改进计划

### 2.1 补充翻译键
- 在 `en.json` 和 `zh.json` 中添加导航相关翻译
- 添加通用的相对时间翻译（"刚刚", "分钟前" 等）
- 添加 Settings 和 Theme 相关翻译

### 2.2 改进 Navigation 组件
- 使用 `useTranslations` 替代硬编码文本
- 支持语言切换时自动更新导航文本

### 2.3 改进日期格式化
- 修改 `formatTimeAgo` 支持多语言
- 使用 next-intl 的日期格式化功能

### 2.4 添加语言持久化
- 在语言切换时保存到 localStorage
- 在 middleware 中读取持久化的语言偏好

### 2.5 添加浏览器语言检测
- 在 middleware 中添加 Accept-Language 头解析
- 优先级: localStorage > URL > 浏览器语言 > 默认语言

### 2.6 添加 RTL 支持
- 在 CSS 中添加 RTL 支持
- 在 HTML 根元素添加 dir 属性

## 3. 实施步骤

### 步骤 1: 更新翻译文件
- [ ] 添加导航翻译
- [ ] 添加相对时间翻译
- [ ] 添加通用 UI 翻译

### 步骤 2: 改进日期格式化
- [ ] 创建支持多语言的日期格式化函数
- [ ] 更新 `formatTimeAgo` 支持英文

### 步骤 3: 改进 Navigation 组件
- [ ] 使用 next-intl 的翻译
- [ ] 测试语言切换

### 步骤 4: 添加语言持久化
- [ ] 修改 middleware 支持语言检测和持久化
- [ ] 更新 LanguageSwitcher 保存语言偏好

### 步骤 5: 添加 RTL 支持
- [ ] 在 globals.css 添加 RTL CSS
- [ ] 在 layout.tsx 添加 dir 属性

## 4. 新增/修改的翻译键清单

### 新增翻译键
```json
{
  "nav": {
    "home": "首页 / Home",
    "dashboard": "实时看板 / Dashboard",
    "subagents": "子代理 / Subagents",
    "tasks": "任务 / Tasks",
    "memory": "记忆 / Memory",
    "mobileMenu": {
      "open": "打开菜单 / Open Menu",
      "close": "关闭菜单 / Close Menu"
    }
  },
  "common": {
    "theme": "主题 / Theme",
    "language": "语言 / Language"
  },
  "time": {
    "justNow": "刚刚 / Just now",
    "minutesAgo": "{count}分钟前 / {count} minutes ago",
    "hoursAgo": "{count}小时前 / {count} hours ago",
    "daysAgo": "{count}天前 / {count} days ago",
    "weeksAgo": "{count}周前 / {count} weeks ago"
  }
}
```

### 修改的翻译键
无需修改，现有翻译键结构良好。

## 5. 完成状态
- [x] 审计当前 i18n 状态
- [ ] 补充中文翻译
- [ ] 完善语言切换（持久化 + 自动检测）
- [ ] 日期/数字格式化改进
- [ ] RTL 支持准备

## 6. 测试清单
- [ ] 语言切换后所有页面文本正确更新
- [ ] 刷新页面后语言偏好保持
- [ ] 首次访问时自动检测浏览器语言
- [ ] 日期时间显示正确的语言格式
- [ ] 导航菜单支持语言切换
- [ ] RTL 语言布局正确（如果添加）
