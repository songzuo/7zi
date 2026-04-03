/**
 * AI 模型配置
 * 支持 GPT-4.5/Claude 4/Gemini 2/DeepSeek/GLM-4 等模型
 */

import { AIModel, AIModelProvider, TaskType } from './types'

/**
 * 模型注册表
 */
export const MODELS: AIModel[] = [
  // OpenAI GPT-4.5 (最新旗舰)
  {
    id: 'gpt-4.5',
    name: 'GPT-4.5',
    provider: AIModelProvider.OPENAI,
    model: 'gpt-4.5',
    displayName: 'GPT-4.5',
    maxTokens: 128000,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    contextWindow: 200000,
    inputPricePerM: 10.0,
    outputPricePerM: 30.0,
    strengths: [
      TaskType.CODE_GENERATION,
      TaskType.CODE_COMPLETION,
      TaskType.CONVERSATION,
      TaskType.ANALYSIS,
      TaskType.CREATIVE_WRITING,
      TaskType.REASONING,
      TaskType.INSTRUCTION_FOLLOWING,
    ],
    isPreferredFor: [TaskType.CODE_GENERATION, TaskType.REASONING],
    enabled: true,
    isFallback: false,
    priority: 1,
  },
  // OpenAI GPT-4o
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: AIModelProvider.OPENAI,
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 16384,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    contextWindow: 128000,
    inputPricePerM: 2.5,
    outputPricePerM: 10.0,
    strengths: [
      TaskType.CODE_GENERATION,
      TaskType.CONVERSATION,
      TaskType.ANALYSIS,
      TaskType.MULTIMODAL,
    ],
    isPreferredFor: [TaskType.MULTIMODAL],
    enabled: true,
    isFallback: false,
    priority: 2,
  },
  // Anthropic Claude 4 (最新)
  {
    id: 'claude-4-opus',
    name: 'Claude 4 Opus',
    provider: AIModelProvider.ANTHROPIC,
    model: 'claude-4-opus-20250514',
    displayName: 'Claude 4 Opus',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    contextWindow: 200000,
    inputPricePerM: 15.0,
    outputPricePerM: 75.0,
    strengths: [
      TaskType.CODE_GENERATION,
      TaskType.ANALYSIS,
      TaskType.REASONING,
      TaskType.CREATIVE_WRITING,
    ],
    isPreferredFor: [TaskType.ANALYSIS, TaskType.REASONING],
    enabled: true,
    isFallback: false,
    priority: 3,
  },
  {
    id: 'claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    provider: AIModelProvider.ANTHROPIC,
    model: 'claude-4-sonnet-20250514',
    displayName: 'Claude 4 Sonnet',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    contextWindow: 200000,
    inputPricePerM: 3.0,
    outputPricePerM: 15.0,
    strengths: [
      TaskType.CODE_GENERATION,
      TaskType.CONVERSATION,
      TaskType.ANALYSIS,
    ],
    isPreferredFor: [],
    enabled: true,
    isFallback: true,
    priority: 4,
  },
  // Google Gemini 2
  {
    id: 'gemini-2-pro',
    name: 'Gemini 2 Pro',
    provider: AIModelProvider.GOOGLE,
    model: 'gemini-2.0-pro',
    displayName: 'Gemini 2 Pro',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    contextWindow: 1000000,
    inputPricePerM: 1.25,
    outputPricePerM: 5.0,
    strengths: [
      TaskType.CODE_GENERATION,
      TaskType.MULTIMODAL,
      TaskType.ANALYSIS,
    ],
    isPreferredFor: [TaskType.MULTIMODAL],
    enabled: true,
    isFallback: false,
    priority: 5,
  },
  {
    id: 'gemini-2-flash',
    name: 'Gemini 2 Flash',
    provider: AIModelProvider.GOOGLE,
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2 Flash',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    contextWindow: 1000000,
    inputPricePerM: 0.0,
    outputPricePerM: 0.0,
    strengths: [
      TaskType.CONVERSATION,
      TaskType.ANALYSIS,
      TaskType.SUMMARIZATION,
    ],
    isPreferredFor: [],
    enabled: true,
    isFallback: true,
    priority: 6,
  },
  // DeepSeek
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: AIModelProvider.DEEPSEEK,
    model: 'deepseek-coder',
    displayName: 'DeepSeek Coder',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: false,
    contextWindow: 128000,
    inputPricePerM: 0.14,
    outputPricePerM: 0.28,
    strengths: [TaskType.CODE_GENERATION, TaskType.CODE_COMPLETION],
    isPreferredFor: [TaskType.CODE_COMPLETION],
    enabled: true,
    isFallback: false,
    priority: 10,
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: AIModelProvider.DEEPSEEK,
    model: 'deepseek-chat',
    displayName: 'DeepSeek Chat',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: false,
    contextWindow: 128000,
    inputPricePerM: 0.07,
    outputPricePerM: 0.14,
    strengths: [
      TaskType.CONVERSATION,
      TaskType.ANALYSIS,
      TaskType.REASONING,
    ],
    isPreferredFor: [],
    enabled: true,
    isFallback: true,
    priority: 11,
  },
  // Zhipu GLM-4
  {
    id: 'glm-4',
    name: 'GLM-4',
    provider: AIModelProvider.ZHIPU,
    model: 'glm-4',
    displayName: 'GLM-4',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    contextWindow: 128000,
    inputPricePerM: 0.1,
    outputPricePerM: 0.1,
    strengths: [
      TaskType.CONVERSATION,
      TaskType.CODE_GENERATION,
      TaskType.ANALYSIS,
    ],
    isPreferredFor: [],
    enabled: true,
    isFallback: true,
    priority: 20,
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    provider: AIModelProvider.ZHIPU,
    model: 'glm-4-flash',
    displayName: 'GLM-4 Flash',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: false,
    contextWindow: 128000,
    inputPricePerM: 0.0,
    outputPricePerM: 0.0,
    strengths: [
      TaskType.CONVERSATION,
      TaskType.SUMMARIZATION,
    ],
    isPreferredFor: [],
    enabled: true,
    isFallback: true,
    priority: 21,
  },
  // MiniMax
  {
    id: 'minimax-abab6',
    name: 'MiniMax Abab6',
    provider: AIModelProvider.MINIMAX,
    model: 'abab6.5s-chat',
    displayName: 'MiniMax Abab6',
    maxTokens: 24576,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: false,
    contextWindow: 245760,
    inputPricePerM: 0.12,
    outputPricePerM: 0.12,
    strengths: [
      TaskType.CONVERSATION,
      TaskType.CODE_GENERATION,
      TaskType.ANALYSIS,
      TaskType.CREATIVE_WRITING,
    ],
    isPreferredFor: [],
    enabled: true,
    isFallback: true,
    priority: 30,
  },
  // Baillian
  {
    id: 'bailian-agent',
    name: 'Bailian Agent',
    provider: AIModelProvider.BAILIAN,
    model: 'agent-cli',
    displayName: 'Bailian Agent',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: true,
    contextWindow: 128000,
    inputPricePerM: 0.0,
    outputPricePerM: 0.0,
    strengths: [
      TaskType.CODE_GENERATION,
      TaskType.CODE_COMPLETION,
    ],
    isPreferredFor: [TaskType.CODE_COMPLETION],
    enabled: true,
    isFallback: true,
    priority: 40,
  },
  // Self-hosted Claude
  {
    id: 'self-claude',
    name: 'Self-hosted Claude',
    provider: AIModelProvider.SELF_CLAUDE,
    model: 'claude-3-opus',
    displayName: 'Self Claude',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    contextWindow: 200000,
    inputPricePerM: 0.0,
    outputPricePerM: 0.0,
    strengths: [
      TaskType.CODE_GENERATION,
      TaskType.ANALYSIS,
      TaskType.REASONING,
      TaskType.CREATIVE_WRITING,
    ],
    isPreferredFor: [],
    enabled: true,
    isFallback: false,
    priority: 50,
  },
]

/**
 * 获取所有启用的模型
 */
export function getEnabledModels(): AIModel[] {
  return MODELS.filter((m) => m.enabled).sort((a, b) => a.priority - b.priority)
}

/**
 * 获取模型 by ID
 */
export function getModelById(id: string): AIModel | undefined {
  return MODELS.find((m) => m.id === id)
}

/**
 * 获取模型 by provider
 */
export function getModelsByProvider(provider: AIModelProvider): AIModel[] {
  return MODELS.filter((m) => m.provider === provider && m.enabled)
}

/**
 * 获取适合某任务类型的模型
 */
export function getModelsForTaskType(taskType: TaskType): AIModel[] {
  return MODELS.filter((m) => m.enabled && m.strengths.includes(taskType)).sort(
    (a, b) => a.priority - b.priority
  )
}

/**
 * 获取某任务类型的首选模型
 */
export function getPreferredModelForTaskType(taskType: TaskType): AIModel | undefined {
  const models = MODELS.filter(
    (m) => m.enabled && m.isPreferredFor?.includes(taskType)
  )
  if (models.length > 0) {
    return models.reduce((a, b) => (a.priority < b.priority ? a : b))
  }
  // Fallback: return first model good at this task type
  return getModelsForTaskType(taskType)[0]
}

/**
 * 计算模型预估成本
 */
export function estimateModelCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  // 成本单位是每百万 token 的价格，换算成分 (1元 = 100分)
  const inputCost = (inputTokens / 1000000) * model.inputPricePerM
  const outputCost = (outputTokens / 1000000) * model.outputPricePerM
  return Math.round((inputCost + outputCost) * 100) // 转换为分
}