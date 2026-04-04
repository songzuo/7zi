/**
 * React Hook for Form Validation
 * 
 * useValidation hook for managing form state and validation in React components
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  FieldConfig,
  FormConfig,
  FieldState,
  ValidationTrigger,
  FormValidationResult,
} from './types'
import { FormValidator } from './form-validator'

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseValidationReturn {
  /** Current form values */
  values: Record<string, unknown>
  /** Field states */
  fieldStates: Record<string, FieldState>
  /** Form errors */
  errors: Record<string, string[]>
  /** Form-level errors */
  formErrors: string[]
  /** Whether form is valid */
  isValid: boolean
  /** Whether form is dirty (any field touched) */
  isDirty: boolean
  /** Whether form is submitting */
  isSubmitting: boolean
  /** Handle field change */
  handleChange: (fieldName: string, value: unknown) => void
  /** Handle field blur */
  handleBlur: (fieldName: string) => void
  /** Validate all fields */
  validate: () => FormValidationResult
  /** Validate specific field */
  validateField: (fieldName: string) => FormValidationResult
  /** Reset form */
  reset: () => void
  /** Reset specific field */
  resetField: (fieldName: string) => void
  /** Set field value */
  setFieldValue: (fieldName: string, value: unknown) => void
  /** Set multiple field values */
  setFieldValues: (values: Record<string, unknown>) => void
  /** Clear all errors */
  clearErrors: () => void
  /** Clear field errors */
  clearFieldErrors: (fieldName: string) => void
  /** Submit form */
  handleSubmit: (onSubmit: (values: Record<string, unknown>) => void | Promise<void>) => (e?: React.FormEvent) => Promise<void>
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useValidation(config: FormConfig): UseValidationReturn {
  const validatorRef = useRef<FormValidator>(new FormValidator(config))
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initialValues: Record<string, unknown> = {}
    for (const field of config.fields) {
      initialValues[field.name] = field.initialValue ?? ''
    }
    return initialValues
  })
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(() =>
    validatorRef.current.getAllFieldStates()
  )
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update field states when validator changes
  const updateFieldStates = useCallback(() => {
    setFieldStates(validatorRef.current.getAllFieldStates())
    setErrors(validatorRef.current.getAllErrors())
    setFormErrors(validatorRef.current.getFormErrors ? validatorRef.current.getFormErrors() : [])
  }, [])

  // Handle field change
  const handleChange = useCallback((fieldName: string, value: unknown) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))
    validatorRef.current.handleChange(fieldName, value, values)
    updateFieldStates()
  }, [values, updateFieldStates])

  // Handle field blur
  const handleBlur = useCallback((fieldName: string) => {
    validatorRef.current.handleBlur(fieldName, values)
    updateFieldStates()
  }, [values, updateFieldStates])

  // Validate all fields
  const validate = useCallback((): FormValidationResult => {
    const result = validatorRef.current.validateAll(values)
    updateFieldStates()
    return result
  }, [values, updateFieldStates])

  // Validate specific field
  const validateField = useCallback((fieldName: string): FormValidationResult => {
    const result = validatorRef.current.validateField(fieldName, values[fieldName], {
      values,
      fieldName,
      fieldNames: config.fields.map(f => f.name),
    })
    updateFieldStates()
    return result
  }, [values, config.fields, updateFieldStates])

  // Reset form
  const reset = useCallback(() => {
    validatorRef.current.reset()
    const initialValues: Record<string, unknown> = {}
    for (const field of config.fields) {
      initialValues[field.name] = field.initialValue ?? ''
    }
    setValues(initialValues)
    updateFieldStates()
  }, [config.fields, updateFieldStates])

  // Reset specific field
  const resetField = useCallback((fieldName: string) => {
    validatorRef.current.resetField(fieldName)
    const fieldConfig = config.fields.find(f => f.name === fieldName)
    setValues(prev => ({
      ...prev,
      [fieldName]: fieldConfig?.initialValue ?? '',
    }))
    updateFieldStates()
  }, [config.fields, updateFieldStates])

  // Set field value
  const setFieldValue = useCallback((fieldName: string, value: unknown) => {
    validatorRef.current.setFieldValue(fieldName, value)
    setValues(prev => ({ ...prev, [fieldName]: value }))
    updateFieldStates()
  }, [updateFieldStates])

  // Set multiple field values
  const setFieldValues = useCallback((newValues: Record<string, unknown>) => {
    validatorRef.current.setFieldValues(newValues)
    setValues(prev => ({ ...prev, ...newValues }))
    updateFieldStates()
  }, [updateFieldStates])

  // Clear all errors
  const clearErrors = useCallback(() => {
    validatorRef.current.clearErrors()
    updateFieldStates()
  }, [updateFieldStates])

  // Clear field errors
  const clearFieldErrors = useCallback((fieldName: string) => {
    validatorRef.current.clearFieldErrors(fieldName)
    updateFieldStates()
  }, [updateFieldStates])

  // Submit form
  const handleSubmit = useCallback(
    async (onSubmit: (values: Record<string, unknown>) => void | Promise<void>) => {
      return async (e?: React.FormEvent) => {
        e?.preventDefault()

        const result = validate()
        if (!result.valid) {
          return
        }

        setIsSubmitting(true)
        try {
          await onSubmit(values)
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [values, validate]
  )

  // Validate on mount if configured
  useEffect(() => {
    if (config.validateOnMount) {
      validate()
    }
  }, [config.validateOnMount, validate])

  return {
    values,
    fieldStates,
    errors,
    formErrors,
    isValid: validatorRef.current.isValid(),
    isDirty: validatorRef.current.isDirty(),
    isSubmitting,
    handleChange,
    handleBlur,
    validate,
    validateField,
    reset,
    resetField,
    setFieldValue,
    setFieldValues,
    clearErrors,
    clearFieldErrors,
    handleSubmit,
  }
}

// ============================================================================
// Simplified Hook for Single Field
// ============================================================================

export interface UseFieldValidationReturn {
  /** Field value */
  value: unknown
  /** Field state */
  state: FieldState
  /** Field errors */
  errors: string[]
  /** Whether field is valid */
  isValid: boolean
  /** Handle change */
  onChange: (value: unknown) => void
  /** Handle blur */
  onBlur: () => void
  /** Reset field */
  reset: () => void
  /** Clear errors */
  clearErrors: () => void
}

export function useFieldValidation(
  fieldName: string,
  initialValue: unknown,
  rules: import('./types').ValidationRule[],
  trigger: ValidationTrigger = 'onBlur'
): UseFieldValidationReturn {
  const form = useValidation({
    fields: [{ name: fieldName, initialValue, rules, trigger }],
  })

  return {
    value: form.values[fieldName],
    state: form.fieldStates[fieldName],
    errors: form.errors[fieldName] || [],
    isValid: !form.errors[fieldName] || form.errors[fieldName].length === 0,
    onChange: (value: unknown) => form.handleChange(fieldName, value),
    onBlur: () => form.handleBlur(fieldName),
    reset: () => form.resetField(fieldName),
    clearErrors: () => form.clearFieldErrors(fieldName),
  }
}