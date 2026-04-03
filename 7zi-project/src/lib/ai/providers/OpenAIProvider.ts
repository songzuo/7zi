/**
 * OpenAI Provider Implementation
 * v1.11.0 - AI Enhancement Feature
 */

import { BaseProvider } from './BaseProvider';
import {
  LLMConfig,
  LLMRequest,
  LLMResponse,
  OpenAIConfig,
  ProviderNotConfiguredError,
  GenerationTimeoutError,
} from '../types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChoice {
  message: OpenAIMessage;
  finish_reason: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

export class OpenAIProvider extends BaseProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: Partial<OpenAIConfig> = {}) {
    const fullConfig: LLMConfig = {
      provider: 'openai',
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4-turbo-preview',
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
      ...config,
    };
    super(fullConfig);
    this.apiKey = fullConfig.apiKey;
  }

  get provider(): 'openai' {
    return 'openai';
  }

  protected getDefaultModel(): string {
    return 'gpt-4-turbo-preview';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError('openai');
    }

    return this.withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout!
      );

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.getModel(),
            messages: request.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: request.temperature ?? this.config.temperature,
            max_tokens: request.maxTokens ?? this.config.maxTokens,
            stop: request.stopSequences,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = (await response.json()) as OpenAIResponse;

        return {
          content: data.choices[0]?.message?.content || '',
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
          model: data.model,
          finishReason: data.choices[0]?.finish_reason,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new GenerationTimeoutError('openai', this.config.timeout!);
        }

        this.handleError(error, 'Chat completion');
      }
    });
  }

  /**
   * Set organization header for OpenAI
   */
  setOrganization(orgId: string): void {
    // Note: This would require storing org ID and using it in fetch
    // For now, we'll implement this in a future update
    console.warn('Organization support requires additional implementation');
  }
}
