/**
 * AI Code Generator - Main Class
 * v1.11.0 - AI Enhancement Feature
 */

import { BaseProvider } from './providers/BaseProvider'
import { OpenAIProvider } from './providers/OpenAIProvider'
import { ClaudeProvider } from './providers/ClaudeProvider'
import {
  LLMProvider,
  LLMConfig,
  CodeGenerationRequest,
  CodeGenerationResponse,
  TemplateGenerationRequest,
  TemplateGenerationResponse,
  TestGenerationRequest,
  TestGenerationResponse,
  CodeStyle,
  TestCaseInfo,
  ProviderNotConfiguredError,
} from './types'

export class CodeGenerator {
  private provider: BaseProvider | null = null
  private defaultLanguage = 'typescript'
  private defaultTestFramework = 'jest'

  constructor(config?: LLMConfig) {
    this.initializeProvider(config)
  }

  /**
   * Initialize the LLM provider
   */
  private initializeProvider(config?: LLMConfig): void {
    const providerType = config?.provider || this.detectProvider()

    switch (providerType) {
      case 'openai':
        this.provider = new OpenAIProvider({
          ...config,
          provider: 'openai',
        })
        break
      case 'claude':
        this.provider = new ClaudeProvider({
          ...config,
          provider: 'claude',
        })
        break
      default:
        // Try OpenAI first, then Claude
        this.provider = new OpenAIProvider({
          ...config,
          provider: 'openai',
        })
        if (!this.provider.isConfigured()) {
          this.provider = new ClaudeProvider({
            ...config,
            provider: 'claude',
          })
        }
        break
    }
  }

  /**
   * Detect available provider from environment
   */
  private detectProvider(): LLMProvider {
    if (process.env.OPENAI_API_KEY) return 'openai'
    if (process.env.CLAUDE_API_KEY) return 'claude'
    return 'openai' // Default to OpenAI
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.provider?.isConfigured() ?? false
  }

  /**
   * Get current provider type
   */
  getProviderType(): LLMProvider | null {
    return this.provider?.provider ?? null
  }

  /**
   * Generate code from a natural language prompt
   */
  async generateCode(
    prompt: string,
    language: string,
    options?: {
      context?: string
      style?: CodeStyle
      requirements?: string[]
    }
  ): Promise<string> {
    if (!this.provider || !this.provider.isConfigured()) {
      throw new ProviderNotConfiguredError(this.provider?.provider || 'openai')
    }

    const lang = language || this.defaultLanguage
    const systemPrompt = this.provider.buildSystemPrompt(lang, options?.context)
    const userPrompt = this.provider.buildCodePrompt(prompt, lang, options?.requirements)

    const response = await this.provider.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    return this.provider.extractCode(response.content)
  }

  /**
   * Generate code from a template with parameters
   */
  async generateFromTemplate(template: string, params: Record<string, unknown>): Promise<string> {
    if (!this.provider || !this.provider.isConfigured()) {
      throw new ProviderNotConfiguredError(this.provider?.provider || 'openai')
    }

    // Format template with simple key replacements first
    let formattedCode = template
    const interpolatedKeys: string[] = []

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{{${key}}}`
      if (formattedCode.includes(placeholder)) {
        formattedCode = formattedCode.replace(
          new RegExp(this.escapeRegex(placeholder), 'g'),
          String(value)
        )
        interpolatedKeys.push(key)
      }
    }

    // If template still has placeholders, use AI to fill them
    const remainingPlaceholders = formattedCode.match(/\{\{(\w+)\}\}/g)
    if (remainingPlaceholders && remainingPlaceholders.length > 0) {
      const prompt = `Fill in the remaining placeholders in this code template:\n\nTemplate:\n${formattedCode}\n\nParameters:\n${JSON.stringify(params, null, 2)}\n\nProvide the complete code with all placeholders filled.`

      const response = await this.provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are a code template filler. Fill in placeholders with appropriate values.',
          },
          { role: 'user', content: prompt },
        ],
      })

      formattedCode = this.provider.extractCode(response.content)
      remainingPlaceholders.forEach(p => {
        const key = p.replace(/[{}]/g, '')
        if (!interpolatedKeys.includes(key)) {
          interpolatedKeys.push(key)
        }
      })
    }

    return formattedCode
  }

  /**
   * Generate unit tests for given function code
   */
  async generateTests(
    functionCode: string,
    options?: {
      functionName?: string
      testFramework?: 'jest' | 'vitest' | 'mocha'
      coverageLevel?: 'basic' | 'comprehensive' | 'edge-cases'
      includeMocks?: boolean
    }
  ): Promise<string> {
    if (!this.provider || !this.provider.isConfigured()) {
      throw new ProviderNotConfiguredError(this.provider?.provider || 'openai')
    }

    const framework = options?.testFramework || this.defaultTestFramework
    const coverage = options?.coverageLevel || 'basic'
    const includeMocks = options?.includeMocks ?? true

    const prompt = this.buildTestPrompt(
      functionCode,
      framework,
      coverage,
      includeMocks,
      options?.functionName
    )

    const response = await this.provider.chat({
      messages: [
        {
          role: 'system',
          content: `You are an expert in ${framework} testing. Write comprehensive, well-structured tests.`,
        },
        { role: 'user', content: prompt },
      ],
    })

    return this.provider.extractCode(response.content)
  }

  /**
   * Build test generation prompt
   */
  private buildTestPrompt(
    functionCode: string,
    framework: string,
    coverage: 'basic' | 'comprehensive' | 'edge-cases',
    includeMocks: boolean,
    functionName?: string
  ): string {
    let prompt = `Generate ${framework} tests for the following code:\n\n\`\`\`\n${functionCode}\n\`\`\`\n`

    prompt += `\nCoverage level: ${coverage}`

    if (includeMocks) {
      prompt += '\nInclude mock implementations where appropriate.'
    }

    prompt += '\n\nProvide only the test code, no explanations.'

    return prompt
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Switch to a different provider
   */
  switchProvider(provider: LLMProvider, config?: Partial<LLMConfig>): void {
    const fullConfig: LLMConfig = {
      provider,
      ...config,
    }
    this.initializeProvider(fullConfig)
  }

  /**
   * Create a CodeGenerator with auto-detection
   */
  static createAuto(): CodeGenerator {
    return new CodeGenerator()
  }

  /**
   * Create a CodeGenerator with OpenAI
   */
  static createWithOpenAI(apiKey?: string): CodeGenerator {
    return new CodeGenerator({
      provider: 'openai',
      apiKey,
    })
  }

  /**
   * Create a CodeGenerator with Claude
   */
  static createWithClaude(apiKey?: string): CodeGenerator {
    return new CodeGenerator({
      provider: 'claude',
      apiKey,
    })
  }
}

// Export for convenience
export default CodeGenerator
