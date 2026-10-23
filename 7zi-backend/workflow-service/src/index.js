/**
 * Standalone Workflow Service
 *
 * Independent workflow automation engine for 7zi:
 * - Workflow definition and execution
 * - Node executors (start, end, task, condition, loop, parallel, etc.)
 * - Checkpoint and resume
 * - Template management
 * - AI workflow generation
 *
 * Usage:
 *   node src/index.js
 *
 * Environment variables:
 *   PORT - Workflow service port (default: 3001)
 *   NODE_ENV - Environment (default: development)
 *   LOG_LEVEL - Logging level (default: info)
 *   CORS_ORIGIN - CORS origin for cross-origin requests
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WorkflowEngine = require('./engine/WorkflowEngine');
const {
  StartExecutor, EndExecutor, TaskExecutor, ConditionExecutor,
  LoopExecutor, ParallelExecutor, SubflowExecutor, DelayExecutor,
  HttpExecutor, TransformExecutor
} = require('./engine/executors');

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGIN || '*';

// ============================================================================
// Logger
// ============================================================================

const logger = {
  info: (message, data = {}) => {
    if (['info', 'debug'].includes(LOG_LEVEL)) {
      console.log(`[INFO] ${new Date().toISOString()} ${message}`, Object.keys(data).length ? JSON.stringify(data, null, 2) : '');
    }
  },
  debug: (message, data = {}) => {
    if (LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, Object.keys(data).length ? JSON.stringify(data, null, 2) : '');
    }
  },
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, Object.keys(data).length ? JSON.stringify(data, null, 2) : '');
  },
  error: (message, data = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, Object.keys(data).length ? JSON.stringify(data, null, 2) : '');
  },
};

// ============================================================================
// App Setup
// ============================================================================

const app = express();

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging in debug mode
if (LOG_LEVEL === 'debug') {
  app.use((req, res, next) => {
    logger.debug('Incoming request', { method: req.method, url: req.url });
    next();
  });
}

// ============================================================================
// Workflow Engine Initialization
// ============================================================================

const engine = new WorkflowEngine({
  maxParallelTasks: parseInt(process.env.MAX_PARALLEL_TASKS || '10', 10),
  checkpointInterval: parseInt(process.env.CHECKPOINT_INTERVAL || '5000', 10),
  defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '3600', 10),
});

// Register default executors
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

// In-memory storage (can be replaced with database in production)
const workflows = new Map();
const templates = new Map();

// ============================================================================
// Workflow API
// ============================================================================

/**
 * Create a workflow
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

    logger.info('Workflow created', { workflowId: workflow.id, name: workflow.name });
    res.status(201).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    logger.error('Error creating workflow', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all workflows
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
 * Get single workflow
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
 * Update workflow
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

  logger.info('Workflow updated', { workflowId: updated.id });
  res.json({
    success: true,
    data: updated
  });
});

/**
 * Delete workflow
 */
app.delete('/api/workflows/:id', (req, res) => {
  if (!workflows.has(req.params.id)) {
    return res.status(404).json({
      success: false,
      error: 'Workflow not found'
    });
  }

  workflows.delete(req.params.id);
  logger.info('Workflow deleted', { workflowId: req.params.id });
  res.json({
    success: true,
    message: 'Workflow deleted'
  });
});

// ============================================================================
// Execution API
// ============================================================================

/**
 * Execute workflow
 */
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const { variables } = req.body;
    const execution = await engine.execute(req.params.id, variables);

    logger.info('Workflow execution started', { workflowId: req.params.id, executionId: execution.id });
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    logger.error('Error executing workflow', { workflowId: req.params.id, error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get execution status
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
 * Get all executions
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
 * Pause execution
 */
app.post('/api/executions/:id/pause', (req, res) => {
  try {
    const execution = engine.pauseExecution(req.params.id);
    logger.info('Workflow execution paused', { executionId: req.params.id });
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    logger.error('Error pausing workflow', { executionId: req.params.id, error: error.message });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Resume execution from checkpoint
 */
app.post('/api/executions/:id/resume', async (req, res) => {
  try {
    const { checkpointId } = req.body;
    const execution = await engine.resumeFromCheckpoint(checkpointId);
    logger.info('Workflow execution resumed', { checkpointId });
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    logger.error('Error resuming workflow', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cancel execution
 */
app.post('/api/executions/:id/cancel', (req, res) => {
  try {
    const execution = engine.cancelExecution(req.params.id);
    logger.info('Workflow execution cancelled', { executionId: req.params.id });
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    logger.error('Error cancelling workflow', { executionId: req.params.id, error: error.message });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Template API
// ============================================================================

/**
 * Get all templates
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
 * Create template
 */
app.post('/api/templates', (req, res) => {
  const template = {
    ...req.body,
    id: req.body.id || generateId(),
    createdAt: new Date().toISOString()
  };

  templates.set(template.id, template);
  logger.info('Template created', { templateId: template.id });
  res.status(201).json({
    success: true,
    data: template
  });
});

/**
 * Get single template
 */
app.get('/api/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found'
    });
  }
  res.json({
    success: true,
    data: template
  });
});

/**
 * Instantiate workflow from template
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

  logger.info('Workflow instantiated from template', { templateId: req.params.id, workflowId: workflow.id });
  res.status(201).json({
    success: true,
    data: workflow
  });
});

/**
 * Export template
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
 * Import template
 */
app.post('/api/templates/import', (req, res) => {
  const template = {
    ...req.body,
    id: generateId(),
    importedAt: new Date().toISOString()
  };

  templates.set(template.id, template);
  logger.info('Template imported', { templateId: template.id });
  res.status(201).json({
    success: true,
    data: template
  });
});

// ============================================================================
// AI-assisted API
// ============================================================================

/**
 * AI generate workflow
 */
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { description } = req.body;
    const workflow = await generateWorkflowWithAI(description);
    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    logger.error('Error generating workflow with AI', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * AI optimization suggestions
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
    logger.error('Error getting optimization suggestions', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Health Check & Metrics
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'workflow-service',
    version: '1.0.0',
    uptime: process.uptime(),
    workflows: workflows.size,
    executions: engine.getAllExecutions().length
  });
});

/**
 * Detailed health check (matches plan: /api/v1/workflow/health)
 */
app.get('/api/v1/workflow/health', (req, res) => {
  const executions = engine.getAllExecutions();
  const stats = {
    running: executions.filter(e => e.status === 'running').length,
    completed: executions.filter(e => e.status === 'completed').length,
    failed: executions.filter(e => e.status === 'failed').length,
    paused: executions.filter(e => e.status === 'paused').length
  };

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'workflow-service',
    version: '1.0.0',
    uptime: process.uptime(),
    workflows: workflows.size,
    executions: executions.length,
    executionStats: stats
  });
});

/**
 * Service metrics
 */
app.get('/api/v1/workflow/metrics', (req, res) => {
  const executions = engine.getAllExecutions();
  res.json({
    workflows: {
      total: workflows.size,
      templates: templates.size
    },
    executions: {
      total: executions.length,
      running: executions.filter(e => e.status === 'running').length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      paused: executions.filter(e => e.status === 'paused').length
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// Utility Functions
// ============================================================================

function generateId() {
  return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * AI workflow generation placeholder
 * In production, this would call minimax API
 */
async function generateWorkflowWithAI(description) {
  logger.debug('Generating workflow with AI', { description });
  return {
    id: generateId(),
    name: 'AI Generated Workflow',
    description,
    version: '1.0.0',
    nodes: [
      { id: 'start_1', type: 'start', name: 'Start', position: { x: 100, y: 100 } },
      { id: 'task_1', type: 'task', name: 'Process', position: { x: 300, y: 100 }, data: { action: 'process', params: {} } },
      { id: 'end_1', type: 'end', name: 'End', position: { x: 500, y: 100 } }
    ],
    edges: [
      { id: 'e1', source: 'start_1', target: 'task_1' },
      { id: 'e2', source: 'task_1', target: 'end_1' }
    ]
  };
}

/**
 * Optimization suggestions
 */
async function getOptimizationSuggestions(workflow) {
  const suggestions = [];

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

  const nodesWithoutTimeout = workflow.nodes.filter(n => !n.timeout && n.type !== 'start' && n.type !== 'end');
  if (nodesWithoutTimeout.length > 0) {
    suggestions.push({
      type: 'timeout',
      message: `${nodesWithoutTimeout.length} nodes missing timeout configuration`,
      nodes: nodesWithoutTimeout.map(n => n.id),
      impact: 'medium'
    });
  }

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

// ============================================================================
// Start Server
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Workflow Service Started (7zi)                    ║
╠═══════════════════════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(46)}║
║  Environment: ${NODE_ENV.padEnd(39)}║
║  CORS Origin: ${CORS_ORIGIN.padEnd(39)}║
║  Log Level: ${LOG_LEVEL.padEnd(42)}║
╠═══════════════════════════════════════════════════════════╣
║  HTTP Endpoints:                                         ║
║    GET /health               - Health check               ║
║    GET /api/v1/workflow/health - Detailed health         ║
║    POST /api/workflows       - Create workflow           ║
║    POST /api/workflows/:id/execute - Execute workflow     ║
╠═══════════════════════════════════════════════════════════╣
║  Web: http://localhost:${PORT.toString()}                               ║
╚═══════════════════════════════════════════════════════════╝
  `);
  logger.info('Workflow service started', { PORT, NODE_ENV, CORS_ORIGIN });
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    logger.info('Workflow service closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================================
// Error Handling
// ============================================================================

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled rejection', { reason });
});

// ============================================================================
// Export for Testing
// ============================================================================

module.exports = { app, engine, server };
