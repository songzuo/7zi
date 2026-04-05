/**
 * AI Chat Components
 *
 * AI 助手功能组件集
 * v1.12.x
 */

// Types
export * from './types'

// API Client
export { aiClient, AIAuthError, AINetworkError } from './client'

// Store
export { useAIChatStore, useAIMessages, useAIStatus, useStreamStats, useShowSuggestions } from './store'

// Components
export { ChatMessage } from './ChatMessage'
export { ChatInput } from './ChatInput'
export { SuggestionPanel } from './SuggestionPanel'
export { ChatWindow } from './ChatWindow'

// Default export
export { ChatWindow as AIChatWindow } from './ChatWindow'
