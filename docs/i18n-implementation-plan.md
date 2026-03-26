# 7zi 项目 i18n 国际化扩展实施计划

## 📊 当前状态分析

### ✅ 已实现的部分

1. **核心架构**
   - ✅ 使用 `next-intl` (v4.8.3) - Next.js App Router 的最佳实践
   - ✅ 支持 6 种语言：zh-CN, en-US, ja, ko, fr, de
   - ✅ 动态路由配置：`src/app/[locale]/`
   - ✅ JSON 格式翻译文件：`src/i18n/messages/`
   - ✅ SEO 支持：hreflang、动态元数据

2. **配置文件**
   - ✅ `next.config.ts` - 已集成 next-intl 插件
   - ✅ `src/i18n/config.ts` - 语言和路由配置
   - ✅ `src/i18n/request.ts` - 服务端请求配置
   - ✅ `src/i18n/client.ts` - 客户端 hooks
   - ✅ `src/i18n/routing.ts` - 路由导航工具

3. **翻译文件**
   - ✅ `zh.json` - 781 行中文翻译
   - ✅ `en.json` - 781 行英文翻译
   - ❌ 缺少：ja.json, ko.json, fr.json, de.json

4. **已集成的组件**
   - ✅ `src/app/[locale]/layout.tsx` - 动态 SEO 元数据
   - ✅ `src/app/[locale]/page.tsx` - 使用 `getTranslations`
   - ✅ `src/components/LanguageSwitcher.tsx` - 语言切换器

### ⚠️ 需要改进的部分

1. **硬编码文本**
   - ❌ `src/components/Footer.tsx` - 包含硬编码中文
   - ⚠️ 部分组件可能仍有硬编码文本待检查

2. **翻译完整性**
   - ❌ 缺少 4 种语言的翻译文件（ja, ko, fr, de）
   - ⚠️ 需要验证所有文本是否都已提取到翻译文件

3. **SEO 优化**
   - ⚠️ 需要确保所有页面的 SEO 元数据都使用翻译

---

## 🎯 扩展计划

### 阶段 1：完成现有翻译（优先级：高）

#### 1.1 补充缺失的翻译文件

**目标**：为 ja, ko, fr, de 创建翻译文件

**步骤**：

```bash
# 创建翻译文件模板
cp src/i18n/messages/en.json src/i18n/messages/ja.json
cp src/i18n/messages/en.json src/i18n/messages/ko.json
cp src/i18n/messages/en.json src/i18n/messages/fr.json
cp src/i18n/messages/en.json src/i18n/messages/de.json
```

**翻译策略**：
- 使用 AI 翻译工具（如 DeepL, Google Translate）生成初稿
- 人工审核和修正专业术语
- 确保语气和品牌一致性

**需要特别关注的翻译**：
- `common` - 基础术语
- `nav` - 导航菜单
- `home` - 首页内容（最重要）
- `about` - 关于我们
- `team` - 团队介绍
- `portfolio` - 作品案例
- `contact` - 联系方式

**预计工作量**：
- 每种语言约 781 条翻译
- AI 翻译 + 人工修正：每种语言 2-3 小时
- 总计：8-12 小时

#### 1.2 验证翻译完整性

**目标**：确保所有文本都已提取到翻译文件

**步骤**：

1. 扫描硬编码文本：
```bash
# 查找包含中文字符的 TSX 文件
grep -r "[\u4e00-\u9fa5]" src/app --include="*.tsx" | grep -v "i18n" | grep -v "test"

# 查找包含中文字符的组件
grep -r "[\u4e00-\u9fa5]" src/components --include="*.tsx" | grep -v "i18n"
```

2. 优先修复的组件：
   - `src/components/Footer.tsx`
   - 其他包含硬编码文本的组件

3. 修复示例（Footer.tsx）：

```tsx
// 修改前
const quickLinks = [
  { name: "首页", href: "/" },
  { name: "关于我们", href: "/about" },
  // ...
];

// 修改后
import { useTranslations } from '@/i18n/client';

export function Footer() {
  const t = useTranslations('footer');

  const quickLinks = [
    { name: t('quickLinks.home'), href: "/" },
    { name: t('quickLinks.about'), href: "/about" },
    // ...
  ];
}
```

4. 添加翻译到 `zh.json` 和 `en.json`：
```json
{
  "footer": {
    "quickLinks": {
      "home": "首页",
      "about": "关于我们",
      // ...
    },
    "services": {
      "webDevelopment": "网站开发",
      // ...
    }
  }
}
```

**预计工作量**：4-6 小时

---

### 阶段 2：优化 SEO 和服务端渲染（优先级：中）

#### 2.1 增强 SEO 元数据

**目标**：确保所有页面的 SEO 元数据都使用翻译

**检查清单**：
- [ ] 所有页面都使用 `generateMetadata` 生成动态 SEO
- [ ] 正确设置 hreflang 标签
- [ ] 每种语言都有独立的 meta 描述和关键词
- [ ] Open Graph 和 Twitter Card 翻译

**示例**：

```tsx
// src/app/[locale]/about/page.tsx
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    keywords: t('meta.keywords'),
    openGraph: {
      title: t('meta.ogTitle'),
      description: t('meta.ogDescription'),
    },
  };
}
```

#### 2.2 优化性能

**目标**：减少 i18n 对性能的影响

**措施**：
- ✅ 已配置 `next-intl` 的优化导入（在 next.config.ts）
- ⚠️ 验证翻译文件大小（每个文件约 20KB，可接受）
- ⚠️ 考虑按页面分割翻译文件（如果文件过大）
- ⚠️ 使用 `useMemo` 缓存翻译对象

**预计工作量**：2-3 小时

---

### 阶段 3：开发工作流和工具（优先级：低）

#### 3.1 创建翻译工作流

**目标**：建立高效的翻译管理和更新流程

**建议工具**：

1. **管理工具**：
   - [easygettext](https://github.com/martinandersen/github.com/easygettext) - 提取文本
   - [i18next-scanner](https://github.com/i18next/i18next-scanner) - 自动提取
   - [Crowdin](https://crowdin.com/) 或 [Poeditor](https://poeditor.com/) - 在线翻译管理

2. **脚本示例**：

```bash
# scripts/extract-i18n.sh
# 提取所有硬编码的中文文本
grep -rh "[\u4e00-\u9fa5]" src/ --include="*.tsx" --include="*.ts" \
  | grep -v "i18n" \
  | grep -v "test" \
  | sort -u > /tmp/missing-translations.txt
```

```bash
# scripts/check-translations.js
// 检查翻译文件是否完整
const fs = require('fs');
const zh = require('../src/i18n/messages/zh.json');
const en = require('../src/i18n/messages/en.json');

function getKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object') {
      keys.push(...getKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const zhKeys = new Set(getKeys(zh));
const enKeys = new Set(getKeys(en));

const missingInEn = [...zhKeys].filter(k => !enKeys.has(k));
const missingInZh = [...enKeys].filter(k => !zhKeys.has(k));

console.log('Missing in en.json:', missingInEn);
console.log('Missing in zh.json:', missingInZh);
```

#### 3.2 创建翻译指南

**目标**：为开发者提供清晰的翻译指南

**内容**：
- 如何添加新的翻译键
- 命名规范（使用点号分隔，如 `home.hero.title`）
- 如何使用 `useTranslations` hook
- 如何处理动态内容
- 如何处理复数和日期格式

**示例文档**：

```markdown
# 翻译指南

## 添加新翻译

1. 在 `src/i18n/messages/zh.json` 中添加：
```json
{
  "myComponent": {
    "title": "标题",
    "description": "描述"
  }
}
```

2. 在 `src/i18n/messages/en.json` 中添加对应的英文

3. 在组件中使用：
```tsx
import { useTranslations } from '@/i18n/client';

const t = useTranslations('myComponent');
return <h1>{t('title')}</h1>;
```

## 命名规范

- 使用点号分隔：`namespace.section.key`
- 使用驼峰命名：`welcomeMessage`
- 复数：`item.count`
```

**预计工作量**：3-4 小时

---

### 阶段 4：测试和验证（优先级：高）

#### 4.1 创建翻译测试

**目标**：确保翻译功能的正确性

**测试内容**：

```tsx
// src/test/i18n/transitions.test.tsx
import { render } from '@testing-library/react';
import { useTranslations } from '@/i18n/client';

describe('i18n Translations', () => {
  it('should render Chinese text correctly', () => {
    const { getByText } = render(<TestComponent locale="zh" />);
    expect(getByText('首页')).toBeInTheDocument();
  });

  it('should render English text correctly', () => {
    const { getByText } = render(<TestComponent locale="en" />);
    expect(getByText('Home')).toBeInTheDocument();
  });

  it('should switch language correctly', () => {
    // 测试语言切换功能
  });
});
```

#### 4.2 可视化测试

**工具**：
- [Storybook i18n addon](https://storybook.js.org/addons/@storybook/addon-i18n) - 在 Storybook 中预览不同语言
- Playwright - 测试多语言页面

**预计工作量**：4-5 小时

---

## 📁 目录结构建议

当前结构已经很完善，建议保持：

```
src/
├── i18n/
│   ├── config.ts              # 语言和路由配置
│   ├── request.ts             # 服务端请求配置
│   ├── client.ts              # 客户端 hooks
│   ├── routing.ts             # 路由导航工具
│   ├── index.ts               # 导出入口
│   ├── utils.ts               # 工具函数
│   └── messages/              # 翻译文件
│       ├── zh.json            # 中文
│       ├── en.json            # 英文
│       ├── ja.json            # 日语（待创建）
│       ├── ko.json            # 韩语（待创建）
│       ├── fr.json            # 法语（待创建）
│       └── de.json            # 德语（待创建）
├── app/
│   └── [locale]/              # 动态语言路由
│       ├── layout.tsx         # 布局（已集成 i18n）
│       ├── page.tsx           # 首页（已集成 i18n）
│       ├── about/
│       │   └── page.tsx       # 需要验证
│       ├── team/
│       │   └── page.tsx       # 需要验证
│       └── ...
├── components/
│   ├── Footer.tsx             # 需要集成 i18n
│   ├── Navigation.tsx         # 需要验证
│   └── ...
└── scripts/
    ├── extract-i18n.sh        # 提取翻译文本
    └── check-translations.js  # 检查翻译完整性
```

---

## 📦 依赖清单

### 当前已安装
```json
{
  "next-intl": "^4.8.3"
}
```

### 建议添加（可选）
```json
{
  "devDependencies": {
    "@types/node": "^25.5.0",      // 已安装
    "easygettext": "^2.22.0",      // 提取翻译文本
    "i18next-scanner": "^4.4.0",   // 自动提取
    "storybook": "^8.0.0"          // 可视化测试（已有则跳过）
  }
}
```

**安装命令**：
```bash
npm install --save-dev easygettext i18next-scanner
```

---

## 🚀 实施步骤总结

### 优先级排序

| 阶段 | 优先级 | 预计时间 | 状态 |
|------|--------|----------|------|
| 阶段 1.1：补充缺失翻译 | 高 | 8-12 小时 | 待开始 |
| 阶段 1.2：修复硬编码文本 | 高 | 4-6 小时 | 待开始 |
| 阶段 2：SEO 和性能优化 | 中 | 2-3 小时 | 待开始 |
| 阶段 3：工作流和工具 | 低 | 3-4 小时 | 待开始 |
| 阶段 4：测试和验证 | 高 | 4-5 小时 | 待开始 |
| **总计** | - | **21-30 小时** | - |

### 建议的实施顺序

1. **第 1 周**：完成阶段 1（补充翻译 + 修复硬编码）
2. **第 2 周**：完成阶段 4（测试和验证）
3. **第 3 周**：完成阶段 2（SEO 优化）
4. **第 4 周**：完成阶段 3（工作流和工具）

---

## ✅ 验收标准

### 功能验收

- [ ] 所有 6 种语言都能正常显示
- [ ] 语言切换功能正常
- [ ] SEO 元数据正确翻译
- [ ] 没有硬编码的文本（除特殊字符如 emoji）
- [ ] 所有页面都能正确渲染多语言内容

### 性能验收

- [ ] 首屏加载时间增加 < 200ms
- [ ] 翻译文件总体积 < 200KB
- [ ] 无额外的 JavaScript 请求
- [ ] Lighthouse SEO 分数 > 90

### 质量验收

- [ ] 所有翻译都经过人工审核
- [ ] 专业术语翻译一致
- [ ] 语气和品牌一致性
- [ ] 无拼写错误
- [ ] 测试覆盖率 > 80%

---

## 📚 参考资料

### 官方文档
- [next-intl 官方文档](https://next-intl-docs.vercel.app/)
- [Next.js 国际化指南](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

### 工具和插件
- [DeepL 翻译](https://www.deepl.com/translator) - 高质量 AI 翻译
- [Crowdin](https://crowdin.com/) - 在线翻译管理平台
- [POEditor](https://poeditor.com/) - 翻译管理工具

### 最佳实践
- 使用翻译键而不是直接嵌入文本
- 保持翻译键的层级结构清晰
- 使用命名空间组织翻译（如 `home.hero.title`）
- 定期检查翻译完整性
- 使用版本控制跟踪翻译变更

---

## 🎯 下一步行动

### 立即开始

1. **创建缺失的翻译文件**
   ```bash
   cd /root/.openclaw/workspace
   cp src/i18n/messages/en.json src/i18n/messages/ja.json
   cp src/i18n/messages/en.json src/i18n/messages/ko.json
   cp src/i18n/messages/en.json src/i18n/messages/fr.json
   cp src/i18n/messages/en.json src/i18n/messages/de.json
   ```

2. **修复 Footer.tsx 的硬编码文本**
   - 将所有硬编码的中文替换为翻译键
   - 添加对应的翻译到 `zh.json` 和 `en.json`

3. **验证其他组件**
   - 使用 grep 查找硬编码文本
   - 逐个修复

### 后续步骤

1. 使用 AI 工具生成初稿翻译
2. 人工审核和修正
3. 进行多语言测试
4. 优化 SEO 和性能
5. 建立翻译工作流

---

## 📞 联系和支持

如有问题或需要帮助，请联系：
- **技术负责人**：前端架构师
- **翻译协调**：内容团队
- **测试支持**：QA 团队

---

*文档版本：1.0*
*最后更新：2026-03-26*
*作者：前端架构师子代理*
