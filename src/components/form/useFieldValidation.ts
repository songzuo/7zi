/**
 * 单字段实时验证 Hook
 */
import { useState, useCallback, useEffect } from 'react';

export type ValidationFunction = (value: string) => string | undefined | null;

export type ValidateOn = 'blur' | 'change' | 'submit';

export type InputElementType = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface UseFieldValidationOptions {
  /** 验证函数 */
  validate?: ValidationFunction;
  /** 验证时机 */
  validateOn?: ValidateOn;
  /** 默认值 */
  defaultValue?: string;
  /** 是否在变化时验证（覆盖 validateOn） */
  validateOnChange?: boolean;
  /** 是否在失焦时验证（覆盖 validateOn） */
  validateOnBlur?: boolean;
}

export interface UseFieldValidationReturn {
  /** 当前值 */
  value: string;
  /** 错误信息 */
  error: string | undefined;
  /** 是否已触摸 */
  isTouched: boolean;
  /** 是否有效 */
  isValid: boolean;
  /** 是否正在验证 */
  isValidating: boolean;
  /** 设置值 */
  setValue: (value: string) => void;
  /** 设置错误 */
  setError: (error: string | undefined) => void;
  /** 处理变化事件 */
  handleChange: (e: React.ChangeEvent<InputElementType>) => void;
  /** 处理失焦事件 */
  handleBlur: (e: React.FocusEvent<InputElementType>) => void;
  /** 手动验证 */
  validate: () => Promise<boolean>;
  /** 重置字段 */
  reset: () => void;
}

/**
 * 单字段实时验证 Hook
 */
export function useFieldValidation(
  options: UseFieldValidationOptions = {}
): UseFieldValidationReturn {
  const {
    validate: validateFn,
    validateOn = 'blur',
    defaultValue = '',
    validateOnChange: customValidateOnChange,
    validateOnBlur: customValidateOnBlur,
  } = options;

  // 计算实际的验证时机
  const shouldValidateOnChange = customValidateOnChange ?? validateOn === 'change';
  const shouldValidateOnBlur = customValidateOnBlur ?? validateOn === 'blur';

  const [value, setValueState] = useState(defaultValue);
  const [error, setErrorState] = useState<string | undefined>();
  const [isTouched, setIsTouched] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * 执行验证
   */
  const runValidation = useCallback(
    async (val: string): Promise<string | undefined> => {
      if (!validateFn) return undefined;

      setIsValidating(true);
      try {
        // 支持异步验证
        const result = await Promise.resolve(validateFn(val));
        return result ?? undefined;
      } finally {
        setIsValidating(false);
      }
    },
    [validateFn]
  );

  /**
   * 设置值
   */
  const setValue = useCallback(
    (newValue: string) => {
      setValueState(newValue);
    },
    []
  );

  /**
   * 设置错误
   */
  const setError = useCallback((newError: string | undefined) => {
    setErrorState(newError);
  }, []);

  /**
   * 处理变化事件
   */
  const handleChange = useCallback(
    async (e: React.ChangeEvent<InputElementType>) => {
      const newValue = e.target.value;
      setValueState(newValue);

      if (shouldValidateOnChange && isTouched) {
        const validationError = await runValidation(newValue);
        setErrorState(validationError);
      }
    },
    [shouldValidateOnChange, isTouched, runValidation]
  );

  /**
   * 处理失焦事件
   */
  const handleBlur = useCallback(
    async (e: React.FocusEvent<InputElementType>) => {
      setIsTouched(true);

      if (shouldValidateOnBlur || !isTouched) {
        const validationError = await runValidation(e.target.value);
        setErrorState(validationError);
      }
    },
    [shouldValidateOnBlur, isTouched, runValidation]
  );

  /**
   * 手动验证
   */
  const validate = useCallback(async (): Promise<boolean> => {
    const validationError = await runValidation(value);
    setErrorState(validationError);
    setIsTouched(true);
    return !validationError;
  }, [value, runValidation]);

  /**
   * 重置字段
   */
  const reset = useCallback(() => {
    setValueState(defaultValue);
    setErrorState(undefined);
    setIsTouched(false);
    setIsValidating(false);
  }, [defaultValue]);

  // 当外部 defaultValue 变化时重置
  useEffect(() => {
    setValueState(defaultValue);
  }, [defaultValue]);

  return {
    value,
    error,
    isTouched,
    isValid: !error,
    isValidating,
    setValue,
    setError,
    handleChange,
    handleBlur,
    validate,
    reset,
  };
}

export default useFieldValidation;