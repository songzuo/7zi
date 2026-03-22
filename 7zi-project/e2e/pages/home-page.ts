/**
 * @fileoverview Home Page Object
 * Encapsulates home page interactions and locators
 */

import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly url: string = '/';

  // Locators
  readonly heroSection: Locator;
  readonly heroTitle: Locator;
  readonly heroSubtitle: Locator;
  readonly ctaButtons: Locator;
  readonly featuresSection: Locator;
  readonly featureCards: Locator;
  readonly testimonialsSection: Locator;
  readonly testimonials: Locator;
  readonly navigation: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.heroSection = page.locator('.hero, .hero-section, [data-section="hero"]');
    this.heroTitle = this.heroSection.locator('h1, .hero-title');
    this.heroSubtitle = this.heroSection.locator('.hero-subtitle, p, .subtitle');
    this.ctaButtons = this.heroSection.locator('.cta-button, .btn-primary, a.button');
    this.featuresSection = page.locator('.features, [data-section="features"]');
    this.featureCards = this.featuresSection.locator('.feature-card, .feature-item');
    this.testimonialsSection = page.locator('.testimonials, [data-section="testimonials"]');
    this.testimonials = this.testimonialsSection.locator('.testimonial, .testimonial-card');
    this.navigation = page.locator('nav, .navigation, header');
    this.footer = page.locator('footer, .footer');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.heroSection.waitFor({ state: 'visible', timeout: 5000 });
  }

  async getHeroTitle(): Promise<string | null> {
    return await this.heroTitle.textContent();
  }

  async getHeroSubtitle(): Promise<string | null> {
    return await this.heroSubtitle.textContent();
  }

  async clickCTA(index: number = 0): Promise<void> {
    const button = this.ctaButtons.nth(index);
    if (await button.isVisible()) {
      await button.click();
    }
  }

  async getFeatureCount(): Promise<number> {
    await this.featuresSection.waitFor({ state: 'visible', timeout: 3000 });
    return await this.featureCards.count();
  }

  async getFeatureTitle(index: number): Promise<string | null> {
    const card = this.featureCards.nth(index);
    if (await card.isVisible()) {
      const title = card.locator('h3, h4, .feature-title');
      return await title.textContent();
    }
    return null;
  }

  async getTestimonialCount(): Promise<number> {
    await this.testimonialsSection.waitFor({ state: 'visible', timeout: 3000 });
    return await this.testimonials.count();
  }

  async navigateTo(pageName: string): Promise<void> {
    const navLink = this.navigation.locator(`a:has-text("${pageName}")`).first();
    if (await navLink.isVisible()) {
      await navLink.click();
    }
  }

  async scrollToFooter(): Promise<void> {
    await this.footer.scrollIntoViewIfNeeded();
  }

  async isOnHomePage(): Promise<boolean> {
    const url = this.page.url();
    return url === '/' || url.endsWith('/zh') || url.endsWith('/en');
  }
}
