/**
 * AI Code Generator Types
 * v1.11.0 - AI Enhancement Feature
 */

// ============================================================================
// LLM Provider Types
// ============================================================================

export type LLMProvider = 'openai' | 'claude'

export interface LLMConfig {
  provider: LLMProvider
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
  timeout?: number
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMRequest {
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model?: string
  finishReason?: string
}

// ============================================================================
// Code Generation Types
// ============================================================================

export interface CodeGenerationRequest {
  prompt: string
  language: string
  context?: string
  style?: CodeStyle
  requirements?: string[]
  maxTokens?: number
}

export interface CodeGenerationResponse {
  code: string
  language: string
  explanation?: string
  suggestions?: string[]
  warnings?: string[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface CodeStyle {
  namingConvention?: 'camelCase' | 'snake_case' | 'PascalCase'
  indentation?: 'spaces' | 'tabs'
  indentSize?: number
  comments?: boolean
  typeAnnotations?: boolean
  formatStyle?: string
}

// ============================================================================
// Template Generation Types
// ============================================================================

export interface TemplateGenerationRequest {
  template: string
  params: Record<string, unknown>
  language?: string
  preserveFormatting?: boolean
}

export interface TemplateGenerationResponse {
  code: string
  language: string
  interpolatedParams: string[]
  warnings?: string[]
}

// ============================================================================
// Test Generation Types
// ============================================================================

export interface TestGenerationRequest {
  functionCode: string
  functionName?: string
  testFramework?: 'jest' | 'vitest' | 'mocha'
  coverageLevel?: 'basic' | 'comprehensive' | 'edge-cases'
  includeMocks?: boolean
}

export interface TestGenerationResponse {
  testCode: string
  testFramework: string
  testCases: TestCaseInfo[]
  coverage?: {
    estimated: number
    branches?: number
  }
}

export interface TestCaseInfo {
  name: string
  description: string
  type: 'happy' | 'edge' | 'error'
}

// ============================================================================
// Provider-Specific Types
// ============================================================================

export interface OpenAIConfig extends LLMConfig {
  provider: 'openai'
  model?: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' | string
  organization?: string
}

export interface ClaudeConfig extends LLMConfig {
  provider: 'claude'
  model?: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku' | string
  apiVersion?: string
}

// ============================================================================
// Error Types
// ============================================================================

export class AIGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: LLMProvider,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'AIGenerationError'
  }
}

export class ProviderNotConfiguredError extends AIGenerationError {
  constructor(provider: LLMProvider) {
    super(
      `Provider ${provider} is not configured. Please set the required API key.`,
      'PROVIDER_NOT_CONFIGURED',
      provider
    )
    this.name = 'ProviderNotConfiguredError'
  }
}

export class GenerationTimeoutError extends AIGenerationError {
  constructor(provider: LLMProvider, timeout: number) {
    super(`Generation timed out after ${timeout}ms`, 'GENERATION_TIMEOUT', provider)
    this.name = 'GenerationTimeoutError'
  }
}

export class InvalidResponseError extends AIGenerationError {
  constructor(message: string, provider?: LLMProvider) {
    super(message, 'INVALID_RESPONSE', provider)
    this.name = 'InvalidResponseError'
  }
}
