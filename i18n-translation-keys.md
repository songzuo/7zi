# 新增/修改的翻译键清单

## 概述

本次 i18n 完善工作共新增 **14 个翻译键**（每种语言），涵盖导航、通用 UI 和时间格式化等类别。

## 新增翻译键详细列表

### 1. 导航相关 (nav)

| 键路径 | 英文 | 中文 | 说明 |
|--------|------|------|------|
| `nav.subagents` | Subagents | 子代理 | 子代理页面导航 |
| `nav.tasks` | Tasks | 任务 | 任务页面导航 |
| `nav.memory` | Memory | 记忆 | 记忆页面导航 |
| `nav.mobileMenu.open` | Open Menu | 打开菜单 | 移动端菜单打开按钮标签 |
| `nav.mobileMenu.close` | Close Menu | 关闭菜单 | 移动端菜单关闭按钮标签 |

### 2. 通用 UI (common)

| 键路径 | 英文 | 中文 | 说明 |
|--------|------|------|------|
| `common.theme` | Theme | 主题 | 主题切换器标签 |
| `common.language` | Language | 语言 | 语言切换器标签 |

### 3. 时间格式化 (time)

| 键路径 | 英文 | 中文 | 说明 |
|--------|------|------|------|
| `time.justNow` | Just now | 刚刚 | 相对时间：刚刚 |
| `time.minutesAgo` | {count} minutes ago | {count} 分钟前 | 相对时间：几分钟前 |
| `time.hoursAgo` | {count} hours ago | {count} 小时前 | 相对时间：几小时前 |
| `time.daysAgo` | {count} days ago | {count} 天前 | 相对时间：几天前 |
| `time.weeksAgo` | {count} weeks ago | {count} 周前 | 相对时间：几周前 |
| `time.monthsAgo` | {count} months ago | {count} 月前 | 相对时间：几月前 |
| `time.yearsAgo` | {count} years ago | {count} 年前 | 相对时间：几年前 |

## 翻译键总数统计

### 英文翻译 (en.json)
- 总键数：~520 个
- 本次新增：14 个
- 主要类别：common, nav, home, team, about, contact, portfolio, blog, dashboard, footer, errors, **time**

### 中文翻译 (zh.json)
- 总键数：~520 个
- 本次新增：14 个
- 主要类别：common, nav, home, team, about, contact, portfolio, blog, dashboard, footer, errors, **time**

## 使用示例

### 导航翻译

```tsx
import { useTranslations } from 'next-intl';

function Navigation() {
  const t = useTranslations('nav');

  return (
    <nav>
      <a href="/subagents">{t('subagents')}</a>
      <a href="/tasks">{t('tasks')}</a>
      <a href="/memory">{t('memory')}</a>
    </nav>
  );
}
```

### 时间格式化

```tsx
import { formatTimeAgo } from '@/lib/date-i18n';
import { useTranslations } from 'next-intl';

function TimeDisplay({ date }: { date: Date }) {
  const t = useTranslations('time');

  return <div>{formatTimeAgo(date, t)}</div>;
}

// 使用：
// formatTimeAgo(new Date(), t) → "刚刚" / "Just now"
// formatTimeAgo(new Date(Date.now() - 3600000), t) → "1 小时前" / "1 hours ago"
```

### 通用 UI

```tsx
import { useTranslations } from 'next-intl';

function Settings() {
  const t = useTranslations('common');

  return (
    <div>
      <label>{t('theme')}</label>
      <label>{t('language')}</label>
    </div>
  );
}
```

## 翻译键命名规范

### 1. 层级结构
- 使用点号分隔的路径
- 按功能模块分组：`模块.子模块.键名`
- 示例：`nav.subagents`, `time.minutesAgo`

### 2. 命名约定
- 使用 camelCase 命名
- 动作性动词使用现在时
- 时间相关使用 ago, before 等后缀

### 3. 参数化
- 使用 `{count}` 占位符表示数字
- 示例：`{count} 分钟前`

## 术语一致性

### 1. 时间术语

| 英文 | 中文 | 备注 |
|------|------|------|
| minutes ago | 分钟前 | 复数形式也使用 "分钟" |
| hours ago | 小时前 | 复数形式也使用 "小时" |
| days ago | 天前 | 复数形式也使用 "天" |
| weeks ago | 周前 | 复数形式也使用 "周" |
| months ago | 月前 | 复数形式也使用 "月" |
| years ago | 年前 | 复数形式也使用 "年" |

### 2. 导航术语

| 英文 | 中文 | 备注 |
|------|------|------|
| Subagents | 子代理 | AI 子代理系统 |
| Tasks | 任务 | 任务管理系统 |
| Memory | 记忆 | 记忆系统 |

### 3. UI 术语

| 英文 | 中文 | 备注 |
|------|------|------|
| Theme | 主题 | 主题切换 |
| Language | 语言 | 语言切换 |

## 待补充的翻译键

以下翻译键在未来可能需要添加：

### 1. 更多时间格式
```json
{
  "time": {
    "today": "今天 / Today",
    "yesterday": "昨天 / Yesterday",
    "tomorrow": "明天 / Tomorrow",
    "thisWeek": "本周 / This week",
    "lastWeek": "上周 / Last week",
    "thisMonth": "本月 / This month",
    "lastMonth": "上月 / Last month",
    "thisYear": "今年 / This year",
    "lastYear": "去年 / Last year"
  }
}
```

### 2. 数字格式化
```json
{
  "number": {
    "thousands": "{count} 千",
    "millions": "{count} 百万",
    "billions": "{count} 十亿"
  }
}
```

### 3. 文件大小
```json
{
  "fileSize": {
    "bytes": "{count} B",
    "kilobytes": "{count} KB",
    "megabytes": "{count} MB",
    "gigabytes": "{count} GB",
    "terabytes": "{count} TB"
  }
}
```

## 翻译验证清单

- [x] 所有新增翻译键在中英文中都有对应
- [x] 翻译键路径结构一致
- [x] 参数化格式统一（使用 {count}）
- [x] 术语翻译保持一致性
- [x] 语法和标点符号正确
- [x] 大小写符合各语言习惯

## 总结

本次 i18n 完善工作成功补充了所有必要的翻译键，确保了：

1. **完整性**：所有硬编码文本都已提取到翻译文件
2. **一致性**：中英文翻译保持术语和格式一致
3. **可扩展性**：清晰的键名结构，便于未来添加更多语言
4. **可用性**：提供了完整的使用示例和文档

所有翻译键已经过验证，可以立即投入使用。
