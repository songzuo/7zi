/**
 * 审计日志系统 - 查询服务
 * @module lib/audit-log/query-service
 * @version 1.10.0
 */

import type {
  AuditEvent,
  AuditQueryOptions,
  AuditQueryResult,
  AuditQueryFilter,
  AuditSortOption,
  AuditPagination,
} from './types.js';
import type { AuditLogStorage } from './types.js';

/**
 * 审计日志查询服务
 */
export class AuditQueryService {
  constructor(private storage: AuditLogStorage) {}

  /**
   * 查询审计日志
   */
  public async query(options: AuditQueryOptions): Promise<AuditQueryResult> {
    return this.storage.query(options);
  }

  /**
   * 按ID获取事件
   */
  public async getById(id: string): Promise<AuditEvent | null> {
    return this.storage.getById(id);
  }

  /**
   * 按用户ID查询
   */
  public async getByUserId(
    userId: string,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { userIds: [userId] },
      ...options,
    });
  }

  /**
   * 按时间范围查询
   */
  public async getByTimeRange(
    start: Date,
    end: Date,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { timeRange: { start, end } },
      ...options,
    });
  }

  /**
   * 按类别查询
   */
  public async getByCategory(
    category: string,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { categories: [category] },
      ...options,
    });
  }

  /**
   * 按操作类型查询
   */
  public async getByAction(
    action: string,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { actions: [action] },
      ...options,
    });
  }

  /**
   * 按资源查询
   */
  public async getByResource(
    resourceType: string,
    resourceId?: string,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    const filter: AuditQueryFilter = { resourceTypes: [resourceType] };
    if (resourceId) {
      filter.resourceIds = [resourceId];
    }

    return this.query({
      filter,
      ...options,
    });
  }

  /**
   * 全文搜索
   */
  public async search(
    query: string,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { searchQuery: query },
      ...options,
    });
  }

  /**
   * 按会话ID查询
   */
  public async getBySessionId(
    sessionId: string,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { sessionIds: [sessionId] },
      ...options,
    });
  }

  /**
   * 按关联ID查询
   */
  public async getByCorrelationId(
    correlationId: string,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { correlationId },
      ...options,
    });
  }

  /**
   * 按客户端IP查询
   */
  public async getByClientIp(
    clientIp: string,
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { clientIps: [clientIp] },
      ...options,
    });
  }

  /**
   * 获取失败的操作
   */
  public async getFailedOperations(
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { statuses: ['failure'] },
      sort: { field: 'timestamp', order: 'desc' },
      ...options,
    });
  }

  /**
   * 获取安全事件
   */
  public async getSecurityEvents(
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { categories: ['security'] },
      sort: { field: 'timestamp', order: 'desc' },
      ...options,
    });
  }

  /**
   * 获取管理操作
   */
  public async getAdminOperations(
    options?: Partial<AuditQueryOptions>
  ): Promise<AuditQueryResult> {
    return this.query({
      filter: { categories: ['admin'] },
      sort: { field: 'timestamp', order: 'desc' },
      ...options,
    });
  }

  /**
   * 构建复杂查询
   */
  public buildQuery(): QueryBuilder {
    return new QueryBuilder(this.storage);
  }
}

/**
 * 查询构建器
 * 提供流畅的 API 来构建复杂查询
 */
export class QueryBuilder {
  private filter: AuditQueryFilter = {};
  private sort?: AuditSortOption;
  private pagination?: AuditPagination;
  private includeDetails = true;
  private includeChanges = true;
  private includeMetadata = true;

  constructor(private storage: AuditLogStorage) {}

  /**
   * 设置时间范围
   */
  public timeRange(start: Date, end: Date): this {
    this.filter.timeRange = { start, end };
    return this;
  }

  /**
   * 设置用户ID
   */
  public userIds(...ids: string[]): this {
    this.filter.userIds = ids;
    return this;
  }

  /**
   * 设置用户名
   */
  public usernames(...names: string[]): this {
    this.filter.usernames = names;
    return this;
  }

  /**
   * 设置组织ID
   */
  public organizationIds(...ids: string[]): this {
    this.filter.organizationIds = ids;
    return this;
  }

  /**
   * 设置事件级别
   */
  public levels(...levels: string[]): this {
    this.filter.levels = levels;
    return this;
  }

  /**
   * 设置事件类别
   */
  public categories(...categories: string[]): this {
    this.filter.categories = categories;
    return this;
  }

  /**
   * 设置操作类型
   */
  public actions(...actions: string[]): this {
    this.filter.actions = actions;
    return this;
  }

  /**
   * 设置结果状态
   */
  public statuses(...statuses: string[]): this {
    this.filter.statuses = statuses;
    return this;
  }

  /**
   * 设置严重程度
   */
  public severities(...severities: string[]): this {
    this.filter.severities = severities;
    return this;
  }

  /**
   * 设置资源类型
   */
  public resourceTypes(...types: string[]): this {
    this.filter.resourceTypes = types;
    return this;
  }

  /**
   * 设置资源ID
   */
  public resourceIds(...ids: string[]): this {
    this.filter.resourceIds = ids;
    return this;
  }

  /**
   * 设置搜索关键词
   */
  public search(query: string): this {
    this.filter.searchQuery = query;
    return this;
  }

  /**
   * 设置标签
   */
  public tags(...tags: string[]): this {
    this.filter.tags = tags;
    return this;
  }

  /**
   * 设置会话ID
   */
  public sessionIds(...ids: string[]): this {
    this.filter.sessionIds = ids;
    return this;
  }

  /**
   * 设置关联ID
   */
  public correlationId(id: string): this {
    this.filter.correlationId = id;
    return this;
  }

  /**
   * 设置客户端IP
   */
  public clientIps(...ips: string[]): this {
    this.filter.clientIps = ips;
    return this;
  }

  /**
   * 设置排序
   */
  public sortBy(field: string, order: 'asc' | 'desc' = 'desc'): this {
    this.sort = { field, order };
    return this;
  }

  /**
   * 设置分页
   */
  public paginate(page: number, pageSize: number): this {
    this.pagination = { page, pageSize };
    return this;
  }

  /**
   * 设置是否包含详情
   */
  public includeDetailsField(include: boolean): this {
    this.includeDetails = include;
    return this;
  }

  /**
   * 设置是否包含变更记录
   */
  public includeChangesField(include: boolean): this {
    this.includeChanges = include;
    return this;
  }

  /**
   * 设置是否包含元数据
   */
  public includeMetadataField(include: boolean): this {
    this.includeMetadata = include;
    return this;
  }

  /**
   * 执行查询
   */
  public async execute(): Promise<AuditQueryResult> {
    return this.storage.query({
      filter: this.filter,
      sort: this.sort,
      pagination: this.pagination,
      includeDetails: this.includeDetails,
      includeChanges: this.includeChanges,
      includeMetadata: this.includeMetadata,
    });
  }

  /**
   * 获取总数
   */
  public async count(): Promise<number> {
    const result = await this.execute();
    return result.total;
  }

  /**
   * 检查是否存在
   */
  public async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  /**
   * 获取第一条
   */
  public async first(): Promise<AuditEvent | null> {
    const result = await this.paginate(1, 1).execute();
    return result.data[0] || null;
  }

  /**
   * 获取所有结果 (不分页)
   */
  public async all(): Promise<AuditEvent[]> {
    const result = await this.execute();
    return result.data;
  }
}