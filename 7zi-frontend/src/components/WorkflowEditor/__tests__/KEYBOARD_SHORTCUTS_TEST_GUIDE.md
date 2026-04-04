# WorkflowEditor 键盘快捷键测试指南

## 测试环境
- 日期: 2026-04-04
- 组件: WorkflowEditor
- 位置: `7zi-frontend/src/components/workflow-editor/`

## 快捷键列表

### 1. 保存工作流
**快捷键**: `Ctrl+S` (Windows/Linux) / `Cmd+S` (macOS)

**测试步骤**:
1. 在编辑器中创建或修改节点
2. 按下 `Ctrl+S` 或 `Cmd+S`
3. 验证: 应该触发 `handleSave()` 函数，调用 `onSave` 回调

**预期行为**:
- 浏览器默认保存行为被阻止
- 保存功能正常触发

---

### 2. 撤销
**快捷键**: `Ctrl+Z` (Windows/Linux) / `Cmd+Z` (macOS)

**测试步骤**:
1. 创建一个节点
2. 移动节点位置
3. 按下 `Ctrl+Z` 或 `Cmd+Z`
4. 验证: 节点位置恢复到移动前的位置

**预期行为**:
- 最近的操作被撤销
- `canUndo` 状态正确更新

---

### 3. 重做
**快捷键**: `Ctrl+Y` (Windows/Linux) / `Cmd+Y` (macOS) 或 `Ctrl+Shift+Z` / `Cmd+Shift+Z`

**测试步骤**:
1. 创建一个节点
2. 移动节点位置
3. 按下 `Ctrl+Z` 撤销
4. 按下 `Ctrl+Y` 或 `Ctrl+Shift+Z` 重做
5. 验证: 节点位置恢复到撤销后的状态

**预期行为**:
- 撤销的操作被重做
- `canRedo` 状态正确更新

---

### 4. 删除选中节点
**快捷键**: `Delete` 或 `Backspace`

**测试步骤**:
1. 选中一个节点
2. 按下 `Delete` 或 `Backspace`
3. 验证: 选中节点被删除，连接的边也被删除
4. 按下 `Ctrl+Z` 验证可以撤销删除操作

**预期行为**:
- 选中节点被移除
- 连接到该节点的所有边被移除
- 删除操作可以撤销

---

### 5. 全选
**快捷键**: `Ctrl+A` (Windows/Linux) / `Cmd+A` (macOS)

**测试步骤**:
1. 在画布上创建多个节点
2. 按下 `Ctrl+A` 或 `Cmd+A`
3. 验证: 所有节点都被选中（显示蓝色边框）
4. 按下 `Escape` 取消选择

**预期行为**:
- 所有节点状态 `selected: true`
- 可以对选中的节点进行批量操作（删除、移动）

---

### 6. 取消选择
**快捷键**: `Escape`

**测试步骤**:
1. 选中一个节点或多个节点
2. 按下 `Escape`
3. 验证: 所有选中状态被清除

**预期行为**:
- `selectedNode` 设置为 `null`
- `selectedEdge` 设置为 `null`
- 所有节点的 `selected` 状态设为 `false`

---

## 额外功能

### 7. 显示快捷键面板
**快捷键**: `?`

**测试步骤**:
1. 按下 `?` 键
2. 验证: 快捷键面板弹出
3. 查看所有快捷键列表
4. 点击关闭按钮或按 `Escape` 关闭面板

**预期行为**:
- `KeyboardShortcutsPanel` 组件显示
- 显示所有分类的快捷键
- 搜索功能正常工作

---

## 焦点管理测试

### 测试焦点隔离

**测试步骤**:
1. 打开 WorkflowEditor
2. 在编辑器内按 `Ctrl+S` - 应该触发保存
3. 点击编辑器外（如浏览器地址栏）
4. 再次按 `Ctrl+S` - 应该触发浏览器保存，而不是编辑器保存

**预期行为**:
- 快捷键只在编辑器获得焦点时生效
- 编辑器失去焦点时，快捷键被全局处理

---

## UI 提示测试

### 工具栏按钮 Tooltip

**测试步骤**:
1. 将鼠标悬停在工具栏的"保存"按钮上
2. 验证: 显示 "保存工作流 (Ctrl+S)" 提示
3. 依次测试其他按钮的 tooltip

**预期行为**:
- 每个按钮都有对应的快捷键提示

### 状态栏快捷键按钮

**测试步骤**:
1. 查看底部状态栏
2. 点击"⌨️ 快捷键"按钮
3. 验证: 快捷键面板打开

**预期行为**:
- 按钮有 hover 效果
- 点击打开快捷键面板

---

## 边界情况测试

### 只读模式

**测试步骤**:
1. 设置 `readOnly={true}` 属性
2. 尝试使用所有编辑快捷键（`Ctrl+Z`, `Ctrl+Y`, `Delete`, `Ctrl+A`）
3. 验证: 所有快捷键都被禁用

**预期行为**:
- 快捷键处理函数提前返回
- 无法修改工作流

### 无选中对象时的 Delete

**测试步骤**:
1. 不选中任何节点或边
2. 按下 `Delete` 或 `Backspace`
3. 验证: 不会发生任何操作

**预期行为**:
- 删除操作不会执行

### 空工作流时的全选

**测试步骤**:
1. 打开空工作流
2. 按下 `Ctrl+A`
3. 验证: 不会报错

**预期行为**:
- 代码正常处理空数组

---

## 快捷键冲突测试

### 与浏览器默认快捷键

**快捷键**: `Ctrl+S` (保存), `Ctrl+Z` (撤销浏览器), `Ctrl+Y` (重做浏览器)

**测试步骤**:
1. 在编辑器中按 `Ctrl+S`
2. 验证: 浏览器保存对话框不出现
3. 编辑器保存功能触发

**预期行为**:
- `event.preventDefault()` 阻止浏览器默认行为

### 与系统快捷键

**测试步骤**:
1. 测试在 macOS 和 Windows 上的表现
2. 验证 `metaKey` (Command) 和 `ctrlKey` 都正确处理

**预期行为**:
- 跨平台兼容性良好

---

## 性能测试

### 大量节点

**测试步骤**:
1. 创建 50 个节点
2. 按 `Ctrl+A` 全选
3. 验证: 响应迅速，没有卡顿

**预期行为**:
- `setNodes` 批量更新高效
- UI 渲染流畅

---

## 浏览器兼容性

### 测试环境
- Chrome (最新版本)
- Firefox (最新版本)
- Safari (macOS)
- Edge (最新版本)

**测试步骤**:
1. 在每个浏览器中运行所有测试
2. 验证: 功能一致性

---

## 自动化测试建议

### Playwright 测试示例

```typescript
test('Ctrl+S should save workflow', async ({ page }) => {
  const editor = new WorkflowEditorPage(page)
  await editor.goto()

  // 监听保存事件
  const savePromise = editor.waitForSave()

  // 按下 Ctrl+S
  await page.keyboard.press('Control+S')

  // 验证保存事件触发
  const savedData = await savePromise
  expect(savedData).toBeDefined()
})

test('Ctrl+A should select all nodes', async ({ page }) => {
  const editor = new WorkflowEditorPage(page)
  await editor.goto()

  // 创建 3 个节点
  await editor.createNode('agent', { x: 100, y: 100 })
  await editor.createNode('condition', { x: 300, y: 100 })
  await editor.createNode('end', { x: 500, y: 100 })

  // 全选
  await page.keyboard.press('Control+A')

  // 验证所有节点被选中
  const selectedNodes = await editor.getSelectedNodes()
  expect(selectedNodes.length).toBe(3)
})
```

---

## 已知问题

### 当前限制
1. 全选功能只选中节点，不选中边
2. 快捷键面板不能通过快捷键关闭（需要点击或按 Escape）

### 未来改进
- 支持边的选择和管理
- 支持快捷键自定义
- 支持快捷键录制和回放

---

## 总结

本次测试覆盖以下方面：
- ✅ 所有 6 个核心快捷键功能
- ✅ 焦点管理机制
- ✅ UI 提示和帮助面板
- ✅ 边界情况处理
- ✅ 浏览器快捷键冲突解决
- ✅ 性能表现
- ✅ 跨浏览器兼容性

所有测试通过后，键盘快捷键功能即可发布使用。
