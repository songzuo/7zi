/**
 * FileStorage - 文件存储实现
 * 消息持久化到文件系统
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IMessage,
  IQueueStats,
  IStorage
} from '../types';

/**
 * 文件存储
 */
export class FileStorage implements IStorage {
  /** 存储路径 */
  protected storagePath: string;

  /** 消息缓存 */
  protected messages: Map<string, IMessage> = new Map();

  /** 队列消息索引 */
  protected queueMessages: Map<string, Set<string>> = new Map();

  /** 是否已初始化 */
  protected initialized: boolean = false;

  /** 写入队列 */
  protected writeQueue: Array<() => Promise<void>> = [];

  /** 是否正在写入 */
  protected writing: boolean = false;

  constructor(storagePath: string = './mq-data') {
    this.storagePath = storagePath;
  }

  /**
   * 初始化存储
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // 创建存储目录
    await fs.mkdir(this.storagePath, { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'queues'), { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'messages'), { recursive: true });

    // 加载现有数据
    await this.loadData();

    this.initialized = true;
  }

  /**
   * 关闭存储
   */
  public async close(): Promise<void> {
    // 等待所有写入完成
    await this.flushWriteQueue();

    this.messages.clear();
    this.queueMessages.clear();
    this.initialized = false;
  }

  /**
   * 加载数据
   */
  protected async loadData(): Promise<void> {
    try {
      // 加载队列索引
      const queuesDir = path.join(this.storagePath, 'queues');
      const queueFiles = await fs.readdir(queuesDir);

      for (const file of queueFiles) {
        const queueName = file.replace('.json', '');
        const filePath = path.join(queuesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const messageIds = JSON.parse(content);
        
        this.queueMessages.set(queueName, new Set(messageIds));
      }

      // 加载消息
      const messagesDir = path.join(this.storagePath, 'messages');
      const messageFiles = await fs.readdir(messagesDir);

      for (const file of messageFiles) {
        const filePath = path.join(messagesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const message = JSON.parse(content);
        
        this.messages.set(message.id, message);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  /**
   * 保存消息
   */
  public async saveMessage(message: IMessage): Promise<void> {
    // 更新内存缓存
    this.messages.set(message.id, message);

    // 添加到队列索引
    if (!this.queueMessages.has(message.queueName)) {
      this.queueMessages.set(message.queueName, new Set());
    }
    this.queueMessages.get(message.queueName)!.add(message.id);

    // 异步写入文件
    this.enqueueWrite(async () => {
      await this.writeMessageToFile(message);
      await this.writeQueueIndex(message.queueName);
    });
  }

  /**
   * 写入消息到文件
   */
  protected async writeMessageToFile(message: IMessage): Promise<void> {
    const filePath = path.join(this.storagePath, 'messages', `${message.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(message, null, 2), 'utf-8');
  }

  /**
   * 写入队列索引
   */
  protected async writeQueueIndex(queueName: string): Promise<void> {
    const messageIds = Array.from(this.queueMessages.get(queueName) ?? []);
    const filePath = path.join(this.storagePath, 'queues', `${queueName}.json`);
    await fs.writeFile(filePath, JSON.stringify(messageIds, null, 2), 'utf-8');
  }

  /**
   * 获取消息
   */
  public async getMessage(messageId: string): Promise<IMessage | null> {
    return this.messages.get(messageId) ?? null;
  }

  /**
   * 获取队列消息
   */
  public async getQueueMessages(queueName: string, limit?: number): Promise<IMessage[]> {
    const messageIds = this.queueMessages.get(queueName);
    if (!messageIds) return [];

    const messages: IMessage[] = [];
    
    for (const messageId of messageIds) {
      const message = this.messages.get(messageId);
      if (message) {
        messages.push(message);
        if (limit && messages.length >= limit) break;
      }
    }

    return messages;
  }

  /**
   * 更新消息
   */
  public async updateMessage(message: IMessage): Promise<void> {
    if (this.messages.has(message.id)) {
      this.messages.set(message.id, message);
      
      // 异步写入文件
      this.enqueueWrite(async () => {
        await this.writeMessageToFile(message);
      });
    }
  }

  /**
   * 删除消息
   */
  public async deleteMessage(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      // 从队列索引移除
      const queueMsgSet = this.queueMessages.get(message.queueName);
      if (queueMsgSet) {
        queueMsgSet.delete(messageId);
        await this.writeQueueIndex(message.queueName);
      }
      
      // 删除消息
      this.messages.delete(messageId);
      
      // 删除文件
      const filePath = path.join(this.storagePath, 'messages', `${messageId}.json`);
      this.enqueueWrite(async () => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // 文件可能不存在
        }
      });
    }
  }

  /**
   * 清空队列
   */
  public async clearQueue(queueName: string): Promise<void> {
    const messageIds = this.queueMessages.get(queueName);
    if (!messageIds) return;

    // 删除队列中的所有消息
    for (const messageId of messageIds) {
      this.messages.delete(messageId);
      
      // 删除文件
      const filePath = path.join(this.storagePath, 'messages', `${messageId}.json`);
      this.enqueueWrite(async () => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // 文件可能不存在
        }
      });
    }

    // 清空队列索引
    messageIds.clear();
    await this.writeQueueIndex(queueName);
  }

  /**
   * 获取队列统计
   */
  public async getQueueStats(queueName: string): Promise<IQueueStats> {
    const messages = await this.getQueueMessages(queueName);
    
    return {
      name: queueName,
      type: 'normal' as any,
      totalMessages: messages.length,
      pendingMessages: messages.filter(m => m.status === 'pending').length,
      processingMessages: messages.filter(m => m.status === 'processing').length,
      acknowledgedMessages: messages.filter(m => m.status === 'acknowledged').length,
      deadLetterMessages: messages.filter(m => m.status === 'dead-letter').length,
      consumeRate: 0,
      produceRate: 0,
      avgProcessingTime: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * 获取存储统计
   */
  public getStorageStats(): {
    totalMessages: number;
    totalQueues: number;
    diskUsage: number;
  } {
    return {
      totalMessages: this.messages.size,
      totalQueues: this.queueMessages.size,
      diskUsage: this.estimateDiskUsage()
    };
  }

  /**
   * 估算磁盘使用
   */
  protected estimateDiskUsage(): number {
    // 粗略估算
    let usage = 0;
    
    for (const message of this.messages.values()) {
      usage += JSON.stringify(message).length;
    }
    
    return usage;
  }

  /**
   * 加入写入队列
   */
  protected enqueueWrite(fn: () => Promise<void>): void {
    this.writeQueue.push(fn);
    this.processWriteQueue();
  }

  /**
   * 处理写入队列
   */
  protected async processWriteQueue(): Promise<void> {
    if (this.writing) return;
    
    this.writing = true;
    
    try {
      while (this.writeQueue.length > 0) {
        const fn = this.writeQueue.shift();
        if (fn) {
          await fn();
        }
      }
    } finally {
      this.writing = false;
    }
  }

  /**
   * 刷新写入队列
   */
  protected async flushWriteQueue(): Promise<void> {
    while (this.writeQueue.length > 0 || this.writing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}