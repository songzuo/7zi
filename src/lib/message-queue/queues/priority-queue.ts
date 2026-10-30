/**
 * PriorityQueue - 优先级队列
 * 根据优先级处理消息
 */

import { Queue } from '../core/queue';
import { Message } from '../core/message';

/**
 * 优先级队列
 */
export class PriorityQueue extends Queue {
  /** 优先级堆 */
  protected heap: Message[] = [];

  /** 入队序号: 用于同优先级下的稳定排序 (先进先出) */
  protected sequence: Map<string, number> = new Map();

  /** 自增序号 */
  protected sequenceCounter: number = 0;

  /**
   * 发布消息
   */
  protected async onPublish(message: Message): Promise<void> {
    // 设置默认优先级
    if (message.priority === undefined) {
      message.priority = 5; // 默认优先级
    }

    // 记录入队序号, 保证同优先级消息按入队顺序 (FIFO) 投递
    this.sequence.set(message.id, this.sequenceCounter++);

    // 插入堆
    this.heapInsert(message);
  }

  /**
   * 消费消息 (优先级最高, 同优先级按入队顺序)
   */
  protected async onConsume(consumerId?: string): Promise<Message | null> {
    // 清理已过期的消息
    const expired = this.heap.filter(m => m.isExpired()).map(m => m.id);
    for (const id of expired) {
      this.removeMessage(id);
    }

    // 选出优先级最高且当前可投递的消息
    let best: Message | null = null;

    for (const candidate of this.heap) {
      // 跳过仍在消费中 (尚未被确认) 的消息, 避免重复投递
      if (this.isInFlight(candidate.id)) continue;

      // 跳过尚未到期的延迟消息
      if (candidate.delay && candidate.needsDelay()) continue;

      if (best === null || this.isHigherPriority(candidate, best)) {
        best = candidate;
      }
    }

    if (!best) return null;

    // 标记为处理中并登记 in-flight, 保证并发消费时同一条消息不会被重复投递
    return this.deliver(best, consumerId);
  }

  /**
   * 重新入队: 消息保持在堆中, 解除 in-flight 后即可再次被投递
   */
  protected async onRequeue(_message: Message): Promise<void> {
    // 消息始终保留在堆内, 无需额外操作
  }

  /**
   * 判断 a 是否应先于 b 被投递
   * 优先级更高者优先; 优先级相同时按入队顺序 (先入先出)
   */
  protected isHigherPriority(a: Message, b: Message): boolean {
    const pa = a.priority ?? 5;
    const pb = b.priority ?? 5;

    if (pa !== pb) return pa > pb;

    return (this.sequence.get(a.id) ?? 0) < (this.sequence.get(b.id) ?? 0);
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
    this.sequence.clear();
  }

  /**
   * 移除消息: 同时从堆与序号表摘除
   */
  protected removeMessage(messageId: string): void {
    const index = this.heap.findIndex(m => m.id === messageId);
    if (index > -1) {
      // 用最后一个元素补位后重新调整堆
      const last = this.heap.pop();
      if (last && index < this.heap.length) {
        this.heap[index] = last;
        this.heapifyDown(index);
        this.heapifyUp(index);
      }
    }
    this.sequence.delete(messageId);
    super.removeMessage(messageId);
  }
}