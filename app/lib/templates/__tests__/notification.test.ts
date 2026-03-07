/**
 * Notification Template System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  NotificationTemplateFactory,
  InfoNotificationTemplate,
  SuccessNotificationTemplate,
  WarningNotificationTemplate,
  ErrorNotificationTemplate,
  ReminderNotificationTemplate,
  MilestoneNotificationTemplate,
  MentionNotificationTemplate,
  NotificationContext,
} from '../notification';

describe('Notification Template System', () => {
  describe('InfoNotificationTemplate', () => {
    let template: InfoNotificationTemplate;
    let context: NotificationContext;

    beforeEach(() => {
      template = new InfoNotificationTemplate();
      context = {
        message: 'This is an informational message',
        userId: 'user123',
        userName: 'John Doe',
      };
    });

    it('should render info notification', () => {
      const result = template.render(context);

      expect(result.title).toBe('Information');
      expect(result.message).toBe('This is an informational message');
      expect(result.type).toBe('info');
      expect(result.icon).toBe('ℹ️');
      expect(result.priority).toBe('normal');
      expect(result.metadata?.notificationType).toBe('info');
    });

    it('should generate HTML output', () => {
      const result = template.render(context);

      expect(result.html).toContain('Information');
      expect(result.html).toContain('informational message');
      expect(result.html).toContain('ℹ️');
    });

    it('should generate text output', () => {
      const result = template.render(context);

      expect(result.text).toContain('[ℹ️ Information]');
      expect(result.text).toContain('informational message');
    });

    it('should generate push notification payload', () => {
      const result = template.render(context);

      expect(result.push).toBeDefined();
      expect(result.push?.title).toContain('Information');
      expect(result.push?.body).toContain('informational message');
    });
  });

  describe('SuccessNotificationTemplate', () => {
    let template: SuccessNotificationTemplate;
    let context: NotificationContext;

    beforeEach(() => {
      template = new SuccessNotificationTemplate();
      context = {
        message: 'Task completed successfully',
      };
    });

    it('should render success notification', () => {
      const result = template.render(context);

      expect(result.type).toBe('success');
      expect(result.icon).toBe('✅');
      expect(result.title).toBe('Success');
      expect(result.priority).toBe('normal');
    });
  });

  describe('WarningNotificationTemplate', () => {
    let template: WarningNotificationTemplate;
    let context: NotificationContext;

    beforeEach(() => {
      template = new WarningNotificationTemplate();
      context = {
        message: 'This action cannot be undone',
      };
    });

    it('should render warning notification with high priority', () => {
      const result = template.render(context);

      expect(result.type).toBe('warning');
      expect(result.icon).toBe('⚠️');
      expect(result.priority).toBe('high');
      expect(result.title).toBe('Warning');
    });
  });

  describe('ErrorNotificationTemplate', () => {
    let template: ErrorNotificationTemplate;
    let context: NotificationContext;

    beforeEach(() => {
      template = new ErrorNotificationTemplate();
      context = {
        message: 'Failed to save changes',
      };
    });

    it('should render error notification with urgent priority', () => {
      const result = template.render(context);

      expect(result.type).toBe('error');
      expect(result.icon).toBe('❌');
      expect(result.priority).toBe('urgent');
      expect(result.title).toBe('Error');
    });

    it('should include error styling in HTML', () => {
      const result = template.render(context);

      expect(result.html).toContain('Failed to save changes');
    });
  });

  describe('ReminderNotificationTemplate', () => {
    let template: ReminderNotificationTemplate;
    let context: NotificationContext;

    beforeEach(() => {
      template = new ReminderNotificationTemplate();
      context = {
        message: 'Meeting starts in 30 minutes',
        data: {
          dueDate: new Date('2024-12-31T15:00:00Z').toISOString(),
        },
      };
    });

    it('should render reminder with due date', () => {
      const result = template.render(context);

      expect(result.type).toBe('reminder');
      expect(result.icon).toBe('⏰');
      expect(result.priority).toBe('high');
      expect(result.message).toContain('Due:');
    });

    it('should work without due date', () => {
      context.data = undefined;
      const result = template.render(context);

      expect(result.message).toBe('Meeting starts in 30 minutes');
    });
  });

  describe('MilestoneNotificationTemplate', () => {
    let template: MilestoneNotificationTemplate;
    let context: NotificationContext;

    beforeEach(() => {
      template = new MilestoneNotificationTemplate();
      context = {
        message: 'You reached 100 completed tasks!',
        data: {
          milestone: '100 Tasks Completed',
        },
      };
    });

    it('should render milestone notification', () => {
      const result = template.render(context);

      expect(result.type).toBe('milestone');
      expect(result.icon).toBe('🎯');
      expect(result.message).toContain('100 Tasks Completed');
      expect(result.message).toContain('🎉');
    });

    it('should work without milestone name', () => {
      context.data = undefined;
      const result = template.render(context);

      expect(result.message).toContain('100 completed tasks');
    });
  });

  describe('MentionNotificationTemplate', () => {
    let template: MentionNotificationTemplate;
    let context: NotificationContext;

    beforeEach(() => {
      template = new MentionNotificationTemplate();
      context = {
        message: 'Check out this comment',
        data: {
          mentionedBy: 'Jane Smith',
        },
      };
    });

    it('should render mention notification', () => {
      const result = template.render(context);

      expect(result.type).toBe('mention');
      expect(result.icon).toBe('@');
      expect(result.priority).toBe('high');
      expect(result.title).toContain('Jane Smith');
    });

    it('should work without mentionedBy', () => {
      context.data = undefined;
      const result = template.render(context);

      expect(result.title).toBe('You were mentioned');
    });
  });

  describe('NotificationTemplateFactory', () => {
    it('should create info template', () => {
      const template = NotificationTemplateFactory.create('info');
      expect(template).toBeInstanceOf(InfoNotificationTemplate);
    });

    it('should create success template', () => {
      const template = NotificationTemplateFactory.create('success');
      expect(template).toBeInstanceOf(SuccessNotificationTemplate);
    });

    it('should create warning template', () => {
      const template = NotificationTemplateFactory.create('warning');
      expect(template).toBeInstanceOf(WarningNotificationTemplate);
    });

    it('should create error template', () => {
      const template = NotificationTemplateFactory.create('error');
      expect(template).toBeInstanceOf(ErrorNotificationTemplate);
    });

    it('should create reminder template', () => {
      const template = NotificationTemplateFactory.create('reminder');
      expect(template).toBeInstanceOf(ReminderNotificationTemplate);
    });

    it('should create milestone template', () => {
      const template = NotificationTemplateFactory.create('milestone');
      expect(template).toBeInstanceOf(MilestoneNotificationTemplate);
    });

    it('should create mention template', () => {
      const template = NotificationTemplateFactory.create('mention');
      expect(template).toBeInstanceOf(MentionNotificationTemplate);
    });

    it('should throw error for unknown template type', () => {
      expect(() => {
        NotificationTemplateFactory.create('unknown' as any);
      }).toThrow('Unknown notification template type');
    });

    it('should return available types', () => {
      const types = NotificationTemplateFactory.getAvailableTypes();
      expect(types).toContain('info');
      expect(types).toContain('success');
      expect(types).toContain('warning');
      expect(types).toContain('error');
      expect(types).toContain('reminder');
      expect(types).toContain('milestone');
      expect(types).toContain('mention');
    });

    it('should allow registering custom templates', () => {
      class CustomNotification extends InfoNotificationTemplate {
        constructor() {
          super();
        }
      }

      NotificationTemplateFactory.register('info', () => new CustomNotification());
      const template = NotificationTemplateFactory.create('info');
      expect(template).toBeInstanceOf(CustomNotification);
    });
  });

  describe('Actions', () => {
    it('should include actions in notification', () => {
      const template = new InfoNotificationTemplate();
      template['config'].actions = [
        { label: 'View', url: 'https://example.com/view', style: 'primary' },
        { label: 'Dismiss', action: 'dismiss', style: 'default' },
      ];

      const result = template.render({
        message: 'Test message',
      });

      expect(result.actions).toHaveLength(2);
      expect(result.actions![0].label).toBe('View');
      expect(result.actions![0].url).toBe('https://example.com/view');
      expect(result.html).toContain('View');
      expect(result.html).toContain('https://example.com/view');
    });

    it('should style primary actions', () => {
      const template = new InfoNotificationTemplate();
      template['config'].actions = [
        { label: 'Primary', url: 'https://example.com', style: 'primary' },
      ];

      const result = template.render({
        message: 'Test',
      });

      expect(result.html).toContain('#3B82F6');
    });

    it('should style danger actions', () => {
      const template = new InfoNotificationTemplate();
      template['config'].actions = [
        { label: 'Delete', url: 'https://example.com/delete', style: 'danger' },
      ];

      const result = template.render({
        message: 'Test',
      });

      expect(result.html).toContain('#EF4444');
    });
  });

  describe('Channels', () => {
    it('should support multiple channels', () => {
      const template = new SuccessNotificationTemplate();
      template['config'].channels = ['in-app', 'email', 'push'];

      const result = template.render({
        message: 'Test',
      });

      expect(result.channels).toContain('in-app');
      expect(result.channels).toContain('email');
      expect(result.channels).toContain('push');
    });
  });

  describe('Push Notification Payload', () => {
    it('should generate valid push payload', () => {
      const template = new InfoNotificationTemplate();
      const result = template.render({
        message: 'Push test',
        data: { id: '123' },
      });

      expect(result.push).toBeDefined();
      expect(result.push?.title).toBeDefined();
      expect(result.push?.body).toBeDefined();
      expect(result.push?.icon).toBe('/icon-192.png');
      expect(result.push?.badge).toBe('/badge-72.png');
      expect(result.push?.data).toEqual({ id: '123' });
    });
  });

  describe('HTML Generation', () => {
    it('should generate well-formed HTML', () => {
      const template = new SuccessNotificationTemplate();
      const result = template.render({
        message: 'Test HTML generation',
      });

      expect(result.html).toContain('class="notification"');
      expect(result.html).toContain('style=');
      expect(result.html).toContain('Success');
      expect(result.html).toContain('Test HTML generation');
    });

    it('should include notification icon in HTML', () => {
      const template = new WarningNotificationTemplate();
      const result = template.render({
        message: 'Warning test',
      });

      expect(result.html).toContain('⚠️');
    });
  });

  describe('Text Generation', () => {
    it('should generate clean text output', () => {
      const template = new ErrorNotificationTemplate();
      const result = template.render({
        message: 'Error occurred',
      });

      expect(result.text).toBe('[❌ Error] Error occurred');
      expect(result.text).not.toContain('<');
      expect(result.text).not.toContain('>');
    });
  });
});
