/**
 * 多渠道告警服务
 * 支持同时向多个渠道发送通知
 */

import {
  NotificationChannel,
  NotificationPayload,
  SendResult,
  ChannelType,
  ChannelConfig,
  createChannel,
} from './channels';

/**
 * 渠道注册项
 */
export interface ChannelRegistryItem {
  /** 渠道名称/标识符 */
  name: string;
  /** 渠道类型 */
  type: ChannelType;
  /** 渠道配置 */
  config: ChannelConfig;
  /** 渠道实例 */
  channel: NotificationChannel;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 多渠道告警结果
 */
export interface MultiChannelAlertResult {
  /** 是否全部成功 */
  allSuccess: boolean;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 各渠道结果 */
  results: Array<{
    name: string;
    type: ChannelType;
    result: SendResult;
  }>;
}

/**
 * 多渠道告警服务
 */
export class MultiChannelAlertService {
  private channels: Map<string, ChannelRegistryItem> = new Map();
  private defaultChannels: string[] = [];

  /**
   * 注册渠道
   * @param name 渠道名称
   * @param type 渠道类型
   * @param config 渠道配置
   * @param enabled 是否启用（默认 true）
   * @returns 是否注册成功
   */
  registerChannel(
    name: string,
    type: ChannelType,
    config: ChannelConfig,
    enabled: boolean = true
  ): boolean {
    const channel = createChannel(type, config);
    
    if (!channel) {
      console.error(`Failed to create channel: ${name} (${type})`);
      return false;
    }

    const item: ChannelRegistryItem = {
      name,
      type,
      config,
      channel,
      enabled,
    };

    this.channels.set(name, item);
    return true;
  }

  /**
   * 移除渠道
   * @param name 渠道名称
   */
  removeChannel(name: string): boolean {
    return this.channels.delete(name);
  }

  /**
   * 获取渠道
   * @param name 渠道名称
   */
  getChannel(name: string): NotificationChannel | undefined {
    return this.channels.get(name)?.channel;
  }

  /**
   * 获取所有渠道名称
   */
  getChannelNames(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * 设置默认渠道
   * @param names 渠道名称数组
   */
  setDefaultChannels(names: string[]): void {
    // 验证所有渠道都存在
    const validNames = names.filter(name => this.channels.has(name));
    this.defaultChannels = validNames;
  }

  /**
   * 获取默认渠道
   */
  getDefaultChannels(): string[] {
    return [...this.defaultChannels];
  }

  /**
   * 启用/禁用渠道
   * @param name 渠道名称
   * @param enabled 是否启用
   */
  setChannelEnabled(name: string, enabled: boolean): boolean {
    const item = this.channels.get(name);
    if (!item) return false;
    
    item.enabled = enabled;
    return true;
  }

  /**
   * 检查渠道是否启用
   * @param name 渠道名称
   */
  isChannelEnabled(name: string): boolean {
    return this.channels.get(name)?.enabled ?? false;
  }

  /**
   * 发送告警到指定渠道
   * @param payload 通知负载
   * @param channelNames 渠道名称数组（默认使用默认渠道）
   * @returns 多渠道告警结果
   */
  async alert(
    payload: NotificationPayload,
    channelNames?: string[]
  ): Promise<MultiChannelAlertResult> {
    const targetChannels = channelNames || this.defaultChannels;
    
    if (targetChannels.length === 0) {
      return {
        allSuccess: false,
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    // 并行发送所有渠道
    const results = await Promise.all(
      targetChannels.map(async (name) => {
        const item = this.channels.get(name);
        
        if (!item) {
          return {
            name,
            type: 'webhook' as ChannelType,
            result: {
              success: false,
              error: `Channel not found: ${name}`,
              channelType: 'webhook',
            } as SendResult,
          };
        }

        if (!item.enabled) {
          return {
            name,
            type: item.type,
            result: {
              success: false,
              error: `Channel disabled: ${name}`,
              channelType: item.type,
            } as SendResult,
          };
        }

        try {
          const sendResult = await item.channel.send(payload);
          return {
            name,
            type: item.type,
            result: sendResult,
          };
        } catch (error) {
          return {
            name,
            type: item.type,
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              channelType: item.type,
            } as SendResult,
          };
        }
      })
    );

    const successCount = results.filter(r => r.result.success).length;
    const failureCount = results.filter(r => !r.result.success).length;

    return {
      allSuccess: failureCount === 0,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * 发送告警到所有启用的渠道
   * @param payload 通知负载
   */
  async alertAll(payload: NotificationPayload): Promise<MultiChannelAlertResult> {
    const enabledChannels = Array.from(this.channels.entries())
      .filter(([_, item]) => item.enabled)
      .map(([name]) => name);

    return this.alert(payload, enabledChannels);
  }

  /**
   * 发送告警到单一渠道（别名方法）
   * @param channelName 渠道名称
   * @param payload 通知负载
   */
  async alertTo(
    channelName: string,
    payload: NotificationPayload
  ): Promise<SendResult> {
    const result = await this.alert(payload, [channelName]);
    return result.results[0]?.result || {
      success: false,
      error: 'Channel not found',
      channelType: 'webhook',
    };
  }

  /**
   * 批量发送（为每个负载选择不同渠道）
   * @param alerts 告警数组，每项包含 payload 和渠道
   */
  async alertBatch(
    alerts: Array<{
      payload: NotificationPayload;
      channels?: string[];
    }>
  ): Promise<MultiChannelAlertResult[]> {
    return Promise.all(
      alerts.map(alert => this.alert(alert.payload, alert.channels))
    );
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    totalChannels: number;
    enabledChannels: number;
    disabledChannels: number;
    defaultChannels: string[];
    channels: Array<{
      name: string;
      type: ChannelType;
      enabled: boolean;
    }>;
  } {
    const channelList = Array.from(this.channels.values());
    const enabledCount = channelList.filter(c => c.enabled).length;

    return {
      totalChannels: this.channels.size,
      enabledChannels: enabledCount,
      disabledChannels: this.channels.size - enabledCount,
      defaultChannels: [...this.defaultChannels],
      channels: channelList.map(c => ({
        name: c.name,
        type: c.type,
        enabled: c.enabled,
      })),
    };
  }

  /**
   * 清空所有渠道
   */
  clear(): void {
    this.channels.clear();
    this.defaultChannels = [];
  }
}

/**
 * 创建默认的多渠道告警服务实例
 */
let defaultService: MultiChannelAlertService | null = null;

export function getAlertService(): MultiChannelAlertService {
  if (!defaultService) {
    defaultService = new MultiChannelAlertService();
  }
  return defaultService;
}

export function createAlertService(): MultiChannelAlertService {
  return new MultiChannelAlertService();
}