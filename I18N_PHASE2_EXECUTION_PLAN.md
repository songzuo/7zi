# i18n Phase 2 详细执行计划

**版本**: v1.2.0 扩展
**日期**: 2026-03-28
**任务**: 完成 ja/ko/es 剩余 74% 翻译工作

---

## 📊 当前翻译状态

### 语言完成度

| 语言   | 键总数 | 未翻译 | 完成率  | 状态      |
| ------ | ------ | ------ | ------- | --------- |
| **zh** | 579    | 0      | 100%    | ✅ 完成   |
| **en** | 579    | 0      | 100%    | ✅ 完成   |
| **ja** | 579    | 343    | **40%** | 🔴 需翻译 |
| **ko** | 579    | 343    | **40%** | 🔴 需翻译 |
| **es** | 579    | 346    | **40%** | 🔴 需翻译 |
| **fr** | 579    | ~10    | 98%     | 🟡 收尾   |
| **de** | 579    | ~10    | 98%     | 🟡 收尾   |

### 未翻译键分布 (ja/ko/es 共通)

| 命名空间          | 未翻译数 | 优先级 | 类型       |
| ----------------- | -------- | ------ | ---------- |
| **ui**            | 67       | P0     | 核心UI组件 |
| **about**         | 47       | P1     | 页面内容   |
| **errors**        | 43       | P0     | 错误消息   |
| **contact**       | 31       | P1     | 页面内容   |
| **portfolio**     | 27       | P2     | 页面内容   |
| **home**          | 26       | P1     | 页面内容   |
| **notifications** | 22       | P2     | 功能文本   |
| **email**         | 16       | P2     | 功能文本   |
| **team**          | 55       | P1     | 页面内容   |
| **subagents**     | ~20      | P2     | 功能文本   |
| **memory**        | ~15      | P2     | 功能文本   |
| **tasks**         | ~12      | P2     | 功能文本   |
| **validation**    | 12       | P0     | 表单验证   |
| **time**          | 7        | P0     | 相对时间   |
| **mobileMenu**    | ~10      | P1     | 导航       |
| **loading**       | ~8       | P2     | 加载提示   |
| **settings**      | ~12      | P2     | 设置页面   |
| **blog**          | ~20      | P2     | 博客内容   |

**总计**: 约 343 个键/语言需要翻译

---

## 🎯 翻译文件清单

### 需翻译文件路径

```
src/i18n/messages/
├── ja.json  (需翻译 343 键)
├── ko.json  (需翻译 343 键)
└── es.json  (需翻译 346 键)
```

### 命名空间详细列表 (22个)

1. **common** - 公共文本 ✅ 已完成
2. **nav** - 导航菜单 ✅ 已完成
3. **home** - 首页 🔴 26键未翻译
4. **team** - 团队页 🔴 55键未翻译
5. **about** - 关于页 🔴 47键未翻译
6. **contact** - 联系页 🔴 31键未翻译
7. **portfolio** - 作品集 🔴 27键未翻译
8. **blog** - 博客页 ~20键未翻译
9. **dashboard** - 控制台 ~15键未翻译
10. **footer** - 页脚 ✅ 已完成
11. **errors** - 错误消息 🔴 43键未翻译
12. **time** - 时间格式化 🔴 7键未翻译
13. **mobileMenu** - 移动菜单 ~10键未翻译
14. **subagents** - 智能体 ~20键未翻译
15. **memory** - 记忆系统 ~15键未翻译
16. **tasks** - 任务系统 ~12键未翻译
17. **ui** - UI组件 🔴 67键未翻译
18. **notifications** - 通知 ~22键未翻译
19. **email** - 邮件模板 ~16键未翻译
20. **settings** - 设置 ~12键未翻译
21. **loading** - 加载提示 ~8键未翻译
22. **validation** - 表单验证 🔴 12键未翻译

---

## 📋 优先级排序与执行计划

### Phase 2.1: 核心UI翻译 (P0 - 紧急)

**目标**: 完成 ui, errors, validation, time 命名空间

| 序号 | 命名空间       | 键数 | 预计时间   | 翻译方向         |
| ---- | -------------- | ---- | ---------- | ---------------- |
| 1    | **validation** | 12   | 15min/语言 | zh/en → ja/ko/es |
| 2    | **time**       | 7    | 10min/语言 | zh/en → ja/ko/es |
| 3    | **ui**         | 67   | 45min/语言 | zh/en → ja/ko/es |
| 4    | **errors**     | 43   | 30min/语言 | zh/en → ja/ko/es |

**小计**: 129 键，**约 2 小时/语言**

#### validation 键列表

```json
{
  "required": "必填项",
  "email": "请输入有效的邮箱地址",
  "phone": "请输入有效的电话号码",
  "minLength": "最少 {min} 个字符",
  "maxLength": "最多 {max} 个字符",
  "url": "请输入有效的网址",
  "number": "请输入数字",
  "date": "请输入有效日期"
}
```

#### time 键列表

```json
{
  "justNow": "刚刚",
  "minutesAgo": "{n} 分钟前",
  "hoursAgo": "{n} 小时前",
  "daysAgo": "{n} 天前",
  "weeksAgo": "{n} 周前",
  "monthsAgo": "{n} 个月前",
  "yearsAgo": "{n} 年前"
}
```

#### ui 键结构 (67键)

- `ui.button` - 按钮文本 (30+)
- `ui.input` - 输入框 (20+)
- `ui.modal` - 弹窗 (5)
- `ui.toast` - 提示消息 (10)
- `ui.tooltip` - 工具提示 (3)

---

### Phase 2.2: 页面内容翻译 (P1 - 高)

**目标**: 完成 about, home, team, contact, mobileMenu

| 序号 | 命名空间       | 键数 | 预计时间   | 翻译方向      |
| ---- | -------------- | ---- | ---------- | ------------- |
| 1    | **home**       | 26   | 30min/语言 | zh → ja/ko/es |
| 2    | **team**       | 55   | 45min/语言 | zh → ja/ko/es |
| 3    | **about**      | 47   | 30min/语言 | zh → ja/ko/es |
| 4    | **contact**    | 31   | 20min/语言 | zh → ja/ko/es |
| 5    | **mobileMenu** | ~10  | 10min/语言 | zh → ja/ko/es |

**小计**: ~169 键，**约 2.5 小时/语言**

---

### Phase 2.3: 次要功能翻译 (P2 - 中)

**目标**: 完成 portfolio, blog, notifications, email, settings

| 序号 | 命名空间          | 键数 | 预计时间   |
| ---- | ----------------- | ---- | ---------- |
| 1    | **portfolio**     | 27   | 20min/语言 |
| 2    | **blog**          | ~20  | 15min/语言 |
| 3    | **notifications** | 22   | 15min/语言 |
| 4    | **email**         | 16   | 15min/语言 |
| 5    | **settings**      | ~12  | 10min/语言 |
| 6    | **subagents**     | ~20  | 15min/语言 |
| 7    | **memory**        | ~15  | 10min/语言 |
| 8    | **tasks**         | ~12  | 10min/语言 |
| 9    | **loading**       | ~8   | 5min/语言  |
| 10   | **dashboard**     | ~15  | 10min/语言 |

**小计**: ~167 键，**约 2 小时/语言**

---

### 时间汇总

| 阶段           | 键数 | 时间/语言 | 3语言总计 |
| -------------- | ---- | --------- | --------- |
| Phase 2.1 (P0) | 129  | 2h        | 6h        |
| Phase 2.2 (P1) | ~169 | 2.5h      | 7.5h      |
| Phase 2.3 (P2) | ~167 | 2h        | 6h        |
| **总计**       | ~465 | **6.5h**  | **19.5h** |

---

## 🔧 自动化工具优化建议

### 当前工具分析

**文件**: `scripts/translate-i18n.py`

**问题**:

1. 硬编码翻译内容，维护困难
2. 仅支持部分命名空间 (common, nav, home, team, about, contact, footer)
3. 无法处理新增命名空间
4. 每次更新需要手动修改 Python 代码

### 优化方案

#### 方案 1: CSV 驱动翻译流程

```
scripts/i18n/
├── translate.csv          # 翻译源表
├── translate-i18n-csv.py   # CSV处理器
└── translation-log.json    # 翻译进度记录
```

**CSV 格式**:

```csv
namespace,key,path,en,zh,ja,ko,es,status
common,siteName,common.siteName,7zi Studio,7zi Studio,7zi Studio,7zi Studio,7zi Studio,done
ui,button.confirm,ui.button.confirm,Confirm,确认,確認,확인,Confirmar,pending
```

**优点**:

- 易于批量编辑 (Excel/Numbers)
- 清晰的进度追踪
- 支持众包翻译
- 可导出给专业翻译公司

#### 方案 2: JSON 差量更新

```
scripts/translate-i18n-v2.py
```

- 从英文版本生成缺失键
- 使用占位符标记待翻译
- 支持 `--lang ja --namespace ui` 指定范围

```python
# 伪代码
def generate_missing_keys(target_lang):
    missing = find_missing(en, target_lang)
    for key in missing:
        placeholder = f"[TODO:{target_lang}:{key}]"
        set_value(target_lang, key, placeholder)
```

#### 方案 3: 集成 AI 翻译 API (推荐)

```python
# scripts/translate-i18n-ai.py
import openai

async def translate_batch(keys, source_lang, target_lang):
    """批量翻译键值对"""
    prompt = f"""
    Translate the following JSON keys from {source_lang} to {target_lang}:
    {json.dumps(keys, ensure_ascii=False)}

    Return valid JSON with translations:
    """
    response = await openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return parse_translations(response)
```

**优势**:

- 高质量翻译 (专业术语处理)
- 批量处理效率高
- 保持术语一致性

**注意**:

- 需要 API 成本
- 需人工校验

---

### 推荐工作流

```
┌─────────────────────────────────────────────────────────┐
│                    i18n Phase 2 工作流                    │
├─────────────────────────────────────────────────────────┤
│  1. 生成缺失键报告 (scripts/i18n-audit.js)              │
│         ↓                                               │
│  2. 选择翻译模式:                                        │
│     ├─ AI 批量翻译 (推荐)                                │
│     ├─ CSV 众包翻译                                      │
│     └─ 手动逐个翻译                                      │
│         ↓                                               │
│  3. 更新翻译文件 (ja.json/ko.json/es.json)              │
│         ↓                                               │
│  4. 质量审查 (scripts/i18n-validate.js)                │
│         ↓                                               │
│  5. 测试验证 (切换语言 + 页面检查)                       │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ 质量审查流程

### 1. 自动化验证

#### 1.1 键完整性检查

```bash
# 检查所有语言是否有相同的键
node scripts/i18n-validate.js --check-keys

# 输出示例
[ERROR] ja: missing keys: ["ui.button.retry"]
[ERROR] ko: missing keys: ["ui.button.retry"]
```

#### 1.2 值类型检查

```bash
# 检查类型一致性
node scripts/i18n-validate.js --check-types
```

#### 1.3 占位符检查

```bash
# 检查未翻译占位符
node scripts/i18n-validate.js --check-placeholder

# 输出
[WARN] es: ui.button.confirm = "Confirm" (possible untranslated)
```

### 2. 人工审查清单

#### 2.1 翻译一致性检查

| 检查项     | 说明                         | 工具      |
| ---------- | ---------------------------- | --------- |
| 术语一致性 | 同一术语在同命名空间译法一致 | grep 对比 |
| 变量占位符 | {name}, {count} 等保持原样   | 文本比对  |
| HTML 标签  | `<b>`, `<a>` 等保持不变      | 视觉检查  |
| 特殊字符   | &, %, $ 等保持不变           | diff      |

#### 2.2 文化适配检查

| 语言 | 检查项                               |
| ---- | ------------------------------------ |
| ja   | 敬语使用、汉字/假名混用、日期格式    |
| ko   | 敬语阶称 (해요체/합니다체)、日期格式 |
| es   | 阴阳性一致、动词变位、地域用词       |

#### 2.3 视觉测试

```bash
# 启动开发服务器测试
npm run dev

# 测试各语言切换
# http://localhost:3000/ja
# http://localhost:3000/ko
# http://localhost:3000/es
```

**检查清单**:

- [ ] 页面文字无乱码
- [ ] 按钮/表单文本正确显示
- [ ] 弹窗/提示消息正确显示
- [ ] 响应式布局正常
- [ ] 无英文残留 (除专有名词外)

### 3. 翻译验收标准

| 指标      | 目标值 | 检查方法                          |
| --------- | ------ | --------------------------------- |
| 键覆盖率  | 100%   | `i18n-audit.js --coverage`        |
| 未翻译率  | < 1%   | `i18n-validate.js --untranslated` |
| JSON 错误 | 0      | `JSON.parse()`                    |
| 测试通过  | 100%   | Playwright E2E                    |

---

## 📅 实施时间表

### 建议执行顺序

```
第1天 (3h)
├── Phase 2.1: validation + time (1h)
└── Phase 2.1: ui 按钮/输入框 (2h)

第2天 (3h)
├── Phase 2.2: home 页面 (1h)
├── Phase 2.2: team 页面 (1.5h)
└── Phase 2.2: about 页面 (0.5h)

第3天 (3h)
├── Phase 2.2: contact + mobileMenu (0.5h)
├── Phase 2.3: portfolio + blog (1h)
└── Phase 2.3: errors + notifications (2h)

第4天 (2h)
├── Phase 2.3: 剩余命名空间 (1h)
└── 质量审查 + 测试 (1h)

第5天 (1h)
├── 问题修复
└── 验收通过
```

**总计**: 约 5 个工作日完成

---

## 🛠️ 所需脚本工具

### 新增工具建议

1. **i18n-audit.js** - 审计当前翻译状态

   ```bash
   node i18n-audit.js --lang ja,ko,es
   ```

2. **i18n-validate.js** - 验证翻译质量

   ```bash
   node i18n-validate.js --strict
   ```

3. **i18n-export-csv.js** - 导出 CSV 供翻译

   ```bash
   node i18n-export-csv.js --output translation.csv
   ```

4. **i18n-import-csv.js** - 导入 CSV 翻译
   ```bash
   node i18n-import-csv.js --input translation.csv
   ```

---

## 📝 总结

### 当前状态

- **3 种语言需翻译**: ja, ko, es
- **未翻译键**: 343/语言
- **预计工作量**: 19.5 小时

### 执行要点

1. **优先翻译 P0** (ui, errors, validation, time)
2. **使用工具辅助** (CSV/AI 批量翻译)
3. **严格质量审查** (自动化 + 人工)
4. **分阶段实施** (5 天完成)

### 验收目标

- [x] zh/en 100% ✅
- [ ] ja/ko/es 100% (目标)
- [x] fr/de 98% ✅
- [ ] 所有语言 JSON 解析通过
- [ ] 页面功能测试通过

---

**计划版本**: 1.0
**生成日期**: 2026-03-28
**执行人**: 咨询师子代理
