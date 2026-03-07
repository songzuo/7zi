/**
 * Template Manager Tests
 */

import { describe, it, expect } from 'vitest';
import { TemplateManager } from '../index';

describe('TemplateManager', () => {
  describe('Email Templates', () => {
    it('should create welcome email template', () => {
      const template = TemplateManager.createEmail('welcome');
      const result = template.render({
        recipientEmail: 'test@example.com',
        recipientName: 'John',
      });

      expect(result.subject).toBe('Welcome to OpenClaw!');
      expect(result.html).toContain('John');
    });

    it('should create verification email template', () => {
      const template = TemplateManager.createEmail('verification');
      const result = template.render({
        recipientEmail: 'test@example.com',
        data: { code: '123456' },
      });

      expect(result.subject).toBe('Verify Your Email Address');
      expect(result.html).toContain('123456');
    });

    it('should create report email with config', () => {
      const template = TemplateManager.createEmail('report', {
        subject: 'Monthly Report',
      });
      const result = template.render({
        recipientEmail: 'test@example.com',
        data: {
          report: { title: 'Monthly Summary' },
        },
      });

      expect(result.subject).toBe('Report: Monthly Report');
    });

    it('should return available email types', () => {
      const types = TemplateManager.getEmailTypes();
      expect(types).toContain('welcome');
      expect(types).toContain('verification');
      expect(types).toContain('password-reset');
      expect(types).toContain('report');
      expect(types).toContain('alert');
    });
  });

  describe('Notification Templates', () => {
    it('should create info notification template', () => {
      const template = TemplateManager.createNotification('info');
      const result = template.render({
        message: 'Test notification',
      });

      expect(result.type).toBe('info');
      expect(result.message).toBe('Test notification');
    });

    it('should create error notification template', () => {
      const template = TemplateManager.createNotification('error');
      const result = template.render({
        message: 'Error occurred',
      });

      expect(result.type).toBe('error');
      expect(result.priority).toBe('urgent');
    });

    it('should create reminder notification template', () => {
      const template = TemplateManager.createNotification('reminder');
      const result = template.render({
        message: 'Meeting soon',
        data: {
          dueDate: new Date().toISOString(),
        },
      });

      expect(result.type).toBe('reminder');
      expect(result.priority).toBe('high');
    });

    it('should return available notification types', () => {
      const types = TemplateManager.getNotificationTypes();
      expect(types).toContain('info');
      expect(types).toContain('success');
      expect(types).toContain('warning');
      expect(types).toContain('error');
      expect(types).toContain('reminder');
      expect(types).toContain('milestone');
      expect(types).toContain('mention');
    });
  });

  describe('Integration', () => {
    it('should handle both email and notification templates', () => {
      // Create email
      const emailTemplate = TemplateManager.createEmail('welcome');
      const emailResult = emailTemplate.render({
        recipientEmail: 'user@example.com',
        recipientName: 'Alice',
      });

      // Create notification
      const notificationTemplate = TemplateManager.createNotification('success');
      const notificationResult = notificationTemplate.render({
        message: 'Account created successfully',
        userName: 'Alice',
      });

      expect(emailResult.subject).toBeDefined();
      expect(emailResult.html).toBeDefined();
      expect(notificationResult.title).toBeDefined();
      expect(notificationResult.message).toBeDefined();
    });
  });
});
