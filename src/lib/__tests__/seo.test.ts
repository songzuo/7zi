/**
 * SEO Module Tests
 * Tests for SEO utilities and schema generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  seoConfig as siteConfig,
  generateOrganizationSchema as getOrganizationSchema,
  generateWebSiteSchema as getWebSiteSchema,
  generateBreadcrumbSchema,
  generateServiceSchema as getServiceSchema,
  generateLocalBusinessSchema as getLocalBusinessSchema,
  generateFAQSchema,
} from '../seo-metadata';

describe('SEO Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('siteConfig (seoConfig)', () => {
    it('should have zh and en configurations', () => {
      expect(siteConfig).toHaveProperty('zh');
      expect(siteConfig).toHaveProperty('en');
    });

    it('should have required fields in zh config', () => {
      expect(siteConfig.zh).toHaveProperty('siteName');
      expect(siteConfig.zh).toHaveProperty('title');
      expect(siteConfig.zh).toHaveProperty('description');
      expect(siteConfig.zh).toHaveProperty('keywords');
      expect(siteConfig.zh).toHaveProperty('ogImage');
    });

    it('should have required fields in en config', () => {
      expect(siteConfig.en).toHaveProperty('siteName');
      expect(siteConfig.en).toHaveProperty('title');
      expect(siteConfig.en).toHaveProperty('description');
      expect(siteConfig.en).toHaveProperty('keywords');
      expect(siteConfig.en).toHaveProperty('ogImage');
    });
  });

  describe('getOrganizationSchema', () => {
    it('should return valid organization schema', () => {
      const schema = getOrganizationSchema();

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'Organization',
      });
    });
  });

  describe('getWebSiteSchema', () => {
    it('should return valid website schema', () => {
      const schema = getWebSiteSchema();

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
      });
    });
  });

  describe('getBreadcrumbSchema', () => {
    it('should return valid breadcrumb schema', () => {
      const items = [
        { name: 'Home', nameEn: 'Home', path: '/' },
        { name: 'Blog', nameEn: 'Blog', path: '/blog' },
      ];
      const schema = generateBreadcrumbSchema(items);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
      });
    });

    it('should handle empty items array', () => {
      const schema = generateBreadcrumbSchema([]);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [],
      });
    });
  });

  describe('generateFAQSchema', () => {
    it('should return valid FAQ schema', () => {
      const faqs = [
        { question: 'What is your pricing?', answer: 'We offer competitive pricing.' },
      ];
      const schema = generateFAQSchema(faqs);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
      });
    });

    it('should create mainEntity array with questions and answers', () => {
      const faqs = [
        { question: 'Question 1?', answer: 'Answer 1' },
        { question: 'Question 2?', answer: 'Answer 2' },
        { question: 'Question 3?', answer: 'Answer 3' },
      ];
      const schema = generateFAQSchema(faqs);

      expect(schema.mainEntity).toHaveLength(3);
      expect(schema.mainEntity[0]).toMatchObject({
        '@type': 'Question',
        name: 'Question 1?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Answer 1',
        },
      });
    });

    it('should handle empty faqs array', () => {
      const schema = generateFAQSchema([]);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      });
    });
  });

  describe('getLocalBusinessSchema', () => {
    it('should return valid local business schema', () => {
      const schema = getLocalBusinessSchema();

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
      });
    });
  });
});
