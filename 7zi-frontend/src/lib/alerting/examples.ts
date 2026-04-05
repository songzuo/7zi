/**
 * Multi-Channel Notifications 使用示例
 * 演示如何创建和使用多渠道通知系统
 */

import {
  SlackChannel,
  DiscordChannel,
  WebhookChannel,
  MultiChannelAlertService,
  getAlertService,
  type NotificationPayload,
  type SlackChannelConfig,
  type DiscordChannelConfig,
  type WebhookChannelConfig,
} from './index';

/**
 * 示例 1: 创建和使用 Slack 渠道
 */
async function example1_SlackChannel() {
  console.log('=== 示例 1: Slack 渠道 ===\n');

  const slackConfig: SlackChannelConfig = {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    channel: '#alerts',
    username: '7zi Alert Bot',
    iconEmoji: ':warning:',
  };

  const slackChannel = new SlackChannel(slackConfig);

  // 验证配置
  if (!slackChannel.validateConfig(slackConfig)) {
    console.error('Slack 配置无效');
    return;
  }

  const payload: NotificationPayload = {
    title: '系统警告',
    message: '服务器 CPU 使用率超过 90%',
    severity: 'warning',
    data: {
      server: 'prod-server-1',
      cpuUsage: 92,
      memoryUsage: 45,
    },
  };

  const result = await slackChannel.send(payload);
  console.log('Slack 发送结果:', result);
  console.log('');
}

/**
 * 示例 2: 创建和使用 Discord 渠道
 */
async function example2_DiscordChannel() {
  console.log('=== 示例 2: Discord 渠道 ===\n');

  const discordConfig: DiscordChannelConfig = {
    type: 'discord',
    webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
    username: '7zi Alert System',
    avatarUrl: 'https://example.com/avatar.png',
  };

  const discordChannel = new DiscordChannel(discordConfig);

  const payload: NotificationPayload = {
    title: '错误报告',
    message: '支付服务异常',
    severity: 'error',
    data: {
      service: 'payment-gateway',
      error: 'Connection timeout',
      requestId: 'req_123456',
    },
  };

  const result = await discordChannel.send(payload);
  console.log('Discord 发送结果:', result);
  console.log('');
}

/**
 * 示例 3: Discord Mentions
 */
async function example3_DiscordMentions() {
  console.log('=== 示例 3: Discord Mentions ===\n');

  const discordConfig: DiscordChannelConfig = {
    type: 'discord',
    webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
  };

  const discordChannel = new DiscordChannel(discordConfig);

  const payload: NotificationPayload = {
    title: '严重故障',
    message: '数据库连接失败',
    severity: 'critical',
    data: {
      mentions: ['<@123456789>', '<@&987654321>'], // @user 和 @role
      database: 'prod-db-1',
    },
  };

  const result = await discordChannel.send(payload);
  console.log('Discord Mentions 发送结果:', result);
  console.log('');
}

/**
 * 示例 4: 通用 Webhook 渠道
 */
async function example4_WebhookChannel() {
  console.log('=== 示例 4: Webhook 渠道 ===\n');

  // 无模板
  const webhookConfig: WebhookChannelConfig = {
    type: 'webhook',
    url: 'https://example.com/api/alerts',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-token',
      'X-Custom-Header': 'custom-value',
    },
    retries: 3,
  };

  const webhookChannel = new WebhookChannel(webhookConfig);

  const payload: NotificationPayload = {
    title: '自定义 Webhook',
    message: '发送到自定义端点',
    severity: 'info',
  };

  const result = await webhookChannel.send(payload);
  console.log('Webhook 发送结果:', result);
  console.log('');
}

/**
 * 示例 5: Webhook 模板
 */
async function example5_WebhookTemplate() {
  console.log('=== 示例 5: Webhook 模板 ===\n');

  const webhookConfig: WebhookChannelConfig = {
    type: 'webhook',
    url: 'https://example.com/api/alerts',
    method: 'POST',
    bodyTemplate: JSON.stringify({
      event: 'alert',
      title: '{{title}}',
      description: '{{message}}',
      level: '{{severity}}',
      timestamp: '{{timestamp}}',
      metadata: {
        server: '{{server}}',
        application: '{{app}}',
      },
    }),
  };

  const webhookChannel = new WebhookChannel(webhookConfig);

  const payload: NotificationPayload = {
    title: '模板告警',
    message: '使用变量替换',
    severity: 'warning',
    data: {
      server: 'server-01',
      app: '7zi-frontend',
    },
  };

  const result = await webhookChannel.send(payload);
  console.log('Webhook 模板发送结果:', result);
  console.log('');
}

/**
 * 示例 6: 使用工厂函数创建渠道
 */
async function example6_ChannelFactory() {
  console.log('=== 示例 6: 渠道工厂函数 ===\n');

  const slackConfig: SlackChannelConfig = {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
  };

  const slackChannel = createChannel('slack', slackConfig);

  if (!slackChannel) {
    console.error('创建渠道失败');
    return;
  }

  console.log('创建的渠道类型:', slackChannel.type);
  console.log('');
}

/**
 * 示例 7: 多渠道服务 - 注册渠道
 */
function example7_MultiChannelService() {
  console.log('=== 示例 7: 多渠道服务 - 注册渠道 ===\n');

  const service = new MultiChannelAlertService();

  // 注册 Slack 渠道
  service.registerChannel('slack-primary', 'slack', {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
    channel: '#alerts',
  });

  // 注册 Discord 渠道
  service.registerChannel('discord-alerts', 'discord', {
    type: 'discord',
    webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
  });

  // 注册 Webhook 渠道
  service.registerChannel('webhook-logs', 'webhook', {
    type: 'webhook',
    url: 'https://logs.example.com/api/webhook',
    method: 'POST',
  });

  // 设置默认渠道
  service.setDefaultChannels(['slack-primary', 'discord-alerts']);

  // 查看状态
  const status = service.getStatus();
  console.log('服务状态:');
  console.log('- 总渠道数:', status.totalChannels);
  console.log('- 启用渠道数:', status.enabledChannels);
  console.log('- 默认渠道:', status.defaultChannels);
  console.log('- 渠道列表:', status.channels);
  console.log('');
}

/**
 * 示例 8: 发送到多个渠道
 */
async function example8_SendToMultiple() {
  console.log('=== 示例 8: 发送到多个渠道 ===\n');

  const service = new MultiChannelAlertService();

  // 注册多个渠道
  service.registerChannel('slack', 'slack', {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
  });

  service.registerChannel('discord', 'discord', {
    type: 'discord',
    webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
  });

  service.registerChannel('webhook', 'webhook', {
    type: 'webhook',
    url: 'https://example.com/api/alerts',
  });

  const payload: NotificationPayload = {
    title: '多渠道告警',
    message: '同时发送到 Slack、Discord 和 Webhook',
    severity: 'warning',
    data: {
      alertId: 'alert-123',
      timestamp: new Date().toISOString(),
    },
  };

  // 发送到所有注册的渠道
  const result = await service.alertAll(payload);

  console.log('发送结果:');
  console.log('- 全部成功:', result.allSuccess);
  console.log('- 成功数量:', result.successCount);
  console.log('- 失败数量:', result.failureCount);
  console.log('- 详细结果:');
  result.results.forEach(r => {
    console.log(`  ${r.name} (${r.type}): ${r.result.success ? '✓' : '✗'}`);
    if (!r.result.success) {
      console.log(`    错误: ${r.result.error}`);
    }
  });
  console.log('');
}

/**
 * 示例 9: 部分渠道失败不影响其他
 */
async function example9_PartialFailure() {
  console.log('=== 示例 9: 部分渠道失败处理 ===\n');

  const service = new MultiChannelAlertService();

  // 注册多个渠道（其中一个是无效的）
  service.registerChannel('slack-valid', 'slack', {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
  });

  service.registerChannel('discord-invalid', 'discord', {
    type: 'discord',
    webhookUrl: 'invalid-webhook-url', // 无效 URL
  });

  service.registerChannel('webhook-valid', 'webhook', {
    type: 'webhook',
    url: 'https://example.com/api/alerts',
  });

  const payload: NotificationPayload = {
    title: '部分失败测试',
    message: '测试失败隔离',
    severity: 'info',
  };

  const result = await service.alertAll(payload);

  console.log('发送结果:');
  console.log('- 全部成功:', result.allSuccess);
  console.log('- 成功数量:', result.successCount);
  console.log('- 失败数量:', result.failureCount);
  console.log('');
}

/**
 * 示例 10: 批量发送
 */
async function example10_BatchSend() {
  console.log('=== 示例 10: 批量发送 ===\n');

  const service = new MultiChannelAlertService();

  service.registerChannel('slack', 'slack', {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
  });

  const alerts = [
    {
      payload: {
        title: '告警 1',
        message: '第一个告警',
        severity: 'info' as const,
      },
      channels: ['slack'],
    },
    {
      payload: {
        title: '告警 2',
        message: '第二个告警',
        severity: 'warning' as const,
      },
      channels: ['slack'],
    },
    {
      payload: {
        title: '告警 3',
        message: '第三个告警',
        severity: 'error' as const,
      },
      channels: ['slack'],
    },
  ];

  const results = await service.alertBatch(alerts);

  console.log('批量发送结果:');
  results.forEach((r, i) => {
    console.log(`告警 ${i + 1}: ${r.allSuccess ? '✓' : '✗'} (${r.successCount}/${r.successCount + r.failureCount})`);
  });
  console.log('');
}

/**
 * 示例 11: 使用单例服务
 */
async function example11_SingletonService() {
  console.log('=== 示例 11: 使用单例服务 ===\n');

  const service = getAlertService();

  // 清空之前的配置（仅用于演示）
  service.clear();

  // 注册渠道
  service.registerChannel('slack', 'slack', {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
  });

  // 设置默认渠道
  service.setDefaultChannels(['slack']);

  const payload: NotificationPayload = {
    title: '单例服务告警',
    message: '使用全局单例服务',
    severity: 'info',
  };

  const result = await service.alert(payload);

  console.log('单例服务发送结果:', result.allSuccess ? '✓' : '✗');
  console.log('');
}

/**
 * 示例 12: 启用/禁用渠道
 */
function example12_EnableDisableChannels() {
  console.log('=== 示例 12: 启用/禁用渠道 ===\n');

  const service = new MultiChannelAlertService();

  service.registerChannel('slack', 'slack', {
    type: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
  });

  service.registerChannel('discord', 'discord', {
    type: 'discord',
    webhookUrl: 'https://discord.com/api/webhooks/123456789/XXXXXXXX',
  });

  console.log('初始状态:');
  console.log('- Slack 启用:', service.isChannelEnabled('slack'));
  console.log('- Discord 启用:', service.isChannelEnabled('discord'));

  // 禁用 Discord
  service.setChannelEnabled('discord', false);

  console.log('\n禁用 Discord 后:');
  console.log('- Slack 启用:', service.isChannelEnabled('slack'));
  console.log('- Discord 启用:', service.isChannelEnabled('discord'));
  console.log('');
}

/**
 * 示例 13: Webhook 模板工具方法
 */
async function example13_WebhookTemplateUtils() {
  console.log('=== 示例 13: Webhook 模板工具方法 ===\n');

  // 验证模板
  const template = JSON.stringify({
    title: '{{title}}',
    message: '{{message}}',
    level: '{{severity}}',
  });

  const validation = WebhookChannel.validateTemplate(template);
  console.log('模板验证:', validation.valid ? '✓' : '✗');
  if (!validation.valid) {
    console.log('错误:', validation.error);
  }

  // 提取变量
  const variables = WebhookChannel.extractTemplateVariables(template);
  console.log('模板变量:', variables);

  // 创建默认模板
  const defaultTemplate = WebhookChannel.createDefaultTemplate();
  console.log('默认模板:', defaultTemplate.substring(0, 100) + '...');
  console.log('');
}

/**
 * 主函数 - 运行所有示例
 */
async function main() {
  console.log('🚀 Multi-Channel Notifications 使用示例\n');
  console.log('=' .repeat(50));
  console.log('');

  // 示例需要有效的 Webhook URL 才能实际发送
  // 以下代码仅作演示，实际使用时需要替换为真实配置

  console.log('注意：以下示例需要配置有效的 Webhook URL 才能实际发送消息');
  console.log('当前代码仅作演示使用\n');

  // 运行不需要真实 API 的示例
  example6_ChannelFactory();
  example7_MultiChannelService();
  example9_PartialFailure(); // 这会失败，因为配置无效
  example12_EnableDisableChannels();
  example13_WebhookTemplateUtils();

  console.log('=' .repeat(50));
  console.log('✅ 所有示例运行完毕');
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

// 导出示例函数供测试使用
export {
  example1_SlackChannel,
  example2_DiscordChannel,
  example3_DiscordMentions,
  example4_WebhookChannel,
  example5_WebhookTemplate,
  example6_ChannelFactory,
  example7_MultiChannelService,
  example8_SendToMultiple,
  example9_PartialFailure,
  example10_BatchSend,
  example11_SingletonService,
  example12_EnableDisableChannels,
  example13_WebhookTemplateUtils,
};