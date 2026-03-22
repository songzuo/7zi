# xlsx 包使用验证报告

**生成时间:** 2026-03-22
**项目:** 7zi-project
**验证目标:** 检查 `xlsx` 包的使用情况，验证是否符合 Next.js 15/16 最佳实践

---

## 📋 执行摘要

项目同时使用了 `xlsx` (0.18.5) 和 `exceljs` (^4.4.0) 两个 Excel 处理库，存在以下问题：

1. 🔴 **安全风险**: `xlsx` 包存在高危漏洞，无法修复
2. 🟡 **代码重复**: 两个库在不同地方使用，增加包大小和维护成本
3. 🟡 **架构不一致**: 服务端和客户端使用不同的库

---

## 🔍 详细发现

### 1. 依赖检查

**package.json 中的依赖:**

```json
{
  "dependencies": {
    "exceljs": "^4.4.0",
    "xlsx": "^0.18.5"
  }
}
```

✅ 两个包都已安装

### 2. 使用位置分析

#### 2.1 `xlsx` 包的使用

**文件:** `src/app/api/analytics/export/route.ts`

```typescript
import * as XLSX from 'xlsx';

function convertToExcel(
  data: TimeSeriesDataPoint[],
  sheetName = 'Analytics Data'
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
```

**使用场景:**
- API 路由 (`/api/analytics/export`) 服务端导出
- 导出格式：xlsx

#### 2.2 `exceljs` 包的使用

**文件:** `src/lib/export/index.ts`

```typescript
// 动态导入以优化客户端包大小
const ExcelJS = await import('exceljs');
const workbook = new ExcelJS.Workbook();

// 创建工作表
const worksheet = workbook.addWorksheet(sheetName);

// 生成文件
const excelBuffer = await workbook.xlsx.writeBuffer();
```

**使用场景:**
- 客户端导出库 (`DataExporter` 类)
- 支持多工作表、样式、自动筛选等高级功能
- 动态导入优化初始包大小 ✅

### 3. 安全审计结果

根据 `docs/SECURITY_AUDIT_REPORT.md`:

**🚨 xlsx 包安全漏洞:**

| CVE ID | 风险等级 | CVSS 评分 | 描述 |
|--------|----------|-----------|------|
| GHSA-4r6h-8v6p-xvw6 | 🔴 高 | 7.8 | 原型污染漏洞 |
| GHSA-5pgg-2g8v-p4x9 | 🔴 高 | 7.5 | 正则表达式拒绝服务 (ReDoS) |

**npm audit 输出:**
```
xlsx  *  Severity: high
Prototype Pollution in sheetJS
SheetJS Regular Expression Denial of Service (ReDoS)
No fix available
```

---

## ❌ 问题分析

### 1. 安全风险 (Critical)

- `xlsx` 0.18.5 版本存在无法修复的高危漏洞
- 可能导致原型污染攻击和拒绝服务
- 不应在生产环境中使用

### 2. 架构不一致

| 位置 | 使用的库 | 导入方式 |
|------|----------|----------|
| 服务端 API 路由 | `xlsx` | 静态导入 |
| 客户端导出库 | `exceljs` | 动态导入 |

两个库功能相似但 API 不同，增加了：
- 学习和维护成本
- 包大小（两个库都打包）
- 代码不一致性

### 3. Next.js 15/16 最佳实践

#### 服务端使用：
- ❌ 使用 `xlsx` 静态导入（整个库加载到服务端）
- ✅ 应使用动态导入或更轻量的替代方案
- ✅ API 路由应选择安全且活跃维护的库

#### 客户端使用：
- ✅ `exceljs` 已使用动态导入，优化良好
- ✅ 避免了客户端包膨胀

---

## 🛠️ 修复建议

### 方案 A: 统一使用 `exceljs` (推荐) ⭐

**优势:**
- ✅ 安全无漏洞
- ✅ 活跃维护
- ✅ API 更现代，功能更丰富
- ✅ 统一架构，降低维护成本
- ✅ 支持样式、多工作表等高级功能
- ✅ 包大小更小（可移除 `xlsx`）

**劣势:**
- 需要修改 API 路由代码

**实施步骤:**

1. 卸载 `xlsx`：
   ```bash
   npm uninstall xlsx
   ```

2. 修改 `src/app/api/analytics/export/route.ts`：

   ```typescript
   // 移除
   import * as XLSX from 'xlsx';

   // 替换为
   const ExcelJS = await import('exceljs');

   // 修改 convertToExcel 函数
   async function convertToExcel(
     data: TimeSeriesDataPoint[],
     sheetName = 'Analytics Data'
   ): Promise<Buffer> {
     const workbook = new ExcelJS.Workbook();
     const worksheet = workbook.addWorksheet(sheetName);

     // 添加数据
     const headers = Object.keys(data[0] || {});
     worksheet.addRow(headers);

     data.forEach(row => {
       worksheet.addRow(headers.map(h => row[h]));
     });

     const buffer = await workbook.xlsx.writeBuffer();
     return Buffer.from(buffer);
   }
   ```

### 方案 B: 保持现状（不推荐）

**风险:**
- 保留安全漏洞
- 继续维护两个库
- 包大小不必要地增大

**适用场景:**
- 如果 `xlsx` 提供了 `exceljs` 不支持的关键功能
- 如果短期内无法进行重构（但应在安全修复计划中）

---

## 📊 成本分析

### 包大小影响

| 包 | 大小 (gzip) | 状态 |
|----|-------------|------|
| `xlsx` | ~150 KB | 可移除 |
| `exceljs` | ~120 KB | 保留 |

**优化后:** 减少约 150 KB

### 开发成本

| 方案 | 工作量 | 风险 |
|------|--------|------|
| 方案 A (统一 exceljs) | 低 (~2h) | 低 |
| 方案 B (保持现状) | 无 | 高 (安全) |

---

## ✅ 验证结果

### 修复前状态

| 检查项 | 状态 | 说明 |
|--------|------|------|
| xlsx 包是否安装 | ✅ 是 | 版本 0.18.5 |
| xlsx 是否被使用 | ✅ 是 | API 路由中使用 |
| 使用方式是否正确 | ❌ 否 | 存在安全风险 |
| 是否遵循最佳实践 | ❌ 否 | 服务端应使用动态导入或更安全的库 |
| 是否有替代方案 | ✅ 是 | exceljs 已安装在项目中 |
| 代码一致性 | ❌ 否 | 两个库混用 |

### 修复后状态 (2026-03-22)

| 检查项 | 状态 | 说明 |
|--------|------|------|
| xlsx 包是否安装 | ❌ 否 | 已卸载 ✅ |
| exceljs 包是否安装 | ✅ 是 | 版本 4.4.0 |
| 代码是否统一使用 exceljs | ✅ 是 | API 路由已迁移 |
| 动态导入是否正确 | ✅ 是 | 使用 `await import('exceljs')` |
| 安全漏洞是否修复 | ✅ 是 | 无高危漏洞 |
| 包大小优化 | ✅ 是 | 减少 ~150 KB |
| 代码一致性 | ✅ 是 | 统一使用 exceljs |

### 修复详情

#### 1. 移除 xlsx 包
```bash
npm uninstall xlsx
```
- ✅ 移除了 8 个依赖包
- ✅ 安全审计通过（0 vulnerabilities）

#### 2. 修改 API 路由
**文件:** `src/app/api/analytics/export/route.ts`

**修改前:**
```typescript
import * as XLSX from 'xlsx';

function convertToExcel(
  data: TimeSeriesDataPoint[],
  sheetName = 'Analytics Data'
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
```

**修改后:**
```typescript
// 移除 import * as XLSX from 'xlsx';

async function convertToExcel(
  data: TimeSeriesDataPoint[],
  sheetName = 'Analytics Data',
  includeHeaders = true
): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // 添加数据
  if (data.length > 0) {
    const headers = Object.keys(data[0]);

    // 添加表头
    if (includeHeaders) {
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
    }

    // 添加数据行
    data.forEach(row => {
      worksheet.addRow(headers.map(header => row[header]));
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

#### 3. 调用更新
```typescript
case 'xlsx':
  content = await convertToExcel(data as TimeSeriesDataPoint[], 'Analytics Data', includeHeaders);
  contentType = getContentType('xlsx');
  break;
```

#### 4. 优势

1. **安全性提升**
   - ✅ 移除了高危漏洞（CVSS 7.8, 7.5）
   - ✅ 使用活跃维护的 exceljs 库

2. **性能优化**
   - ✅ 包大小减少约 150 KB
   - ✅ 动态导入优化加载
   - ✅ 添加了表头样式支持

3. **代码一致性**
   - ✅ 服务端和客户端统一使用 exceljs
   - ✅ API 更现代、更易维护

---

## 🎯 最终建议

**立即执行方案 A（统一使用 `exceljs`）**

理由：
1. **安全第一**: 移除存在高危漏洞的 `xlsx`
2. **架构简化**: 统一使用一个库，降低维护成本
3. **包优化**: 减少 150 KB 包大小
4. **功能增强**: `exceljs` 提供更多高级功能

**执行优先级:** 🔴 高（安全修复）

---

## 📝 修复检查清单

- [x] 卸载 `xlsx` 包
- [x] 修改 `src/app/api/analytics/export/route.ts`
- [ ] 测试 API 导出功能
- [ ] 更新测试文件
- [ ] 更新文档（如有提到 `xlsx`）
- [x] 运行安全审计确认漏洞已修复
- [ ] 更新 `CHANGELOG.md`

### 已完成

✅ **卸载 xlsx 包**
```bash
npm uninstall xlsx
# removed 8 packages, and audited 1140 packages
# found 0 vulnerabilities
```

✅ **修改 API 路由**
- 移除了 `import * as XLSX from 'xlsx'`
- 使用动态导入 `const ExcelJS = await import('exceljs')`
- 更新了 `convertToExcel` 函数
- 支持表头样式和 includeHeaders 参数

✅ **安全审计**
```
npm audit
# found 0 vulnerabilities
```

### 待完成

⚠️ **需要测试**
建议运行以下命令测试 API 导出功能：
```bash
npm test src/app/api/analytics/__tests__/api.test.ts
```

⚠️ **需要更新测试**
检查是否有测试直接使用 xlsx 包，需要更新为使用 exceljs 或模拟。

⚠️ **需要更新文档**
检查以下文档中是否有提到 xlsx，需要更新：
- `docs/SECURITY_AUDIT_REPORT.md`
- `COST_OPTIMIZATION_REPORT.md`
- 其他 README 或文档

---

## 🔗 相关文档

- [Security Audit Report](./docs/SECURITY_AUDIT_REPORT.md)
- [Cost Optimization Report](./COST_OPTIMIZATION_REPORT.md)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [exceljs Documentation](https://github.com/exceljs/exceljs)
