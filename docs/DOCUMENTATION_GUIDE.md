# 7zi 文档维护指南

> 文档编写规范、更新流程、质量标准

**版本**: 1.0.0  
**更新日期**: 2026-03-08  
**维护者**: 架构师子代理

---

## 📋 目录

- [文档分类](#文档分类)
- [编写规范](#编写规范)
- [更新流程](#更新流程)
- [质量标准](#质量标准)
- [责任分工](#责任分工)

---

## 文档分类

### 核心文档 (Core)

| 文档 | 更新频率 | 负责人 |
|------|----------|--------|
| README.md | 版本发布时 | 媒体 |
| ARCHITECTURE.md | 架构变更时 | 架构师 |
| PROJECT_STATUS.md | 每周 | 咨询师 |
| NEXT_FEATURES.md | 每月 | 架构师 |
| TECH_DEBT.md | 代码审查后 | 咨询师 |
| DOCS_INDEX.md | 新增文档时 | 架构师 |

### 用户文档 (User-Facing)

| 文档 | 更新频率 | 负责人 |
|------|----------|--------|
| docs/USER_GUIDE.md | 功能上线时 | 销售客服 |
| docs/API_REFERENCE.md | API 变更时 | 架构师 |
| docs/QUICK_REFERENCE.md | 每月 | 系统管理员 |

### 技术文档 (Technical)

| 文档 | 更新频率 | 负责人 |
|------|----------|--------|
| docs/COMPONENTS.md | 组件变更时 | 设计师 |
| docs/TESTING_GUIDE.md | 测试策略变更时 | 测试员 |
| docs/DEPLOYMENT.md | 部署流程变更时 | 系统管理员 |
| docs/TASKS_MODULE.md | 模块更新时 | Executor |

### 报告文档 (Reports)

| 文档 | 更新频率 | 负责人 |
|------|----------|--------|
| docs/performance-*.md | 性能优化后 | 系统管理员 |
| docs/monitoring-*.md | 监控变更后 | 系统管理员 |
| docs/test-reports/*.md | 测试完成后 | 测试员 |

---

## 编写规范

### 文档结构

```markdown
# 文档标题

> 简短描述 (1-2 句)

**版本**: 1.0.0  
**更新日期**: YYYY-MM-DD  
**维护者**: 角色名

---

## 📋 目录

- [章节 1](#章节 -1)
- [章节 2](#章节 -2)

---

## 章节内容

### 子章节

内容...

---

*文档由 XXX 子代理维护*
```

### 标题规范

- 使用 `#` 表示主标题 (H1)
- 使用 `##` 表示章节 (H2)
- 使用 `###` 表示子章节 (H3)
- 标题要简洁明了，避免过长

### 代码块规范

````markdown
```bash
# 添加语言标识
npm run dev
```

```tsx
// 添加语言标识和注释
import { Button } from '@/components/shared/Button';

// 基础用法
<Button>点击我</Button>
```

```json
{
  "key": "value"
}
```
````

### 表格规范

```markdown
| 列 1 | 列 2 | 列 3 |
|------|------|------|
| 值 1 | 值 2 | 值 3 |
```

- 表头与内容用 `|---|` 分隔
- 对齐方式：默认左对齐
- 数字列可用右对齐 `|---:|`

### 链接规范

```markdown
# 内部链接
[文档标题](./docs/FILENAME.md)

# 外部链接
[Next.js](https://nextjs.org/)

# 锚点链接
[返回目录](#目录)
```

### 图片规范

```markdown
![描述文字](./images/screenshot.png)

<!-- 或使用 HTML 控制尺寸 -->
<img src="./images/diagram.svg" width="600" alt="架构图" />
```

### Emoji 使用

- 章节标题前可加 Emoji 增强可读性
- 不要过度使用，保持专业
- 常用 Emoji:
  - 📋 目录/清单
  - 🚀 快速开始/部署
  - 📖 指南/教程
  - 🛠️ 工具/配置
  - 📊 数据/统计
  - ⚡ 性能/快速
  - 🧪 测试
  - 🔧 故障排查

---

## 更新流程

### 1. 识别更新需求

- 功能变更后
- 用户反馈问题
- 定期审查 (每月)
- 技术栈升级

### 2. 更新文档

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 创建文档分支
git checkout -b docs/update-api-reference

# 3. 编辑文档
code docs/API_REFERENCE.md

# 4. 预览效果 (如适用)
# Markdown 预览插件或 VS Code

# 5. 提交更改
git add docs/API_REFERENCE.md
git commit -m "docs: 更新 API 参考文档 v1.0.1

- 添加任务分配端点
- 完善错误响应格式
- 添加更多 SDK 示例"

# 6. 推送分支
git push origin docs/update-api-reference

# 7. 创建 PR
# GitHub: 创建 Pull Request
```

### 3. 审查流程

```
作者提交 → 自动检查 (Lint/Build) → 同行审查 → 合并 → 部署
```

### 4. 版本控制

```markdown
## 更新日志

### v1.0.1 (2026-03-08)
- 添加任务分配端点
- 完善错误响应格式

### v1.0.0 (2026-03-01)
- 初始版本
```

---

## 质量标准

### 内容质量

| 标准 | 要求 |
|------|------|
| 准确性 | 信息正确，代码可运行 |
| 完整性 | 覆盖所有重要场景 |
| 清晰度 | 表达清晰，无歧义 |
| 一致性 | 术语、格式统一 |
| 时效性 | 定期更新，标注日期 |

### 技术审查清单

- [ ] 代码示例可运行
- [ ] API 端点已验证
- [ ] 链接有效
- [ ] 截图是最新的
- [ ] 版本号正确
- [ ] 更新日期已修改
- [ ] 维护者信息正确

### 可读性审查清单

- [ ] 标题层次清晰
- [ ] 段落长度适中
- [ ] 有目录导航
- [ ] 有关键信息强调
- [ ] 有示例代码
- [ ] 有常见问题解答

---

## 责任分工

### 架构师 (Architect)

- ARCHITECTURE.md
- docs/API_REFERENCE.md
- docs/COMPONENTS.md
- DOCS_INDEX.md
- 技术决策文档

### 咨询师 (Consultant)

- PROJECT_STATUS.md
- TECH_DEBT.md
- 调研报告
- 分析文档

### 设计师 (Designer)

- docs/DESIGN_*.md
- docs/UI_*.md
- docs/RESPONSIVE_*.md
- 组件文档 (部分)

### 系统管理员 (Sysadmin)

- docs/DEPLOYMENT.md
- docs/MONITORING_*.md
- docs/OPERATIONS_MANUAL.md
- docs/QUICK_REFERENCE.md
- 运维相关文档

### 测试员 (Tester)

- docs/TESTING_GUIDE.md
- docs/test-reports/*.md
- 测试相关文档

### Executor

- docs/TASKS_MODULE.md
- 模块实现文档
- 代码示例

### 媒体 (Media)

- README.md
- 对外宣传文档
- 用户故事

### 销售客服 (Support)

- docs/USER_GUIDE.md
- FAQ 文档
- 用户反馈整理

---

## 文档模板

### API 端点模板

```markdown
### 端点名称

```http
METHOD /api/path
```

**描述**: 简短说明

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `param` | string | ✅ | 说明 |

**请求体**

```json
{
  "key": "value"
}
```

**响应示例**

```json
{
  "success": true,
  "data": {}
}
```

**cURL 示例**

```bash
curl -X POST http://localhost:3000/api/path \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```
```

### 组件文档模板

```markdown
### 组件名称

**路径**: `src/components/path/Component.tsx`

```tsx
import { Component } from '@/components/path/Component';

<Component prop="value" />
```

**Props**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `prop` | string | `default` | 说明 |

**使用示例**

```tsx
<Component prop="value">
  内容
</Component>
```
```

### 故障排查模板

```markdown
### 问题描述

症状：...

**可能原因**

1. 原因 1
2. 原因 2

**解决方案**

```bash
# 解决步骤
command1
command2
```

**验证**

```bash
# 验证是否解决
verification-command
```
```

---

## 最佳实践

### 1. 文档即代码

- 文档与代码一起版本控制
- 文档变更走 Code Review 流程
- 文档测试纳入 CI/CD

### 2. 单一事实来源

- 避免重复内容
- 如有重复，相互引用
- 保持信息一致性

### 3. 用户导向

- 从用户角度编写
- 提供实际示例
- 包含常见问题

### 4. 持续改进

- 收集用户反馈
- 定期审查更新
- 跟踪文档使用情况

### 5. 自动化

- 自动生成 API 文档
- 自动检查链接有效性
- 自动构建文档站点

---

## 工具推荐

### Markdown 编辑器

- VS Code + Markdown 插件
- Typora
- Obsidian

### 文档站点

- VitePress
- Docusaurus
- GitBook

### 图表工具

- Mermaid (流程图)
- Excalidraw (手绘风格)
- Draw.io (专业图表)

### 截图工具

- Snipaste
- ShareX
- CleanShot X

---

## 检查清单

### 新文档发布前

- [ ] 内容准确完整
- [ ] 代码示例可运行
- [ ] 格式符合规范
- [ ] 添加到 DOCS_INDEX.md
- [ ] 更新更新日志
- [ ] 指定维护者

### 文档更新时

- [ ] 更新版本号
- [ ] 更新更新日期
- [ ] 记录变更内容
- [ ] 通知相关人员
- [ ] 更新相关文档

### 定期审查 (每月)

- [ ] 检查链接有效性
- [ ] 更新过时内容
- [ ] 补充缺失文档
- [ ] 清理重复内容
- [ ] 收集用户反馈

---

*文档维护指南由架构师子代理编写和维护*
