/**
 * Anthropic Claude Provider Implementation
 * v1.11.0 - AI Enhancement Feature
 */

import { BaseProvider } from './BaseProvider';
import {
  LLMConfig,
  LLMMessage,
  LLMRequest,
  LLMResponse,
  ClaudeConfig,
  ProviderNotConfiguredError,
  GenerationTimeoutError,
} from '../types';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeContent {
  type: 'text';
  text: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: 'assistant';
  content: ClaudeContent[];
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeProvider extends BaseProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.anthropic.com/v1';
  private apiVersion = '2023-06-01';

  constructor(config: Partial<ClaudeConfig> = {}) {
    const fullConfig: LLMConfig = {
      provider: 'claude',
      apiKey: config.apiKey || process.env.CLAUDE_API_KEY,
      model: config.model || 'claude-3-sonnet-20240229',
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
      ...config,
    };
    super(fullConfig);
    this.apiKey = fullConfig.apiKey;
  }

  get provider(): 'claude' {
    return 'claude';
  }

  protected getDefaultModel(): string {
    return 'claude-3-sonnet-20240229';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError('claude');
    }

    return this.withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout!
      );

      try {
        // Claude API requires separating system message from messages array
        const systemMessage = request.messages.find((m) => m.role === 'system');
        const conversationMessages = request.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        const response = await fetch(`${this.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey!,
            'anthropic-version': this.apiVersion,
          },
          body: JSON.stringify({
            model: this.getModel(),
            max_tokens: request.maxTokens ?? this.config.maxTokens,
            system: systemMessage?.content,
            messages: conversationMessages,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Claude API error: ${response.status} - ${error}`);
        }

        const data = (await response.json()) as ClaudeResponse;

        // Extract text from content blocks
        const content = data.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        return {
          content,
          usage: {
            promptTokens: data.usage?.input_tokens || 0,
            completionTokens: data.usage?.output_tokens || 0,
            totalTokens:
              (data.usage?.input_tokens || 0) +
              (data.usage?.output_tokens || 0),
          },
          model: data.model,
          finishReason: data.stop_reason,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new GenerationTimeoutError('claude', this.config.timeout!);
        }

        this.handleError(error, 'Chat completion');
      }
    });
  }

  /**
   * Set API version
   */
  setApiVersion(version: string): void {
    this.apiVersion = version;
  }
}
