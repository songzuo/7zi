/**
 * @fileoverview 搜索功能的测试文件
 * @description 测试模糊匹配、拼音搜索、相关性评分等新功能
 */

import { searchItems, highlightSearchTerm } from './search-filter'
import type { SearchConfig } from '@/types/search-filter'

// ============================================================================
// 测试数据
// ============================================================================

interface TestItem {
  id: number
  title: string
  description: string
  status: string
  priority: string
}

const testItems: TestItem[] = [
  {
    id: 1,
    title: '任务管理系统',
    description: '这是一个完整的任务管理平台开发项目',
    status: '进行中',
    priority: '高',
  },
  {
    id: 2,
    title: '搜索功能优化',
    description: '增强搜索算法，添加模糊匹配和拼音支持',
    status: '进行中',
    priority: '中',
  },
  {
    id: 3,
    title: 'Search Feature Enhancement',
    description: 'Enhance search algorithm with fuzzy matching',
    status: 'todo',
    priority: 'low',
  },
  {
    id: 4,
    title: '用户界面设计',
    description: '设计现代化、响应式的用户界面',
    status: '已完成',
    priority: '高',
  },
  {
    id: 5,
    title: 'Yonghu Jiemian Sheji',
    description: 'Design modern and responsive user interface',
    status: 'completed',
    priority: 'high',
  },
]

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试基本搜索
 */
function testBasicSearch(): void {
  if (process.env.NODE_ENV === 'production') return
  console.log('\n=== 基本搜索测试 ===')
  const results = searchItems(testItems, '搜索')
  console.log(`查询: "搜索", 结果数: ${results.length}`)
  results.forEach((r, i) => {
    console.log(`${i + 1}. [${r.item.title}] (分数: ${r.score.toFixed(2)})`)
  })
}

/**
 * 测试模糊匹配
 */
function testFuzzySearch(): void {
  if (process.env.NODE_ENV === 'production') return
  console.log('\n=== 模糊匹配测试 ===')

  // 测试拼写错误
  const config: SearchConfig = {
    target: 'all',
    fuzzyMatch: true,
    fuzzyThreshold: 1,
  }

  const queries = ['搜素', 'seach', '任务管理', 'renwu'] // 包含拼写错误的查询

  queries.forEach(query => {
    const results = searchItems(testItems, query, config)
    console.log(`\n查询: "${query}" (模糊匹配), 结果数: ${results.length}`)
    results.forEach((r, i) => {
      console.log(`${i + 1}. [${r.item.title}] (分数: ${r.score.toFixed(2)})`)
    })
  })
}

/**
 * 测试拼音匹配
 */
function testPinyinSearch(): void {
  if (process.env.NODE_ENV === 'production') return
  console.log('\n=== 拼音匹配测试 ===')

  const config: SearchConfig = {
    target: 'all',
    pinyinMatch: true,
  }

  const queries = ['renwu', 'sousuo', 'youxian', 'yonghu'] // 拼音查询

  queries.forEach(query => {
    const results = searchItems(testItems, query, config)
    console.log(`\n查询: "${query}" (拼音匹配), 结果数: ${results.length}`)
    results.forEach((r, i) => {
      console.log(`${i + 1}. [${r.item.title}] (分数: ${r.score.toFixed(2)})`)
    })
  })
}

/**
 * 测试权重排序
 */
function testWeightedSearch(): void {
  if (process.env.NODE_ENV === 'production') return
  console.log('\n=== 权重排序测试 ===')

  const config: SearchConfig = {
    target: 'all',
    fuzzyMatch: true,
    fieldWeights: {
      title: 2.0, // 标题权重更高
      description: 1.0,
      status: 0.5,
      priority: 0.5,
    },
  }

  const query = '设计'
  const results = searchItems(testItems, query, config)
  console.log(`查询: "${query}" (标题权重2.0, 描述权重1.0), 结果数: ${results.length}`)
  results.forEach((r, i) => {
    console.log(
      `${i + 1}. [${r.item.title}] (分数: ${r.score.toFixed(2)}, 匹配字段: ${r.matchedFields.join(', ')})`
    )
  })
}

/**
 * 测试综合搜索（模糊+拼音+权重）
 */
function testCombinedSearch(): void {
  if (process.env.NODE_ENV === 'production') return
  console.log('\n=== 综合搜索测试 ===')

  const config: SearchConfig = {
    target: 'all',
    fuzzyMatch: true,
    fuzzyThreshold: 2,
    pinyinMatch: true,
    fieldWeights: {
      title: 2.0,
      description: 1.0,
      status: 0.5,
      priority: 0.5,
    },
    minScore: 0.5,
    includeHighlights: true,
  }

  const query = 'sousuo' // 拼音 + 拼写错误
  const results = searchItems(testItems, query, config)
  console.log(`查询: "${query}" (综合配置), 结果数: ${results.length}`)
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. [${r.item.title}]`)
    console.log(`   分数: ${r.score.toFixed(2)}`)
    console.log(`   匹配字段: ${r.matchedFields.join(', ')}`)
    console.log(`   高亮: ${r.highlights.length} 处`)
    r.highlights.forEach(h => {
      console.log(`     - ${h.field}: "${h.text}" [${h.start}-${h.end}]`)
    })
  })
}

/**
 * 测试高亮功能
 */
function testHighlight(): void {
  if (process.env.NODE_ENV === 'production') return
  console.log('\n=== 高亮功能测试 ===')

  const texts = ['任务管理系统', 'Search Feature Enhancement', '增强搜索算法']

  const queries = ['任务', 'search', 'sousuo']

  texts.forEach(text => {
    console.log(`\n原文: "${text}"`)

    queries.forEach(query => {
      const highlighted = highlightSearchTerm(text, query, {
        fuzzyMatch: true,
        pinyinMatch: true,
      })
      console.log(`  查询 "${query}": ${highlighted}`)
    })
  })
}

/**
 * 测试向后兼容性
 */
function testBackwardCompatibility(): void {
  if (process.env.NODE_ENV === 'production') return
  console.log('\n=== 向后兼容性测试 ===')

  // 不提供任何配置，使用默认值
  const results = searchItems(testItems, '搜索')

  console.log(`使用默认配置查询 "搜索": 结果数 ${results.length}`)
  results.forEach((r, i) => {
    console.log(`${i + 1}. [${r.item.title}] (分数: ${r.score.toFixed(2)})`)
  })

  // 旧版配置风格
  const oldConfig: SearchConfig = {
    target: 'all',
    caseSensitive: false,
    exactMatch: false,
    fields: ['title', 'description'],
  }

  const oldResults = searchItems(testItems, '搜索', oldConfig)
  console.log(`\n使用旧版配置风格: 结果数 ${oldResults.length}`)
}

// ============================================================================
// 运行所有测试
// ============================================================================

export function runAllTests(): void {
  if (process.env.NODE_ENV === 'production') return
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║       搜索功能增强测试套件                                  ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  testBasicSearch()
  testFuzzySearch()
  testPinyinSearch()
  testWeightedSearch()
  testCombinedSearch()
  testHighlight()
  testBackwardCompatibility()

  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║       所有测试完成                                          ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAllTests()
}
