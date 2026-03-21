/**
 * EmailJS 配置 - 支持 i18n
 *
 * 使用说明:
 * 1. 注册 EmailJS 账号: https://www.emailjs.com/
 * 2. 创建邮件服务 (Email Service)
 * 3. 创建邮件模板 (Email Template)
 * 4. 获取 Public Key, Service ID, Template ID
 *
 * 模板变量参考:
 * - {{from_name}} - 发件人姓名
 * - {{from_email}} - 发件人邮箱
 * - {{company}} - 公司名称
 * - {{subject}} - 主题
 * - {{message}} - 消息内容
 * - {{locale}} - 语言 (zh/en)
 */

import type { Locale } from '@/i18n/config';

export const EMAILJS_CONFIG = {
  // EmailJS Public Key (在 Account > General 中找到)
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "",

  // 邮件服务 ID (在 Email Services 中找到)
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "",

  // 邮件模板 ID (在 Email Templates 中找到)
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "",
};

/**
 * 检查 EmailJS 是否已配置
 */
export function isEmailJSConfigured(): boolean {
  return Boolean(
    EMAILJS_CONFIG.publicKey &&
    EMAILJS_CONFIG.serviceId &&
    EMAILJS_CONFIG.templateId
  );
}

/**
 * 邮件模板参数接口
 */
export interface EmailTemplateParams {
  from_name: string;
  from_email: string;
  company?: string;
  subject?: string;
  message: string;
  to_name?: string;
  reply_to?: string;
  locale?: Locale;
}

/**
 * 主题映射 - 支持多语言
 */
export const SUBJECT_MAP: Record<Locale, Record<string, string>> = {
  zh: {
    project: "项目咨询",
    cooperation: "商务合作",
    support: "技术支持",
    careers: "加入我们",
    other: "其他",
  },
  en: {
    project: "Project Inquiry",
    cooperation: "Business Cooperation",
    support: "Technical Support",
    careers: "Join Us",
    other: "Other",
  },
};

/**
 * 获取主题显示名称 (支持 i18n)
 */
export function getSubjectLabel(subject?: string, locale: Locale = 'zh'): string {
  if (!subject) return locale === 'zh' ? '通用咨询' : 'General Inquiry';
  return SUBJECT_MAP[locale]?.[subject] || subject;
}

/**
 * 获取本地化的邮件主题
 */
export function getLocalizedSubject(subjectKey: string, locale: Locale = 'zh'): string {
  const subjects = SUBJECT_MAP[locale] || SUBJECT_MAP.zh;
  return subjects[subjectKey] || SUBJECT_MAP.zh[subjectKey] || subjectKey;
}