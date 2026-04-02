# UI 一致性审查 - 快速参考

**项目**: 7zi-frontend v1.8.0
**审查日期**: 2026-04-02
**审查范围**: 所有 React 组件和样式文件

---

## 🚨 需立即修复的问题 (P0 - 1-2天)

### 1. 暗色模式颜色设置错误
- **文件**: `src/app/globals.css:35-38`
- **问题**: 暗色模式下文本和背景颜色变量使用错误
- **修复**:
  ```css
  /* 修改为 */
  .dark body {
    color: var(--color-gray-800);
    background-color: var(--color-gray-50);
  }
  ```
- **影响**: 🔴 严重 - 暗色模式不可读

### 2. 全局过渡动画性能问题
- **文件**: `src/app/globals.css:14-19`
- **问题**: `*` 选择器对所有元素应用过渡
- **修复**:
  ```css
  /* 只在需要的元素上应用 */
  body, button, input, a, .card, .modal {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  }
  ```
- **影响**: 🔴 严重 - 性能下降

### 3. Modal 组件暗色模式不完整
- **文件**: `src/components/ui/Modal.tsx`
- **问题**: 使用硬编码 `bg-white`，未支持暗色模式
- **修复**: 添加 `dark:bg-gray-800` 等暗色类名
- **影响**: 🔴 严重 - 暗色模式下组件异常

### 4. Button 组件内存泄漏风险
- **文件**: `src/components/ui/Button.tsx:58-65`
- **问题**: `rippleTimeoutRef` 未在组件卸载时清理
- **修复**: 添加 `useEffect` 清理函数
- **影响**: 🔴 中等 - 潜在内存泄漏

---

## ⚠️ 重要问题 (P1 - 3-5天)

### 5. Pricing 页面未集成 i18n
- **文件**: `src/app/pricing/page.tsx`
- **问题**: 自管理翻译对象，未使用项目 i18n 系统
- **修复**: 创建 `locales/pricing.json`，使用 `useTranslation` 钩子
- **影响**: 🟡 中等 - 翻译不一致

### 6. 组件目录结构冗余
- **路径**: `src/shared/components/ui/`
- **问题**: 与 `src/components/ui/` 功能重复
- **修复**: 删除冗余目录，统一使用 `src/components/ui/`
- **影响**: 🟡 中等 - 维护困难

### 7. RoomCard 时间格式硬编码
- **文件**: `src/components/rooms/RoomCard.tsx:65-75`
- **问题**: 硬编码中文时间格式（"天前"、"小时前"）
- **修复**: 使用 i18n 系统或 date-fns
- **影响**: 🟡 中等 - 国际化不完整

### 8. Input 组件动画类名错误
- **文件**: `src/components/ui/Input.tsx:101-113`
- **问题**: 使用 Tailwind 不支持的 `animate-in fade-in zoom-in`
- **修复**: 使用 `animate-pulse` 或自定义动画
- **影响**: 🟡 低 - 动画不生效

### 9. 容器类使用不一致
- **问题**: 混合使用 `container mx-auto` 和 `max-w-7xl mx-auto`
- **建议**: 统一使用 `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **影响**: 🟡 低 - 布局不一致

---

## 📊 问题统计

| 优先级 | 数量 | 预估修复时间 |
|--------|------|--------------|
| P0 (紧急) | 4 | 1-2 天 |
| P1 (重要) | 10 | 3-5 天 |
| P2 (优化) | 7 | 1-2 周 |

---

## 🎯 快速修复清单

### 今天可以完成的任务 (1-2 小时)

- [ ] 修复 `globals.css` 暗色模式颜色 (15分钟)
- [ ] 修复 `globals.css` 过渡动画 (15分钟)
- [ ] 修复 `Modal.tsx` 暗色模式 (30分钟)
- [ ] 修复 `Button.tsx` 内存泄漏 (15分钟)
- [ ] 创建 `locales/pricing.json` 翻译文件 (30分钟)

### 本周可以完成的任务 (8-10 小时)

- [ ] 重构 Pricing 页面使用 i18n (2小时)
- [ ] 修复 RoomCard 时间格式 (30分钟)
- [ ] 删除冗余的 `shared/components/ui/` 目录 (30分钟)
- [ ] 统一容器和间距规范 (2小时)
- [ ] 修复 Input 组件动画 (30分钟)

---

## 📁 受影响的文件清单

### 高优先级
- `src/app/globals.css`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Button.tsx`

### 中优先级
- `src/app/pricing/page.tsx`
- `src/components/rooms/RoomCard.tsx`
- `src/components/ui/Input.tsx`
- `src/app/page.tsx`
- 所有使用 `container mx-auto` 的页面

### 新建文件
- `src/locales/en/pricing.json`
- `src/locales/zh/pricing.json`
- `src/styles/animations.css` (可选)

---

## 🔗 相关文档

- 完整报告: `UI_CONSISTENCY_GUIDE.md`
- 设计系统: `src/styles/tokens.css`
- 组件文档: `src/components/ui/README.md` (需创建)

---

## 💡 建议

1. **立即修复 P0 问题** - 影响用户体验
2. **优先完成 i18n 集成** - 为后续功能打基础
3. **建立代码审查规范** - 防止类似问题再次出现
4. **添加自动化测试** - 验证暗色模式和样式一致性

---

**审查人**: 🎨 设计师子代理
**下次审查**: 完成修复后 (预计 2026-04-15)
