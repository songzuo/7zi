/**
 * @fileoverview EmailJS 配置和工具函数测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EMAILJS_CONFIG,
  isEmailJSConfigured,
  getSubjectLabel,
  SUBJECT_MAP,
  type EmailTemplateParams,
} from '../../lib/emailjs';

describe('EMAILJS_CONFIG', () => {
  it('has publicKey property', () => {
    expect(EMAILJS_CONFIG).toHaveProperty('publicKey');
  });

  it('has serviceId property', () => {
    expect(EMAILJS_CONFIG).toHaveProperty('serviceId');
  });

  it('has templateId property', () => {
    expect(EMAILJS_CONFIG).toHaveProperty('templateId');
  });

  it('defaults to empty strings when env vars are not set', () => {
    // These will be empty strings if env vars are not set
    expect(typeof EMAILJS_CONFIG.publicKey).toBe('string');
    expect(typeof EMAILJS_CONFIG.serviceId).toBe('string');
    expect(typeof EMAILJS_CONFIG.templateId).toBe('string');
  });
});

describe('isEmailJSConfigured', () => {
  it('returns boolean', () => {
    const result = isEmailJSConfigured();
    expect(typeof result).toBe('boolean');
  });

  it('returns false when any config is missing', () => {
    // In test environment without env vars, should return false
    // This tests the actual behavior
    const result = isEmailJSConfigured();
    expect(result).toBe(false);
  });
});

describe('SUBJECT_MAP', () => {
  it('contains project key', () => {
    expect(SUBJECT_MAP).toHaveProperty('project', '项目咨询');
  });

  it('contains cooperation key', () => {
    expect(SUBJECT_MAP).toHaveProperty('cooperation', '商务合作');
  });

  it('contains support key', () => {
    expect(SUBJECT_MAP).toHaveProperty('support', '技术支持');
  });

  it('contains careers key', () => {
    expect(SUBJECT_MAP).toHaveProperty('careers', '加入我们');
  });

  it('contains other key', () => {
    expect(SUBJECT_MAP).toHaveProperty('other', '其他');
  });

  it('has correct number of subjects', () => {
    const keys = Object.keys(SUBJECT_MAP);
    expect(keys.length).toBe(5);
  });
});

describe('getSubjectLabel', () => {
  it('returns correct label for project', () => {
    expect(getSubjectLabel('project')).toBe('项目咨询');
  });

  it('returns correct label for cooperation', () => {
    expect(getSubjectLabel('cooperation')).toBe('商务合作');
  });

  it('returns correct label for support', () => {
    expect(getSubjectLabel('support')).toBe('技术支持');
  });

  it('returns correct label for careers', () => {
    expect(getSubjectLabel('careers')).toBe('加入我们');
  });

  it('returns correct label for other', () => {
    expect(getSubjectLabel('other')).toBe('其他');
  });

  it('returns "通用咨询" for undefined', () => {
    expect(getSubjectLabel(undefined)).toBe('通用咨询');
  });

  it('returns the subject itself if not in map', () => {
    expect(getSubjectLabel('custom-subject')).toBe('custom-subject');
  });

  it('returns "通用咨询" for empty string', () => {
    expect(getSubjectLabel('')).toBe('通用咨询');
  });

  it('handles null gracefully', () => {
    // @ts-expect-error - Testing runtime behavior with null
    expect(getSubjectLabel(null)).toBe('通用咨询');
  });
});

describe('EmailTemplateParams interface', () => {
  it('has required fields', () => {
    const params: EmailTemplateParams = {
      from_name: 'John Doe',
      from_email: 'john@example.com',
      message: 'Test message',
    };
    expect(params.from_name).toBe('John Doe');
    expect(params.from_email).toBe('john@example.com');
    expect(params.message).toBe('Test message');
  });

  it('supports optional fields', () => {
    const params: EmailTemplateParams = {
      from_name: 'John Doe',
      from_email: 'john@example.com',
      message: 'Test message',
      company: 'Test Company',
      subject: 'project',
      to_name: 'Support Team',
      reply_to: 'john@example.com',
    };
    expect(params.company).toBe('Test Company');
    expect(params.subject).toBe('project');
    expect(params.to_name).toBe('Support Team');
    expect(params.reply_to).toBe('john@example.com');
  });
});
