/**
 * Workspace Automation Engine
 *
 * 自动化工作流系统 - 统一导出
 */

// ============================================================================
// Core Types & Interfaces
// ============================================================================
export type {
  // Trigger Types
  TriggerType,
  ActionType,
  RuleStatus,
  ScheduleType,
  EventType,

  // Configuration
  TriggerConfig,
  ActionConfig,
  AutomationRule,

  // Execution
  ExecutionContext,
  ExecutionResult,

  // Validation
  ValidationError,
} from './automation-engine'

// ============================================================================
// Core Classes
// ============================================================================
export { AutomationEngine, RuleValidator, automationEngine } from './automation-engine'

// ============================================================================
// Default Templates
// ============================================================================
export {
  DEFAULT_RULE_TEMPLATES,
  getRuleTemplates,
  getRuleTemplateById,
  getRuleTemplatesByType,
  createRuleFromTemplate,
} from './default-templates'

// ============================================================================
// React Hooks
// ============================================================================
// NOTE: The following hooks are exported but not used in the current codebase.
// They are kept for potential future use.
// If you need these hooks, please use them directly from automation-hooks.ts
export {
  // Rule Management
  useAutomationRules,
  useAutomationRule,
  useRuleTemplates,

  // Rule Execution
  useRuleExecution,
  useRuleExecutionHistory,

  // Event Triggering
  useEventTrigger,

  // Statistics
  useRuleStats,
  useGlobalStats,

  // Validation
  useRuleValidation,

  // Registration
  useRuleRegistration,
} from './automation-hooks'

// ============================================================================
// Storage
// ============================================================================
export { AutomationDB, AutomationStorageAdapter, automationDB, automationStorage } from './automation-storage'

// REMOVED: None of the above hooks are currently used in the application.
// They are kept for backward compatibility and potential future use.
// Bundle size could be reduced by removing these exports if not needed.
