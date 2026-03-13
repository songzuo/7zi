/**
 * 测试 src/lib/seo.ts
 */

import { describe, it, expect } from 'vitest';
import {
  siteConfig,
  getOrganizationSchema,
  getWebSiteSchema,
  getBreadcrumbSchema,
  getBlogPostSchema,
  getServiceSchema,
  getFAQSchema,
  getLocalBusinessSchema,
  getCanonicalUrl,
  getOGImageUrl,
  socialLinks,
  navLinks,
} from './seo';

describe('seo', () => {
  describe('siteConfig', () => {
    it('should have correct site name', () => {
      expect(siteConfig.name).toBe('7zi Studio');
    });

    it('should have email', () => {
      expect(siteConfig.email).toBe('business@7zi.studio');
    });

    it('should have language set to Chinese', () => {
      expect(siteConfig.language).toBe('zh-CN');
    });

    it('should have keywords array', () => {
      expect(Array.isArray(siteConfig.keywords)).toBe(true);
      expect(siteConfig.keywords.length).toBeGreaterThan(0);
    });
  });

  describe('getOrganizationSchema', () => {
    it('should return valid organization schema', () => {
      const schema = getOrganizationSchema();
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe(siteConfig.name);
      expect(schema.url).toBe(siteConfig.url);
      expect(schema.logo).toBe(siteConfig.logo);
      expect(schema.foundingDate).toBe('2024');
    });

    it('should have founder information', () => {
      const schema = getOrganizationSchema();
      expect(schema.founders).toBeDefined();
      expect(Array.isArray(schema.founders)).toBe(true);
      expect(schema.founders[0].name).toBe('宋琢环球旅行');
    });

    it('should have contact point', () => {
      const schema = getOrganizationSchema();
      expect(schema.contactPoint).toBeDefined();
      expect(schema.contactPoint.contactType).toBe('customer service');
    });
  });

  describe('getWebSiteSchema', () => {
    it('should return valid website schema', () => {
      const schema = getWebSiteSchema();
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe(siteConfig.name);
    });

    it('should have search action', () => {
      const schema = getWebSiteSchema();
      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction['@type']).toBe('SearchAction');
    });
  });

  describe('getBreadcrumbSchema', () => {
    it('should return valid breadcrumb schema', () => {
      const items = [
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
      ];
      const schema = getBreadcrumbSchema(items);
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(2);
    });

    it('should have correct positions', () => {
      const items = [
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' },
        { name: 'Team', url: '/about/team' },
      ];
      const schema = getBreadcrumbSchema(items);
      
      schema.itemListElement.forEach((item: { position: number }, index: number) => {
        expect(item.position).toBe(index + 1);
      });
    });

    it('should handle empty items', () => {
      const schema = getBreadcrumbSchema([]);
      expect(schema.itemListElement).toHaveLength(0);
    });
  });

  describe('getBlogPostSchema', () => {
    it('should return valid blog post schema', () => {
      const post = {
        title: 'Test Post',
        description: 'A test post',
        url: 'https://example.com/post',
        datePublished: '2024-01-01',
        author: 'Test Author',
      };
      const schema = getBlogPostSchema(post);
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BlogPosting');
      expect(schema.headline).toBe(post.title);
      expect(schema.description).toBe(post.description);
    });

    it('should use dateModified when provided', () => {
      const post = {
        title: 'Test',
        description: 'Test',
        url: 'https://example.com/post',
        datePublished: '2024-01-01',
        dateModified: '2024-01-15',
        author: 'Author',
      };
      const schema = getBlogPostSchema(post);
      expect(schema.dateModified).toBe('2024-01-15');
    });

    it('should use datePublished as dateModified when not provided', () => {
      const post = {
        title: 'Test',
        description: 'Test',
        url: 'https://example.com/post',
        datePublished: '2024-01-01',
        author: 'Author',
      };
      const schema = getBlogPostSchema(post);
      expect(schema.dateModified).toBe(post.datePublished);
    });

    it('should include tags and category when provided', () => {
      const post = {
        title: 'Test',
        description: 'Test',
        url: 'https://example.com/post',
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
    it('should return valid service schema', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development services',
        url: 'https://example.com/services/web',
      };
      const schema = getServiceSchema(service);
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Service');
      expect(schema.name).toBe(service.name);
    });

    it('should include offers when provided', () => {
      const service = {
        name: 'Consulting',
        description: 'Expert consulting',
        url: 'https://example.com/services/consulting',
        offers: {
          price: '100',
          priceCurrency: 'USD',
        },
      };
      const schema = getServiceSchema(service);
      expect(schema.offers).toBeDefined();
      expect(schema.offers!.price).toBe('100');
    });
  });

  describe('getFAQSchema', () => {
    it('should return valid FAQ schema', () => {
      const faqs = [
        { question: 'Q1?', answer: 'A1' },
        { question: 'Q2?', answer: 'A2' },
      ];
      const schema = getFAQSchema(faqs);
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
    });

    it('should format questions correctly', () => {
      const faqs = [{ question: 'What is this?', answer: 'This is a test' }];
      const schema = getFAQSchema(faqs);
      
      expect(schema.mainEntity[0]['@type']).toBe('Question');
      expect(schema.mainEntity[0].name).toBe('What is this?');
      expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe('This is a test');
    });
  });

  describe('getLocalBusinessSchema', () => {
    it('should return valid local business schema', () => {
      const schema = getLocalBusinessSchema({});
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ProfessionalService');
    });

    it('should include address when provided', () => {
      const business = {
        address: {
          street: '123 Main St',
          city: 'Beijing',
          region: 'Beijing',
          postalCode: '100000',
          country: 'CN',
        },
      };
      const schema = getLocalBusinessSchema(business);
      expect(schema.address).toBeDefined();
      expect(schema.address!.streetAddress).toBe('123 Main St');
    });
  });

  describe('getCanonicalUrl', () => {
    it('should generate canonical URL from path', () => {
      const url = getCanonicalUrl('/blog');
      expect(url).toContain('/blog');
    });

    it('should handle paths without leading slash', () => {
      const url = getCanonicalUrl('blog');
      expect(url).toContain('/blog');
    });

    it('should handle empty path', () => {
      const url = getCanonicalUrl('');
      expect(url).toBe(siteConfig.url);
    });
  });

  describe('getOGImageUrl', () => {
    it('should return custom image when provided', () => {
      const customImage = 'https://example.com/custom.png';
      expect(getOGImageUrl({ image: customImage })).toBe(customImage);
    });

    it('should generate dynamic OG image URL with title', () => {
      const url = getOGImageUrl({ title: 'Test Title' });
      expect(url).toContain('/api/og?');
      expect(url).toContain('title=Test+Title');
    });

    it('should return default OG image when no options', () => {
      const url = getOGImageUrl();
      expect(url).toBe(siteConfig.ogImage);
    });
  });

  describe('socialLinks', () => {
    it('should have all required social links', () => {
      expect(socialLinks.github).toBeDefined();
      expect(socialLinks.twitter).toBeDefined();
      expect(socialLinks.linkedin).toBeDefined();
      expect(socialLinks.email).toBeDefined();
    });

    it('should have correct email format', () => {
      expect(socialLinks.email).toContain('mailto:');
    });
  });

  describe('navLinks', () => {
    it('should be an array', () => {
      expect(Array.isArray(navLinks)).toBe(true);
    });

    it('should have valid structure', () => {
      navLinks.forEach((link) => {
        expect(link.name).toBeDefined();
        expect(link.href).toBeDefined();
      });
    });

    it('should have homepage link', () => {
      const homeLink = navLinks.find((l) => l.href === '/');
      expect(homeLink).toBeDefined();
    });
  });
});