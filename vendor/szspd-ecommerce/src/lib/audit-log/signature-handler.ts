/**
 * 审计日志系统 - 数据完整性签名
 * @module lib/audit-log/signature-handler
 * @version 1.10.0
 */

import type { AuditEvent } from './types.js';
import crypto from 'crypto';

/**
 * 审计日志签名处理器
 * 提供数据完整性验证，防止日志被篡改
 */
export class AuditSignatureHandler {
  private enabled: boolean;
  private secretKey: string;
  private algorithm: string = 'sha256';

  constructor(enabled: boolean = true, secretKey?: string) {
    this.enabled = enabled;
    this.secretKey = secretKey || this.generateDefaultKey();
  }

  /**
   * 对审计事件进行签名
   */
  public sign(event: AuditEvent): AuditEvent {
    if (!this.enabled) {
      return event;
    }

    const signature = this.generateSignature(event);
    return {
      ...event,
      signature,
    };
  }

  /**
   * 验证审计事件签名
   */
  public verify(event: AuditEvent): boolean {
    if (!this.enabled || !event.signature) {
      return true;
    }

    const expectedSignature = this.generateSignature(event);
    return event.signature === expectedSignature;
  }

  /**
   * 批量验证签名
   */
  public verifyBatch(events: AuditEvent[]): { valid: AuditEvent[]; invalid: AuditEvent[] } {
    const valid: AuditEvent[] = [];
    const invalid: AuditEvent[] = [];

    for (const event of events) {
      if (this.verify(event)) {
        valid.push(event);
      } else {
        invalid.push(event);
      }
    }

    return { valid, invalid };
  }

  /**
   * 生成签名
   */
  private generateSignature(event: AuditEvent): string {
    // 创建签名字符串
    const dataToSign = this.createSignableString(event);
    
    // 使用 HMAC 签名
    const hmac = crypto.createHmac(this.algorithm, this.secretKey);
    hmac.update(dataToSign);
    return hmac.digest('hex');
  }

  /**
   * 创建可签名字符串
   * 从事件中提取关键数据，排除签名本身
   */
  private createSignableString(event: AuditEvent): string {
    const fields = [
      event.id,
      event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
      event.level,
      event.category,
      event.action,
      event.status,
      event.severity,
      event.message,
    ];

    // 添加用户ID (如果有)
    if (event.user?.userId) {
      fields.push(event.user.userId);
    }

    // 添加资源信息 (如果有)
    if (event.resource) {
      fields.push(event.resource.type);
      if (event.resource.id) {
        fields.push(event.resource.id);
      }
    }

    // 添加关联ID (如果有)
    if (event.correlationId) {
      fields.push(event.correlationId);
    }

    return fields.join('|');
  }

  /**
   * 生成默认密钥
   */
  private generateDefaultKey(): string {
    // 在生产环境中应该从环境变量或密钥管理系统获取
    const envKey = process.env.AUDIT_LOG_SIGNING_KEY;
    if (envKey) {
      return envKey;
    }

    // 开发环境使用固定密钥 (生产环境必须使用环境变量)
    console.warn(
      'AUDIT_LOG_SIGNING_KEY environment variable not set. Using development key. ' +
      'This is not secure for production!'
    );
    return 'dev-audit-log-signing-key-please-change-in-production';
  }

  /**
   * 更新密钥
   */
  public updateSecretKey(newKey: string): void {
    if (!newKey || newKey.length < 32) {
      throw new Error('Secret key must be at least 32 characters long');
    }
    this.secretKey = newKey;
  }

  /**
   * 生成新的密钥对 (用于初始化或密钥轮换)
   */
  public static generateNewKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 获取签名状态
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 启用签名
   */
  public enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用签名
   */
  public disable(): void {
    this.enabled = false;
  }

  /**
   * 计算事件的哈希值 (用于链式验证)
   */
  public hashEvent(event: AuditEvent): string {
    const dataToHash = this.createSignableString(event);
    return crypto.createHash(this.algorithm).update(dataToHash).digest('hex');
  }

  /**
   * 验证事件链的完整性
   * 用于验证一系列事件的顺序和完整性
   */
  public verifyEventChain(events: AuditEvent[]): {
    valid: boolean;
    breakIndex?: number;
    details: string[];
  } {
    const details: string[] = [];

    if (events.length === 0) {
      return { valid: true, details: ['Empty event chain'] };
    }

    // 按时间戳排序
    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 验证每个事件的签名
    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      if (!this.verify(event)) {
        return {
          valid: false,
          breakIndex: i,
          details: [...details, `Signature verification failed at index ${i}`],
        };
      }
      details.push(`Event ${i}: ${event.id} - Signature valid`);
    }

    // 验证事件链 (如果有关联ID)
    for (let i = 1; i < sortedEvents.length; i++) {
      const current = sortedEvents[i];
      const previous = sortedEvents[i - 1];

      if (current.parentId && current.parentId !== previous.id) {
        details.push(
          `Warning: Event ${i} parent ID does not match previous event ID`
        );
      }
    }

    return {
      valid: true,
      details,
    };
  }

  /**
   * 创建事件链签名
   * 将前一个事件的哈希包含在当前事件中
   */
  public signEventChain(events: AuditEvent[]): AuditEvent[] {
    if (events.length === 0) {
      return events;
    }

    const signedEvents: AuditEvent[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = { ...events[i] };

      // 如果不是第一个事件，包含前一个事件的哈希
      if (i > 0 && signedEvents[i - 1].signature) {
        event.metadata = {
          ...event.metadata,
          previousEventHash: signedEvents[i - 1].signature,
        };
      }

      // 签名当前事件
      signedEvents.push(this.sign(event));
    }

    return signedEvents;
  }

  /**
   * 计算事件指纹 (用于检测重复事件)
   */
  public calculateFingerprint(event: AuditEvent): string {
    const fingerprintData = [
      event.category,
      event.action,
      event.user?.userId || 'anonymous',
      event.resource?.type || '',
      event.resource?.id || '',
      event.message,
    ].join('|');

    return crypto.createHash('md5').update(fingerprintData).digest('hex');
  }
}