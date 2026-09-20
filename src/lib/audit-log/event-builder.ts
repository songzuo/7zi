/**
 * 审计日志系统 - 事件构建器
 * @module lib/audit-log/event-builder
 * @version 1.10.0
 */

import type {
  AuditEvent,
  AuditLogLevel,
  AuditEventCategory,
  AuditActionType,
  AuditResultStatus,
  AuditSeverity,
  AuditUserContext,
  AuditRequestContext,
  AuditResource,
  AuditChangeDetail,
} from './types.js';

/**
 * 审计事件构建器
 * 提供流畅的 API 来构建审计事件
 */
export class AuditEventBuilder {
  private event: Partial<AuditEvent> = {};

  /**
   * 设置事件ID
   */
  public withId(id: string): this {
    this.event.id = id;
    return this;
  }

  /**
   * 设置时间戳
   */
  public withTimestamp(timestamp: Date): this {
    this.event.timestamp = timestamp;
    return this;
  }

  /**
   * 设置事件级别
   */
  public withLevel(level: AuditLogLevel): this {
    this.event.level = level;
    return this;
  }

  /**
   * 设置事件类别
   */
  public withCategory(category: AuditEventCategory): this {
    this.event.category = category;
    return this;
  }

  /**
   * 设置操作类型
   */
  public withAction(action: AuditActionType): this {
    this.event.action = action;
    return this;
  }

  /**
   * 设置自定义操作名称
   */
  public withActionName(name: string): this {
    this.event.actionName = name;
    return this;
  }

  /**
   * 设置结果状态
   */
  public withStatus(status: AuditResultStatus): this {
    this.event.status = status;
    return this;
  }

  /**
   * 设置严重程度
   */
  public withSeverity(severity: AuditSeverity): this {
    this.event.severity = severity;
    return this;
  }

  /**
   * 设置事件消息
   */
  public withMessage(message: string): this {
    this.event.message = message;
    return this;
  }

  /**
   * 设置事件详情
   */
  public withDetails(details: Record<string, unknown> | undefined): this {
    if (details) {
      this.event.details = { ...details };
    }
    return this;
  }

  /**
   * 添加单个详情字段
   */
  public addDetail(key: string, value: unknown): this {
    if (!this.event.details) {
      this.event.details = {};
    }
    this.event.details[key] = value;
    return this;
  }

  /**
   * 设置用户上下文
   */
  public withUser(user: AuditUserContext | undefined): this {
    if (user) {
      this.event.user = { ...user };
    }
    return this;
  }

  /**
   * 设置请求上下文
   */
  public withRequest(request: AuditRequestContext | undefined): this {
    if (request) {
      this.event.request = { ...request };
    }
    return this;
  }

  /**
   * 设置资源信息
   */
  public withResource(resource: AuditResource | undefined): this {
    if (resource) {
      this.event.resource = { ...resource };
    }
    return this;
  }

  /**
   * 设置变更详情
   */
  public withChanges(changes: AuditChangeDetail[] | undefined): this {
    if (changes) {
      this.event.changes = [...changes];
    }
    return this;
  }

  /**
   * 添加单个变更记录
   */
  public addChange(change: AuditChangeDetail): this {
    if (!this.event.changes) {
      this.event.changes = [];
    }
    this.event.changes.push(change);
    return this;
  }

  /**
   * 设置错误信息
   */
  public withError(
    error: { code?: string; message: string; stack?: string } | undefined
  ): this {
    if (error) {
      this.event.error = { ...error };
    }
    return this;
  }

  /**
   * 设置关联事件ID
   */
  public withCorrelationId(correlationId: string | undefined): this {
    if (correlationId) {
      this.event.correlationId = correlationId;
    }
    return this;
  }

  /**
   * 设置父事件ID
   */
  public withParentId(parentId: string | undefined): this {
    if (parentId) {
      this.event.parentId = parentId;
    }
    return this;
  }

  /**
   * 设置标签
   */
  public withTags(tags: string[] | undefined): this {
    if (tags) {
      this.event.tags = [...tags];
    }
    return this;
  }

  /**
   * 添加单个标签
   */
  public addTag(tag: string): this {
    if (!this.event.tags) {
      this.event.tags = [];
    }
    this.event.tags.push(tag);
    return this;
  }

  /**
   * 设置元数据
   */
  public withMetadata(metadata: Record<string, unknown> | undefined): this {
    if (metadata) {
      this.event.metadata = this.event.metadata
        ? { ...this.event.metadata, ...metadata }
        : { ...metadata };
    }
    return this;
  }

  /**
   * 添加单个元数据字段
   */
  public addMetadata(key: string, value: unknown): this {
    if (!this.event.metadata) {
      this.event.metadata = {};
    }
    this.event.metadata[key] = value;
    return this;
  }

  /**
   * 设置签名
   */
  public withSignature(signature: string): this {
    this.event.signature = signature;
    return this;
  }

  /**
   * 设置为成功状态
   */
  public success(): this {
    this.event.status = 'success';
    this.event.level = this.event.level || 'info';
    return this;
  }

  /**
   * 设置为失败状态
   */
  public failure(): this {
    this.event.status = 'failure';
    this.event.level = this.event.level || 'warn';
    return this;
  }

  /**
   * 设置为部分成功状态
   */
  public partial(): this {
    this.event.status = 'partial';
    this.event.level = this.event.level || 'warn';
    return this;
  }

  /**
   * 设置为低严重程度
   */
  public lowSeverity(): this {
    this.event.severity = 'low';
    return this;
  }

  /**
   * 设置为中等严重程度
   */
  public mediumSeverity(): this {
    this.event.severity = 'medium';
    return this;
  }

  /**
   * 设置为高严重程度
   */
  public highSeverity(): this {
    this.event.severity = 'high';
    return this;
  }

  /**
   * 设置为关键严重程度
   */
  public criticalSeverity(): this {
    this.event.severity = 'critical';
    this.event.level = 'critical';
    return this;
  }

  /**
   * 从现有事件复制
   */
  public fromEvent(event: Partial<AuditEvent>): this {
    this.event = { ...event };
    return this;
  }

  /**
   * 构建事件
   */
  public build(): AuditEvent {
    // 验证必需字段
    const requiredFields: (keyof AuditEvent)[] = [
      'id',
      'timestamp',
      'level',
      'category',
      'action',
      'status',
      'severity',
      'message',
    ];

    const missingFields = requiredFields.filter((field) => !this.event[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required audit event fields: ${missingFields.join(', ')}`
      );
    }

    // 返回完整事件
    return this.event as AuditEvent;
  }

  /**
   * 获取部分构建的事件 (用于调试)
   */
  public peek(): Partial<AuditEvent> {
    return { ...this.event };
  }

  /**
   * 重置构建器
   */
  public reset(): this {
    this.event = {};
    return this;
  }

  /**
   * 克隆构建器
   */
  public clone(): AuditEventBuilder {
    const cloned = new AuditEventBuilder();
    cloned.event = { ...this.event };
    if (this.event.details) {
      cloned.event.details = { ...this.event.details };
    }
    if (this.event.tags) {
      cloned.event.tags = [...this.event.tags];
    }
    if (this.event.changes) {
      cloned.event.changes = [...this.event.changes];
    }
    return cloned;
  }
}

/**
 * 便捷方法：创建新的事件构建器
 */
export function createAuditEvent(): AuditEventBuilder {
  return new AuditEventBuilder();
}

/**
 * 快速创建简单审计事件
 */
export function quickAuditEvent(
  category: AuditEventCategory,
  action: AuditActionType,
  message: string,
  options?: {
    level?: AuditLogLevel;
    status?: AuditResultStatus;
    severity?: AuditSeverity;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
  }
): AuditEvent {
  const builder = createAuditEvent()
    .withId(generateEventId())
    .withTimestamp(new Date())
    .withCategory(category)
    .withAction(action)
    .withMessage(message);

  if (options?.level) {
    builder.withLevel(options.level);
  } else {
    builder.withLevel('info');
  }

  if (options?.status) {
    builder.withStatus(options.status);
  } else {
    builder.withStatus('success');
  }

  if (options?.severity) {
    builder.withSeverity(options.severity);
  } else {
    builder.withSeverity('low');
  }

  if (options?.userId) {
    builder.withUser({ userId: options.userId });
  }

  if (options?.resourceType || options?.resourceId) {
    builder.withResource({
      type: options.resourceType || 'unknown',
      id: options.resourceId,
    });
  }

  return builder.build();
}

/**
 * 生成事件ID
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `audit_${timestamp}_${random}`;
}