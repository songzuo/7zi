/**
 * 表单验证类型定义
 */
export type ValidationRule<T = string> = {
  rule: (value: T) => boolean;
  message: string;
};

export type FieldValidators = {
  required?: boolean | string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: ValidationRule;
};

export type ValidationSchema<T extends Record<string, unknown>> = {
  [K in keyof T]?: FieldValidators;
};

export type ValidationErrors<T extends Record<string, unknown>> = {
  [K in keyof T]?: string;
};

export type ValidationState<T extends Record<string, unknown>> = {
  values: T;
  errors: ValidationErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
};

export type ValidationOptions = {
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  validateOnSubmit?: boolean;
};
