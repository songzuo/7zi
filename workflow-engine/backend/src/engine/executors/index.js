/**
 * 基础节点执行器
 */

class BaseExecutor {
  constructor(type) {
    this.type = type;
  }

  async execute(node, execution, input) {
    throw new Error('execute() must be implemented by subclass');
  }
}

/**
 * Start 节点执行器
 */
class StartExecutor extends BaseExecutor {
  constructor() {
    super('start');
  }

  async execute(node, execution, input) {
    return { started: true, timestamp: new Date().toISOString() };
  }
}

/**
 * End 节点执行器
 */
class EndExecutor extends BaseExecutor {
  constructor() {
    super('end');
  }

  async execute(node, execution, input) {
    return { completed: true, timestamp: new Date().toISOString() };
  }
}

/**
 * Task 节点执行器
 */
class TaskExecutor extends BaseExecutor {
  constructor() {
    super('task');
  }

  async execute(node, execution, input) {
    const { action, params } = node.data;
    
    // 模拟任务执行
    // 实际实现中会调用具体的服务或函数
    console.log(`Executing task: ${action}`, params);
    
    return {
      action,
      result: 'success',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Condition 节点执行器
 */
class ConditionExecutor extends BaseExecutor {
  constructor() {
    super('condition');
  }

  async execute(node, execution, input) {
    const { conditions, defaultBranch } = node.data;
    
    for (const condition of conditions) {
      if (this.evaluateCondition(condition.expression, execution, input)) {
        return {
          branch: condition.branch,
          matched: true
        };
      }
    }
    
    return {
      branch: defaultBranch,
      matched: false
    };
  }

  evaluateCondition(expression, execution, input) {
    // 简单的条件求值
    try {
      const fn = new Function('variables', 'input', `return ${expression}`);
      return fn(execution.variables, input);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }
}

/**
 * Loop 节点执行器
 */
class LoopExecutor extends BaseExecutor {
  constructor() {
    super('loop');
  }

  async execute(node, execution, input) {
    const { iterable, maxIterations = 100 } = node.data;
    
    // 解析迭代器
    let items = [];
    if (typeof iterable === 'string') {
      // 从变量或输入中获取
      items = this.resolveValue(iterable, execution, input) || [];
    } else if (Array.isArray(iterable)) {
      items = iterable;
    }

    // 限制迭代次数
    items = items.slice(0, maxIterations);

    const results = [];
    for (let i = 0; i < items.length; i++) {
      results.push({
        index: i,
        item: items[i],
        timestamp: new Date().toISOString()
      });
    }

    return {
      iterations: results,
      count: results.length
    };
  }

  resolveValue(path, execution, input) {
    const parts = path.split('.');
    let value = path.startsWith('variables.') ? execution.variables : input;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  }
}

/**
 * Parallel 节点执行器
 */
class ParallelExecutor extends BaseExecutor {
  constructor() {
    super('parallel');
  }

  async execute(node, execution, input) {
    const { branches } = node.data;
    
    // 标记为并行执行
    return {
      parallel: true,
      branches,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Subflow 节点执行器
 */
class SubflowExecutor extends BaseExecutor {
  constructor(engine) {
    super('subflow');
    this.engine = engine;
  }

  async execute(node, execution, input) {
    const { workflowId, variables } = node.data;
    
    if (!workflowId) {
      throw new Error('Subflow requires workflowId');
    }

    // 执行子工作流
    const result = await this.engine.execute(workflowId, {
      ...variables,
      ...input
    });

    return {
      subflowId: result.id,
      status: result.status,
      output: result.nodeExecutions[result.nodeExecutions.length - 1]?.output
    };
  }
}

/**
 * Delay 节点执行器
 */
class DelayExecutor extends BaseExecutor {
  constructor() {
    super('delay');
  }

  async execute(node, execution, input) {
    const { duration, unit = 'seconds' } = node.data;
    
    let ms = duration;
    switch (unit) {
      case 'seconds':
        ms *= 1000;
        break;
      case 'minutes':
        ms *= 60000;
        break;
      case 'hours':
        ms *= 3600000;
        break;
    }

    await new Promise(resolve => setTimeout(resolve, ms));

    return {
      delayed: true,
      duration: `${duration} ${unit}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * HTTP 节点执行器
 */
class HttpExecutor extends BaseExecutor {
  constructor() {
    super('http');
  }

  async execute(node, execution, input) {
    const { url, method = 'GET', headers = {}, body } = node.data;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: method !== 'GET' ? JSON.stringify(body) : undefined
      });

      const data = await response.json();

      return {
        status: response.status,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }
}

/**
 * AI 节点执行器（使用 minimax）
 */
class AiExecutor extends BaseExecutor {
  constructor(minimaxClient) {
    super('ai');
    this.minimax = minimaxClient;
  }

  async execute(node, execution, input) {
    const { prompt, model = 'minimax-m2', temperature = 0.7, maxTokens = 2000 } = node.data;
    
    // 替换变量
    const resolvedPrompt = this.resolvePrompt(prompt, execution, input);

    // 调用 minimax API
    const response = await this.minimax.chat.completions.create({
      model,
      messages: [{ role: 'user', content: resolvedPrompt }],
      temperature,
      max_tokens: maxTokens
    });

    return {
      content: response.choices[0].message.content,
      model,
      usage: response.usage,
      timestamp: new Date().toISOString()
    };
  }

  resolvePrompt(prompt, execution, input) {
    return prompt.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      return this.resolveValue(path.trim(), execution, input) || match;
    });
  }

  resolveValue(path, execution, input) {
    const parts = path.split('.');
    let value = path.startsWith('variables.') ? execution.variables : input;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  }
}

/**
 * Transform 节点执行器
 */
class TransformExecutor extends BaseExecutor {
  constructor() {
    super('transform');
  }

  async execute(node, execution, input) {
    const { transformations } = node.data;
    
    let result = input;
    for (const transform of transformations) {
      result = await this.applyTransform(transform, result, execution);
    }

    return result;
  }

  async applyTransform(transform, data, execution) {
    const { type, config } = transform;

    switch (type) {
      case 'map':
        return this.mapTransform(config, data);
      case 'filter':
        return this.filterTransform(config, data);
      case 'reduce':
        return this.reduceTransform(config, data);
      case 'merge':
        return { ...data, ...config.values };
      case 'extract':
        return this.extractValue(config.path, data);
      default:
        return data;
    }
  }

  mapTransform(config, data) {
    if (!Array.isArray(data)) return data;
    return data.map(item => {
      const result = {};
      for (const [key, path] of Object.entries(config.mapping)) {
        result[key] = this.extractValue(path, item);
      }
      return result;
    });
  }

  filterTransform(config, data) {
    if (!Array.isArray(data)) return data;
    return data.filter(item => {
      const value = this.extractValue(config.field, item);
      return value === config.value;
    });
  }

  reduceTransform(config, data) {
    if (!Array.isArray(data)) return data;
    return data.reduce((acc, item) => {
      const value = this.extractValue(config.field, item);
      return acc + (config.operation === 'sum' ? value : 1);
    }, config.initialValue || 0);
  }

  extractValue(path, data) {
    const parts = path.split('.');
    let value = data;
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    return value;
  }
}

module.exports = {
  BaseExecutor,
  StartExecutor,
  EndExecutor,
  TaskExecutor,
  ConditionExecutor,
  LoopExecutor,
  ParallelExecutor,
  SubflowExecutor,
  DelayExecutor,
  HttpExecutor,
  AiExecutor,
  TransformExecutor
};