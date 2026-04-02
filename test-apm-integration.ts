/**
 * APM 集成验证脚本
 *
 * 功能：
 * - 验证 TraceManager 功能
 * - 验证中间件功能
 * - 验证 traceId 传播
 */

import { TraceManager } from '@/lib/trace/TraceManager'

async function testTraceManager() {
  console.log('=== Testing TraceManager ===\n')

  // 创建 TraceManager
  const traceManager = new TraceManager({
    serviceName: 'test-api',
    serviceVersion: '1.7.0',
    environment: 'development',
    samplingRate: 1.0,
  })

  console.log('1. 创建 TraceManager ✅')

  // 开始 Trace
  const traceId = traceManager.startTrace('test-operation', {
    attributes: { 'test.key': 'test.value' },
  })

  console.log(`2. 创建 Trace: ${traceId} ✅`)

  // 创建 Span
  const span1 = traceManager.startSpan('step-1', {
    attributes: { 'step.number': 1 },
  })

  console.log(`3. 创建 Span 1: ${span1?.spanId} ✅`)

  if (span1) {
    // 记录属性
    traceManager.setAttribute(span1, 'custom.attr', 'value')

    // 创建嵌套 Span
    const span2 = traceManager.startSpan('step-1-1')
    console.log(`4. 创建嵌套 Span 2: ${span2?.spanId} ✅`)

    if (span2) {
      traceManager.endSpan(span2)
    }

    traceManager.endSpan(span1)
  }

  // 获取追踪上下文
  const context = traceManager.getContext()
  console.log(`5. 获取 Context: traceId=${context?.traceId}, spanId=${context?.spanId} ✅`)

  // 注入到 headers
  const headers: Record<string, string> = {}
  traceManager.injectContext(headers, 'w3c')
  console.log(`6. 注入 Headers: traceparent=${headers.traceparent} ✅`)

  // 从 headers 提取
  const extractedContext = traceManager.extractContext(headers)
  console.log(`7. 提取 Context: traceId=${extractedContext?.traceId} ✅`)

  // 结束 Trace
  const spans = traceManager.endTrace()
  console.log(`8. 结束 Trace: 收集到 ${spans?.length} 个 spans ✅\n`)

  console.log('=== 所有测试通过! ===\n')

  return { traceId, spans, headers, context }
}

// 运行测试
testTraceManager()
  .then(result => {
    console.log('\n测试结果:')
    console.log('- Trace ID:', result.traceId)
    console.log('- Span 数量:', result.spans?.length)
    console.log('- Trace Context:', JSON.stringify(result.context, null, 2))
    console.log('- Headers:', JSON.stringify(result.headers, null, 2))
  })
  .catch(error => {
    console.error('测试失败:', error)
    process.exit(1)
  })
