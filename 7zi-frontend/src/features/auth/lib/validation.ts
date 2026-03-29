/**
 * Validation utilities for auth
 */

export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const emailValidation: ValidationRule = {
  validate: (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },
  message: 'Invalid email address',
};

export const passwordValidation: ValidationRule = {
  validate: (password: string) => {
    return password.length >= 8;
  },
  message: 'Password must be at least 8 characters',
};

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  } else if (!emailValidation.validate(email)) {
    errors.push(emailValidation.message);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  } else if (!passwordValidation.validate(password)) {
    errors.push(passwordValidation.message);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
