/**
 * REST API - REST API 管理接口
 * 提供队列、消息和消费者管理接口
 */

import * as http from 'http';
import * as url from 'url';
import {
  IApiResponse,
  IQueueConfig,
  IMessageOptions,
  IConsumerConfig,
  QueueType
} from '../types';
import { Broker } from '../core/broker';
import { Monitor } from '../utils/monitor';

/**
 * REST API 服务器
 */
export class RestAPI {
  /** Broker */
  protected broker: Broker;

  /** Monitor */
  protected monitor: Monitor;

  /** HTTP 服务器 */
  protected server?: http.Server;

  /** 端口 */
  protected port: number;

  /** 是否正在运行 */
  protected running: boolean = false;

  constructor(broker: Broker, monitor: Monitor, port: number = 3000) {
    this.broker = broker;
    this.monitor = monitor;
    this.port = port;
  }

  /**
   * 启动 API 服务器
   */
  public async start(): Promise<void> {
    if (this.running) return;

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        this.running = true;
        console.log(`REST API server started on port ${this.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * 停止 API 服务器
   */
  public async stop(): Promise<void> {
    if (!this.running || !this.server) return;

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.running = false;
        resolve();
      });
    });
  }

  /**
   * 处理请求
   */
  protected async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const parsedUrl = url.parse(req.url!, true);
    const path = parsedUrl.pathname || '';
    const method = req.method!;

    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 请求
    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      // 路由请求
      const result = await this.route(method, path, req, parsedUrl.query);
      this.sendResponse(res, 200, result);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.sendResponse(res, 500, {
        success: false,
        error: message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 路由请求
   */
  protected async route(
    method: string,
    path: string,
    req: http.IncomingMessage,
    query: any
  ): Promise<IApiResponse> {
    // ============================================================================
    // 队列管理
    // ============================================================================

    // GET /api/queues - 获取所有队列
    if (method === 'GET' && path === '/api/queues') {
      return {
        success: true,
        data: this.broker.getAllQueueStats(),
        timestamp: Date.now()
      };
    }

    // POST /api/queues - 创建队列
    if (method === 'POST' && path === '/api/queues') {
      const body = await this.parseBody(req);
      const config: IQueueConfig = {
        name: body.name,
        type: body.type || QueueType.NORMAL,
        maxSize: body.maxSize,
        messageTTL: body.messageTTL,
        deadLetterQueue: body.deadLetterQueue
      };

      await this.broker.createQueue(config);
      this.monitor.emitQueueCreated(config.name, config.type);

      return {
        success: true,
        data: { queueName: config.name },
        timestamp: Date.now()
      };
    }

    // DELETE /api/queues/:name - 删除队列
    const deleteQueueMatch = path.match(/^\/api\/queues\/([^/]+)$/);
    if (method === 'DELETE' && deleteQueueMatch) {
      const queueName = deleteQueueMatch[1];
      await this.broker.deleteQueue(queueName);
      this.monitor.emitQueueDeleted(queueName);

      return {
        success: true,
        data: { queueName },
        timestamp: Date.now()
      };
    }

    // GET /api/queues/:name/stats - 获取队列统计
    const queueStatsMatch = path.match(/^\/api\/queues\/([^/]+)\/stats$/);
    if (method === 'GET' && queueStatsMatch) {
      const queueName = queueStatsMatch[1];
      const stats = this.broker.getQueueStats(queueName);

      return {
        success: true,
        data: stats,
        timestamp: Date.now()
      };
    }

    // ============================================================================
    // 消息管理
    // ============================================================================

    // POST /api/queues/:name/messages - 发布消息
    const publishMatch = path.match(/^\/api\/queues\/([^/]+)\/messages$/);
    if (method === 'POST' && publishMatch) {
      const queueName = publishMatch[1];
      const body = await this.parseBody(req);
      const options: IMessageOptions = {
        priority: body.priority,
        delay: body.delay,
        ttl: body.ttl,
        maxRetries: body.maxRetries,
        metadata: body.metadata
      };

      const message = await this.broker.publish(queueName, body.data, options);
      this.monitor.emitMessagePublished(message.id, queueName);

      return {
        success: true,
        data: message,
        timestamp: Date.now()
      };
    }

    // GET /api/queues/:name/messages - 获取队列消息
    const getMessagesMatch = path.match(/^\/api\/queues\/([^/]+)\/messages$/);
    if (method === 'GET' && getMessagesMatch) {
      const queueName = getMessagesMatch[1];
      const queue = this.broker.getQueue(queueName);

      if (!queue) {
        return {
          success: false,
          error: `Queue not found: ${queueName}`,
          timestamp: Date.now()
        };
      }

      const limit = parseInt(query.limit as string) || 100;
      const messages = queue.getAllMessages().slice(0, limit);

      return {
        success: true,
        data: messages,
        timestamp: Date.now()
      };
    }

    // DELETE /api/queues/:name/messages/:id - 删除消息
    const deleteMessageMatch = path.match(/^\/api\/queues\/([^/]+)\/messages\/([^/]+)$/);
    if (method === 'DELETE' && deleteMessageMatch) {
      const queueName = deleteMessageMatch[1];
      const messageId = deleteMessageMatch[2];
      const queue = this.broker.getQueue(queueName);

      if (!queue) {
        return {
          success: false,
          error: `Queue not found: ${queueName}`,
          timestamp: Date.now()
        };
      }

      await queue.reject(messageId, false);

      return {
        success: true,
        data: { messageId },
        timestamp: Date.now()
      };
    }

    // ============================================================================
    // 消费者管理
    // ============================================================================

    // GET /api/consumers - 获取所有消费者
    if (method === 'GET' && path === '/api/consumers') {
      const groups = this.broker.getAllConsumerGroups();
      const consumers = groups.flatMap(g => g.getStats().consumers);

      return {
        success: true,
        data: consumers,
        timestamp: Date.now()
      };
    }

    // POST /api/consumers - 创建消费者
    if (method === 'POST' && path === '/api/consumers') {
      const body = await this.parseBody(req);
      // 注意: 实际创建消费者需要提供处理器函数
      // 这里简化处理

      return {
        success: true,
        data: { message: 'Consumer creation requires handler function' },
        timestamp: Date.now()
      };
    }

    // GET /api/consumers/:id/stats - 获取消费者统计
    const consumerStatsMatch = path.match(/^\/api\/consumers\/([^/]+)\/stats$/);
    if (method === 'GET' && consumerStatsMatch) {
      const consumerId = consumerStatsMatch[1];
      const stats = this.monitor.getConsumerStatsHistory(consumerId);

      return {
        success: true,
        data: stats[stats.length - 1] || null,
        timestamp: Date.now()
      };
    }

    // ============================================================================
    // 监控和统计
    // ============================================================================

    // GET /api/monitor/report - 获取监控报告
    if (method === 'GET' && path === '/api/monitor/report') {
      return {
        success: true,
        data: this.monitor.getReport(),
        timestamp: Date.now()
      };
    }

    // GET /api/broker/stats - 获取 Broker 统计
    if (method === 'GET' && path === '/api/broker/stats') {
      return {
        success: true,
        data: this.broker.getStats(),
        timestamp: Date.now()
      };
    }

    // 404
    return {
      success: false,
      error: 'Not found',
      timestamp: Date.now()
    };
  }

  /**
   * 解析请求体
   */
  protected parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * 发送响应
   */
  protected sendResponse(
    res: http.ServerResponse,
    statusCode: number,
    data: IApiResponse
  ): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}