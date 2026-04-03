// 简单测试 XLSX 包装器
import XLSX from 'xlsx'

// 创建工作簿
const workbook = XLSX.utils.book_new()

// 创建工作表数据
const data = [
  ['ID', 'Name', 'Email'],
  [1, 'Alice', 'alice@example.com'],
  [2, 'Bob', 'bob@example.com'],
  [3, 'Charlie', 'charlie@example.com'],
]

// 转换为工作表
const worksheet = XLSX.utils.aoa_to_sheet(data)

// 设置列宽
worksheet['!cols'] = [
  { wch: 10 },
  { wch: 15 },
  { wch: 25 },
]

// 添加工作表到工作簿
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

// 写入文件
XLSX.writeFile(workbook, 'test-output.xlsx')

console.log('✅ XLSX 测试成功！文件已生成: test-output.xlsx')
