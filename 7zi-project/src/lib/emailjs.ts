/**
 * EmailJS Configuration and Utilities
 */

// EmailJS config interface
export interface EmailJSConfig {
  publicKey: string;
  serviceId: string;
  templateId: string; // For backward compatibility with tests
  templateIds: Record<string, string>;
}

// Default config
export const EMAILJS_CONFIG: EmailJSConfig = {
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '',
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_CONTACT || '',
  templateIds: {
    contact: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_CONTACT || '',
    feedback: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_FEEDBACK || '',
    notification: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_NOTIFICATION || '',
  },
};

// Email template params
export interface EmailTemplateParams {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  [key: string]: string | undefined;
}

// Subject map for templates
export const SUBJECT_MAP: Record<string, string> = {
  contact: '用户反馈',
  feedback: '反馈建议',
  bug: 'Bug 报告',
  feature: '功能请求',
  other: '其他',
};

// Check if EmailJS is configured
export function isEmailJSConfigured(): boolean {
  return Boolean(
    EMAILJS_CONFIG.publicKey &&
    EMAILJS_CONFIG.serviceId &&
    Object.values(EMAILJS_CONFIG.templateIds).some(Boolean)
  );
}

// Get subject label
export function getSubjectLabel(key: string): string {
  return SUBJECT_MAP[key] || SUBJECT_MAP.other;
}
