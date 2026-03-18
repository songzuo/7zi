/**
 * Unit tests for seo.ts
 * @module lib/__tests__/seo.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  siteConfig,
  getOrganizationSchema,
  getWebSiteSchema,
  getBreadcrumbSchema,
  getBlogPostSchema,
  getServiceSchema,
  getFAQSchema,
  getCanonicalUrl,
  getOGImageUrl,
  socialLinks,
  navLinks,
} from '../seo';

describe('seo.ts', () => {
  describe('siteConfig', () => {
    it('should have required fields', () => {
      expect(siteConfig.name).toBe('7zi Studio');
      expect(siteConfig.url).toBe('https://7zi.studio');
      expect(siteConfig.description).toBeTruthy();
      expect(siteConfig.keywords).toBeInstanceOf(Array);
    });
  });

  describe('getOrganizationSchema', () => {
    it('should return valid Organization schema', () => {
      const schema = getOrganizationSchema();
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe(siteConfig.name);
      expect(schema.url).toBe(siteConfig.url);
      expect(schema.logo).toBeTruthy();
    });
  });

  describe('getWebSiteSchema', () => {
    it('should return valid WebSite schema', () => {
      const schema = getWebSiteSchema();
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe(siteConfig.name);
      expect(schema.url).toBe(siteConfig.url);
    });
  });

  describe('getBreadcrumbSchema', () => {
    it('should return valid BreadcrumbList schema', () => {
      const items = [
        { name: 'Home', url: 'https://7zi.studio/' },
        { name: 'Blog', url: 'https://7zi.studio/blog' },
      ];
      const schema = getBreadcrumbSchema(items);
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].position).toBe(1);
    });

    it('should handle empty array', () => {
      const schema = getBreadcrumbSchema([]);
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(0);
    });
  });

  describe('getBlogPostSchema', () => {
    it('should return valid BlogPosting schema', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test',
        datePublished: '2024-01-01',
        author: 'Test Author',
      };
      const schema = getBlogPostSchema(post);
      expect(schema['@type']).toBe('BlogPosting');
      expect(schema.headline).toBe(post.title);
      expect(schema.author).toEqual({ '@type': 'Person', name: post.author });
    });

    it('should handle optional fields', () => {
      const post = {
        title: 'Test',
        description: 'Desc',
        url: 'https://7zi.studio/blog/test',
        datePublished: '2024-01-01',
        author: 'Author',
        tags: ['tag1', 'tag2'],
        category: 'Tech',
      };
      const schema = getBlogPostSchema(post);
      expect(schema.keywords).toBe('tag1, tag2');
      expect(schema.articleSection).toBe('Tech');
    });
  });

  describe('getServiceSchema', () => {
    it('should return valid Service schema', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development',
        url: 'https://7zi.studio/services/web-dev',
      };
      const schema = getServiceSchema(service);
      expect(schema['@type']).toBe('Service');
      expect(schema.name).toBe(service.name);
    });

    it('should handle offers with pricing', () => {
      const service = {
        name: 'Consulting',
        description: 'Expert consultation',
        url: 'https://7zi.studio/services/consulting',
        offers: {
          price: '99.00',
          priceCurrency: 'USD',
        },
      };
      const schema = getServiceSchema(service);
      expect(schema.offers).toBeDefined();
    });
  });

  describe('getFAQSchema', () => {
    it('should return valid FAQPage schema', () => {
      const faqs = [
        { question: 'What is 7zi?', answer: 'An AI studio' },
        { question: 'How to contact?', answer: 'Via email' },
      ];
      const schema = getFAQSchema(faqs);
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
    });

    it('should handle empty FAQ array', () => {
      const schema = getFAQSchema([]);
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(0);
    });
  });

  describe('getCanonicalUrl', () => {
    it('should generate canonical URL with leading slash', () => {
      expect(getCanonicalUrl('blog')).toBe('https://7zi.studio/blog');
    });

    it('should handle path with leading slash', () => {
      expect(getCanonicalUrl('/blog')).toBe('https://7zi.studio/blog');
    });

    it('should handle empty path', () => {
      expect(getCanonicalUrl()).toBe('https://7zi.studio');
    });
  });

  describe('getOGImageUrl', () => {
    it('should return default OG image when no options', () => {
      const url = getOGImageUrl();
      expect(url).toContain('og-image.png');
    });

    it('should return custom image if provided', () => {
      const customImage = 'https://example.com/custom.jpg';
      const url = getOGImageUrl({ image: customImage });
      expect(url).toBe(customImage);
    });

    it('should generate dynamic OG image with title', () => {
      const url = getOGImageUrl({ title: 'Test Title' });
      expect(url).toContain('/api/og');
      expect(url).toContain('title=Test');
    });
  });

  describe('socialLinks', () => {
    it('should have all required social links', () => {
      expect(socialLinks.github).toContain('github.com');
      expect(socialLinks.twitter).toContain('twitter.com');
      expect(socialLinks.linkedin).toContain('linkedin.com');
      expect(socialLinks.email).toContain('mailto:');
    });
  });

  describe('navLinks', () => {
    it('should have required navigation links', () => {
      expect(navLinks).toBeInstanceOf(Array);
      expect(navLinks.length).toBeGreaterThan(0);
      expect(navLinks.find(l => l.name === '首页')).toBeTruthy();
      expect(navLinks.find(l => l.href === '/')).toBeTruthy();
    });
  });
});
