# ExcelJS → XLSX 迁移可行性分析报告

**生成时间**: 2026-04-03
**分析范围**: `/root/.openclaw/workspace` 项目
**当前依赖**: exceljs@^4.4.0 (23MB)
**目标依赖**: xlsx (SheetJS) (~300KB)
**预计节省**: ~20MB

---

## 1. ExcelJS 使用情况概览

### 1.1 依赖声明

```json
{
  "dependencies": {
    "exceljs": "^4.4.0"
  }
}
```

**实际占用空间**: 23MB

### 1.2 使用位置

| 文件路径 | 用途 | 使用方式 |
|---------|------|---------|
| `src/lib/export/index.ts` | 核心导出工具类 | 动态导入 |
| `src/app/api/analytics/export/route.ts` | 分析数据导出 API | 动态导入 |
| `src/app/api/analytics/export/route.test.ts` | 单元测试 | Mock |
| `7zi-frontend/src/app/api/data/import/route.ts` | 数据导入 API | 仅注释提及 |

**注意**: 所有实际使用都采用**动态导入**（`import()`），已实现代码分割，不会影响初始包大小。

---

## 2. ExcelJS API 使用分析

### 2.1 核心导出工具 (`src/lib/export/index.ts`)

#### 使用的 ExcelJS API：

```typescript
// 1. 创建工作簿
const workbook = new ExcelJS.Workbook()

// 2. 添加工作表
const worksheet = workbook.addWorksheet(sheetName)

// 3. 添加行
const headerRow = worksheet.addRow(fields.map(f => f.label))
worksheet.addRow(values)

// 4. 单元格样式
headerRow.font = { bold: true }
headerRow.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE0E0E0' }
}

// 5. 列宽设置
column.width = field.width

// 6. 冻结行
worksheet.views = [{
  state: 'frozen',
  ySplit: excelOptions.freezeRows
}]

// 7. 自动筛选
worksheet.autoFilter = {
  from: { row: 1, column: 1 },
  to: { row: transformedData.length + 1, column: fields.length }
}

// 8. 写入缓冲区
const excelBuffer = await workbook.xlsx.writeBuffer()
```

#### 功能特性：

- ✅ 表头样式（粗体、灰色背景）
- ✅ 列宽自动计算
- ✅ 冻结表头行
- ✅ 自动筛选功能
- ✅ 多工作表导出
- ✅ 自定义字段格式化

### 2.2 分析导出 API (`src/app/api/analytics/export/route.ts`)

#### 使用的 ExcelJS API：

```typescript
// 1. 创建工作簿
const workbook = new ExcelJS.Workbook()

// 2. 添加工作表
const worksheet = workbook.addWorksheet(sheetName)

// 3. 添加行
const headerRow = worksheet.addRow(headers)
worksheet.addRow(values)

// 4. 表头样式
headerRow.font = { bold: true }
headerRow.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE0E0E0' }
}

// 5. 列宽自动调整
worksheet.columns.forEach((column, index) => {
  const maxLength = Math.max(...)
  column.width = Math.min(Math.max(maxLength, 10), 50)
})

// 6. 写入缓冲区
const buffer = await workbook.xlsx.writeBuffer()
```

---

## 3. ExcelJS vs XLSX (SheetJS) 功能对比

| 功能 | ExcelJS | XLSX (SheetJS) | 影响 |
|-----|---------|----------------|------|
| **基本读写** | ✅ | ✅ | 无影响 |
| **单元格样式** | ✅ 完整支持 | ❌ 不支持 | 🔴 高影响 |
| **字体样式** | ✅ | ❌ | 🔴 高影响 |
| **背景填充** | ✅ | ❌ | 🔴 高影响 |
| **列宽设置** | ✅ | ⚠️ 有限支持 | 🟡 中影响 |
| **冻结行/列** | ✅ | ❌ | 🔴 高影响 |
| **自动筛选** | ✅ | ❌ | 🔴 高影响 |
| **合并单元格** | ✅ | ❌ | 🟡 中影响 |
| **数据验证** | ✅ | ❌ | 🟡 中影响 |
| **图片插入** | ✅ | ❌ | 🟢 低影响（未使用） |
| **公式** | ✅ | ⚠️ 有限支持 | 🟢 低影响（未使用） |
| **包大小** | 23MB | ~300KB | ✅ 优势 |
| **性能** | 中等 | 快 | ✅ 优势 |

---

## 4. 迁移风险评估

### 4.1 高风险项 🔴

| 功能 | 当前使用 | 迁移影响 | 风险等级 |
|-----|---------|---------|---------|
| **表头样式** | 粗体 + 灰色背景 | 完全丢失 | 🔴 高 |
| **冻结表头** | 冻结第1行 | 完全丢失 | 🔴 高 |
| **自动筛选** | 启用筛选 | 完全丢失 | 🔴 高 |

**影响**：
- 导出的 Excel 文件将失去专业外观
- 用户体验下降（无法冻结表头、无法筛选）
- 可能需要向用户说明功能变更

### 4.2 中风险项 🟡

| 功能 | 当前使用 | 迁移影响 | 风险等级 |
|-----|---------|---------|---------|
| **列宽设置** | 自动计算列宽 | 需要使用 `!cols` 配置 | 🟡 中 |
| **多工作表** | 支持多工作表导出 | 需要重构代码 | 🟡 中 |

### 4.3 低风险项 🟢

| 功能 | 当前使用 | 迁移影响 | 风险等级 |
|-----|---------|---------|---------|
| **基本数据导出** | 行数据写入 | API 不同但功能相同 | 🟢 低 |
| **动态导入** | 已实现代码分割 | 需要调整导入方式 | 🟢 低 |

---

## 5. 迁移工作量评估

### 5.1 代码改动范围

| 文件 | 改动类型 | 预估工作量 |
|-----|---------|-----------|
| `src/lib/export/index.ts` | 重构导出逻辑 | 4-6 小时 |
| `src/app/api/analytics/export/route.ts` | 重构导出逻辑 | 2-3 小时 |
| `src/app/api/analytics/export/route.test.ts` | 更新 Mock | 1-2 小时 |
| `package.json` | 更新依赖 | 5 分钟 |
| **总计** | - | **7-11 小时** |

### 5.2 主要改动点

#### 1. 替换导入方式

```typescript
// 旧代码
const ExcelJS = await import('exceljs')
const workbook = new ExcelJS.Workbook()

// 新代码
const XLSX = await import('xlsx')
const workbook = XLSX.utils.book_new()
```

#### 2. 替换工作表操作

```typescript
// 旧代码
const worksheet = workbook.addWorksheet(sheetName)
worksheet.addRow(values)

// 新代码
const worksheet = XLSX.utils.json_to_sheet(data)
XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
```

#### 3. 移除样式相关代码

```typescript
// 需要删除的代码
headerRow.font = { bold: }
headerRow.fill = { ... }
worksheet.views = [{ state: 'frozen', ... }]
worksheet.autoFilter = { ... }
```

#### 4. 列宽设置（有限支持）

```typescript
// 新代码（有限支持）
worksheet['!cols'] = fields.map(f => ({ wch: f.width || 15 }))
```

---

## 6. 迁移建议

### 6.1 不建议迁移 ❌

**理由**：

1. **功能损失严重**
   - 表头样式、冻结行、自动筛选等核心功能将完全丢失
   - 导出的 Excel 文件专业度大幅下降

2. **用户体验下降**
   - 用户无法冻结表头查看大量数据
   - 无法使用筛选功能快速定位数据
   - 可能收到用户投诉

3. **节省空间有限**
   - 当前已使用动态导入，不影响初始包大小
   - 23MB 仅在需要导出 Excel 时加载
   - 对于服务器端 API，包大小影响较小

4. **迁移成本高**
   - 需要 7-11 小时的开发时间
   - 需要更新测试代码
   - 需要向用户说明功能变更

### 6.2 如果必须迁移，建议方案 ⚠️

如果由于特殊原因必须迁移（如严格的包大小限制），建议：

#### 方案 A：保留 ExcelJS，优化使用

1. **确认动态导入生效**
   ```typescript
   // 确保使用 webpackChunkName
   const ExcelJS = await import(
     /* webpackChunkName: "exceljs" */
     'exceljs'
   )
   ```

2. **检查打包配置**
   - 验证 Next.js 的代码分割是否正确
   - 确认 exceljs 被正确分离到独立 chunk

3. **考虑 CDN 加载**
   - 对于客户端导出，可考虑从 CDN 加载
   - 减少服务器端包大小

#### 方案 B：混合方案（推荐）

1. **保留 ExcelJS 用于需要样式的导出**
   - 分析数据导出（需要样式）
   - 用户报告导出（需要样式）

2. **使用 XLSX 用于简单数据导出**
   - 后台数据导出（不需要样式）
   - API 数据交换（纯数据）

3. **根据场景选择库**
   ```typescript
   async function exportExcel(data, options) {
     if (options.needsStyling) {
       return exportWithExcelJS(data, options)
     } else {
       return exportWithXLSX(data, options)
     }
   }
   ```

#### 方案 C：完全迁移到 XLSX（不推荐）

如果必须完全迁移，需要：

1. **接受功能损失**
   - 移除所有样式相关代码
   - 移除冻结行、自动筛选功能
   - 更新用户文档说明

2. **提供替代方案**
   - 建议用户使用 Excel 的格式化功能
   - 提供 CSV 导出作为替代

3. **用户沟通**
   - 发布迁移公告
   - 说明功能变更原因
   - 收集用户反馈

---

## 7. 其他优化建议

### 7.1 包大小优化（不迁移）

1. **Tree Shaking**
   - 检查是否有未使用的 exceljs 功能
   - 配置 webpack/vite 进行更激进的 tree shaking

2. **按需加载**
   - 确认动态导入配置正确
   - 检查 Next.js 的 chunk 分离

3. **服务器端渲染**
   - Excel 导出在服务器端执行
   - 客户端包大小不受影响

### 7.2 性能优化

1. **流式导出**
   - 对于大数据集，考虑流式写入
   - 避免内存溢出

2. **缓存机制**
   - 缓存常用导出结果
   - 减少重复计算

3. **异步处理**
   - 对于大文件导出，使用后台任务
   - 提供下载链接而非直接返回

---

## 8. 结论

### 8.1 最终建议

**不建议从 ExcelJS 迁移到 XLSX**

**核心原因**：
1. 功能损失严重（样式、冻结、筛选）
2. 用户体验下降
3. 当前已使用动态导入，包大小影响有限
4. 迁移成本高（7-11 小时）

### 8.2 推荐行动

1. **保持现状**
   - 继续使用 ExcelJS
   - 确认动态导入配置正确

2. **优化现有实现**
   - 检查打包配置
   - 验证代码分割效果
   - 考虑 CDN 加载（如适用）

3. **监控包大小**
   - 定期检查打包输出
   - 关注实际加载性能

### 8.3 长期考虑

如果未来包大小成为严重问题，可以考虑：

1. **混合方案**：根据场景选择库
2. **服务端导出**：将 Excel 生成完全移到服务端
3. **替代格式**：推广 CSV/JSON 导出

---

## 9. 附录

### 9.1 ExcelJS 动态导入示例

```typescript
// 正确的动态导入方式
const ExcelJS = await import(
  /* webpackChunkName: "exceljs" */
  'exceljs'
)
const workbook = new ExcelJS.Workbook()
```

### 9.2 XLSX 基本用法示例

```typescript
import XLSX from 'xlsx'

// 创建工作簿
const workbook = XLSX.utils.book_new()

// 创建工作表
const worksheet = XLSX.utils.json_to_sheet(data)

// 添加工作表
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

// 写入文件
XLSX.writeFile(workbook, 'output.xlsx')

// 或写入缓冲区
const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
```

### 9.3 相关资源

- ExcelJS 文档: https://github.com/exceljs/exceljs
- XLSX (SheetJS) 文档: https://github.com/SheetJS/sheetjs
- Next.js 代码分割: https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading

---

**报告结束**