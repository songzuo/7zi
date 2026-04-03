/**
 * OpenClaw Workflow Engine v1.11.0
 * Built-in Node Executors
 */

import { INodeExecutor, IExecutionContext } from './WorkflowEngine';
import { IWorkflowNode, NodeType, INodeConfig } from '../types/workflow.types';
import axios from 'axios';

// ============================================================================
// Trigger Executors
// ============================================================================

/**
 * Cron 触发器执行器
 */
export class CronTriggerExecutor implements INodeExecutor {
  type = NodeType.TRIGGER_CRON;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.cron;
    if (!config) {
      throw new Error('Cron trigger configuration missing');
    }

    return {
      triggered: true,
      scheduled: config.expression,
      timezone: config.timezone
    };
  }
}

/**
 * Webhook 触发器执行器
 */
export class WebhookTriggerExecutor implements INodeExecutor {
  type = NodeType.TRIGGER_WEBHOOK;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.webhook;
    if (!config) {
      throw new Error('Webhook trigger configuration missing');
    }

    return {
      triggered: true,
      path: config.path,
      method: config.method
    };
  }
}

/**
 * 事件触发器执行器
 */
export class EventTriggerExecutor implements INodeExecutor {
  type = NodeType.TRIGGER_EVENT;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.event;
    if (!config) {
      throw new Error('Event trigger configuration missing');
    }

    return {
      triggered: true,
      eventType: config.eventType
    };
  }
}

// ============================================================================
// Action Executors
// ============================================================================

/**
 * HTTP Action 执行器
 */
export class HttpActionExecutor implements INodeExecutor {
  type = NodeType.ACTION_HTTP;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.http;
    if (!config) {
      throw new Error('HTTP action configuration missing');
    }

    try {
      const response = await axios({
        method: config.method,
        url: config.url,
        headers: config.headers,
        data: config.body,
        timeout: config.timeout || 30000
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          status: error.response?.status || 0,
          error: error.message,
          data: error.response?.data
        };
      }
      throw error;
    }
  }
}

/**
 * Script Action 执行器
 */
export class ScriptActionExecutor implements INodeExecutor {
  type = NodeType.ACTION_SCRIPT;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.script;
    if (!config) {
      throw new Error('Script action configuration missing');
    }

    const { language, code } = config;

    if (language === 'javascript' || language === 'typescript') {
      // 创建安全的执行环境
      const vm = await import('vm');
      const script = new vm.Script(code);
      
      const result = script.runInNewContext({
        variables: context.variables,
        console: {
          log: (...args: any[]) => context.logger.info('Script output', { args })
        }
      });

      return result;
    }

    throw new Error(`Unsupported script language: ${language}`);
  }
}

/**
 * Transform Action 执行器
 */
export class TransformActionExecutor implements INodeExecutor {
  type = NodeType.ACTION_TRANSFORM;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.transform;
    if (!config) {
      throw new Error('Transform action configuration missing');
    }

    const input = config.input ? this.resolveVariable(config.input, context.variables) : context.variables;
    
    let result: any;
    
    switch (config.type) {
      case 'map':
        result = this.map(input, config.expression);
        break;
      case 'filter':
        result = this.filter(input, config.expression);
        break;
      case 'reduce':
        result = this.reduce(input, config.expression);
        break;
      case 'custom':
        result = this.customTransform(input, config.expression);
        break;
      default:
        throw new Error(`Unknown transform type: ${config.type}`);
    }

    return result;
  }

  private resolveVariable(path: string, variables: Record<string, any>): any {
    const parts = path.split('.');
    let value: any = variables;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private map(array: any[], expression: string): any[] {
    // 简化的 map 实现
    return array.map((item, index) => {
      try {
        const fn = new Function('item', 'index', `return ${expression}`);
        return fn(item, index);
      } catch (error) {
        return item;
      }
    });
  }

  private filter(array: any[], expression: string): any[] {
    return array.filter((item, index) => {
      try {
        const fn = new Function('item', 'index', `return ${expression}`);
        return fn(item, index);
      } catch (error) {
        return false;
      }
    });
  }

  private reduce(array: any[], expression: string): any {
    try {
      const fn = new Function('acc', 'item', 'index', `return ${expression}`);
      return array.reduce(fn, {});
    } catch (error) {
      return array;
    }
  }

  private customTransform(input: any, expression: string): any {
    try {
      const fn = new Function('input', `return ${expression}`);
      return fn(input);
    } catch (error) {
      return input;
    }
  }
}

// ============================================================================
// Logic Executors
// ============================================================================

/**
 * Condition Logic 执行器
 */
export class ConditionLogicExecutor implements INodeExecutor {
  type = NodeType.LOGIC_CONDITION;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.condition;
    if (!config) {
      throw new Error('Condition logic configuration missing');
    }

    const result = this.evaluateExpression(config.expression, context.variables);
    
    return {
      result,
      branch: result ? config.trueBranch : config.falseBranch
    };
  }

  private evaluateExpression(expression: string, variables: Record<string, any>): boolean {
    try {
      const fn = new Function('vars', `
        with (vars) {
          return ${expression};
        }
      `);
      return fn(variables);
    } catch (error) {
      return false;
    }
  }
}

/**
 * Switch Logic 执行器
 */
export class SwitchLogicExecutor implements INodeExecutor {
  type = NodeType.LOGIC_SWITCH;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.switch;
    if (!config) {
      throw new Error('Switch logic configuration missing');
    }

    const value = this.evaluateExpression(config.expression, context.variables);
    
    for (const caseItem of config.cases) {
      if (value === caseItem.value) {
        return { branch: caseItem.branch, value };
      }
    }

    return { branch: config.default, value };
  }

  private evaluateExpression(expression: string, variables: Record<string, any>): any {
    try {
      const fn = new Function('vars', `
        with (vars) {
          return ${expression};
        }
      `);
      return fn(variables);
    } catch (error) {
      return undefined;
    }
  }
}

/**
 * Loop Logic 执行器
 */
export class LoopLogicExecutor implements INodeExecutor {
  type = NodeType.LOGIC_LOOP;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.loop;
    if (!config) {
      throw new Error('Loop logic configuration missing');
    }

    const iterable = Array.isArray(config.iterable) 
      ? config.iterable 
      : this.resolveVariable(config.iterable as string, context.variables);

    if (!Array.isArray(iterable)) {
      throw new Error('Iterable must be an array');
    }

    const maxIterations = config.maxIterations || 1000;
    const iterations = Math.min(iterable.length, maxIterations);

    return {
      iterable,
      iterations,
      parallel: config.parallel || false
    };
  }

  private resolveVariable(path: string, variables: Record<string, any>): any {
    const parts = path.split('.');
    let value: any = variables;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }
}

/**
 * Parallel Logic 执行器
 */
export class ParallelLogicExecutor implements INodeExecutor {
  type = NodeType.LOGIC_PARALLEL;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.parallel;
    if (!config) {
      throw new Error('Parallel logic configuration missing');
    }

    return {
      branches: config.branches,
      failFast: config.failFast !== false
    };
  }
}

/**
 * Wait Logic 执行器
 */
export class WaitLogicExecutor implements INodeExecutor {
  type = NodeType.LOGIC_WAIT;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<void> {
    const config = node.config.wait;
    if (!config) {
      throw new Error('Wait logic configuration missing');
    }

    if (config.duration) {
      await this.sleep(config.duration);
    } else if (config.until) {
      const waitTime = new Date(config.until).getTime() - Date.now();
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Integration Executors
// ============================================================================

/**
 * OpenAI Integration 执行器
 */
export class OpenAIIntegrationExecutor implements INodeExecutor {
  type = NodeType.INTEGRATION_OPENAI;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.openai;
    if (!config) {
      throw new Error('OpenAI integration configuration missing');
    }

    // 这里需要实现实际的 OpenAI API 调用
    // 为了示例，返回模拟数据
    return {
      model: config.model,
      response: 'AI response placeholder',
      tokens: config.maxTokens
    };
  }
}

/**
 * Minimax Integration 执行器
 */
export class MinimaxIntegrationExecutor implements INodeExecutor {
  type = NodeType.INTEGRATION_MINIMAX;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.minimax;
    if (!config) {
      throw new Error('Minimax integration configuration missing');
    }

    // 这里需要实现实际的 Minimax API 调用
    // 为了示例，返回模拟数据
    return {
      model: config.model,
      response: 'AI response placeholder',
      tokens: config.maxTokens
    };
  }
}

/**
 * Claude Integration 执行器
 */
export class ClaudeIntegrationExecutor implements INodeExecutor {
  type = NodeType.INTEGRATION_CLAUDE;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.claude;
    if (!config) {
      throw new Error('Claude integration configuration missing');
    }

    // 这里需要实现实际的 Claude API 调用
    // 为了示例，返回模拟数据
    return {
      model: config.model,
      response: 'AI response placeholder',
      tokens: config.maxTokens
    };
  }
}

/**
 * Custom Integration 执行器
 */
export class CustomIntegrationExecutor implements INodeExecutor {
  type = NodeType.INTEGRATION_CUSTOM;

  async execute(node: IWorkflowNode, context: IExecutionContext): Promise<any> {
    const config = node.config.custom;
    if (!config) {
      throw new Error('Custom integration configuration missing');
    }

    // 这里需要实现自定义连接器逻辑
    return {
      connector: config.connector,
      action: config.action,
      result: 'Custom integration result'
    };
  }
}

// ============================================================================
// 导出所有执行器
// ============================================================================

export const allExecutors: INodeExecutor[] = [
  new CronTriggerExecutor(),
  new WebhookTriggerExecutor(),
  new EventTriggerExecutor(),
  new HttpActionExecutor(),
  new ScriptActionExecutor(),
  new TransformActionExecutor(),
  new ConditionLogicExecutor(),
  new SwitchLogicExecutor(),
  new LoopLogicExecutor(),
  new ParallelLogicExecutor(),
  new WaitLogicExecutor(),
  new OpenAIIntegrationExecutor(),
  new MinimaxIntegrationExecutor(),
  new ClaudeIntegrationExecutor(),
  new CustomIntegrationExecutor()
];