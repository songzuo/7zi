/**
 * 工作流引擎 API 服务器
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WorkflowEngine = require('./src/engine/WorkflowEngine');
const {
  StartExecutor, EndExecutor, TaskExecutor, ConditionExecutor,
  LoopExecutor, ParallelExecutor, SubflowExecutor, DelayExecutor,
  HttpExecutor, AiExecutor, TransformExecutor
} = require('./src/engine/executors');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 初始化工作流引擎
const engine = new WorkflowEngine({
  maxParallelTasks: 10,
  checkpointInterval: 5000,
  defaultTimeout: 3600
});

// 注册默认执行器
engine.registerExecutor('start', new StartExecutor());
engine.registerExecutor('end', new EndExecutor());
engine.registerExecutor('task', new TaskExecutor());
engine.registerExecutor('condition', new ConditionExecutor());
engine.registerExecutor('loop', new LoopExecutor());
engine.registerExecutor('parallel', new ParallelExecutor());
engine.registerExecutor('subflow', new SubflowExecutor(engine));
engine.registerExecutor('delay', new DelayExecutor());
engine.registerExecutor('http', new HttpExecutor());
engine.registerExecutor('transform', new TransformExecutor());

// 存储工作流和模板
const workflows = new Map();
const templates = new Map();

// ============ 工作流 API ============

/**
 * 创建工作流
 */
app.post('/api/workflows', (req, res) => {
  try {
    const workflow = req.body;
    workflow.id = workflow.id || generateId();
    workflow.version = workflow.version || '1.0.0';
    workflow.createdAt = new Date().toISOString();
    workflow.updatedAt = new Date().toISOString();

    engine.registerWorkflow(workflow);
    workflows.set(workflow.id, workflow);

    res.status(201).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取所有工作流
 */
app.get('/api/workflows', (req, res) => {
  const list = Array.from(workflows.values());
  res.json({
    success: true,
    data: list,
    total: list.length
  });
});

/**
 * 获取单个工作流
 */
app.get('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found'
    });
  }
  res.json({
    success: true,
    data: workflow
  });
});

/**
 * 更新工作流
 */
app.put('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found'
    });
  }

  const updated = {
    ...workflow,
    ...req.body,
    id: workflow.id,
    updatedAt: new Date().toISOString()
  };

  workflows.set(updated.id, updated);
  engine.registerWorkflow(updated);

  res.json({
    success: true,
    data: updated
  });
});

/**
 * 删除工作流
 */
app.delete('/api/workflows/:id', (req, res) => {
  if (!workflows.has(req.params.id)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found'
    });
  }

  workflows.delete(req.params.id);
  res.json({
    success: true,
    message: 'Workflow deleted'
  });
});

// ============ 执行 API ============

/**
 * 执行工作流
 */
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const { variables } = req.body;
    const execution = await engine.execute(req.params.id, variables);
    
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取执行状态
 */
app.get('/api/executions/:id', (req, res) => {
  const execution = engine.getExecution(req.params.id);
  if (!execution) {
    return res.status(404).json({
      success: false,
      error: 'Execution not found'
    });
  }
  res.json({
    success: true,
    data: execution
  });
});

/**
 * 获取所有执行
 */
app.get('/api/executions', (req, res) => {
  const list = engine.getAllExecutions();
  res.json({
    success: true,
    data: list,
    total: list.length
  });
});

/**
 * 暂停执行
 */
app.post('/api/executions/:id/pause', (req, res) => {
  try {
    const execution = engine.pauseExecution(req.params.id);
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 恢复执行
 */
app.post('/api/executions/:id/resume', async (req, res) => {
  try {
    const { checkpointId } = req.body;
    const execution = await engine.resumeFromCheckpoint(checkpointId);
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 取消执行
 */
app.post('/api/executions/:id/cancel', (req, res) => {
  try {
    const execution = engine.cancelExecution(req.params.id);
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============ 模板 API ============

/**
 * 获取所有模板
 */
app.get('/api/templates', (req, res) => {
  const list = Array.from(templates.values());
  res.json({
    success: true,
    data: list,
    total: list.length
  });
});

/**
 * 创建模板
 */
app.post('/api/templates', (req, res) => {
  const template = {
    ...req.body,
    id: req.body.id || generateId(),
    createdAt: new Date().toISOString()
  };
  
  templates.set(template.id, template);
  
  res.status(201).json({
    success: true,
    data: template
  });
});

/**
 * 从模板创建工作流
 */
app.post('/api/templates/:id/instantiate', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found'
    });
  }

  const workflow = {
    ...template.workflow,
    id: generateId(),
    name: req.body.name || template.name,
    createdAt: new Date().toISOString()
  };

  engine.registerWorkflow(workflow);
  workflows.set(workflow.id, workflow);

  res.status(201).json({
    success: true,
    data: workflow
  });
});

/**
 * 导出模板
 */
app.get('/api/templates/:id/export', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found'
    });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${template.name}.json"`);
  res.json(template);
});

/**
 * 导入模板
 */
app.post('/api/templates/import', (req, res) => {
  const template = {
    ...req.body,
    id: generateId(),
    importedAt: new Date().toISOString()
  };

  templates.set(template.id, template);

  res.status(201).json({
    success: true,
    data: template
  });
});

// ============ AI 辅助 API ============

/**
 * AI 生成工作流
 */
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { description } = req.body;
    
    // 使用 minimax 生成工作流
    const workflow = await generateWorkflowWithAI(description);
    
    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * AI 优化建议
 */
app.post('/api/ai/optimize', async (req, res) => {
  try {
    const { workflow } = req.body;
    
    const suggestions = await getOptimizationSuggestions(workflow);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ 健康检查 ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============ 工具函数 ============

function generateId() {
  return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * AI 生成工作流（使用 minimax）
 */
async function generateWorkflowWithAI(description) {
  // 实际实现中调用 minimax API
  // 这里返回一个示例工作流
  return {
    id: generateId(),
    name: 'AI Generated Workflow',
    description,
    version: '1.0.0',
    nodes: [
      {
        id: 'start_1',
        type: 'start',
        name: 'Start',
        position: { x: 100, y: 100 }
      },
      {
        id: 'task_1',
        type: 'task',
        name: 'Process',
        position: { x: 300, y: 100 },
        data: {
          action: 'process',
          params: {}
        }
      },
      {
        id: 'end_1',
        type: 'end',
        name: 'End',
        position: { x: 500, y: 100 }
      }
    ],
    edges: [
      { id: 'e1', source: 'start_1', target: 'task_1' },
      { id: 'e2', source: 'task_1', target: 'end_1' }
    ]
  };
}

/**
 * 获取优化建议
 */
async function getOptimizationSuggestions(workflow) {
  const suggestions = [];

  // 检查并行化机会
  const taskNodes = workflow.nodes.filter(n => n.type === 'task');
  if (taskNodes.length > 1) {
    const parallelizable = findParallelizableNodes(workflow);
    if (parallelizable.length > 0) {
      suggestions.push({
        type: 'parallelization',
        message: `Found ${parallelizable.length} nodes that can run in parallel`,
        nodes: parallelizable,
        impact: 'high'
      });
    }
  }

  // 检查超时配置
  const nodesWithoutTimeout = workflow.nodes.filter(n => !n.timeout && n.type !== 'start' && n.type !== 'end');
  if (nodesWithoutTimeout.length > 0) {
    suggestions.push({
      type: 'timeout',
      message: `${nodesWithoutTimeout.length} nodes missing timeout configuration`,
      nodes: nodesWithoutTimeout.map(n => n.id),
      impact: 'medium'
    });
  }

  // 检查重试策略
  const nodesWithoutRetry = workflow.nodes.filter(n => !n.retry && n.type === 'task');
  if (nodesWithoutRetry.length > 0) {
    suggestions.push({
      type: 'retry',
      message: `${nodesWithoutRetry.length} task nodes missing retry configuration`,
      nodes: nodesWithoutRetry.map(n => n.id),
      impact: 'medium'
    });
  }

  return suggestions;
}

function findParallelizableNodes(workflow) {
  // 简单实现：查找没有依赖关系的连续任务节点
  const taskNodes = workflow.nodes.filter(n => n.type === 'task');
  const parallelizable = [];

  for (const node of taskNodes) {
    const incomingEdges = workflow.edges.filter(e => e.target === node.id);
    if (incomingEdges.length <= 1) {
      parallelizable.push(node.id);
    }
  }

  return parallelizable;
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`Workflow Engine API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;