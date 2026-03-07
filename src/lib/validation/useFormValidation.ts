/**
 * 表单验证 Hook
 * 提供实时验证、字段级验证、表单级验证
 */
import { useState, useCallback, useMemo } from 'react';
import type { ValidationSchema, ValidationErrors, ValidationState, ValidationOptions } from './types';

/**
 * 表单验证 Hook
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  schema: ValidationSchema<T>,
  options: ValidationOptions = {}
) {
  const {
    validateOnBlur = true,
    validateOnChange = false,
    validateOnSubmit = true,
  } = options;

  const [state, setState] = useState<ValidationState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: true,
    isDirty: false,
  });

  /**
   * 验证单个字段
   */
  const validateField = useCallback(
    (name: keyof T, value: unknown): string | undefined => {
      const fieldSchema = schema[name];
      if (!fieldSchema) return undefined;

      const strValue = typeof value === 'string' ? value : String(value ?? '');

      // 必填验证
      if (fieldSchema.required) {
        if (!strValue || strValue.trim() === '') {
          return typeof fieldSchema.required === 'string' 
            ? fieldSchema.required 
            : '此字段为必填项';
        }
      }

      // 如果值为空且非必填，跳过其他验证
      if (!strValue || strValue.trim() === '') {
        return undefined;
      }

      // 最小长度
      if (fieldSchema.minLength !== undefined) {
        if (strValue.length < fieldSchema.minLength) {
          return `最少需要 ${fieldSchema.minLength} 个字符`;
        }
      }

      // 最大长度
      if (fieldSchema.maxLength !== undefined) {
        if (strValue.length > fieldSchema.maxLength) {
          return `最多允许 ${fieldSchema.maxLength} 个字符`;
        }
      }

      // 正则验证
      if (fieldSchema.pattern) {
        if (!fieldSchema.pattern.test(strValue)) {
          return '格式不正确';
        }
      }

      // 自定义验证
      if (fieldSchema.custom) {
        if (!fieldSchema.custom.rule(strValue)) {
          return fieldSchema.custom.message;
        }
      }

      return undefined;
    },
    [schema]
  );

  /**
   * 验证所有字段
   */
  const validateAllFields = useCallback((): ValidationErrors<T> => {
    const errors: ValidationErrors<T> = {};
    let hasErrors = false;

    for (const key in schema) {
      const error = validateField(key, state.values[key]);
      if (error) {
        errors[key] = error;
        hasErrors = true;
      }
    }

    setState((prev) => ({
      ...prev,
      errors,
      isValid: !hasErrors,
    }));

    return errors;
  }, [schema, state.values, validateField]);

  /**
   * 设置字段值
   */
  const setValue = useCallback(
    (name: keyof T, value: T[keyof T]) => {
      setState((prev) => {
        const newValues = { ...prev.values, [name]: value };
        const newState: ValidationState<T> = {
          ...prev,
          values: newValues,
          isDirty: true,
        };

        // 实时验证
        if (validateOnChange && prev.touched[name]) {
          const error = validateField(name, value);
          newState.errors = { ...prev.errors, [name]: error };
          newState.isValid = Object.values(newState.errors).every((e) => !e);
        }

        return newState;
      });
    },
    [validateField, validateOnChange]
  );

  /**
   * 设置字段为已触摸
   */
  const setTouched = useCallback(
    (name: keyof T) => {
      setState((prev) => {
        const newState: ValidationState<T> = {
          ...prev,
          touched: { ...prev.touched, [name]: true },
        };

        // 失焦验证
        if (validateOnBlur) {
          const error = validateField(name, prev.values[name]);
          newState.errors = { ...prev.errors, [name]: error };
          newState.isValid = Object.values(newState.errors).every((e) => !e);
        }

        return newState;
      });
    },
    [validateField, validateOnBlur]
  );

  /**
   * 处理输入变化
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const finalValue = type === 'number' ? Number(value) : value;
      setValue(name as keyof T, finalValue as T[keyof T]);
    },
    [setValue]
  );

  /**
   * 处理失焦
   */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched(name as keyof T);
    },
    [setTouched]
  );

  /**
   * 提交表单
   */
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => async (e: React.FormEvent) => {
      e.preventDefault();

      // 标记所有字段为已触摸
      const allTouched = Object.keys(schema).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>
      );

      if (validateOnSubmit) {
        const errors = validateAllFields();
        
        setState((prev) => ({
          ...prev,
          touched: allTouched,
        }));

        if (Object.keys(errors).length > 0) {
          return;
        }
      }

      await onSubmit(state.values);
    },
    [schema, validateOnSubmit, validateAllFields, state.values]
  );

  /**
   * 重置表单
   */
  const reset = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isValid: true,
      isDirty: false,
    });
  }, [initialValues]);

  /**
   * 设置多个字段值
   */
  const setValues = useCallback((values: Partial<T>) => {
    setState((prev) => ({
      ...prev,
      values: { ...prev.values, ...values },
      isDirty: true,
    }));
  }, []);

  /**
   * 设置多个错误
   */
  const setErrors = useCallback((errors: ValidationErrors<T>) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, ...errors },
      isValid: Object.values({ ...prev.errors, ...errors }).every((e) => !e),
    }));
  }, []);

  /**
   * 获取字段状态
   */
  const getFieldState = useCallback(
    (name: keyof T) => ({
      value: state.values[name],
      error: state.errors[name],
      touched: !!state.touched[name],
      hasError: !!state.errors[name] && !!state.touched[name],
    }),
    [state.values, state.errors, state.touched]
  );

  /**
   * 获取字段属性（用于 input 元素）
   */
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      name,
      value: String(state.values[name] ?? ''),
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    [state.values, handleChange, handleBlur]
  );

  return useMemo(
    () => ({
      // 状态
      values: state.values,
      errors: state.errors,
      touched: state.touched,
      isValid: state.isValid,
      isDirty: state.isDirty,

      // 方法
      setValue,
      setValues,
      setTouched,
      setErrors,
      handleChange,
      handleBlur,
      handleSubmit,
      reset,
      validateField,
      validateAllFields,
      getFieldState,
      getFieldProps,
    }),
    [
      state,
      setValue,
      setValues,
      setTouched,
      setErrors,
      handleChange,
      handleBlur,
      handleSubmit,
      reset,
      validateField,
      validateAllFields,
      getFieldState,
      getFieldProps,
    ]
  );
}

export default useFormValidation;
