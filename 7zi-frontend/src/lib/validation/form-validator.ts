/**
 * Form Validator
 * 
 * Main form validation engine with field-level and form-level validation
 */

import type {
  ValidationRule,
  ValidationContext,
  ValidationResult,
  FieldError,
  FormValidationResult,
  FieldConfig,
  FormConfig,
  FieldState,
  ValidationTrigger,
  AsyncValidator,
  AsyncValidationState,
  FormValidationRule,
  Translator,
} from './types'
import { required } from './validators'

// ============================================================================
// Form Validator Class
// ============================================================================

export class FormValidator {
  private config: FormConfig
  private fieldStates: Map<string, FieldState>
  private asyncStates: Map<string, AsyncValidationState>
  private formErrors: string[] = []

  constructor(config: FormConfig) {
    this.config = config
    this.fieldStates = new Map()
    this.asyncStates = new Map()

    // Initialize field states
    for (const field of config.fields) {
      this.fieldStates.set(field.name, {
        value: field.initialValue ?? '',
        touched: false,
        validated: false,
        errors: [],
        validating: false,
      })
    }
  }

  /** Get the translation function */
  private t(key: string, params?: Record<string, string | number>): string {
    return this.config.t?.(key, params) ?? key
  }

  /** Get field configuration */
  private getFieldConfig(fieldName: string): FieldConfig | undefined {
    return this.config.fields.find(f => f.name === fieldName)
  }

  /** Check if field should be validated */
  private shouldValidate(fieldName: string, trigger: ValidationTrigger): boolean {
    const fieldConfig = this.getFieldConfig(fieldName)
    if (!fieldConfig) return false

    const triggers = Array.isArray(fieldConfig.trigger)
      ? fieldConfig.trigger
      : [fieldConfig.trigger ?? this.config.defaultTrigger ?? 'onSubmit']

    return triggers.includes(trigger)
  }

  /** Validate a single field */
  validateField(
    fieldName: string,
    value: unknown,
    context?: ValidationContext
  ): FormValidationResult {
    const fieldConfig = this.getFieldConfig(fieldName)
    if (!fieldConfig) {
      return this.createResult(true)
    }

    const errors: string[] = []
    const rules = fieldConfig.rules ?? []

    // Update field state
    const state = this.fieldStates.get(fieldName)!
    state.value = value
    state.validated = true

    // Run validation rules
    for (const rule of rules) {
      // Skip if rule has skipIfEmpty and value is empty
      if (rule.skipIfEmpty && this.isEmpty(value)) {
        continue
      }

      const result = rule.validate(value, context)

      if (!result.valid) {
        const message = fieldConfig.customMessages?.[rule.name] ?? result.message ?? rule.message
        errors.push(message)
        state.errors.push(message)
      }
    }

    // Update state errors
    state.errors = errors

    return this.createResult(errors.length === 0, {
      [fieldName]: errors,
    })
  }

  /** Validate all fields */
  validateAll(values: Record<string, unknown>): FormValidationResult {
    const allErrors: Record<string, string[]> = {}

    // Validate each field
    for (const field of this.config.fields) {
      const context: ValidationContext = {
        values,
        fieldName: field.name,
        fieldNames: this.config.fields.map(f => f.name),
      }

      const result = this.validateField(field.name, values[field.name], context)

      if (!result.valid && result.errors[field.name]) {
        allErrors[field.name] = result.errors[field.name]
      }
    }

    // Run form-level validation
    this.formErrors = []
    if (this.config.formRules) {
      for (const rule of this.config.formRules) {
        const error = rule.validate(values)
        if (error !== true) {
          this.formErrors.push(error)
        }
      }
    }

    return this.createResult(
      Object.keys(allErrors).length === 0 && this.formErrors.length === 0,
      allErrors,
      this.formErrors
    )
  }

  /** Validate a field asynchronously */
  async validateFieldAsync(
    fieldName: string,
    value: unknown,
    context?: ValidationContext
  ): Promise<FormValidationResult> {
    const fieldConfig = this.getFieldConfig(fieldName)
    if (!fieldConfig) {
      return this.createResult(true)
    }

    const asyncRules = fieldConfig.rules?.filter(
      (r): r is AsyncValidator => 'validate' in r && r.validate.constructor.name === 'AsyncFunction'
    )

    if (!asyncRules || asyncRules.length === 0) {
      return this.validateField(fieldName, value, context)
    }

    const state = this.fieldStates.get(fieldName)!
    state.validating = true

    const errors: string[] = []

    try {
      for (const rule of asyncRules) {
        const result = await rule.validate(value, context)

        if (!result.valid) {
          const message = fieldConfig.customMessages?.[rule.name] ?? result.message ?? rule.message
          errors.push(message)
        }
      }
    } finally {
      state.validating = false
    }

    // Update state errors
    state.errors = errors

    return this.createResult(errors.length === 0, {
      [fieldName]: errors,
    })
  }

  /** Debounced async validation */
  validateFieldAsyncDebounced(
    fieldName: string,
    value: unknown,
    context?: ValidationContext
  ): Promise<FormValidationResult> {
    const fieldConfig = this.getFieldConfig(fieldName)
    if (!fieldConfig) {
      return Promise.resolve(this.createResult(true))
    }

    const asyncRules = fieldConfig.rules?.filter(
      (r): r is AsyncValidator => 'debounce' in r && (r as AsyncValidator).debounce
    )

    if (!asyncRules || asyncRules.length === 0) {
      return this.validateFieldAsync(fieldName, value, context)
    }

    // Get the debounce delay from the first async rule
    const debounce = (asyncRules[0] as AsyncValidator).debounce ?? 300

    // Clear existing timer
    const asyncState = this.asyncStates.get(fieldName)
    if (asyncState?.timer) {
      clearTimeout(asyncState.timer)
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        const result = await this.validateFieldAsync(fieldName, value, context)
        resolve(result)
      }, debounce)

      this.asyncStates.set(fieldName, {
        validating: true,
        lastValue: value,
        timer,
      })
    })
  }

  /** Handle field change */
  handleChange(fieldName: string, value: unknown, allValues: Record<string, unknown>): void {
    const state = this.fieldStates.get(fieldName)!
    state.value = value
    state.touched = true

    if (this.shouldValidate(fieldName, 'onChange')) {
      this.validateField(fieldName, value, {
        values: allValues,
        fieldName,
        fieldNames: this.config.fields.map(f => f.name),
      })
    }
  }

  /** Handle field blur */
  handleBlur(fieldName: string, allValues: Record<string, unknown>): void {
    const state = this.fieldStates.get(fieldName)!
    state.touched = true

    if (this.shouldValidate(fieldName, 'onBlur')) {
      this.validateField(fieldName, state.value, {
        values: allValues,
        fieldName,
        fieldNames: this.config.fields.map(f => f.name),
      })
    }
  }

  /** Get field state */
  getFieldState(fieldName: string): FieldState | undefined {
    return this.fieldStates.get(fieldName)
  }

  /** Get all field states */
  getAllFieldStates(): Record<string, FieldState> {
    const result: Record<string, FieldState> = {}
    for (const [name, state] of this.fieldStates) {
      result[name] = state
    }
    return result
  }

  /** Get field errors */
  getFieldErrors(fieldName: string): string[] {
    return this.fieldStates.get(fieldName)?.errors ?? []
  }

  /** Get all errors */
  getAllErrors(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    for (const [name, state] of this.fieldStates) {
      if (state.errors.length > 0) {
        result[name] = state.errors
      }
    }
    return result
  }

  /** Check if form is valid */
  isValid(): boolean {
    for (const state of this.fieldStates.values()) {
      if (state.errors.length > 0) {
        return false
      }
    }
    return this.formErrors.length === 0
  }

  /** Check if form is dirty (any field touched) */
  isDirty(): boolean {
    for (const state of this.fieldStates.values()) {
      if (state.touched) {
        return true
      }
    }
    return false
  }

  /** Reset form to initial state */
  reset(): void {
    for (const field of this.config.fields) {
      this.fieldStates.set(field.name, {
        value: field.initialValue ?? '',
        touched: false,
        validated: false,
        errors: [],
        validating: false,
      })
    }
    this.formErrors = []
    this.asyncStates.clear()
  }

  /** Reset specific field */
  resetField(fieldName: string): void {
    const fieldConfig = this.getFieldConfig(fieldName)
    if (fieldConfig) {
      this.fieldStates.set(fieldName, {
        value: fieldConfig.initialValue ?? '',
        touched: false,
        validated: false,
        errors: [],
        validating: false,
      })
    }
  }

  /** Set field value */
  setFieldValue(fieldName: string, value: unknown): void {
    const state = this.fieldStates.get(fieldName)
    if (state) {
      state.value = value
    }
  }

  /** Set multiple field values */
  setFieldValues(values: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(values)) {
      this.setFieldValue(name, value)
    }
  }

  /** Clear all errors */
  clearErrors(): void {
    for (const state of this.fieldStates.values()) {
      state.errors = []
    }
    this.formErrors = []
  }

  /** Clear field errors */
  clearFieldErrors(fieldName: string): void {
    const state = this.fieldStates.get(fieldName)
    if (state) {
      state.errors = []
    }
  }

  /** Create validation result */
  private createResult(
    valid: boolean,
    errors: Record<string, string[]> = {},
    formErrors: string[] = []
  ): FormValidationResult {
    const allFieldErrors = Object.values(errors).flat()
    const allErrors = [...allFieldErrors, ...formErrors]

    return {
      valid,
      errors,
      formErrors,
      firstError: allErrors[0],
    }
  }

  /** Check if value is empty */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true
    }
    if (Array.isArray(value) && value.length === 0) {
      return true
    }
    return false
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Create a form validator instance */
export function createFormValidator(config: FormConfig): FormValidator {
  return new FormValidator(config)
}

/** Validate a single value with rules */
export function validateValue<T = unknown>(
  value: T,
  rules: ValidationRule<T>[],
  context?: ValidationContext
): ValidationResult {
  for (const rule of rules) {
    if (rule.skipIfEmpty && isEmpty(value)) {
      continue
    }

    const result = rule.validate(value, context)
    if (!result.valid) {
      return result
    }
  }

  return { valid: true }
}

/** Check if value is empty */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true
  }
  if (Array.isArray(value) && value.length === 0) {
    return true
  }
  return false
}

/** Create a form validation rule */
export function createFormRule(
  name: string,
  validate: (values: Record<string, unknown>) => string | true,
  message: string
): FormValidationRule {
  return { name, validate, message }
}