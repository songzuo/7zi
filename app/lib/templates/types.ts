/**
 * Template System Types
 * 
 * Shared types for the template system.
 */

/**
 * Base Template Interface
 */
export interface BaseTemplate<TContext = TemplateContext, TResult = TemplateResult> {
  render(context: TContext): TResult;
}

/**
 * Base Template Context
 */
export interface TemplateContext {
  [key: string]: unknown;
}

/**
 * Base Template Result
 */
export interface TemplateResult {
  metadata?: Record<string, unknown>;
}

/**
 * Template Variable
 */
export interface TemplateVariable {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'url' | 'email';
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

/**
 * Template Definition
 */
export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: 'email' | 'notification' | 'sms' | 'push';
  variables: TemplateVariable[];
  createdAt: Date;
  updatedAt: Date;
}

export default {
  BaseTemplate: {} as BaseTemplate,
  TemplateContext: {} as TemplateContext,
  TemplateResult: {} as TemplateResult,
};
