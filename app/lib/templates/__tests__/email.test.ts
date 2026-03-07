/**
 * Email Template System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EmailTemplateFactory,
  WelcomeEmailTemplate,
  VerificationEmailTemplate,
  PasswordResetEmailTemplate,
  ReportEmailTemplate,
  AlertEmailTemplate,
  CustomEmailTemplate,
  EmailContext,
} from '../email';

describe('Email Template System', () => {
  describe('WelcomeEmailTemplate', () => {
    let template: WelcomeEmailTemplate;
    let context: EmailContext;

    beforeEach(() => {
      template = new WelcomeEmailTemplate();
      context = {
        recipientEmail: 'test@example.com',
        recipientName: 'John Doe',
        actionUrl: 'https://example.com/get-started',
      };
    });

    it('should render welcome email with all components', () => {
      const result = template.render(context);

      expect(result.subject).toBe('Welcome to OpenClaw!');
      expect(result.html).toContain('Hello John Doe');
      expect(result.html).toContain('Get Started');
      expect(result.html).toContain('https://example.com/get-started');
      expect(result.text).toContain('Welcome to OpenClaw!');
      expect(result.metadata?.templateType).toBe('welcome');
    });

    it('should work without recipient name', () => {
      context.recipientName = undefined;
      const result = template.render(context);

      expect(result.html).toContain('Hello there');
    });

    it('should work without action URL', () => {
      context.actionUrl = undefined;
      const result = template.render(context);

      expect(result.html).not.toContain('Get Started');
      expect(result.html).toContain('Welcome to OpenClaw!');
    });

    it('should generate valid HTML structure', () => {
      const result = template.render(context);

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html');
      expect(result.html).toContain('</html>');
      expect(result.html).toContain('<style>');
    });

    it('should generate plain text version', () => {
      const result = template.render(context);

      expect(result.text).not.toContain('<');
      expect(result.text).not.toContain('>');
      expect(result.text.length).toBeGreaterThan(0);
    });
  });

  describe('VerificationEmailTemplate', () => {
    let template: VerificationEmailTemplate;
    let context: EmailContext;

    beforeEach(() => {
      template = new VerificationEmailTemplate();
      context = {
        recipientEmail: 'test@example.com',
        recipientName: 'Jane Doe',
        actionUrl: 'https://example.com/verify?token=abc123',
        data: { code: '123456' },
      };
    });

    it('should render verification email with code', () => {
      const result = template.render(context);

      expect(result.subject).toBe('Verify Your Email Address');
      expect(result.html).toContain('123456');
      expect(result.html).toContain('Verify Email');
      expect(result.html).toContain('24 hours');
      expect(result.metadata?.templateType).toBe('verification');
    });

    it('should handle missing verification code', () => {
      context.data = undefined;
      const result = template.render(context);

      expect(result.html).toContain('N/A');
    });
  });

  describe('PasswordResetEmailTemplate', () => {
    let template: PasswordResetEmailTemplate;
    let context: EmailContext;

    beforeEach(() => {
      template = new PasswordResetEmailTemplate();
      context = {
        recipientEmail: 'test@example.com',
        recipientName: 'User',
        actionUrl: 'https://example.com/reset-password?token=xyz789',
      };
    });

    it('should render password reset email', () => {
      const result = template.render(context);

      expect(result.subject).toBe('Reset Your Password');
      expect(result.html).toContain('Reset Password');
      expect(result.html).toContain('1 hour');
      expect(result.html).toContain('safely ignore this email');
      expect(result.metadata?.templateType).toBe('password-reset');
    });
  });

  describe('ReportEmailTemplate', () => {
    let template: ReportEmailTemplate;
    let context: EmailContext;

    beforeEach(() => {
      template = new ReportEmailTemplate('Weekly Summary');
      context = {
        recipientEmail: 'test@example.com',
        recipientName: 'Reporter',
        actionUrl: 'https://example.com/reports/123',
        data: {
          report: {
            title: 'Weekly Summary Report',
            summary: 'This week we completed 15 tasks.',
          },
        },
      };
    });

    it('should render report email with data', () => {
      const result = template.render(context);

      expect(result.subject).toBe('Report: Weekly Summary');
      expect(result.html).toContain('Weekly Summary Report');
      expect(result.html).toContain('completed 15 tasks');
      expect(result.html).toContain('View Full Report');
      expect(result.metadata?.templateType).toBe('report');
    });

    it('should handle missing report data', () => {
      context.data = undefined;
      const result = template.render(context);

      expect(result.subject).toBe('Report: Weekly Summary');
      expect(result.html).toContain('Your report is ready');
    });
  });

  describe('AlertEmailTemplate', () => {
    let template: AlertEmailTemplate;
    let context: EmailContext;

    beforeEach(() => {
      template = new AlertEmailTemplate('System Alert');
      context = {
        recipientEmail: 'admin@example.com',
        recipientName: 'Admin',
        actionUrl: 'https://example.com/alerts/456',
        data: {
          alert: {
            type: 'CPU Usage',
            severity: 'High',
            message: 'CPU usage exceeded 90%',
          },
        },
      };
    });

    it('should render alert email with urgent styling', () => {
      const result = template.render(context);

      expect(result.subject).toContain('Alert');
      expect(result.html).toContain('CPU Usage');
      expect(result.html).toContain('High');
      expect(result.html).toContain('90%');
      expect(result.html).toContain('View Details');
      expect(result.metadata?.templateType).toBe('alert');
    });

    it('should use red color for alerts', () => {
      const result = template.render(context);

      expect(result.html).toContain('#EF4444');
    });
  });

  describe('CustomEmailTemplate', () => {
    it('should render custom content', () => {
      const template = new CustomEmailTemplate({
        type: 'custom',
        subject: 'Custom Email',
        header: '📢 Announcement',
      });

      const context: EmailContext = {
        recipientEmail: 'test@example.com',
        recipientName: 'User',
        customContent: '<p>This is custom HTML content.</p>',
        actionUrl: 'https://example.com/action',
        actionText: 'Take Action',
      };

      const result = template.render(context);

      expect(result.subject).toBe('Custom Email');
      expect(result.html).toContain('📢 Announcement');
      expect(result.html).toContain('custom HTML content');
      expect(result.html).toContain('Take Action');
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

    it('should create password-reset template', () => {
      const template = EmailTemplateFactory.create('password-reset');
      expect(template).toBeInstanceOf(PasswordResetEmailTemplate);
    });

    it('should create report template with config', () => {
      const template = EmailTemplateFactory.create('report', { subject: 'Monthly Report' });
      expect(template).toBeInstanceOf(ReportEmailTemplate);
    });

    it('should create alert template with config', () => {
      const template = EmailTemplateFactory.create('alert', { subject: 'Critical Alert' });
      expect(template).toBeInstanceOf(AlertEmailTemplate);
    });

    it('should create custom template', () => {
      const template = EmailTemplateFactory.create('custom', {
        type: 'custom',
        subject: 'My Custom Email',
      });
      expect(template).toBeInstanceOf(CustomEmailTemplate);
    });

    it('should throw error for unknown template type', () => {
      expect(() => {
        EmailTemplateFactory.create('unknown' as any);
      }).toThrow('Unknown email template type');
    });

    it('should return available types', () => {
      const types = EmailTemplateFactory.getAvailableTypes();
      expect(types).toContain('welcome');
      expect(types).toContain('verification');
      expect(types).toContain('password-reset');
      expect(types).toContain('report');
      expect(types).toContain('alert');
      expect(types).toContain('custom');
    });

    it('should allow registering custom templates', () => {
      class MyCustomTemplate extends CustomEmailTemplate {
        constructor() {
          super({ type: 'custom', subject: 'My Template' });
        }
      }

      EmailTemplateFactory.register('custom', () => new MyCustomTemplate());
      const template = EmailTemplateFactory.create('custom');
      expect(template).toBeInstanceOf(MyCustomTemplate);
    });
  });

  describe('HTML Generation', () => {
    it('should include responsive CSS', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render({
        recipientEmail: 'test@example.com',
      });

      expect(result.html).toContain('max-width: 600px');
      expect(result.html).toContain('padding');
      expect(result.html).toContain('border-radius');
    });

    it('should include brand color', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render({
        recipientEmail: 'test@example.com',
      });

      expect(result.html).toContain('#3B82F6');
    });

    it('should include footer with year', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render({
        recipientEmail: 'test@example.com',
      });

      const currentYear = new Date().getFullYear().toString();
      expect(result.html).toContain(currentYear);
      expect(result.html).toContain('All rights reserved');
    });
  });

  describe('Text Generation', () => {
    it('should strip HTML tags from text version', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render({
        recipientEmail: 'test@example.com',
      });

      expect(result.text).not.toMatch(/<[^>]+>/);
    });

    it('should preserve content in text version', () => {
      const template = new WelcomeEmailTemplate();
      const result = template.render({
        recipientEmail: 'test@example.com',
        recipientName: 'Alice',
      });

      expect(result.text).toContain('Alice');
      expect(result.text).toContain('OpenClaw');
    });
  });
});
