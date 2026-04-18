/**
 * Base LLM Provider Abstract Class
 * v1.11.0 - AI Enhancement Feature
 */

import {
  LLMConfig,
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMProvider,
  AIGenerationError,
} from '../types'

export abstract class BaseProvider {
  protected config: LLMConfig
  protected defaultMaxTokens = 2048
  protected defaultTemperature = 0.7
  protected defaultTimeout = 60000

  constructor(config: LLMConfig) {
    this.config = this.validateConfig(config)
  }

  /**
   * Get the provider type
   */
  abstract get provider(): LLMProvider

  /**
   * Check if the provider is properly configured
   */
  abstract isConfigured(): boolean

  /**
   * Send a chat completion request
   */
  abstract chat(request: LLMRequest): Promise<LLMResponse>

  /**
   * Get the model name to use
   */
  protected getModel(): string {
    return this.config.model || this.getDefaultModel()
  }

  /**
   * Get the default model for this provider
   */
  protected abstract getDefaultModel(): string

  /**
   * Validate and normalize config
   */
  protected validateConfig(config: LLMConfig): LLMConfig {
    return {
      ...config,
      temperature: config.temperature ?? this.defaultTemperature,
      maxTokens: config.maxTokens ?? this.defaultMaxTokens,
      timeout: config.timeout ?? this.defaultTimeout,
    }
  }

  /**
   * Build system prompt for code generation
   */
  public buildSystemPrompt(language: string, context?: string): string {
    let prompt = `You are an expert software developer specializing in ${language} programming.
Generate clean, efficient, and well-documented code.
Follow best practices and modern design patterns.
Include type annotations where appropriate.
Add helpful comments for complex logic.`

    if (context) {
      prompt += `\n\nContext:\n${context}`
    }

    return prompt
  }

  /**
   * Build user prompt for code generation
   */
  public buildCodePrompt(prompt: string, language: string, requirements?: string[]): string {
    let userPrompt = `Generate ${language} code for the following:\n\n${prompt}`

    if (requirements && requirements.length > 0) {
      userPrompt += '\n\nRequirements:\n'
      requirements.forEach((req, i) => {
        userPrompt += `${i + 1}. ${req}\n`
      })
    }

    userPrompt += '\n\nProvide only the code, no explanations unless critical.'

    return userPrompt
  }

  /**
   * Handle API errors
   */
  protected handleError(error: unknown, operation: string): never {
    if (error instanceof AIGenerationError) {
      throw error
    }

    const message = error instanceof Error ? error.message : String(error)
    throw new AIGenerationError(
      `${operation} failed: ${message}`,
      'PROVIDER_ERROR',
      this.provider,
      error instanceof Error ? error : undefined
    )
  }

  /**
   * Retry logic for transient failures
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on certain errors
        if (error instanceof AIGenerationError) {
          if (error.code === 'PROVIDER_NOT_CONFIGURED' || error.code === 'INVALID_RESPONSE') {
            throw error
          }
        }

        if (attempt < maxRetries) {
          await this.delay(delayMs * attempt)
        }
      }
    }

    throw lastError
  }

  /**
   * Delay utility
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Extract code from markdown response
   */
  public extractCode(response: string): string {
    // Try to extract code from markdown code blocks
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g
    const matches = [...response.matchAll(codeBlockRegex)]

    if (matches.length > 0) {
      return matches.map(m => m[1].trim()).join('\n\n')
    }

    // Return as-is if no code blocks found
    return response.trim()
  }
}
