/**
 * Email Templates 测试
 */

import { describe, it, expect } from 'vitest';
import {
  WelcomeEmailTemplate,
  VerificationEmailTemplate,
  PasswordResetEmailTemplate,
  ReportEmailTemplate,
  AlertEmailTemplate,
  CustomEmailTemplate,
  EmailTemplateFactory,
  EmailContext,
} from './email';

describe('Email Templates', () => {
  const baseContext: EmailContext = {
    recipientName: 'Test User',
    recipientEmail: 'test@example.com',
    senderName: 'OpenClaw',
    senderEmail: 'noreply@openclaw.com',
  };

  describe('WelcomeEmailTemplate', () => {
    it('should render welcome email', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render(baseContext);

      expect(result.subject).toContain('Welcome');
      expect(result.html).toContain('Hello Test User');
      expect(result.html).toContain('Welcome to OpenClaw');
      expect(result.text).toBeDefined();
    });

    it('should handle missing recipient name', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render({ ...baseContext, recipientName: undefined });

      expect(result.html).toContain('Hello there');
    });

    it('should include action button when URL provided', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render({
        ...baseContext,
        actionUrl: 'https://example.com/get-started',
        actionText: 'Get Started',
      });

      expect(result.html).toContain('https://example.com/get-started');
    });
  });

  describe('VerificationEmailTemplate', () => {
    it('should render verification email', () => {
      const template = new VerificationEmailTemplate();
      const result = template.render({
        ...baseContext,
        data: { code: '123456' },
        actionUrl: 'https://example.com/verify',
      });

      expect(result.subject).toContain('Verify');
      expect(result.html).toContain('123456');
      expect(result.html).toContain('Verify Email');
    });

    it('should handle missing verification code', () => {
      const template = new VerificationEmailTemplate();
      const result = template.render(baseContext);

      expect(result.html).toContain('N/A');
    });
  });

  describe('PasswordResetEmailTemplate', () => {
    it('should render password reset email', () => {
      const template = new PasswordResetEmailTemplate();
      const result = template.render({
        ...baseContext,
        actionUrl: 'https://example.com/reset',
      });

      expect(result.subject).toContain('Reset');
      expect(result.html).toContain('Reset Password');
    });

    it('should include expiry notice', () => {
      const template = new PasswordResetEmailTemplate();
      const result = template.render(baseContext);

      expect(result.html).toContain('expire in 1 hour');
    });
  });

  describe('ReportEmailTemplate', () => {
    it('should render report email', () => {
      const template = new ReportEmailTemplate('Monthly Report');
      const result = template.render({
        ...baseContext,
        data: {
          report: {
            title: 'Monthly Report',
            summary: 'This is a summary',
          },
        },
      });

      expect(result.subject).toContain('Report');
      expect(result.html).toContain('Monthly Report');
      expect(result.html).toContain('This is a summary');
    });

    it('should handle missing report data', () => {
      const template = new ReportEmailTemplate('Report');
      const result = template.render(baseContext);

      expect(result.html).toContain('Your report is ready');
    });
  });

  describe('AlertEmailTemplate', () => {
    it('should render alert email', () => {
      const template = new AlertEmailTemplate('System Error');
      const result = template.render({
        ...baseContext,
        data: {
          alert: {
            type: 'System Error',
            severity: 'High',
            message: 'Something went wrong',
          },
        },
      });

      expect(result.subject).toContain('Alert');
      expect(result.html).toContain('System Error');
      expect(result.html).toContain('High');
    });

    it('should use red brand color', () => {
      const template = new AlertEmailTemplate('Alert');
      const result = template.render(baseContext);

      expect(result.html).toContain('#EF4444');
    });
  });

  describe('CustomEmailTemplate', () => {
    it('should render custom email', () => {
      const template = new CustomEmailTemplate({
        type: 'custom',
        subject: 'Custom Subject',
      });
      const result = template.render({
        ...baseContext,
        customContent: '<p>Custom content here</p>',
      });

      expect(result.subject).toBe('Custom Subject');
      expect(result.html).toContain('Custom content here');
    });

    it('should include action button when provided', () => {
      const template = new CustomEmailTemplate({
        type: 'custom',
        subject: 'Action Required',
      });
      const result = template.render({
        ...baseContext,
        customContent: '<p>Please take action</p>',
        actionUrl: 'https://example.com/action',
        actionText: 'Take Action',
      });

      expect(result.html).toContain('Take Action');
      expect(result.html).toContain('https://example.com/action');
    });
  });

  describe('EmailTemplateFactory', () => {
    it('should create welcome template', () => {
      const template = EmailTemplateFactory.create('welcome');
      expect(template).toBeInstanceOf(WelcomeEmailTemplate);
    });

    it('should create verification template', () => {
      const template = EmailTemplateFactory.create('verification');
      expect(template).toBeInstanceOf(VerificationEmailTemplate);
    });

    it('should create password reset template', () => {
      const template = EmailTemplateFactory.create('password-reset');
      expect(template).toBeInstanceOf(PasswordResetEmailTemplate);
    });

    it('should create report template', () => {
      const template = EmailTemplateFactory.create('report', { subject: 'Test Report' });
      expect(template).toBeInstanceOf(ReportEmailTemplate);
    });

    it('should create alert template', () => {
      const template = EmailTemplateFactory.create('alert', { subject: 'Test Alert' });
      expect(template).toBeInstanceOf(AlertEmailTemplate);
    });

    it('should create custom template', () => {
      const template = EmailTemplateFactory.create('custom', {
        type: 'custom',
        subject: 'Custom',
      });
      expect(template).toBeInstanceOf(CustomEmailTemplate);
    });

    it('should throw error for unknown type', () => {
      expect(() => {
        // @ts-expect-error - testing invalid type
        EmailTemplateFactory.create('unknown');
      }).toThrow('Unknown email template type');
    });

    it('should return available types', () => {
      const types = EmailTemplateFactory.getAvailableTypes();
      expect(types).toContain('welcome');
      expect(types).toContain('verification');
      expect(types).toContain('password-reset');
      expect(types).toContain('report');
      expect(types).toContain('alert');
    });

    it('should allow registering custom templates', () => {
      class CustomTemplate extends WelcomeEmailTemplate {
        render() {
          return {
            subject: 'Custom',
            html: '<div>Custom</div>',
            text: 'Custom',
            metadata: { templateType: 'custom' },
          };
        }
      }

      EmailTemplateFactory.register('notification', () => new CustomTemplate());
      const template = EmailTemplateFactory.create('notification');
      expect(template).toBeInstanceOf(CustomTemplate);
    });
  });

  describe('Email HTML Structure', () => {
    it('should include DOCTYPE declaration', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render(baseContext);

      expect(result.html).toContain('<!DOCTYPE html>');
    });

    it('should include responsive viewport', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render(baseContext);

      expect(result.html).toContain('viewport');
      expect(result.html).toContain('width=device-width');
    });

    it('should include brand color styling', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render(baseContext);

      expect(result.html).toContain('#3B82F6');
    });

    it('should include footer with copyright', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render(baseContext);

      expect(result.html).toContain('©');
      expect(result.html).toContain('All rights reserved');
    });
  });
});