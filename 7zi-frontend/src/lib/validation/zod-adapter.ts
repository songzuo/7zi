/**
 * Zod Schema Adapter
 * 
 * Integration with Zod schemas for type-safe validation
 */

import { z } from 'zod'
import type {
  ValidationRule,
  ValidationContext,
  ValidationResult,
  ZodFieldSchema,
  Translator,
} from './types'
import { createResult, getErrorMessage } from './validators'

// ============================================================================
// Zod to ValidationRule Converter
// ============================================================================

/** Convert a Zod schema to validation rules */
export function zodToRules<T = unknown>(
  schema: z.ZodSchema<T>,
  messages?: Record<string, string>,
  t?: Translator
): ValidationRule[] {
  const rules: ValidationRule[] = []

  // Traverse Zod schema to extract validation rules
  const processZodType = (zodType: z.ZodTypeAny): void => {
    // Handle refinements
    if (zodType instanceof z.ZodEffects) {
      processZodType(zodType._def.schema)
      return
    }

    // Handle unions
    if (zodType instanceof z.ZodUnion) {
      zodType._def.options.forEach(processZodType)
      return
    }

    // Handle optional/nullable
    if (zodType instanceof z.ZodOptional || zodType instanceof z.ZodNullable) {
      processZodType(zodType._def.innerType)
      return
    }

    // Handle default values
    if (zodType instanceof z.ZodDefault) {
      processZodType(zodType._def.innerType)
      return
    }

    // Extract rules from ZodString
    if (zodType instanceof z.ZodString) {
      const checks = zodType._def.checks ?? []

      for (const check of checks) {
        switch (check.kind) {
          case 'min':
            rules.push(createMinLengthRule(check.value, messages, t))
            break
          case 'max':
            rules.push(createMaxLengthRule(check.value, messages, t))
            break
          case 'email':
            rules.push(createEmailRule(messages, t))
            break
          case 'url':
            rules.push(createUrlRule(messages, t))
            break
          case 'uuid':
            rules.push(createUuidRule(messages, t))
            break
          case 'regex':
            rules.push(createPatternRule(check.regex, messages, t))
            break
        }
      }
    }

    // Extract rules from ZodNumber
    if (zodType instanceof z.ZodNumber) {
      const checks = zodType._def.checks ?? []

      for (const check of checks) {
        switch (check.kind) {
          case 'min':
            rules.push(createMinRule(check.value, messages, t))
            break
          case 'max':
            rules.push(createMaxRule(check.value, messages, t))
            break
          case 'int':
            rules.push(createIntegerRule(messages, t))
            break
          case 'multipleOf':
            rules.push(createMultipleOfRule(check.value, messages, t))
            break
        }
      }
    }

    // Handle refine/custom validations
    if (zodType instanceof z.ZodEffects && zodType._def.effect.type === 'refinement') {
      const refinement = zodType._def.effect.refinement
      rules.push(createCustomRule(refinement, messages, t))
    }
  }

  processZodType(schema)
  return rules
}

/** Create a minimum length rule from Zod */
function createMinLengthRule(
  min: number,
  messages?: Record<string, string>,
  t?: Translator
): ValidationRule {
  return {
    name: 'minLength',
    validate: (value: unknown) => {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        return createResult(true)
      }
      const length = typeof value === 'string' ? value.length : value.length
      return length >= min
        ? createResult(true)
        : createResult(false, getErrorMessage('minLength', { min }, messages?.minLength, t))
    },
    message: messages?.minLength || getErrorMessage('minLength', { min }, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create a maximum length rule from Zod */
function createMaxLengthRule(
  max: number,
  messages?: Record<string, string>,
  t?: Translator
): ValidationRule {
  return {
    name: 'maxLength',
    validate: (value: unknown) => {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        return createResult(true)
      }
      const length = typeof value === 'string' ? value.length : value.length
      return length <= max
        ? createResult(true)
        : createResult(false, getErrorMessage('maxLength', { max }, messages?.maxLength, t))
    },
    message: messages?.maxLength || getErrorMessage('maxLength', { max }, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create an email rule from Zod */
function createEmailRule(messages?: Record<string, string>, t?: Translator): ValidationRule {
  return {
    name: 'email',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(false, getErrorMessage('email', undefined, messages?.email, t))
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
        ? createResult(true)
        : createResult(false, getErrorMessage('email', undefined, messages?.email, t))
    },
    message: messages?.email || getErrorMessage('email', undefined, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create a URL rule from Zod */
function createUrlRule(messages?: Record<string, string>, t?: Translator): ValidationRule {
  return {
    name: 'url',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(false, getErrorMessage('url', undefined, messages?.url, t))
      }
      try {
        new URL(value)
        return createResult(true)
      } catch {
        return createResult(false, getErrorMessage('url', undefined, messages?.url, t))
      }
    },
    message: messages?.url || getErrorMessage('url', undefined, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create a UUID rule from Zod */
function createUuidRule(messages?: Record<string, string>, t?: Translator): ValidationRule {
  return {
    name: 'uuid',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(false, getErrorMessage('uuid', undefined, messages?.uuid, t))
      }
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(value)
        ? createResult(true)
        : createResult(false, getErrorMessage('uuid', undefined, messages?.uuid, t))
    },
    message: messages?.uuid || getErrorMessage('uuid', undefined, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create a pattern rule from Zod */
function createPatternRule(
  regex: RegExp,
  messages?: Record<string, string>,
  t?: Translator
): ValidationRule {
  return {
    name: 'pattern',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(true)
      }
      return regex.test(value)
        ? createResult(true)
        : createResult(false, getErrorMessage('pattern', undefined, messages?.pattern, t))
    },
    message: messages?.pattern || getErrorMessage('pattern', undefined, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create a min value rule from Zod */
function createMinRule(min: number, messages?: Record<string, string>, t?: Translator): ValidationRule {
  return {
    name: 'min',
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      if (typeof num !== 'number' || isNaN(num)) {
        return createResult(true)
      }
      return num >= min
        ? createResult(true)
        : createResult(false, getErrorMessage('min', { min }, messages?.min, t))
    },
    message: messages?.min || getErrorMessage('min', { min }, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create a max value rule from Zod */
function createMaxRule(max: number, messages?: Record<string, string>, t?: Translator): ValidationRule {
  return {
    name: 'max',
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      if (typeof num !== 'number' || isNaN(num)) {
        return createResult(true)
      }
      return num <= max
        ? createResult(true)
        : createResult(false, getErrorMessage('max', { max }, messages?.max, t))
    },
    message: messages?.max || getErrorMessage('max', { max }, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create an integer rule from Zod */
function createIntegerRule(messages?: Record<string, string>, t?: Translator): ValidationRule {
  return {
    name: 'integer',
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      return typeof num === 'number' && !isNaN(num) && Number.isInteger(num)
        ? createResult(true)
        : createResult(false, getErrorMessage('integer', undefined, messages?.integer, t))
    },
    message: messages?.integer || getErrorMessage('integer', undefined, undefined, t),
    skipIfEmpty: true,
  }
}

/** Create a multiple of rule from Zod */
function createMultipleOfRule(
  multipleOf: number,
  messages?: Record<string, string>,
  t?: Translator
): ValidationRule {
  return {
    name: 'multipleOf',
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      if (typeof num !== 'number' || isNaN(num)) {
        return createResult(true)
      }
      return num % multipleOf === 0
        ? createResult(true)
        : createResult(
            false,
            `Value must be a multiple of ${multipleOf}`,
            'multipleOf'
          )
    },
    message: `Value must be a multiple of ${multipleOf}`,
    skipIfEmpty: true,
  }
}

/** Create a custom rule from Zod refinement */
function createCustomRule(
  refinement: (value: unknown, ctx: z.RefinementCtx) => unknown,
  messages?: Record<string, string>,
  t?: Translator
): ValidationRule {
  return {
    name: 'custom',
    validate: (value: unknown, context?: ValidationContext) => {
      try {
        const mockCtx: z.RefinementCtx = {
          addIssue: () => {},
          path: [],
        }
        refinement(value, mockCtx)
        return createResult(true)
      } catch {
        return createResult(
          false,
          messages?.custom || getErrorMessage('pattern', undefined, undefined, t),
          'custom'
        )
      }
    },
    message: messages?.custom || getErrorMessage('pattern', undefined, undefined, t),
    skipIfEmpty: true,
  }
}

// ============================================================================
// Validation with Zod Schema
// ============================================================================

/** Validate a value using a Zod schema directly */
export function validateWithZod<T = unknown>(
  value: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(value)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map((err: z.ZodIssue) => {
    const path = err.path.join('.')
    return path ? `${path}: ${err.message}` : err.message
  })

  return { success: false, errors }
}

/** Create a validation rule from a Zod schema */
export function zodRule<T = unknown>(
  schema: z.ZodSchema<T>,
  message?: string
): ValidationRule<T> {
  return {
    name: 'zod',
    validate: (value: T) => {
      const result = schema.safeParse(value)
      return result.success
        ? createResult(true)
        : createResult(
            false,
            message || result.error.issues[0]?.message || 'Validation failed',
            'zod'
          )
    },
    message: message || 'Validation failed',
    skipIfEmpty: true,
  }
}
