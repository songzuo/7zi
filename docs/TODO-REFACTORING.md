# TODO & 技术债务清单

> **生成时间**: 2026-03-26
> **扫描范围**: `src/` 目录下所有 TypeScript/JavaScript 文件
> **发现条目**: 4 个

---

## 高优先级

### 1. [performance-optimization.ts] CSS 清理工具实现

- **位置**: `src/lib/performance-optimization.ts:98`
- **类型**: TODO
- **难度**: 中等
- **描述**: 移除未使用的 CSS 以优化页面加载性能。当前函数只是一个占位符，需要实现实际的 CSS 清理逻辑。
- **建议方案**:
  - 集成 PurgeCSS 或类似工具（如 Uncss）
  - 构建时运行清理或在运行时动态分析 DOM
  - 考虑使用 PostCSS 插件集成到构建流程
- **影响**: 减少打包体积，提升首屏加载速度

---

## 中优先级

### 2. [api.test.ts] 测试框架替换

- **位置**: `src/app/api/analytics/__tests__/api.test.ts:7`
- **类型**: TODO
- **难度**: 简单
- **描述**: 当前测试文件使用原生 fetch API，需要替换为适当的测试框架。注释提到 next/test 不可用。
- **建议方案**:
  - 继续使用 vitest，但添加 Mock Service Worker (MSW) 来模拟 API 响应
  - 或者使用 fetch-mock 库来拦截 fetch 请求
  - 确保测试环境变量配置正确
- **影响**: 提升测试可靠性和覆盖率

---

### 3. [RealtimeTeamEfficiency.tsx] 计算趋势数据

- **位置**: `src/components/analytics/RealtimeTeamEfficiency.tsx:220`
- **类型**: TODO
- **难度**: 中等
- **描述**: 团队效率组件需要显示各项指标的趋势变化（上升/下降百分比），当前 trend 字段为 undefined。
- **建议方案**:
  - 从历史数据获取上一周期的指标值
  - 计算当前值与历史值的差异百分比
  - 添加趋势指示器（箭头图标 + 颜色区分）
  - 可使用 Redis 缓存历史数据以优化性能
- **影响**: 提升数据可视化质量，帮助用户快速判断趋势

---

### 4. [MeetingRoom.tsx] Toast 错误提示实现

- **位置**: `src/components/meeting/MeetingRoom.tsx:412`
- **类型**: TODO
- **难度**: 简单
- **描述**: 会议组件的错误处理使用了 alert()，需要使用项目中已有的 Toast 组件替换。
- **建议方案**:
  - 导入 Toast 组件（如 `@/components/ui/Toast`）
  - 使用 `Toast.show()` 或类似的 API 替换 alert
  - 根据错误类型显示不同级别的提示（错误/警告/信息）
- **影响**: 提升用户体验，保持 UI 一致性

---

## 统计信息

| 类型     | 数量  |
| -------- | ----- |
| TODO     | 4     |
| FIXME    | 0     |
| XXX      | 0     |
| HACK     | 0     |
| **总计** | **4** |

| 优先级 | 数量 |
| ------ | ---- |
| 高     | 1    |
| 中     | 3    |
| 低     | 0    |

| 难度 | 数量 |
| ---- | ---- |
| 简单 | 2    |
| 中等 | 2    |
| 复杂 | 0    |

---

## 维护建议

1. **定期扫描**: 建议在每次发布前运行代码扫描，确保没有新增的 TODO/FIXME
2. **优先级排序**: 高优先级项应在下一个 Sprint 中解决
3. **代码审查**: 在代码审查时检查 TODO 注释，确保必要时及时处理
4. **清理旧项**: 每季度审查一次此清单，删除已解决的项或更新优先级

---

## 扫描命令

```bash
# 重新扫描所有 TODO/FIXME/XXX/HACK 注释
grep -rn "TODO\|FIXME\|XXX\|HACK" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```
