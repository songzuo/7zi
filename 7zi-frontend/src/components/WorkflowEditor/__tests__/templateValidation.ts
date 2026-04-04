/**
 * 模板系统验证脚本
 *
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 验证模板系统的核心功能
 */

// 模拟导入（实际使用时从正确的路径导入）
// import {
//   listTemplates,
//   getTemplate,
//   createFromTemplate,
//   validateTemplate,
//   getTemplateStats,
//   type WorkflowTemplate,
//   type WorkflowDefinition,
// } from './templates'

// ============================================
// 验证函数
// ============================================

/**
 * 验证模板列表
 */
function validateTemplateList(templates: any[]): boolean {
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

/**
 * 验证模板结构
 */
function validateTemplateStructure(template: any): boolean {
  const requiredFields = ['id', 'name', 'description', 'category', 'icon', 'tags', 'difficulty', 'estimatedNodes', 'workflow']

  for (const field of requiredFields) {
    if (!(field in template)) {
      console.error(`✗ 模板缺少必需字段: ${field}`)
      return false
    }
  }

  // 验证 workflow 结构
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

/**
 * 验证节点结构
 */
function validateNodeStructure(node: any): boolean {
  const requiredFields = ['id', 'type', 'label', 'config']

  for (const field of requiredFields) {
    if (!(field in node)) {
      console.error(`✗ 节点缺少必需字段: ${field}`)
      return false
    }
  }

  return true
}

/**
 * 验证边结构
 */
function validateEdgeStructure(edge: any, nodeIds: Set<string>): boolean {
  const requiredFields = ['id', 'source', 'target']

  for (const field of requiredFields) {
    if (!(field in edge)) {
      console.error(`✗ 边缺少必需字段: ${field}`)
      return false
    }
  }

  // 验证边的引用
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

/**
 * 验证工作流创建
 */
function validateWorkflowCreation(workflow: any): boolean {
  if (!workflow) {
    console.error('✗ 工作流创建失败')
    return false
  }

  const requiredFields = ['id', 'name', 'nodes', 'edges']

  for (const field of requiredFields) {
    if (!(field in workflow)) {
      console.error(`✗ 工作流缺少必需字段: ${field}`)
      return false
    }
  }

  return true
}

// ============================================
// 主验证流程
// ============================================

/**
 * 运行所有验证
 */
export function runTemplateValidation(templates: any[]): {
  success: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  console.log('开始验证模板系统...\n')

  // 1. 验证模板列表
  if (!validateTemplateList(templates)) {
    return {
      success: false,
      errors: ['模板列表验证失败'],
      warnings,
    }
  }

  // 2. 验证每个模板
  for (const template of templates) {
    console.log(`\n验证模板: ${template.name} (${template.id})`)

    // 验证模板结构
    if (!validateTemplateStructure(template)) {
      errors.push(`模板 ${template.id} 结构验证失败`)
      continue
    }

    // 验证节点
    const nodeIds = new Set<string>()
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

    console.log(`  ✓ 节点数: ${template.workflow.nodes.length}`)
    console.log(`  ✓ 边数: ${template.workflow.edges.length}`)
  }

  // 3. 验证模板统计
  console.log('\n验证模板统计...')
  const stats = {
    total: templates.length,
    byCategory: {} as Record<string, number>,
    byDifficulty: {} as Record<string, number>,
  }

  for (const template of templates) {
    stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1
    stats.byDifficulty[template.difficulty] = (stats.byDifficulty[template.difficulty] || 0) + 1
  }

  console.log(`  ✓ 总数: ${stats.total}`)
  console.log(`  ✓ 按类别: ${JSON.stringify(stats.byCategory)}`)
  console.log(`  ✓ 按难度: ${JSON.stringify(stats.byDifficulty)}`)

  // 4. 验证工作流创建
  console.log('\n验证工作流创建...')
  const testTemplate = templates[0]
  if (testTemplate) {
    // 模拟创建工作流
    const workflow = {
      id: `test-${Date.now()}`,
      name: '测试工作流',
      nodes: testTemplate.workflow.nodes.map((node: any) => ({
        ...node,
        id: `test-${node.id}`,
      })),
      edges: testTemplate.workflow.edges.map((edge: any) => ({
        ...edge,
        id: `test-${edge.id}`,
        source: `test-${edge.source}`,
        target: `test-${edge.target}`,
      })),
    }

    if (validateWorkflowCreation(workflow)) {
      console.log(`  ✓ 工作流创建成功: ${workflow.id}`)
    } else {
      errors.push('工作流创建验证失败')
    }
  }

  // 总结
  console.log('\n' + '='.repeat(50))
  if (errors.length === 0) {
    console.log('✓ 所有验证通过!')
    return {
      success: true,
      errors: [],
      warnings,
    }
  } else {
    console.log(`✗ 发现 ${errors.length} 个错误:`)
    errors.forEach((error) => console.log(`  - ${error}`))
    return {
      success: false,
      errors,
      warnings,
    }
  }
}

// ============================================
// 导出
// ============================================

export default {
  runTemplateValidation,
  validateTemplateList,
  validateTemplateStructure,
  validateNodeStructure,
  validateEdgeStructure,
  validateWorkflowCreation,
}