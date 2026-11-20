/**
 * 工作流自动化系统使用示例
 *
 * 本文件演示了如何使用工作流自动化系统的各个组件
 */

import {
  WorkflowDSLParser,
  DSLFormat,
  createExampleWorkflowDSL,
} from '@/lib/workflow/dsl'
import {
  TriggerManager,
  TriggerType,
  TriggerStatus,
  type TriggerDefinition,
} from '@/lib/workflow/triggers'
import { WorkflowScheduler } from '@/lib/workflow/scheduler'
import { enhancedWorkflowExecutor } from '@/lib/workflow/executor'
import { WorkflowDefinition, NodeType, EdgeType } from '@/types/workflow'

// ============================================================================
// 示例 1: 使用 DSL 解析器
// ============================================================================

async function example1_DSLParser() {
  console.log('\n=== 示例 1: DSL 解析器 ===\n')

  const parser = new WorkflowDSLParser()

  // 1.1 创建示例工作流 DSL
  const dsl = createExampleWorkflowDSL()
  console.log('创建示例工作流 DSL:', dsl.id, dsl.name)

  // 1.2 序列化为 JSON
  // @ts-ignore - convertToWorkflowDefinition is private but needed for examples
  const workflowDef = parser.convertToWorkflowDefinition(dsl)
  // @ts-ignore - serialize expects WorkflowDefinition not WorkflowDSL
  const json = parser.serialize(dsl, DSLFormat.JSON)
  console.log('\n序列化为 JSON (前 200 字符):')
  console.log(json.substring(0, 200) + '...')

  // 1.3 序列化为 YAML
  // @ts-ignore - serialize expects WorkflowDefinition not WorkflowDSL
  const yamlOut = parser.serialize(dsl, DSLFormat.YAML)
  console.log('\n序列化为 YAML (前 200 字符):')
  console.log(yamlOut.substring(0, 200) + '...')

  // 1.4 解析 JSON
  const jsonResult = parser.parse(json, DSLFormat.JSON)
  console.log('\n解析 JSON 结果:')
  console.log('- 成功:', jsonResult.success)
  console.log('- 错误数:', jsonResult.errors.length)
  console.log('- 警告数:', jsonResult.warnings.length)
  if (jsonResult.workflow) {
    console.log('- 工作流 ID:', jsonResult.workflow.id)
    console.log('- 节点数:', jsonResult.workflow.nodes.length)
    console.log('- 边数:', jsonResult.workflow.edges.length)
  }

  // 1.5 解析 YAML
  const yamlResult = parser.parse(yamlOut, DSLFormat.YAML)
  console.log('\n解析 YAML 结果:')
  console.log('- 成功:', yamlResult.success)
  console.log('- 错误数:', yamlResult.errors.length)
  console.log('- 警告数:', yamlResult.warnings.length)
}

// ============================================================================
// 示例 2: 创建自定义工作流
// ============================================================================

async function example2_CustomWorkflow() {
  console.log('\n=== 示例 2: 创建自定义工作流 ===\n')

  const parser = new WorkflowDSLParser()

  // 2.1 定义工作流 DSL
  const customDSL = {
    id: 'order-processing',
    name: '订单处理工作流',
    description: '处理用户订单的完整流程',
    version: 1,
    status: 'active' as const,
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: '开始',
        position: { x: 100, y: 100 },
      },
      {
        id: 'validate-order',
        type: NodeType.AGENT,
        name: '验证订单',
        description: '验证订单信息的完整性和有效性',
        position: { x: 300, y: 100 },
        config: {
          agentId: 'order-validator',
          agentType: 'task',
          prompt: '验证订单信息，包括商品、数量、价格等',
          model: 'gpt-4',
          timeout: 60,
        },
      },
      {
        id: 'check-stock',
        type: NodeType.CONDITION,
        name: '检查库存',
        description: '检查商品库存是否充足',
        position: { x: 500, y: 100 },
        config: {
          expression: '${stockAvailable}',
          trueLabel: '有库存',
          falseLabel: '无库存',
        },
      },
      {
        id: 'process-payment',
        type: NodeType.AGENT,
        name: '处理支付',
        description: '处理支付流程',
        position: { x: 700, y: 50 },
        config: {
          agentId: 'payment-processor',
          agentType: 'task',
          prompt: '处理支付，包括验证支付信息和扣款',
          model: 'gpt-4',
          timeout: 120,
        },
      },
      {
        id: 'notify-out-of-stock',
        type: NodeType.AGENT,
        name: '通知缺货',
        description: '通知用户商品缺货',
        position: { x: 700, y: 150 },
        config: {
          agentId: 'notification-sender',
          agentType: 'task',
          prompt: '发送缺货通知给用户',
          model: 'gpt-3.5-turbo',
          timeout: 30,
        },
      },
      {
        id: 'end',
        type: NodeType.END,
        name: '结束',
        position: { x: 900, y: 100 },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'start',
        target: 'validate-order',
        type: EdgeType.SEQUENCE,
      },
      {
        id: 'e2',
        source: 'validate-order',
        target: 'check-stock',
        type: EdgeType.SEQUENCE,
      },
      {
        id: 'e3',
        source: 'check-stock',
        target: 'process-payment',
        type: EdgeType.CONDITION,
        conditionConfig: {
          label: '有库存',
        },
      },
      {
        id: 'e4',
        source: 'check-stock',
        target: 'notify-out-of-stock',
        type: EdgeType.CONDITION,
        conditionConfig: {
          label: '无库存',
        },
      },
      {
        id: 'e5',
        source: 'process-payment',
        target: 'end',
        type: EdgeType.SEQUENCE,
      },
      {
        id: 'e6',
        source: 'notify-out-of-stock',
        target: 'end',
        type: EdgeType.SEQUENCE,
      },
    ],
    config: {
      timeout: 300,
      retryPolicy: {
        maxRetries: 3,
        backoff: 'exponential',
        interval: 5,
      },
      variables: {
        environment: 'production',
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin',
    },
  }

  // 2.2 解析工作流
  const result = parser.parse(JSON.stringify(customDSL), DSLFormat.JSON)

  if (result.success && result.workflow) {
    console.log('工作流创建成功!')
    console.log('- ID:', result.workflow.id)
    console.log('- 名称:', result.workflow.name)
    console.log('- 节点数:', result.workflow.nodes.length)
    console.log('- 边数:', result.workflow.edges.length)

    // 2.3 注册到执行器
    enhancedWorkflowExecutor.registerWorkflow(result.workflow)
    console.log('\n工作流已注册到执行器')
  } else {
    console.log('工作流创建失败:', result.errors)
  }
}

// ============================================================================
// 示例 3: 使用触发器系统
// ============================================================================

async function example3_Triggers() {
  console.log('\n=== 示例 3: 触发器系统 ===\n')

  const triggerManager = new TriggerManager()

  // 3.1 创建定时触发器
  const scheduleTrigger: TriggerDefinition = {
    id: 'daily-report-trigger',
    workflowId: 'daily-report-workflow',
    type: TriggerType.SCHEDULE,
    name: '每日报告触发器',
    description: '每天凌晨 2 点生成报告',
    status: TriggerStatus.ACTIVE,
    config: {
      interval: 24 * 60 * 60 * 1000, // 24 小时
      timezone: 'Asia/Shanghai',
    },
    executionConfig: {
      inputs: {
        reportType: 'daily',
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      triggerCount: 0,
      errorCount: 0,
    },
  }

  await triggerManager.registerTrigger(scheduleTrigger)
  console.log('定时触发器已注册:', scheduleTrigger.id)

  // 3.2 创建事件触发器
  const eventTrigger: TriggerDefinition = {
    id: 'user-register-trigger',
    workflowId: 'welcome-workflow',
    type: TriggerType.EVENT,
    name: '用户注册触发器',
    description: '用户注册后发送欢迎邮件',
    status: TriggerStatus.ACTIVE,
    config: {
      eventType: 'user.registered',
      source: 'auth-service',
      filter: {
        plan: 'premium',
      },
      debounce: 5000, // 5 秒防抖
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      triggerCount: 0,
      errorCount: 0,
    },
  }

  await triggerManager.registerTrigger(eventTrigger)
  console.log('事件触发器已注册:', eventTrigger.id)

  // 3.3 创建 Webhook 触发器
  const webhookTrigger: TriggerDefinition = {
    id: 'payment-webhook-trigger',
    workflowId: 'payment-workflow',
    type: TriggerType.WEBHOOK,
    name: '支付 Webhook 触发器',
    description: '处理支付成功通知',
    status: TriggerStatus.ACTIVE,
    config: {
      endpoint: '/webhooks/payment',
      method: 'POST',
      auth: {
        type: 'bearer',
        token: 'secret-token',
      },
      validation: {
        signature: 'webhook-secret',
        ipWhitelist: ['192.168.1.1'],
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      triggerCount: 0,
      errorCount: 0,
    },
  }

  await triggerManager.registerTrigger(webhookTrigger)
  console.log('Webhook 触发器已注册:', webhookTrigger.id)

  // 3.4 创建 Cron 触发器
  const cronTrigger: TriggerDefinition = {
    id: 'backup-trigger',
    workflowId: 'backup-workflow',
    type: TriggerType.CRON,
    name: '备份触发器',
    description: '每天凌晨 3 点执行备份',
    status: TriggerStatus.ACTIVE,
    config: {
      expression: '0 3 * * *', // 每天凌晨 3 点
      timezone: 'Asia/Shanghai',
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      triggerCount: 0,
      errorCount: 0,
    },
  }

  await triggerManager.registerTrigger(cronTrigger)
  console.log('Cron 触发器已注册:', cronTrigger.id)

  // 3.5 查询触发器
  const allTriggers = triggerManager.getAllTriggers()
  console.log('\n所有触发器数量:', allTriggers.length)

  const activeTriggers = triggerManager.getAllTriggers({
    status: TriggerStatus.ACTIVE,
  })
  console.log('激活的触发器数量:', activeTriggers.length)

  // 3.6 手动触发
  await triggerManager.manualTrigger('daily-report-trigger', {
    testData: 'manual trigger',
  })
  console.log('\n手动触发成功')

  // 3.7 获取统计信息
  const stats = triggerManager.getTriggerStats('daily-report-trigger')
  console.log('\n触发器统计:')
  console.log('- 触发次数:', stats?.triggerCount)
  console.log('- 错误次数:', stats?.errorCount)
  console.log('- 最后触发时间:', stats?.lastTriggeredAt)

  // 清理
  await triggerManager.stopAll()
}

// ============================================================================
// 示例 4: 使用工作流调度器
// ============================================================================

async function example4_Scheduler() {
  console.log('\n=== 示例 4: 工作流调度器 ===\n')

  // 4.1 创建调度器
  const scheduler = new WorkflowScheduler({
    maxConcurrentTasks: 3,
    taskQueueSize: 20,
    taskTimeout: 60000, // 1 分钟
    retryPolicy: {
      maxRetries: 3,
      backoff: 'exponential',
      interval: 2000,
    },
  })

  console.log('调度器已创建')
  console.log('- 最大并发任务数:', 3)
  console.log('- 任务队列大小:', 20)
  console.log('- 任务超时时间:', 60000, 'ms')

  // 4.2 创建简单工作流
  const simpleWorkflow: WorkflowDefinition = {
    id: 'simple-workflow',
    name: '简单工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: '开始',
        position: { x: 100, y: 100 },
      },
      {
        id: 'task',
        type: NodeType.AGENT,
        name: '执行任务',
        position: { x: 300, y: 100 },
        agentConfig: {
          agentId: 'task-executor',
          agentType: 'task',
          prompt: '执行简单任务',
        },
      },
      {
        id: 'end',
        type: NodeType.END,
        name: '结束',
        position: { x: 500, y: 100 },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'start',
        target: 'task',
        type: EdgeType.SEQUENCE,
      },
      {
        id: 'e2',
        source: 'task',
        target: 'end',
        type: EdgeType.SEQUENCE,
      },
    ],
    config: {
      variables: {},
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin',
    },
  }

  // 4.3 注册工作流
  scheduler.registerWorkflow(simpleWorkflow)
  console.log('\n工作流已注册:', simpleWorkflow.id)

  // 4.4 触发工作流
  const task = await scheduler.triggerWorkflow(
    'simple-workflow',
    {
      inputData: 'test data',
    },
    {
      triggeredBy: 'user-123',
      triggerType: 'manual',
    }
  )

  console.log('\n任务已创建:')
  console.log('- 任务 ID:', task.id)
  console.log('- 工作流 ID:', task.workflowId)
  console.log('- 状态:', task.status)

  // 4.5 查询任务
  const retrievedTask = scheduler.getTask(task.id)
  console.log('\n查询任务:')
  console.log('- 任务 ID:', retrievedTask?.id)
  console.log('- 状态:', retrievedTask?.status)

  // 4.6 获取统计信息
  const stats = scheduler.getStatistics()
  console.log('\n调度器统计:')
  console.log('- 总任务数:', stats.totalTasks)
  console.log('- 待处理:', stats.pendingTasks)
  console.log('- 运行中:', stats.runningTasks)
  console.log('- 已完成:', stats.completedTasks)
  console.log('- 失败:', stats.failedTasks)
  console.log('- 队列大小:', stats.queueSize)

  // 4.7 清理
  await scheduler.stop()
  console.log('\n调度器已停止')
}

// ============================================================================
// 示例 5: 综合示例
// ============================================================================

async function example5_Comprehensive() {
  console.log('\n=== 示例 5: 综合示例 ===\n')

  // 5.1 创建调度器
  const scheduler = new WorkflowScheduler({
    maxConcurrentTasks: 5,
    taskQueueSize: 50,
  })

  // 5.2 创建工作流 DSL
  const parser = new WorkflowDSLParser()
  const dsl = createExampleWorkflowDSL()
  const result = parser.parse(JSON.stringify(dsl), DSLFormat.JSON)

  if (!result.success || !result.workflow) {
    console.log('工作流解析失败')
    return
  }

  // 5.3 注册工作流
  scheduler.registerWorkflow(result.workflow)
  console.log('工作流已注册:', result.workflow.id)

  // 5.4 添加定时触发器
  const trigger: TriggerDefinition = {
    id: 'example-trigger',
    workflowId: result.workflow.id,
    type: TriggerType.SCHEDULE,
    name: '示例触发器',
    status: TriggerStatus.ACTIVE,
    config: {
      interval: 60000, // 1 分钟
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      triggerCount: 0,
      errorCount: 0,
    },
  }

  await scheduler.addTrigger(trigger)
  console.log('触发器已添加:', trigger.id)

  // 5.5 手动触发工作流
  const task = await scheduler.triggerWorkflow(result.workflow.id, {
    exampleData: 'value',
  })

  console.log('任务已创建:', task.id)

  // 5.6 监控任务状态
  console.log('\n监控任务状态...')
  let attempts = 0
  const maxAttempts = 10

  const monitorInterval = setInterval(() => {
    attempts++
    const currentTask = scheduler.getTask(task.id)

    if (currentTask) {
      console.log(`[${attempts}] 任务状态:`, currentTask.status)

      if (
        currentTask.status === 'completed' ||
        currentTask.status === 'failed' ||
        currentTask.status === 'cancelled'
      ) {
        clearInterval(monitorInterval)

        console.log('\n任务完成!')
        console.log('- 最终状态:', currentTask.status)
        console.log('- 开始时间:', currentTask.metadata.startedAt)
        console.log('- 完成时间:', currentTask.metadata.completedAt)
        console.log('- 执行时长:', currentTask.metadata.duration, 'ms')

        if (currentTask.metadata.error) {
          console.log('- 错误信息:', currentTask.metadata.error)
        }
      }
    }

    if (attempts >= maxAttempts) {
      clearInterval(monitorInterval)
      console.log('\n监控超时')
    }
  }, 1000)

  // 5.7 等待监控完成
  await new Promise(resolve => setTimeout(resolve, 12000))

  // 5.8 获取最终统计
  const finalStats = scheduler.getStatistics()
  console.log('\n最终统计:')
  console.log('- 总任务数:', finalStats.totalTasks)
  console.log('- 已完成:', finalStats.completedTasks)
  console.log('- 失败:', finalStats.failedTasks)

  // 5.9 清理
  await scheduler.stop()
  console.log('\n调度器已停止')
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.log('========================================')
  console.log('  工作流自动化系统使用示例')
  console.log('========================================')

  try {
    await example1_DSLParser()
    await example2_CustomWorkflow()
    await example3_Triggers()
    await example4_Scheduler()
    await example5_Comprehensive()

    console.log('\n========================================')
    console.log('  所有示例执行完成!')
    console.log('========================================\n')
  } catch (error) {
    console.error('\n执行出错:', error)
  }
}

// 导出示例函数
export {
  example1_DSLParser,
  example2_CustomWorkflow,
  example3_Triggers,
  example4_Scheduler,
  example5_Comprehensive,
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main().catch(console.error)
}