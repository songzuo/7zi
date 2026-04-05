/**
 * Multi-Channel Notifications 单元测试
 */

import {
  SlackChannel,
  DiscordChannel,
  WebhookChannel,
  createChannel,
  NotificationPayload,
  SlackChannelConfig,
  DiscordChannelConfig,
  WebhookChannelConfig,
} from '../channels';

import {
  MultiChannelAlertService,
  getAlertService,
} from '../MultiChannelAlertService';

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock fetch API
 */
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('SlackChannel', () => {
  let channel: SlackChannel;
  const config: SlackChannelConfig = {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    channel: '#alerts',
    username: '7zi Test Bot',
  };

  beforeEach(() => {
    channel = new SlackChannel(config);
    mockFetch.mockClear();
  });

  it('validateConfig - 有效配置', () => {
    expect(channel.validateConfig(config)).toBe(true);
  });

  it('validateConfig - 无效 URL', () => {
    const invalidConfig = { ...config, webhookUrl: 'invalid-url' };
    expect(channel.validateConfig(invalidConfig)).toBe(false);
  });

  it('validateConfig - 缺少 webhookUrl', () => {
    const invalidConfig = { ...config, webhookUrl: undefined };
    expect(channel.validateConfig(invalidConfig)).toBe(false);
  });

  it('send - 成功发送', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const payload: NotificationPayload = {
      title: '测试告警',
      message: '这是一个测试告警',
      severity: 'warning',
    };

    const result = await channel.send(payload);

    expect(result.success).toBe(true);
    expect(result.channelType).toBe('slack');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      config.webhookUrl,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('send - API 错误', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });

    const payload: NotificationPayload = {
      title: '测试告警',
      message: '测试',
    };

    const result = await channel.send(payload);

    expect(result.success).toBe(false);
    expect(result.error).toContain('400');
  });

  it('send - 网络错误', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const payload: NotificationPayload = {
      title: '测试告警',
      message: '测试',
    };

    const result = await channel.send(payload);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('updateConfig', () => {
    channel.updateConfig({ username: 'Updated Bot' });
    expect(channel.getConfig().username).toBe('Updated Bot');
  });
});

describe('DiscordChannel', () => {
  let channel: DiscordChannel;
  const config: DiscordChannelConfig = {
    type: 'discord',
    webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
    username: '7zi Alert',
  };

  beforeEach(() => {
    channel = new DiscordChannel(config);
    mockFetch.mockClear();
  });

  it('validateConfig - 有效配置', () => {
    expect(channel.validateConfig(config)).toBe(true);
  });

  it('validateConfig - 无效 URL', () => {
    const invalidConfig = { ...config, webhookUrl: 'invalid-url' };
    expect(channel.validateConfig(invalidConfig)).toBe(false);
  });

  it('send - 成功发送', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'msg123' }),
    });

    const payload: NotificationPayload = {
      title: '测试告警',
      message: '这是一个测试告警',
      severity: 'error',
      data: { userId: 12345 },
    };

    const result = await channel.send(payload);

    expect(result.success).toBe(true);
    expect(result.channelType).toBe('discord');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('send - 包含 mentions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const payload: NotificationPayload = {
      title: '@提及测试',
      message: '测试 Discord mentions',
      data: {
        mentions: ['<@123456789>', '<@&987654321>'],
      },
    };

    const result = await channel.send(payload);

    expect(result.success).toBe(true);
    
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.content).toContain('<@123456789>');
  });
});

describe('WebhookChannel', () => {
  let channel: WebhookChannel;
  const config: WebhookChannelConfig = {
    type: 'webhook',
    url: 'https://example.com/webhook',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer token123',
    },
  };

  beforeEach(() => {
    channel = new WebhookChannel(config);
    mockFetch.mockClear();
  });

  it('validateConfig - 有效配置', () => {
    expect(channel.validateConfig(config)).toBe(true);
  });

  it('validateConfig - 无效 URL', () => {
    const invalidConfig = { ...config, url: 'invalid-url' };
    expect(channel.validateConfig(invalidConfig)).toBe(false);
  });

  it('validateConfig - 无效方法', () => {
    const invalidConfig = { ...config, method: 'GET' as any };
    expect(channel.validateConfig(invalidConfig)).toBe(false);
  });

  it('validateConfig - 无效模板', () => {
    const invalidConfig = { ...config, bodyTemplate: 'not json' };
    expect(channel.validateConfig(invalidConfig)).toBe(false);
  });

  it('send - 成功发送（无模板）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '{"status":"ok"}',
    });

    const payload: NotificationPayload = {
      title: '测试告警',
      message: '测试 Webhook',
      severity: 'info',
    };

    const result = await channel.send(payload);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers.Authorization).toBe('Bearer token123');
  });

  it('send - 使用模板', async () => {
    const configWithTemplate: WebhookChannelConfig = {
      ...config,
      bodyTemplate: JSON.stringify({
        alert: '{{title}}',
        details: '{{message}}',
        level: '{{severity}}',
        custom: '{{customField}}',
      }),
    };
    
    channel = new WebhookChannel(configWithTemplate);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '{}',
    });

    const payload: NotificationPayload = {
      title: '模板测试',
      message: '使用模板变量',
      severity: 'warning',
      data: { customField: '自定义值' },
    };

    const result = await channel.send(payload);

    expect(result.success).toBe(true);
    
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.alert).toBe('模板测试');
    expect(body.details).toBe('使用模板变量');
    expect(body.level).toBe('warning');
    expect(body.custom).toBe('自定义值');
  });

  it('send - 重试机制', async () => {
    // 前两次失败，第三次成功
    mockFetch
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '{}',
      });

    const payload: NotificationPayload = {
      title: '重试测试',
      message: '测试重试机制',
    };

    const result = await channel.send(payload);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('static methods', () => {
    const template = '{"title":"{{title}}","msg":"{{message}}"}';
    
    // 验证模板
    const validation = WebhookChannel.validateTemplate(template);
    expect(validation.valid).toBe(true);
    
    // 提取变量
    const variables = WebhookChannel.extractTemplateVariables(template);
    expect(variables).toEqual(['title', 'message']);
    
    // 创建默认模板
    const defaultTemplate = WebhookChannel.createDefaultTemplate();
    const defaultValidation = WebhookChannel.validateTemplate(defaultTemplate);
    expect(defaultValidation.valid).toBe(true);
  });
});

describe('createChannel 工厂函数', () => {
  it('创建 Slack 渠道', () => {
    const config: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    const channel = createChannel('slack', config);
    expect(channel).toBeInstanceOf(SlackChannel);
  });

  it('创建 Discord 渠道', () => {
    const config: DiscordChannelConfig = {
      type: 'discord',
      webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
    };

    const channel = createChannel('discord', config);
    expect(channel).toBeInstanceOf(DiscordChannel);
  });

  it('创建 Webhook 渠道', () => {
    const config: WebhookChannelConfig = {
      type: 'webhook',
      url: 'https://example.com/webhook',
    };

    const channel = createChannel('webhook', config);
    expect(channel).toBeInstanceOf(WebhookChannel);
  });

  it('类型不匹配返回 null', () => {
    const config: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    const channel = createChannel('discord', config);
    expect(channel).toBeNull();
  });

  it('无效配置返回 null', () => {
    const config: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'invalid-url',
    };

    const channel = createChannel('slack', config);
    expect(channel).toBeNull();
  });
});

describe('MultiChannelAlertService', () => {
  let service: MultiChannelAlertService;

  beforeEach(() => {
    service = new MultiChannelAlertService();
    mockFetch.mockClear();
  });

  it('注册渠道', () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    const result = service.registerChannel('slack-primary', 'slack', slackConfig);
    expect(result).toBe(true);
    expect(service.getChannelNames()).toContain('slack-primary');
  });

  it('移除渠道', () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    service.registerChannel('slack-temp', 'slack', slackConfig);
    expect(service.getChannelNames()).toContain('slack-temp');
    
    service.removeChannel('slack-temp');
    expect(service.getChannelNames()).not.toContain('slack-temp');
  });

  it('设置和获取默认渠道', () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    const discordConfig: DiscordChannelConfig = {
      type: 'discord',
      webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);
    service.registerChannel('discord', 'discord', discordConfig);

    service.setDefaultChannels(['slack', 'discord']);
    expect(service.getDefaultChannels()).toEqual(['slack', 'discord']);
  });

  it('启用/禁用渠道', () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);
    expect(service.isChannelEnabled('slack')).toBe(true);

    service.setChannelEnabled('slack', false);
    expect(service.isChannelEnabled('slack')).toBe(false);
  });

  it('alert - 发送到默认渠道', async () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);
    service.setDefaultChannels(['slack']);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const payload: NotificationPayload = {
      title: '测试',
      message: '测试告警',
    };

    const result = await service.alert(payload);

    expect(result.allSuccess).toBe(true);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].name).toBe('slack');
  });

  it('alert - 发送到指定渠道', async () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const payload: NotificationPayload = {
      title: '测试',
      message: '测试告警',
    };

    const result = await service.alert(payload, ['slack']);

    expect(result.allSuccess).toBe(true);
  });

  it('alert - 部分渠道失败', async () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    const discordConfig: DiscordChannelConfig = {
      type: 'discord',
      webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);
    service.registerChannel('discord', 'discord', discordConfig);

    // Slack 成功，Discord 失败
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'Error' });

    const payload: NotificationPayload = {
      title: '测试',
      message: '测试告警',
    };

    const result = await service.alert(payload, ['slack', 'discord']);

    expect(result.allSuccess).toBe(false);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });

  it('alert - 单渠道失败不影响其他', async () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    const webhookConfig: WebhookChannelConfig = {
      type: 'webhook',
      url: 'https://example.com/webhook',
    };

    service.registerChannel('slack', 'slack', slackConfig);
    service.registerChannel('webhook', 'webhook', webhookConfig);

    // Slack 成功，Webhook 失败
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockRejectedValueOnce(new Error('Network error'));

    const payload: NotificationPayload = {
      title: '测试',
      message: '测试告警',
    };

    const result = await service.alert(payload, ['slack', 'webhook']);

    // 验证两个渠道都尝试发送了
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // 验证结果统计
    expect(result.results.length).toBe(2);
  });

  it('alertTo - 发送到单个渠道', async () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const payload: NotificationPayload = {
      title: '测试',
      message: '测试告警',
    };

    const result = await service.alertTo('slack', payload);

    expect(result.success).toBe(true);
  });

  it('alertBatch - 批量发送', async () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const alerts = [
      {
        payload: { title: '告警1', message: '第一个告警' },
        channels: ['slack'],
      },
      {
        payload: { title: '告警2', message: '第二个告警' },
        channels: ['slack'],
      },
    ];

    const results = await service.alertBatch(alerts);

    expect(results).toHaveLength(2);
    expect(results[0].allSuccess).toBe(true);
    expect(results[1].allSuccess).toBe(true);
  });

  it('getStatus - 获取服务状态', () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    const discordConfig: DiscordChannelConfig = {
      type: 'discord',
      webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);
    service.registerChannel('discord', 'discord', discordConfig);
    service.setDefaultChannels(['slack']);
    service.setChannelEnabled('discord', false);

    const status = service.getStatus();

    expect(status.totalChannels).toBe(2);
    expect(status.enabledChannels).toBe(1);
    expect(status.disabledChannels).toBe(1);
    expect(status.defaultChannels).toEqual(['slack']);
    expect(status.channels).toHaveLength(2);
  });

  it('clear - 清空所有渠道', () => {
    const slackConfig: SlackChannelConfig = {
      type: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    };

    service.registerChannel('slack', 'slack', slackConfig);
    service.setDefaultChannels(['slack']);

    expect(service.getChannelNames()).toHaveLength(1);

    service.clear();

    expect(service.getChannelNames()).toHaveLength(0);
    expect(service.getDefaultChannels()).toHaveLength(0);
  });
});