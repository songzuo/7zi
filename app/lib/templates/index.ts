/**
 * Template System
 * 
 * Unified entry point for email and notification templates.
 */

export * from './types';
export * from './email';
export * from './notification';

// Re-export factories for convenience
export { EmailTemplateFactory } from './email';
export { NotificationTemplateFactory } from './notification';

// Import for TemplateManager
import { EmailTemplateFactory, EmailTemplateType, EmailTemplateConfig } from './email';
import { NotificationTemplateFactory, NotificationType, NotificationTemplateConfig } from './notification';

/**
 * Template Manager - Unified template management
 */
export class TemplateManager {
  /**
   * Create an email template
   */
  static createEmail(type: EmailTemplateType, config?: Partial<EmailTemplateConfig>) {
    return EmailTemplateFactory.create(type, config);
  }

  /**
   * Create a notification template
   */
  static createNotification(type: NotificationType, config?: Partial<NotificationTemplateConfig>) {
    return NotificationTemplateFactory.create(type, config);
  }

  /**
   * Get available email template types
   */
  static getEmailTypes() {
    return EmailTemplateFactory.getAvailableTypes();
  }

  /**
   * Get available notification template types
   */
  static getNotificationTypes() {
    return NotificationTemplateFactory.getAvailableTypes();
  }
}

export default TemplateManager;
