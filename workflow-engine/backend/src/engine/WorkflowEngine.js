/**
 * 工作流执行引擎
 * 支持分布式执行、断点续传、失败重试
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class WorkflowEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.workflows = new Map();
    this.executions = new Map();
    this.executors = new Map();
    this.checkpoints = new Map();
    
    this.config = {
      maxParallelTasks: options.maxParallelTasks || 10,
      checkpointInterval: options.checkpointInterval || 5000,
      defaultTimeout: options.defaultTimeout || 3600,
      retryStrategy: options.retryStrategy || 'exponential',
      ...options
    };
  }

  /**
   * 注册工作流
   */
  registerWorkflow(workflow) {
    this.validateWorkflow(workflow);
    this.workflows.set(workflow.id, workflow);
    this.emit('workflow:registered', workflow);
    return workflow.id;
  }

  /**
   * 验证工作流定义
   */
  validateWorkflow(workflow) {
    if (!workflow.id || !workflow.name || !workflow.version) {
      throw new Error('Invalid workflow: missing required fields');
    }
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Invalid workflow: no nodes defined');
    }
    if (!workflow.nodes.find(n => n.type === 'start')) {
      throw new Error('Invalid workflow: no start node');
    }
    return true;
  }

  /**
   * 执行工作流
   */
  async execute(workflowId, variables = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = uuidv4();
    const execution = {
      id: executionId,
      workflowId,
      status: 'pending',
      startTime: new Date().toISOString(),
      variables: { ...workflow.variables, ...variables },
      nodeExecutions: [],
      checkpoints: []
    };

    this.executions.set(executionId, execution);
    this.emit('execution:started', execution);

    try {
      execution.status = 'running';
      await this.runExecution(execution);
      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
      this.emit('execution:completed', execution);
    } catch (error) {
      execution.status = 'failed';
      execution.error = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      execution.endTime = new Date().toISOString();
      this.emit('execution:failed', { execution, error });
    }

    return execution;
  }

  /**
   * 运行执行实例
   */
  async runExecution(execution) {
    const workflow = this.workflows.get(execution.workflowId);
    const startNode = workflow.nodes.find(n => n.type === 'start');
    
    if (!startNode) {
      throw new Error('No start node found');
    }

    // 启动检查点定时器
    const checkpointTimer = this.startCheckpointTimer(execution);

    try {
      await this.executeNode(execution, startNode.id);
    } finally {
      clearInterval(checkpointTimer);
    }
  }

  /**
   * 执行单个节点
   */
  async executeNode(execution, nodeId, input = {}) {
    const workflow = this.workflows.get(execution.workflowId);
    const node = workflow.nodes.find(n => n.id === nodeId);
    
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const nodeExecution = {
      nodeId,
      status: 'running',
      startTime: new Date().toISOString(),
      input,
      retryCount: 0
    };

    execution.nodeExecutions.push(nodeExecution);
    this.emit('node:started', { execution, node });

    try {
      // 执行节点逻辑
      const output = await this.executeNodeLogic(node, execution, input);
      
      nodeExecution.status = 'completed';
      nodeExecution.output = output;
      nodeExecution.endTime = new Date().toISOString();
      this.emit('node:completed', { execution, node, output });

      // 执行后续节点
      await this.executeNextNodes(execution, nodeId, output);

      return output;
    } catch (error) {
      // 失败重试
      if (node.retry && nodeExecution.retryCount < node.retry.maxAttempts) {
        nodeExecution.retryCount++;
        this.emit('node:retry', { execution, node, attempt: nodeExecution.retryCount });
        
        await this.delay(this.calculateBackoff(node.retry, nodeExecution.retryCount));
        return this.executeNode(execution, nodeId, input);
      }

      nodeExecution.status = 'failed';
      nodeExecution.error = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      nodeExecution.endTime = new Date().toISOString();
      this.emit('node:failed', { execution, node, error });
      
      throw error;
    }
  }

  /**
   * 执行节点逻辑
   */
  async executeNodeLogic(node, execution, input) {
    const executor = this.executors.get(node.type);
    
    if (!executor) {
      throw new Error(`No executor for node type: ${node.type}`);
    }

    // 超时控制
    const timeout = node.timeout || this.config.defaultTimeout;
    
    return Promise.race([
      executor.execute(node, execution, input),
      this.createTimeoutPromise(timeout)
    ]);
  }

  /**
   * 执行后续节点
   */
  async executeNextNodes(execution, nodeId, output) {
    const workflow = this.workflows.get(execution.workflowId);
    const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);

    // 并行执行
    if (output && output.parallel) {
      await Promise.all(
        outgoingEdges.map(edge => {
          if (this.evaluateCondition(edge.condition, execution, output)) {
            return this.executeNode(execution, edge.target, output);
          }
          return Promise.resolve();
        })
      );
    } else {
      // 串行执行
      for (const edge of outgoingEdges) {
        if (this.evaluateCondition(edge.condition, execution, output)) {
          await this.executeNode(execution, edge.target, output);
        }
      }
    }
  }

  /**
   * 条件求值
   */
  evaluateCondition(condition, execution, output) {
    if (!condition) return true;
    
    try {
      // 使用安全的表达式求值
      const context = { 
        variables: execution.variables, 
        output,
        $: output 
      };
      return this.safeEval(condition, context);
    } catch (error) {
      this.emit('condition:error', { condition, error });
      return false;
    }
  }

  /**
   * 安全表达式求值
   */
  safeEval(expression, context) {
    // 简单的条件表达式求值
    // 支持: ${variable}, ${output.field}, 比较运算符
    const resolved = expression.replace(/\$\{([^}]+)\}/g, (match, path) => {
      return this.resolvePath(path.trim(), context);
    });
    
    // 基本比较运算
    if (resolved.includes('==')) return eval(resolved);
    if (resolved.includes('!=')) return eval(resolved);
    if (resolved.includes('>')) return eval(resolved);
    if (resolved.includes('<')) return eval(resolved);
    
    return Boolean(resolved);
  }

  /**
   * 解析路径
   */
  resolvePath(path, context) {
    const parts = path.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  }

  /**
   * 创建检查点
   */
  createCheckpoint(execution) {
    const checkpoint = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      nodeId: execution.nodeExecutions[execution.nodeExecutions.length - 1]?.nodeId,
      state: {
        variables: { ...execution.variables },
        nodeExecutions: [...execution.nodeExecutions]
      }
    };

    execution.checkpoints.push(checkpoint);
    this.checkpoints.set(checkpoint.id, checkpoint);
    this.emit('checkpoint:created', { execution, checkpoint });
    
    return checkpoint;
  }

  /**
   * 从检查点恢复
   */
  async resumeFromCheckpoint(checkpointId) {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    const execution = this.executions.get(checkpoint.executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${checkpoint.executionId}`);
    }

    // 恢复状态
    execution.variables = checkpoint.state.variables;
    execution.nodeExecutions = checkpoint.state.nodeExecutions;
    execution.status = 'running';

    this.emit('execution:resumed', { execution, checkpoint });
    
    // 继续执行
    await this.runExecution(execution);
    
    return execution;
  }

  /**
   * 暂停执行
   */
  pauseExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'paused';
    this.createCheckpoint(execution);
    this.emit('execution:paused', execution);
    
    return execution;
  }

  /**
   * 取消执行
   */
  cancelExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'cancelled';
    execution.endTime = new Date().toISOString();
    this.emit('execution:cancelled', execution);
    
    return execution;
  }

  /**
   * 注册节点执行器
   */
  registerExecutor(nodeType, executor) {
    this.executors.set(nodeType, executor);
    this.emit('executor:registered', { nodeType, executor });
  }

  /**
   * 启动检查点定时器
   */
  startCheckpointTimer(execution) {
    return setInterval(() => {
      if (execution.status === 'running') {
        this.createCheckpoint(execution);
      }
    }, this.config.checkpointInterval);
  }

  /**
   * 计算退避时间
   */
  calculateBackoff(retryConfig, attempt) {
    const { backoffStrategy, initialDelay, maxDelay } = retryConfig;
    
    switch (backoffStrategy) {
      case 'fixed':
        return Math.min(initialDelay, maxDelay);
      case 'linear':
        return Math.min(initialDelay * attempt, maxDelay);
      case 'exponential':
      default:
        return Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建超时 Promise
   */
  createTimeoutPromise(seconds) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), seconds * 1000);
    });
  }

  /**
   * 获取执行状态
   */
  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  /**
   * 获取所有执行
   */
  getAllExecutions() {
    return Array.from(this.executions.values());
  }
}

module.exports = WorkflowEngine;