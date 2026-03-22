/**
 * @fileoverview Contact Page Object
 * Encapsulates contact page interactions and locators
 */

import { Page, Locator } from '@playwright/test';

export class ContactPage {
  readonly page: Page;
  readonly url: string = '/contact';

  // Locators
  readonly heading: Locator;
  readonly contactForm: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly subjectInput: Locator;
  readonly messageTextarea: Locator;
  readonly submitButton: Locator;
  readonly contactInfo: Locator;
  readonly emailInfo: Locator;
  readonly phoneInfo: Locator;
  readonly addressInfo: Locator;
  readonly socialLinks: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.heading = page.locator('h1, .page-title').filter({ hasText: /联系|Contact/i });
    this.contactForm = page.locator('.contact-form, form');
    this.nameInput = this.contactForm.locator('input[name="name"], input[placeholder*="姓名"], input[placeholder*="Name"]');
    this.emailInput = this.contactForm.locator('input[type="email"], input[name="email"]');
    this.subjectInput = this.contactForm.locator('input[name="subject"], input[placeholder*="主题"], input[placeholder*="Subject"]');
    this.messageTextarea = this.contactForm.locator('textarea[name="message"], textarea[placeholder*="消息"], textarea[placeholder*="Message"]');
    this.submitButton = this.contactForm.locator('button[type="submit"]');
    this.contactInfo = page.locator('.contact-info, .contact-details');
    this.emailInfo = this.contactInfo.locator('a[href^="mailto:"]');
    this.phoneInfo = this.contactInfo.locator('a[href^="tel:"], .phone');
    this.addressInfo = this.contactInfo.locator('.address');
    this.socialLinks = page.locator('.social-links a, .social-icons a');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.contactForm.waitFor({ state: 'visible', timeout: 5000 });
  }

  async getPageTitle(): Promise<string | null> {
    return await this.heading.textContent();
  }

  async fillName(name: string): Promise<void> {
    if (await this.nameInput.isVisible()) {
      await this.nameInput.fill(name);
    }
  }

  async fillEmail(email: string): Promise<void> {
    if (await this.emailInput.isVisible()) {
      await this.emailInput.fill(email);
    }
  }

  async fillSubject(subject: string): Promise<void> {
    if (await this.subjectInput.isVisible()) {
      await this.subjectInput.fill(subject);
    }
  }

  async fillMessage(message: string): Promise<void> {
    if (await this.messageTextarea.isVisible()) {
      await this.messageTextarea.fill(message);
    }
  }

  async fillForm(data: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }): Promise<void> {
    await this.fillName(data.name);
    await this.fillEmail(data.email);
    if (data.subject) await this.fillSubject(data.subject);
    await this.fillMessage(data.message);
  }

  async submit(): Promise<void> {
    if (await this.submitButton.isVisible()) {
      await this.submitButton.click();
    }
  }

  async submitForm(data: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  async getErrorMessage(field: string): Promise<string | null> {
    const errorLocator = this.contactForm.locator(
      `input[name="${field}"] ~ .error, input[name="${field}"] ~ [role="alert"]`
    );
    if (await errorLocator.count() > 0) {
      return await errorLocator.textContent();
    }
    return null;
  }

  async hasError(field: string): Promise<boolean> {
    const errorLocator = this.contactForm.locator(
      `input[name="${field}"] ~ .error, input[name="${field}"] ~ [role="alert"]`
    );
    return await errorLocator.count() > 0;
  }

  async getEmailInfo(): Promise<string | null> {
    if (await this.emailInfo.isVisible()) {
      return await this.emailInfo.textContent();
    }
    return null;
  }

  async getPhoneInfo(): Promise<string | null> {
    if (await this.phoneInfo.isVisible()) {
      return await this.phoneInfo.textContent();
    }
    return null;
  }

  async getAddressInfo(): Promise<string | null> {
    if (await this.addressInfo.isVisible()) {
      return await this.addressInfo.textContent();
    }
    return null;
  }

  async getSocialLinkCount(): Promise<number> {
    return await this.socialLinks.count();
  }

  async clickSocialLink(index: number): Promise<void> {
    const link = this.socialLinks.nth(index);
    if (await link.isVisible()) {
      await link.click();
    }
  }

  async clearForm(): Promise<void> {
    await this.nameInput.clear();
    await this.emailInput.clear();
    if (await this.subjectInput.isVisible()) await this.subjectInput.clear();
    await this.messageTextarea.clear();
  }

  async isOnContactPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/contact');
  }

  async isFormVisible(): Promise<boolean> {
    return await this.contactForm.isVisible();
  }

  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }
}
