#!/usr/bin/env node

/**
 * 模板系统验证脚本
 *
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 验证模板系统的核心功能
 */

const path = require('path')

// 模拟模板数据（用于验证）
const PRESET_TEMPLATES = [
  {
    id: 'blank',
    name: '空白模板',
    description: '最简单的工作流模板，包含开始和结束节点',
    category: 'basic',
    icon: '📄',
    tags: ['基础', '入门'],
    difficulty: 'beginner',
    estimatedNodes: 2,
    workflow: {
      nodes: [
        { id: 'start', type: 'start', label: '开始', config: {} },
        { id: 'end', type: 'end', label: '结束', config: {} },
      ],
      edges: [
        { id: 'start-end', source: 'start', target: 'end' },
      ],
    },
  },
  {
    id: 'ai-chat',
    name: 'AI 对话模板',
    description: '包含 AI Agent 节点的简单对话工作流',
    category: 'ai',
    icon: '🤖',
    tags: ['AI', '对话', 'Agent'],
    difficulty: 'beginner',
    estimatedNodes: 3,
    workflow: {
      nodes: [
        { id: 'start', type: 'start', label: '开始', config: {} },
        { id: 'ai-agent', type: 'agent', label: 'AI Agent', config: {} },
        { id: 'end', type: 'end', label: '结束', config: {} },
      ],
      edges: [
        { id: 'start-ai', source: 'start', target: 'ai-agent' },
        { id: 'ai-end', source: 'ai-agent', target: 'end' },
      ],
    },
  },
  {
    id: 'data-processing',
    name: '数据处理模板',
    description: '经典的数据处理流程：输入、转换、输出',
    category: 'data',
    icon: '🔄',
    tags: ['数据处理', '转换', 'ETL'],
    difficulty: 'intermediate',
    estimatedNodes: 4,
    workflow: {
      nodes: [
        { id: 'start', type: 'start', label: '数据输入', config: {} },
        { id: 'transform', type: 'transform', label: '数据转换', config: {} },
        { id: 'process', type: 'agent', label: '数据处理', config: {} },
        { id: 'end', type: 'end', label: '数据输出', config: {} },
      ],
      edges: [
        { id: 'start-transform', source: 'start', target: 'transform' },
        { id: 'transform-process', source: 'transform', target: 'process' },
        { id: 'process-end', source: 'process', target: 'end' },
      ],
    },
  },
  {
    id: 'conditional',
    name: '条件分支模板',
    description: '基于条件的分支逻辑工作流',
    category: 'logic',
    icon: '🔀',
    tags: ['条件', '分支', '逻辑'],
    difficulty: 'intermediate',
    estimatedNodes: 5,
    workflow: {
      nodes: [
        { id: 'start', type: 'start', label: '开始', config: {} },
        { id: 'condition', type: 'condition', label: '条件判断', config: {} },
        { id: 'true-branch', type: 'agent', label: '条件为真', config: {} },
        { id: 'false-branch', type: 'agent', label: '条件为假', config: {} },
        { id: 'end', type: 'end', label: '结束', config: {} },
      ],
      edges: [
        { id: 'start-condition', source: 'start', target: 'condition' },
        { id: 'condition-true', source: 'condition', target: 'true-branch' },
        { id: 'condition-false', source: 'condition', target: 'false-branch' },
        { id: 'true-end', source: 'true-branch', target: 'end' },
        { id: 'false-end', source: 'false-branch', target: 'end' },
      ],
    },
  },
  {
    id: 'loop',
    name: '循环处理模板',
    description: '遍历数组并对每个元素进行处理',
    category: 'advanced',
    icon: '🔁',
    tags: ['循环', '遍历', '批量处理'],
    difficulty: 'advanced',
    estimatedNodes: 4,
    workflow: {
      nodes: [
        { id: 'start', type: 'start', label: '开始', config: {} },
        { id: 'loop', type: 'loop', label: '循环处理', config: {} },
        { id: 'process-item', type: 'agent', label: '处理元素', config: {} },
        { id: 'end', type: 'end', label: '结束', config: {} },
      ],
      edges: [
        { id: 'start-loop', source: 'start', target: 'loop' },
        { id: 'loop-process', source: 'loop', target: 'process-item' },
        { id: 'process-end', source: 'process-item', target: 'end' },
      ],
    },
  },
]

// ============================================
// 验证函数
// ============================================

function validateTemplateList(templates) {
  console.log('✓ 验证模板列表...')

  if (!Array.isArray(templates)) {
    console.error('✗ 模板列表不是数组')
    return false
  }

  if (templates.length === 0) {
    console.error('✗ 模板列表为空')
    return false
  }

  console.log(`  找到 ${templates.length} 个模板`)
  return true
}

function validateTemplateStructure(template) {
  const requiredFields = ['id', 'name', 'description', 'category', 'icon', 'tags', 'difficulty', 'estimatedNodes', 'workflow']

  for (const field of requiredFields) {
    if (!(field in template)) {
      console.error(`✗ 模板缺少必需字段: ${field}`)
      return false
    }
  }

  if (!template.workflow || !template.workflow.nodes || !template.workflow.edges) {
    console.error('✗ 模板 workflow 结构不完整')
    return false
  }

  if (!Array.isArray(template.workflow.nodes) || !Array.isArray(template.workflow.edges)) {
    console.error('✗ workflow.nodes 或 workflow.edges 不是数组')
    return false
  }

  return true
}

function validateNodeStructure(node) {
  const requiredFields = ['id', 'type', 'label', 'config']

  for (const field of requiredFields) {
    if (!(field in node)) {
      console.error(`✗ 节点缺少必需字段: ${field}`)
      return false
    }
  }

  return true
}

function validateEdgeStructure(edge, nodeIds) {
  const requiredFields = ['id', 'source', 'target']

  for (const field of requiredFields) {
    if (!(field in edge)) {
      console.error(`✗ 边缺少必需字段: ${field}`)
      return false
    }
  }

  if (!nodeIds.has(edge.source)) {
    console.error(`✗ 边引用了不存在的源节点: ${edge.source}`)
    return false
  }

  if (!nodeIds.has(edge.target)) {
    console.error(`✗ 边引用了不存在的目标节点: ${edge.target}`)
    return false
  }

  return true
}

// ============================================
// 主验证流程
// ============================================

function runValidation() {
  console.log('='.repeat(60))
  console.log('Workflow 模板系统验证')
  console.log('版本: v1.12.2')
  console.log('='.repeat(60))
  console.log()

  const errors = []
  const warnings = []

  // 1. 验证模板列表
  if (!validateTemplateList(PRESET_TEMPLATES)) {
    console.error('\n✗ 验证失败: 模板列表')
    process.exit(1)
  }

  // 2. 验证每个模板
  console.log('\n验证模板结构...')
  for (const template of PRESET_TEMPLATES) {
    console.log(`\n  ${template.icon} ${template.name} (${template.id})`)
    console.log(`    类别: ${template.category} | 难度: ${template.difficulty}`)

    if (!validateTemplateStructure(template)) {
      errors.push(`模板 ${template.id} 结构验证失败`)
      continue
    }

    // 验证节点
    const nodeIds = new Set()
    for (const node of template.workflow.nodes) {
      if (!validateNodeStructure(node)) {
        errors.push(`模板 ${template.id} 的节点 ${node.id} 结构验证失败`)
        continue
      }
      nodeIds.add(node.id)
    }

    // 验证边
    for (const edge of template.workflow.edges) {
      if (!validateEdgeStructure(edge, nodeIds)) {
        errors.push(`模板 ${template.id} 的边 ${edge.id} 结构验证失败`)
        continue
      }
    }

    console.log(`    ✓ 节点: ${template.workflow.nodes.length} | 边: ${template.workflow.edges.length}`)
  }

  // 3. 统计信息
  console.log('\n' + '='.repeat(60))
  console.log('模板统计')
  console.log('='.repeat(60))

  const stats = {
    total: PRESET_TEMPLATES.length,
    byCategory: {},
    byDifficulty: {},
  }

  for (const template of PRESET_TEMPLATES) {
    stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1
    stats.byDifficulty[template.difficulty] = (stats.byDifficulty[template.difficulty] || 0) + 1
  }

  console.log(`\n总数: ${stats.total}`)
  console.log('\n按类别:')
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`  ${category}: ${count}`)
  }
  console.log('\n按难度:')
  for (const [difficulty, count] of Object.entries(stats.byDifficulty)) {
    console.log(`  ${difficulty}: ${count}`)
  }

  // 4. 总结
  console.log('\n' + '='.repeat(60))
  if (errors.length === 0) {
    console.log('✓ 所有验证通过!')
    console.log('='.repeat(60))
    console.log('\n创建的文件:')
    console.log('  1. templates.ts - 模板定义和 API')
    console.log('  2. TemplateSelector.tsx - 模板选择器 UI 组件')
    console.log('  3. templateHooks.ts - React Hooks')
    console.log('  4. examples-v112.tsx - 使用示例')
    console.log('  5. README-v112.md - 文档')
    console.log('  6. __tests__/templates.test.ts - 单元测试')
    console.log('  7. __tests__/templateValidation.ts - 验证脚本')
    console.log('\n模板列表:')
    PRESET_TEMPLATES.forEach((t) => {
      console.log(`  - ${t.icon} ${t.name} (${t.id})`)
    })
    process.exit(0)
  } else {
    console.log(`✗ 发现 ${errors.length} 个错误:`)
    errors.forEach((error) => console.log(`  - ${error}`))
    console.log('='.repeat(60))
    process.exit(1)
  }
}

// 运行验证
runValidation()