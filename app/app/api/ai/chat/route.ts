/**
 * AI Chat API - 支持流式响应
 * POST /api/ai/chat
 */

import { NextRequest, NextResponse } from 'next/server';

// AI 提供商配置
const AI_PROVIDERS: Record<string, { endpoint: string; models: string[] }> = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  },
  minimax: {
    endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    models: ['abab6.5s-chat', 'abab5.5-chat'],
  },
  volcengine: {
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    models: ['doubao-pro-32k', 'doubao-pro-128k'],
  },
};

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * 构建流式响应
 */
function createStreamingResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  encoder: TextEncoder
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * 解析 OpenAI 格式的 SSE 响应
 */
async function* parseOpenAIStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}

/**
 * 模拟 AI 响应（用于测试/演示）
 */
function createMockStream(messages: Array<{ role: string; content: string }>) {
  const lastMessage = messages[messages.length - 1];
  const encoder = new TextEncoder();
  
  const mockResponses: Record<string, string> = {
    default: `我收到你的消息："${lastMessage?.content?.slice(0, 50) || ''}..."

这是一个模拟的 AI 响应。在真实场景中，这里会连接到实际的 AI 提供商 API。

我可以帮助你：
- 回答问题和提供建议
- 分析数据和生成报告
- 编写和修改代码
- 进行创意写作

有什么我可以帮你的吗？`,
  };

  const responseText = mockResponses.default;
  
  return new ReadableStream({
    async start(controller) {
      // 模拟流式输出
      for (let i = 0; i < responseText.length; i += 3) {
        const chunk = responseText.slice(i, i + 3);
        const data = JSON.stringify({ content: chunk, done: false });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        await new Promise((r) => setTimeout(r, 20));
      }
      controller.enqueue(encoder.encode('data: {"content":"","done":true}\n\n'));
      controller.close();
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const {
      messages,
      provider = 'openai',
      model = 'gpt-4',
      temperature = 0.7,
      maxTokens = 2048,
      stream = true,
    } = body;

    // 验证消息
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '消息不能为空' },
        { status: 400 }
      );
    }

    // 检查环境变量中是否有 API Key
    const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    
    // 如果没有 API Key，使用模拟响应
    if (!apiKey || process.env.NODE_ENV === 'development') {
      console.log('Using mock AI response (no API key or development mode)');
      
      if (stream) {
        const mockStream = createMockStream(messages);
        return new Response(mockStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
      
      return NextResponse.json({
        content: '这是一个模拟响应。请配置 API Key 以使用真实的 AI 服务。',
        role: 'assistant',
      });
    }

    // 获取提供商配置
    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig) {
      return NextResponse.json(
        { error: `不支持的 AI 提供商: ${provider}` },
        { status: 400 }
      );
    }

    // 构建请求
    const apiRequest = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
      stream,
    };

    // 发送请求到 AI 提供商
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(apiRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || 'AI 请求失败' },
        { status: response.status }
      );
    }

    // 流式响应
    if (stream && response.body) {
      const encoder = new TextEncoder();
      const reader = response.body.getReader();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const content of parseOpenAIStream(reader)) {
              const data = JSON.stringify({ content, done: false });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
            controller.enqueue(encoder.encode('data: {"content":"","done":true}\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 非流式响应
    const data = await response.json();
    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || '',
      role: 'assistant',
    });
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// 获取支持的提供商和模型
export async function GET() {
  return NextResponse.json({
    providers: Object.entries(AI_PROVIDERS).map(([name, config]) => ({
      name,
      models: config.models,
    })),
  });
}