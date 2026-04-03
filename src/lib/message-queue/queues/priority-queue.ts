/**
 * PriorityQueue - 优先级队列
 * 根据优先级处理消息
 */

import { Queue } from '../core/queue';
import { Message } from '../core/message';
import { IMessage, IMessageOptions } from '../types';

/**
 * 优先级队列
 */
export class PriorityQueue extends Queue {
  /** 优先级堆 */
  protected heap: Message[] = [];

  /**
   * 发布消息
   */
  protected async onPublish(message: Message): Promise<void> {
    // 设置默认优先级
    if (message.priority === undefined) {
      message.priority = 5; // 默认优先级
    }
    
    // 插入堆
    this.heapInsert(message);
  }

  /**
   * 消费消息 (优先级最高)
   */
  protected async onConsume(consumerId?: string): Promise<Message | null> {
    // 从堆顶取出优先级最高的消息
    while (this.heap.length > 0) {
      const message = this.heapExtractMax();
      
      if (!message) break;
      
      // 跳过已过期消息
      if (message.isExpired()) {
        this.removeMessage(message.id);
        continue;
      }
      
      // 标记为处理中
      message.markProcessing(consumerId);
      return message;
    }
    
    return null;
  }

  /**
   * 插入堆
   */
  protected heapInsert(message: Message): void {
    this.heap.push(message);
    this.heapifyUp(this.heap.length - 1);
  }

  /**
   * 提取堆顶元素
   */
  protected heapExtractMax(): Message | null {
    if (this.heap.length === 0) return null;
    
    const max = this.heap[0];
    const last = this.heap.pop();
    
    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }
    
    return max;
  }

  /**
   * 上浮调整
   */
  protected heapifyUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.comparePriority(index, parentIndex) > 0) {
        this.swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  /**
   * 下沉调整
   */
  protected heapifyDown(index: number): void {
    const length = this.heap.length;
    
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;
      
      if (leftChild < length && this.comparePriority(leftChild, largest) > 0) {
        largest = leftChild;
      }
      
      if (rightChild < length && this.comparePriority(rightChild, largest) > 0) {
        largest = rightChild;
      }
      
      if (largest !== index) {
        this.swap(index, largest);
        index = largest;
      } else {
        break;
      }
    }
  }

  /**
   * 比较优先级
   */
  protected comparePriority(i: number, j: number): number {
    const priorityI = this.heap[i].priority ?? 5;
    const priorityJ = this.heap[j].priority ?? 5;
    
    // 优先级高的排前面
    return priorityI - priorityJ;
  }

  /**
   * 交换元素
   */
  protected swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  /**
   * 清空队列
   */
  protected async onClear(): Promise<void> {
    this.heap = [];
  }
}