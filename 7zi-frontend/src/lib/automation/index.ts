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
