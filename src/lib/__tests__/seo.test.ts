/**
 * SEO 工具函数测试
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
} from '../seo';

describe('seo.ts', () => {
  describe('siteConfig', () => {
    it('应包含基本的网站配置', () => {
      expect(siteConfig).toHaveProperty('name');
      expect(siteConfig).toHaveProperty('url');
      expect(siteConfig).toHaveProperty('ogImage');
      expect(siteConfig).toHaveProperty('description');
    });

    it('应包含正确的基础 URL', () => {
      // 在测试环境中可能是 localhost，验证 URL 格式正确
      expect(siteConfig.url).toMatch(/^https?:\/\/.+/);
    });

    it('应有完整的社会化链接配置', () => {
      expect(siteConfig.twitterHandle).toBe('@7zistudio');
      expect(siteConfig.email).toBe('business@7zi.studio');
    });
  });

  describe('getOrganizationSchema', () => {
    it('应返回有效的组织结构化数据', () => {
      const schema = getOrganizationSchema();
      
      expect(schema['@type']).toBe('Organization');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('url');
      expect(schema).toHaveProperty('logo');
      expect(schema).toHaveProperty('description');
    });

    it('应包含联系方式', () => {
      const schema = getOrganizationSchema();
      
      expect(schema).toHaveProperty('contactPoint');
      expect(schema.contactPoint).toHaveProperty('email');
    });

    it('应包含社交媒体链接', () => {
      const schema = getOrganizationSchema();
      
      expect(schema).toHaveProperty('sameAs');
      expect(Array.isArray(schema.sameAs)).toBe(true);
      expect(schema.sameAs).toContain('https://github.com/7zi-studio');
    });
  });

  describe('getWebSiteSchema', () => {
    it('应返回有效的网站结构化数据', () => {
      const schema = getWebSiteSchema();
      
      expect(schema['@type']).toBe('WebSite');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('url');
    });

    it('应包含搜索操作', () => {
      const schema = getWebSiteSchema();
      
      expect(schema).toHaveProperty('potentialAction');
    });
  });

  describe('getBreadcrumbSchema', () => {
    it('应返回有效的面包屑结构化数据', () => {
      const items = [
        { name: '首页', url: 'https://7zi.studio/' },
        { name: '博客', url: 'https://7zi.studio/blog' },
      ];
      
      const schema = getBreadcrumbSchema(items);
      
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema).toHaveProperty('itemListElement');
      expect(schema.itemListElement).toHaveLength(2);
    });

    it('应正确设置位置索引', () => {
      const items = [
        { name: '首页', url: 'https://7zi.studio/' },
        { name: '博客', url: 'https://7zi.studio/blog' },
        { name: '文章', url: 'https://7zi.studio/blog/article' },
      ];
      
      const schema = getBreadcrumbSchema(items);
      
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[1].position).toBe(2);
      expect(schema.itemListElement[2].position).toBe(3);
    });
  });

  describe('getBlogPostSchema', () => {
    it('应返回有效的博客文章结构化数据', () => {
      const post = {
        title: '测试文章',
        description: '这是一篇测试文章',
        url: 'https://7zi.studio/blog/test-article',
        datePublished: '2024-01-01',
        author: '测试作者',
      };
      
      const schema = getBlogPostSchema(post);
      
      expect(schema['@type']).toBe('BlogPosting');
      expect(schema.headline).toBe(post.title);
      expect(schema.description).toBe(post.description);
    });

    it('应正确处理可选字段', () => {
      const post = {
        title: '测试文章',
        description: '这是一篇测试文章',
        url: 'https://7zi.studio/blog/test-article',
        datePublished: '2024-01-01',
        author: '测试作者',
        image: 'https://7zi.studio/image.jpg',
        tags: ['tag1', 'tag2'],
        category: '技术',
        wordCount: 1000,
      };
      
      const schema = getBlogPostSchema(post);
      
      expect(schema.image).toBe(post.image);
      expect(schema.keywords).toBe('tag1, tag2');
      expect(schema.articleSection).toBe('技术');
      expect(schema.wordCount).toBe(1000);
    });
  });

  describe('getServiceSchema', () => {
    it('应返回有效的服务结构化数据', () => {
      const service = {
        name: '网站开发',
        description: '专业网站开发服务',
        url: 'https://7zi.studio/services/web-development',
      };
      
      const schema = getServiceSchema(service);
      
      expect(schema['@type']).toBe('Service');
      expect(schema.name).toBe(service.name);
      expect(schema.description).toBe(service.description);
    });

    it('应正确处理价格信息', () => {
      const service = {
        name: '网站开发',
        description: '专业网站开发服务',
        url: 'https://7zi.studio/services/web-development',
        offers: {
          price: '999',
          priceCurrency: 'CNY',
        },
      };
      
      const schema = getServiceSchema(service);
      
      expect(schema).toHaveProperty('offers');
      expect(schema.offers?.price).toBe('999');
      expect(schema.offers?.priceCurrency).toBe('CNY');
    });
  });

  describe('getFAQSchema', () => {
    it('应返回有效的 FAQ 结构化数据', () => {
      const faqs = [
        { question: '什么是7zi Studio?', answer: '这是一个AI驱动的数字工作室' },
        { question: '你们提供哪些服务?', answer: '网站开发、品牌设计等' },
      ];
      
      const schema = getFAQSchema(faqs);
      
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]['@type']).toBe('Question');
    });
  });

  describe('getLocalBusinessSchema', () => {
    it('应返回有效的本地业务结构化数据', () => {
      const business = {
        name: '7zi Studio',
        description: 'AI驱动的数字工作室',
      };
      
      const schema = getLocalBusinessSchema(business);
      
      expect(schema['@type']).toBe('ProfessionalService');
      expect(schema.name).toBe(business.name);
      expect(schema.priceRange).toBe('$$');
    });

    it('应正确处理地址信息', () => {
      const business = {
        name: '7zi Studio',
        description: 'AI驱动的数字工作室',
        address: {
          street: '测试街道123号',
          city: '北京',
          region: '北京市',
          postalCode: '100000',
          country: 'CN',
        },
      };
      
      const schema = getLocalBusinessSchema(business);
      
      expect(schema).toHaveProperty('address');
      expect(schema.address?.streetAddress).toBe('测试街道123号');
      expect(schema.address?.addressLocality).toBe('北京');
    });
  });

  describe('getCanonicalUrl', () => {
    it('应正确生成规范 URL', () => {
      expect(getCanonicalUrl('/about')).toContain('/about');
      expect(getCanonicalUrl('blog')).toContain('/blog');
    });

    it('应正确处理空路径', () => {
      const url = getCanonicalUrl('');
      // 在测试环境中可能是 localhost，验证 URL 格式正确
      expect(url).toMatch(/^https?:\/\/.+/);
    });
  });

  describe('getOGImageUrl', () => {
    it('应返回默认 OG 图片', () => {
      const url = getOGImageUrl();
      expect(url).toContain('og-image');
    });

    it('应正确处理自定义图片', () => {
      const customImage = 'https://example.com/custom.jpg';
      const url = getOGImageUrl({ image: customImage });
      expect(url).toBe(customImage);
    });

    it('应正确处理标题参数', () => {
      const url = getOGImageUrl({ title: '测试标题' });
      expect(url).toContain('/api/og');
    });
  });

  describe('socialLinks', () => {
    it('应包含所有社交媒体链接', () => {
      expect(socialLinks).toHaveProperty('github');
      expect(socialLinks).toHaveProperty('twitter');
      expect(socialLinks).toHaveProperty('linkedin');
      expect(socialLinks).toHaveProperty('email');
    });

    it('应生成正确的邮件链接', () => {
      expect(socialLinks.email).toContain('mailto:');
      expect(socialLinks.email).toContain('business@7zi.studio');
    });
  });

  describe('navLinks', () => {
    it('应包含所有导航链接', () => {
      expect(navLinks.length).toBeGreaterThan(0);
      expect(navLinks[0]).toHaveProperty('name');
      expect(navLinks[0]).toHaveProperty('href');
    });

    it('应包含首页链接', () => {
      const homeLink = navLinks.find(link => link.href === '/');
      expect(homeLink).toBeDefined();
      expect(homeLink?.name).toBe('首页');
    });
  });
});
