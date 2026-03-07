# Telegram 机器人配置指南

**最后更新**: 2026-03-06  
**状态**: ✅ 已配置  
**Bot Token**: 通过 OpenClaw secrets 管理

---

## 📋 目录

1. [概述](#概述)
2. [创建 Bot](#创建 bot)
3. [配置 OpenClaw](#配置-openclaw)
4. [功能列表](#功能列表)
5. [命令参考](#命令参考)
6. [Webhook 配置](#webhook 配置)
7. [常见问题](#常见问题)

---

## 概述

7zi Studio 使用 Telegram Bot 进行：

- ✅ 通知推送
- ✅ 命令交互
- ✅ 状态汇报
- ✅ 团队协作
- ✅ 监控告警

### Bot 信息

| 项目 | 值 |
|------|-----|
| Bot Name | @7ziStudioBot |
| Bot ID | (通过 Token 获取) |
| Webhook URL | https://7zi.com/api/webhooks/telegram |
| 状态 | ✅ 运行中 |

---

## 创建 Bot

### 1. 通过 BotFather 创建

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按提示设置 Bot 名称和用户名
4. 获取 Bot Token (格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. 设置 Bot 信息

```
/setname - 设置 Bot 显示名称
/setdescription - 设置 Bot 描述
/setabouttext - 设置 About 文本
/setuserpic - 设置头像
```

### 3. 配置隐私模式

```
/setprivacy - 选择是否接收群聊消息
- Disable: Bot 接收所有群消息
- Enable: Bot 只接收 @mention 和命令
```

---

## 配置 OpenClaw

### 1. 存储 Token

```bash
# 使用 OpenClaw secrets
openclaw secrets set TELEGRAM_BOT_TOKEN "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"

# 或添加到环境变量
export TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
```

### 2. 配置频道/群组

```bash
# 获取频道/群组 ID (转发消息到 @getidsbot)
TELEGRAM_CHANNEL_ID="-1001234567890"

# 配置到 OpenClaw
openclaw config set telegram.channel_id "$TELEGRAM_CHANNEL_ID"
```

### 3. 测试连接

```bash
# 发送测试消息
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="$TELEGRAM_CHANNEL_ID" \
  -d text="测试消息 - 7zi Studio Bot"
```

---

## 功能列表

### 通知推送

```typescript
// 发送通知
await telegram.notify({
  channel: 'telegram',
  message: '部署完成 ✅',
  type: 'success'
});
```

### 命令交互

```typescript
// 处理命令
if (message.text === '/status') {
  const status = await getSystemStatus();
  await reply(message.chat.id, status);
}
```

### 状态汇报

```typescript
// 定期汇报
cron.schedule('0 */6 * * *', async () => {
  const report = await generateReport();
  await telegram.send({
    channel: 'telegram',
    message: report,
    parse_mode: 'Markdown'
  });
});
```

### 监控告警

```typescript
// 告警通知
if (cpuUsage > 90) {
  await telegram.alert({
    level: 'critical',
    message: `⚠️ CPU 使用率过高：${cpuUsage}%`,
    actions: ['查看监控', '重启服务']
  });
}
```

---

## 命令参考

### 系统命令

| 命令 | 描述 | 权限 |
|------|------|------|
| `/start` | 启动 Bot，显示欢迎信息 | 所有人 |
| `/help` | 显示帮助信息 | 所有人 |
| `/status` | 系统状态 | 管理员 |
| `/deploy` | 触发部署 | 管理员 |
| `/logs` | 查看日志 | 管理员 |
| `/restart` | 重启服务 | 管理员 |
| `/backup` | 创建备份 | 管理员 |

### 团队命令

| 命令 | 描述 | 权限 |
|------|------|------|
| `/tasks` | 查看任务列表 | 团队成员 |
| `/meeting` | 发起会议 | 团队成员 |
| `/report` | 提交日报 | 团队成员 |
| `/vote` | 发起投票 | 团队成员 |

### 查询命令

| 命令 | 描述 | 权限 |
|------|------|------|
| `/weather [城市]` | 查询天气 | 所有人 |
| `/repo` | 仓库状态 | 团队成员 |
| `/issues` | Issue 列表 | 团队成员 |

---

## Webhook 配置

### 1. 设置 Webhook

```bash
# 设置 Webhook URL
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d url="https://7zi.com/api/webhooks/telegram" \
  -d allowed_updates='["message","callback_query","channel_post"]'
```

### 2. 验证 Webhook

```bash
# 检查 Webhook 状态
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

### 3. Webhook 处理

```typescript
// /api/webhooks/telegram.ts
export async function POST(req: Request) {
  const update = await req.json();
  
  // 处理消息
  if (update.message) {
    await handleMessage(update.message);
  }
  
  // 处理回调查询
  if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
  
  return new Response('OK', { status: 200 });
}

async function handleMessage(message: any) {
  const { chat, from, text } = message;
  
  // 命令处理
  if (text?.startsWith('/')) {
    const [command, ...args] = text.split(' ');
    await handleCommand(chat.id, command, args, from);
  } else {
    // 普通消息
    await handleTextMessage(chat.id, text, from);
  }
}

async function handleCommand(
  chatId: number,
  command: string,
  args: string[],
  from: any
) {
  switch (command) {
    case '/start':
      await sendWelcome(chatId, from);
      break;
    case '/help':
      await sendHelp(chatId);
      break;
    case '/status':
      if (await isAdmin(from.id)) {
        await sendStatus(chatId);
      }
      break;
    // ... 其他命令
  }
}
```

### 4. 内联按钮

```typescript
// 发送带按钮的消息
await telegram.send({
  chat_id: chatId,
  text: '选择操作:',
  reply_markup: {
    inline_keyboard: [
      [{ text: '✅ 确认', callback_data: 'confirm' }],
      [{ text: '❌ 取消', callback_data: 'cancel' }]
    ]
  }
});

// 处理按钮点击
if (data.callback_data === 'confirm') {
  await performAction();
  await telegram.editMessage({
    chat_id: data.chat_id,
    message_id: data.message_id,
    text: '操作已确认 ✅'
  });
}
```

---

## 消息类型

### 文本消息

```typescript
await telegram.send({
  channel: 'telegram',
  message: 'Hello, World!',
  parse_mode: 'Markdown'
});
```

### Markdown 格式

```typescript
const message = `
*7zi Studio 通知*

状态：✅ 运行中
版本：v1.0.0
时间：${new Date().toISOString()}

[查看详情](https://7zi.com)
`;

await telegram.send({
  channel: 'telegram',
  message: message,
  parse_mode: 'Markdown'
});
```

### 带图片

```typescript
await telegram.send({
  channel: 'telegram',
  caption: '部署完成截图',
  photo: {
    source: '/path/to/screenshot.png'
  }
});
```

### 带文件

```typescript
await telegram.send({
  channel: 'telegram',
  caption: '日志文件',
  document: {
    source: '/path/to/log.txt',
    filename: 'deploy.log'
  }
});
```

---

## 常见问题

### Q1: Bot 无法接收消息

**检查**:
1. Bot 是否已加入群组/频道
2. 隐私模式设置是否正确
3. Webhook 是否配置成功

```bash
# 检查 Bot 成员状态
curl "https://api.telegram.org/bot$TOKEN/getChatMember?chat_id=-1001234567890&user_id=$BOT_ID"
```

### Q2: Webhook 失败

**错误**: `Webhook failed, last error: ...`

**解决**:
1. 检查 HTTPS 证书是否有效
2. 确认服务器可公网访问
3. 检查防火墙设置

```bash
# 删除 Webhook，改用轮询
curl -X POST "https://api.telegram.org/bot$TOKEN/deleteWebhook"
```

### Q3: 消息发送失败

**错误**: `chat not found` 或 `unauthorized`

**解决**:
1. 确认 Chat ID 正确（负数表示群组/频道）
2. 检查 Bot Token 是否有效
3. 确认 Bot 有发送权限

### Q4: 速率限制

**错误**: `429 Too Many Requests`

**解决**:
```typescript
// 添加延迟
async function sendMessageWithRetry(chatId: number, text: string) {
  try {
    return await telegram.send({ chat_id: chatId, text });
  } catch (error) {
    if (error.code === 429) {
      const retryAfter = error.parameters?.retry_after || 1;
      await sleep(retryAfter * 1000);
      return await telegram.send({ chat_id: chatId, text });
    }
    throw error;
  }
}
```

---

## 最佳实践

### 1. 错误处理

```typescript
async function safeSend(message: any) {
  try {
    await telegram.send(message);
  } catch (error) {
    logger.error('Telegram send failed', error);
    // 降级到备用通知方式
    await fallbackNotify(message);
  }
}
```

### 2. 消息队列

```typescript
// 避免消息洪水
const messageQueue = new Queue('telegram', {
  rateLimit: {
    max: 30,  // 每秒最多 30 条
    duration: 1000
  }
});

await messageQueue.add('send', { chatId, text });
```

### 3. 日志记录

```typescript
logger.info('Telegram message sent', {
  chatId: message.chat.id,
  text: message.text?.substring(0, 50),
  timestamp: new Date().toISOString()
});
```

---

## 参考资源

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Bot 示例](https://core.telegram.org/bots/samples)
- [Node-Telegram-Bot-API](https://github.com/yagop/node-telegram-bot-api)
- [Telegraf.js](https://telegraf.js.org/)

---

*本集成由 7zi Studio AI 团队维护*
