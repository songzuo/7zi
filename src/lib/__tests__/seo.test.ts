/**
 * SEO Module Tests
 * Tests for SEO utilities and schema generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
} from '../seo';

describe('SEO Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('siteConfig', () => {
    it('should have all required fields', () => {
      expect(siteConfig).toMatchObject({
        name: '7zi Studio',
        url: expect.any(String),
        ogImage: expect.any(String),
        logo: expect.any(String),
        twitterHandle: '@7zistudio',
        email: 'business@7zi.studio',
        description: expect.any(String),
        keywords: expect.any(Array),
        language: 'zh-CN',
        locale: 'zh_CN',
      });
    });

    it('should use default URL if env var not set', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);

      expect(siteConfig.url).toBe('https://7zi.studio');
    });

    it('should use custom URL from env var', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://custom.domain.com');

      // Need to reload the module to pick up env var change
      vi.resetModules();
      const { siteConfig: newSiteConfig } = require('../seo');

      expect(newSiteConfig.url).toBe('https://custom.domain.com');
    });
  });

  describe('getOrganizationSchema', () => {
    it('should return valid organization schema', () => {
      const schema = getOrganizationSchema();

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
        logo: siteConfig.logo,
        description: siteConfig.description,
        foundingDate: '2024',
      });
    });

    it('should include founders array', () => {
      const schema = getOrganizationSchema();

      expect(schema.founders).toBeInstanceOf(Array);
      expect(schema.founders.length).toBeGreaterThan(0);
      expect(schema.founders[0]).toMatchObject({
        '@type': 'Person',
        name: '宋琢环球旅行',
      });
    });

    it('should include contact point with email', () => {
      const schema = getOrganizationSchema();

      expect(schema.contactPoint).toMatchObject({
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: siteConfig.email,
      });
    });

    it('should include sameAs social links', () => {
      const schema = getOrganizationSchema();

      expect(schema.sameAs).toBeInstanceOf(Array);
      expect(schema.sameAs.length).toBeGreaterThan(0);
      expect(schema.sameAs).toContain('https://github.com/7zi-studio');
      expect(schema.sameAs).toContain('https://twitter.com/7zistudio');
    });
  });

  describe('getWebSiteSchema', () => {
    it('should return valid website schema', () => {
      const schema = getWebSiteSchema();

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
      });
    });

    it('should include publisher organization', () => {
      const schema = getWebSiteSchema();

      expect(schema.publisher).toMatchObject({
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
      });
    });

    it('should include search action', () => {
      const schema = getWebSiteSchema();

      expect(schema.potentialAction).toMatchObject({
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: expect.stringContaining('search={search_term_string}'),
        },
      });
    });
  });

  describe('getBreadcrumbSchema', () => {
    it('should return valid breadcrumb schema', () => {
      const items = [
        { name: 'Home', url: 'https://7zi.studio/' },
        { name: 'Blog', url: 'https://7zi.studio/blog' },
      ];
      const schema = getBreadcrumbSchema(items);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
      });
    });

    it('should create list elements with correct positions', () => {
      const items = [
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: 'Post', url: '/blog/post-1' },
      ];
      const schema = getBreadcrumbSchema(items);

      expect(schema.itemListElement).toHaveLength(3);
      expect(schema.itemListElement[0]).toMatchObject({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
      });
      expect(schema.itemListElement[1]).toMatchObject({
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
      });
      expect(schema.itemListElement[2]).toMatchObject({
        '@type': 'ListItem',
        position: 3,
        name: 'Post',
      });
    });

    it('should handle empty items array', () => {
      const schema = getBreadcrumbSchema([]);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [],
      });
    });
  });

  describe('getBlogPostSchema', () => {
    it('should return valid blog post schema', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test-post',
        datePublished: '2024-01-01',
        author: 'Test Author',
      };
      const schema = getBlogPostSchema(post);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        url: post.url,
        datePublished: post.datePublished,
        dateModified: post.datePublished,
        author: {
          '@type': 'Person',
          name: post.author,
        },
      });
    });

    it('should use datePublished as dateModified when not provided', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test-post',
        datePublished: '2024-01-01',
        author: 'Test Author',
      };
      const schema = getBlogPostSchema(post);

      expect(schema.dateModified).toBe(post.datePublished);
    });

    it('should use provided dateModified when available', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test-post',
        datePublished: '2024-01-01',
        dateModified: '2024-01-02',
        author: 'Test Author',
      };
      const schema = getBlogPostSchema(post);

      expect(schema.dateModified).toBe('2024-01-02');
    });

    it('should include tags when provided', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test-post',
        datePublished: '2024-01-01',
        author: 'Test Author',
        tags: ['react', 'nextjs', 'typescript'],
      };
      const schema = getBlogPostSchema(post);

      expect(schema.keywords).toBe('react, nextjs, typescript');
    });

    it('should include category when provided', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test-post',
        datePublished: '2024-01-01',
        author: 'Test Author',
        category: 'Development',
      };
      const schema = getBlogPostSchema(post);

      expect(schema.articleSection).toBe('Development');
    });

    it('should include word count when provided', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test-post',
        datePublished: '2024-01-01',
        author: 'Test Author',
        wordCount: 1000,
      };
      const schema = getBlogPostSchema(post);

      expect(schema.wordCount).toBe(1000);
    });

    it('should use default ogImage when no image provided', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test-post',
        datePublished: '2024-01-01',
        author: 'Test Author',
      };
      const schema = getBlogPostSchema(post);

      expect(schema.image).toBe(siteConfig.ogImage);
    });

    it('should use provided image when available', () => {
      const post = {
        title: 'Test Post',
        description: 'Test description',
        url: 'https://7zi.studio/blog/test-post',
        datePublished: '2024-01-01',
        author: 'Test Author',
        image: 'https://example.com/custom-image.png',
      };
      const schema = getBlogPostSchema(post);

      expect(schema.image).toBe('https://example.com/custom-image.png');
    });
  });

  describe('getServiceSchema', () => {
    it('should return valid service schema', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development services',
        url: 'https://7zi.studio/services/web-development',
      };
      const schema = getServiceSchema(service);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.name,
        description: service.description,
        url: service.url,
      });
    });

    it('should use site name as default provider', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development services',
        url: 'https://7zi.studio/services/web-development',
      };
      const schema = getServiceSchema(service);

      expect(schema.provider).toMatchObject({
        '@type': 'Organization',
        name: siteConfig.name,
      });
    });

    it('should use provided provider when available', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development services',
        url: 'https://7zi.studio/services/web-development',
        provider: 'Custom Provider',
      };
      const schema = getServiceSchema(service);

      expect(schema.provider.name).toBe('Custom Provider');
    });

    it('should include offers when price info provided', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development services',
        url: 'https://7zi.studio/services/web-development',
        offers: {
          price: '1000',
          priceCurrency: 'USD',
        },
      };
      const schema = getServiceSchema(service);

      expect(schema.offers).toMatchObject({
        '@type': 'Offer',
        price: '1000',
        priceCurrency: 'USD',
      });
    });

    it('should not include offers when price info not provided', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development services',
        url: 'https://7zi.studio/services/web-development',
      };
      const schema = getServiceSchema(service);

      expect(schema.offers).toBeUndefined();
    });

    it('should default to China as areaServed', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development services',
        url: 'https://7zi.studio/services/web-development',
      };
      const schema = getServiceSchema(service);

      expect(schema.areaServed).toMatchObject({
        '@type': 'Country',
        name: 'China',
      });
    });

    it('should use provided areaServed when available', () => {
      const service = {
        name: 'Web Development',
        description: 'Professional web development services',
        url: 'https://7zi.studio/services/web-development',
        areaServed: 'United States',
      };
      const schema = getServiceSchema(service);

      expect(schema.areaServed.name).toBe('United States');
    });
  });

  describe('getFAQSchema', () => {
    it('should return valid FAQ schema', () => {
      const faqs = [
        { question: 'What is your pricing?', answer: 'We offer competitive pricing.' },
      ];
      const schema = getFAQSchema(faqs);

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
      const schema = getFAQSchema(faqs);

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
      const schema = getFAQSchema([]);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      });
    });
  });

  describe('getLocalBusinessSchema', () => {
    it('should return valid local business schema', () => {
      const business = {
        name: '7zi Studio',
        description: 'Digital studio',
      };
      const schema = getLocalBusinessSchema(business);

      expect(schema).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        name: business.name,
        description: business.description,
        url: siteConfig.url,
      });
    });

    it('should use site config defaults when not provided', () => {
      const business = {};
      const schema = getLocalBusinessSchema(business);

      expect(schema.name).toBe(siteConfig.name);
      expect(schema.description).toBe(siteConfig.description);
    });

    it('should include address when provided', () => {
      const business = {
        name: '7zi Studio',
        address: {
          street: '123 Main St',
          city: 'Beijing',
          region: 'Beijing',
          postalCode: '100000',
          country: 'China',
        },
      };
      const schema = getLocalBusinessSchema(business);

      expect(schema.address).toMatchObject({
        '@type': 'PostalAddress',
        streetAddress: '123 Main St',
        addressLocality: 'Beijing',
        addressRegion: 'Beijing',
        postalCode: '100000',
        addressCountry: 'China',
      });
    });

    it('should include telephone when provided', () => {
      const business = {
        name: '7zi Studio',
        telephone: '+86-123-4567-8900',
      };
      const schema = getLocalBusinessSchema(business);

      expect(schema.telephone).toBe('+86-123-4567-8900');
    });

    it('should include openingHours when provided', () => {
      const business = {
        name: '7zi Studio',
        openingHours: ['Mo-Fr 09:00-18:00', 'Sa 10:00-14:00'],
      };
      const schema = getLocalBusinessSchema(business);

      expect(schema.openingHours).toEqual(['Mo-Fr 09:00-18:00', 'Sa 10:00-14:00']);
    });

    it('should include priceRange', () => {
      const schema = getLocalBusinessSchema({});

      expect(schema.priceRange).toBe('$$');
    });
  });

  describe('getCanonicalUrl', () => {
    it('should return correct URL for root path', () => {
      const url = getCanonicalUrl();
      expect(url).toBe(`${siteConfig.url}/`);
    });

    it('should return correct URL for subpath', () => {
      const url = getCanonicalUrl('/about');
      expect(url).toBe(`${siteConfig.url}/about`);
    });

    it('should add leading slash if missing', () => {
      const url = getCanonicalUrl('contact');
      expect(url).toBe(`${siteConfig.url}/contact`);
    });

    it('should handle nested paths', () => {
      const url = getCanonicalUrl('/blog/categories/tech');
      expect(url).toBe(`${siteConfig.url}/blog/categories/tech`);
    });
  });

  describe('getOGImageUrl', () => {
    it('should return default ogImage when no options provided', () => {
      const url = getOGImageUrl();
      expect(url).toBe(siteConfig.ogImage);
    });

    it('should return custom image when provided', () => {
      const customImage = 'https://example.com/custom-og.png';
      const url = getOGImageUrl({ image: customImage });
      expect(url).toBe(customImage);
    });

    it('should generate dynamic OG image URL when title provided', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://7zi.studio');

      const url = getOGImageUrl({ title: 'Test Title' });
      expect(url).toContain('/api/og');
      expect(url).toContain('title=Test%20Title');
      expect(url).toContain('description=');
    });

    it('should include custom description in dynamic OG URL when provided', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://7zi.studio');

      const url = getOGImageUrl({
        title: 'Test',
        description: 'Custom description',
      });
      expect(url).toContain('description=Custom%20description');
    });

    it('should prefer provided image over title', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://7zi.studio');

      const url = getOGImageUrl({
        title: 'Test Title',
        image: 'https://example.com/custom.png',
      });
      expect(url).toBe('https://example.com/custom.png');
      expect(url).not.toContain('/api/og');
    });
  });

  describe('socialLinks', () => {
    it('should have all required social links', () => {
      expect(socialLinks).toMatchObject({
        github: 'https://github.com/7zi-studio',
        twitter: 'https://twitter.com/7zistudio',
        linkedin: 'https://linkedin.com/company/7zistudio',
        email: expect.stringContaining('mailto:'),
      });
    });

    it('should use site email for mailto link', () => {
      expect(socialLinks.email).toBe(`mailto:${siteConfig.email}`);
    });
  });

  describe('navLinks', () => {
    it('should be an array of navigation links', () => {
      expect(navLinks).toBeInstanceOf(Array);
      expect(navLinks.length).toBeGreaterThan(0);
    });

    it('should have objects with name and href properties', () => {
      navLinks.forEach(link => {
        expect(link).toHaveProperty('name');
        expect(link).toHaveProperty('href');
        expect(typeof link.name).toBe('string');
        expect(typeof link.href).toBe('string');
      });
    });

    it('should include main navigation items', () => {
      const names = navLinks.map(link => link.name);
      expect(names).toContain('首页');
      expect(names).toContain('关于我们');
      expect(names).toContain('博客');
      expect(names).toContain('联系我们');
    });

    it('should have hrefs that start with /', () => {
      navLinks.forEach(link => {
        expect(link.href.startsWith('/')).toBe(true);
      });
    });
  });
});
