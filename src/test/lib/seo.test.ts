/**
 * @fileoverview SEO utilities tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('SEO Utilities', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    // Set test environment
    process.env.NEXT_PUBLIC_SITE_URL = 'https://test.studio';
  });

  afterEach(() => {
    // Restore original environment
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  describe('siteConfig', () => {
    it('exports site configuration', async () => {
      const seoModule = await import('../../lib/seo');
      expect(seoModule.siteConfig).toBeDefined();
    });

    it('has required site config properties', async () => {
      const seoModule = await import('../../lib/seo');
      const { siteConfig } = seoModule;

      expect(siteConfig.name).toBe('7zi Studio');
      expect(siteConfig.url).toContain('https://');
      expect(siteConfig.description).toBeDefined();
      expect(siteConfig.email).toContain('@');
    });
  });

  describe('getOrganizationSchema', () => {
    it('returns valid organization schema', async () => {
      const seoModule = await import('../../lib/seo');
      const schema = seoModule.getOrganizationSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBeDefined();
      expect(schema.url).toBeDefined();
    });

    it('includes founder information', async () => {
      const seoModule = await import('../../lib/seo');
      const schema = seoModule.getOrganizationSchema();

      expect(schema.founders).toBeDefined();
      expect(Array.isArray(schema.founders)).toBe(true);
    });
  });

  describe('getWebSiteSchema', () => {
    it('returns valid website schema', async () => {
      const seoModule = await import('../../lib/seo');
      const schema = seoModule.getWebSiteSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBeDefined();
    });

    it('includes search action', async () => {
      const seoModule = await import('../../lib/seo');
      const schema = seoModule.getWebSiteSchema();

      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction['@type']).toBe('SearchAction');
    });
  });

  describe('getBreadcrumbSchema', () => {
    it('returns valid breadcrumb schema', async () => {
      const seoModule = await import('../../lib/seo');
      const items = [
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' },
      ];
      const schema = seoModule.getBreadcrumbSchema(items);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toBeDefined();
      expect(Array.isArray(schema.itemListElement)).toBe(true);
    });

    it('includes all breadcrumb items', async () => {
      const seoModule = await import('../../lib/seo');
      const items = [
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' },
        { name: 'Team', url: '/team' },
      ];
      const schema = seoModule.getBreadcrumbSchema(items);

      expect(schema.itemListElement.length).toBe(items.length);
    });
  });

  // Note: generateMetaTags function doesn't exist in seo.ts, tests removed
});