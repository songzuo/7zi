/**
 * Contact form validation utilities
 */

export interface FormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

export interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

/**
 * Validates contact form data
 */
export function validateContactForm(
  data: FormData,
  locale: 'zh' | 'en' = 'zh'
): ValidationResult {
  const errors: FormErrors = {};

  // Name validation
  if (!data.name.trim()) {
    errors.name = locale === 'zh' ? '请输入您的姓名' : 'Please enter your name';
  }

  // Email validation
  if (!data.email.trim()) {
    errors.email = locale === 'zh' ? '请输入您的邮箱' : 'Please enter your email';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = locale === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email address';
  }

  // Message validation
  if (!data.message.trim()) {
    errors.message = locale === 'zh' ? '请输入消息内容' : 'Please enter your message';
  } else if (data.message.trim().length < 10) {
    errors.message = locale === 'zh' ? '消息内容至少需要 10 个字符' : 'Message must be at least 10 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Subject options for the contact form
 */
export function getSubjectOptions(locale: 'zh' | 'en' = 'zh') {
  return locale === 'zh'
    ? [
        { value: '', label: '选择咨询主题' },
        { value: 'project', label: '项目咨询' },
        { value: 'cooperation', label: '商务合作' },
        { value: 'support', label: '技术支持' },
        { value: 'careers', label: '加入我们' },
        { value: 'other', label: '其他' },
      ]
    : [
        { value: '', label: 'Select a topic' },
        { value: 'project', label: 'Project Inquiry' },
        { value: 'cooperation', label: 'Business Cooperation' },
        { value: 'support', label: 'Technical Support' },
        { value: 'careers', label: 'Join Us' },
        { value: 'other', label: 'Other' },
      ];
}