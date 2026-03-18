/**
 * SEO 元数据工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  seoConfig,
  pageSeoConfigs,
  generatePageMetadata,
  generateHreflangLinks,
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateServiceSchema,
  generateLocalBusinessSchema,
  generatePageSchemas,
  getAllLanguageAlternates,
} from '../seo-metadata';

describe('seo-metadata.ts', () => {
  describe('seoConfig', () => {
    it('应包含中英文配置', () => {
      expect(seoConfig).toHaveProperty('zh');
      expect(seoConfig).toHaveProperty('en');
    });

    it('中文配置应包含所有必需字段', () => {
      const zh = seoConfig.zh;
      expect(zh).toHaveProperty('siteName');
      expect(zh).toHaveProperty('title');
      expect(zh).toHaveProperty('description');
      expect(zh).toHaveProperty('keywords');
      expect(zh).toHaveProperty('ogImage');
      expect(zh).toHaveProperty('locale');
    });

    it('英文配置应包含所有必需字段', () => {
      const en = seoConfig.en;
      expect(en).toHaveProperty('siteName');
      expect(en).toHaveProperty('title');
      expect(en).toHaveProperty('description');
      expect(en).toHaveProperty('keywords');
      expect(en).toHaveProperty('ogImage');
      expect(en).toHaveProperty('locale');
    });

    it('应使用正确的 locale 值', () => {
      expect(seoConfig.zh.locale).toBe('zh_CN');
      expect(seoConfig.en.locale).toBe('en_US');
    });
  });

  describe('pageSeoConfigs', () => {
    it('应包含首页配置', () => {
      expect(pageSeoConfigs).toHaveProperty('home');
      expect(pageSeoConfigs.home.title).toContain('首页');
    });

    it('每个页面配置应包含必需字段', () => {
      const home = pageSeoConfigs.home;
      expect(home).toHaveProperty('title');
      expect(home).toHaveProperty('titleEn');
      expect(home).toHaveProperty('description');
      expect(home).toHaveProperty('descriptionEn');
      expect(home).toHaveProperty('path');
    });

    it('应包含所有主要页面配置', () => {
      expect(pageSeoConfigs).toHaveProperty('home');
      expect(pageSeoConfigs).toHaveProperty('about');
      expect(pageSeoConfigs).toHaveProperty('team');
      expect(pageSeoConfigs).toHaveProperty('blog');
      expect(pageSeoConfigs).toHaveProperty('contact');
    });
  });

  describe('generatePageMetadata', () => {
    it('应生成中文 Metadata', () => {
      const metadata = generatePageMetadata('home', 'zh');
      
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(metadata.title).toContain('首页');
    });

    it('应生成英文 Metadata', () => {
      const metadata = generatePageMetadata('home', 'en');
      
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(metadata.title).toContain('Home');
    });

    it('应包含 Open Graph 配置', () => {
      const metadata = generatePageMetadata('home', 'zh');
      
      expect(metadata).toHaveProperty('openGraph');
      expect(metadata.openGraph).toHaveProperty('title');
      expect(metadata.openGraph).toHaveProperty('description');
      expect(metadata.openGraph).toHaveProperty('locale');
    });

    it('应包含 Twitter Card 配置', () => {
      const metadata = generatePageMetadata('home', 'zh');
      
      expect(metadata).toHaveProperty('twitter');
      expect((metadata.twitter as any)?.card).toBe('summary_large_image');
    });

    it('应包含 alternates 和 hreflang', () => {
      const metadata = generatePageMetadata('home', 'zh');
      
      expect(metadata).toHaveProperty('alternates');
      expect(metadata.alternates).toHaveProperty('canonical');
      expect(metadata.alternates).toHaveProperty('languages');
    });

    it('应包含 robots 配置', () => {
      const metadata = generatePageMetadata('home', 'zh');
      
      expect(metadata).toHaveProperty('robots');
      expect((metadata.robots as any)?.index).toBe(true);
      expect((metadata.robots as any)?.follow).toBe(true);
    });

    it('应处理未知页面 key', () => {
      const metadata = generatePageMetadata('unknown-page', 'zh');
      
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
    });
  });

  describe('generateHreflangLinks', () => {
    it('应生成正确的 hreflang 链接', () => {
      const links = generateHreflangLinks('/about');
      
      expect(links).toHaveLength(3);
      expect(links[0].hreflang).toBe('zh-CN');
      expect(links[1].hreflang).toBe('en-US');
      expect(links[2].hreflang).toBe('x-default');
    });

    it('应正确处理根路径', () => {
      const links = generateHreflangLinks('');
      
      expect(links[0].href).toContain('/zh');
      expect(links[1].href).toContain('/en');
    });

    it('应正确处理带斜杠的路径', () => {
      const links = generateHreflangLinks('/blog');
      
      expect(links[0].href).toContain('/zh/blog');
    });
  });

  describe('generateWebSiteSchema', () => {
    it('应生成中文网站 Schema', () => {
      const schema = generateWebSiteSchema('zh');
      
      expect(schema['@type']).toBe('WebSite');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('url');
      expect(schema).toHaveProperty('inLanguage');
    });

    it('应生成英文网站 Schema', () => {
      const schema = generateWebSiteSchema('en');
      
      expect(schema['@type']).toBe('WebSite');
      expect(schema.inLanguage).toBe('en-US');
    });

    it('应包含搜索操作', () => {
      const schema = generateWebSiteSchema('zh');
      
      expect(schema).toHaveProperty('potentialAction');
    });
  });

  describe('generateOrganizationSchema', () => {
    it('应生成组织 Schema', () => {
      const schema = generateOrganizationSchema('zh');
      
      expect(schema['@type']).toBe('Organization');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('url');
      expect(schema).toHaveProperty('logo');
    });

    it('应包含创始人信息', () => {
      const schema = generateOrganizationSchema('zh');
      
      expect(schema).toHaveProperty('founders');
      expect(Array.isArray(schema.founders)).toBe(true);
    });

    it('应包含联系方式', () => {
      const schema = generateOrganizationSchema('zh');
      
      expect(schema).toHaveProperty('contactPoint');
      expect(schema.contactPoint.contactType).toBe('customer service');
    });

    it('应包含社交媒体链接', () => {
      const schema = generateOrganizationSchema('zh');
      
      expect(schema).toHaveProperty('sameAs');
      expect(schema.sameAs).toContain('https://github.com/7zi-studio');
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('应生成面包屑 Schema', () => {
      const items = [
        { name: '首页', nameEn: 'Home', path: '/' },
        { name: '博客', nameEn: 'Blog', path: '/blog' },
      ];
      
      const schema = generateBreadcrumbSchema(items, 'zh');
      
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema).toHaveProperty('itemListElement');
      expect(schema.itemListElement).toHaveLength(2);
    });

    it('应根据语言返回正确的名称', () => {
      const items = [
        { name: '首页', nameEn: 'Home', path: '/' },
      ];
      
      const zhSchema = generateBreadcrumbSchema(items, 'zh');
      const enSchema = generateBreadcrumbSchema(items, 'en');
      
      expect(zhSchema.itemListElement[0].name).toBe('首页');
      expect(enSchema.itemListElement[0].name).toBe('Home');
    });

    it('应正确设置位置索引', () => {
      const items = [
        { name: '首页', nameEn: 'Home', path: '/' },
        { name: '博客', nameEn: 'Blog', path: '/blog' },
        { name: '文章', nameEn: 'Article', path: '/blog/article' },
      ];
      
      const schema = generateBreadcrumbSchema(items, 'zh');
      
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[1].position).toBe(2);
      expect(schema.itemListElement[2].position).toBe(3);
    });
  });

  describe('generateFAQSchema', () => {
    it('应生成 FAQ Schema', () => {
      const faqs = [
        { question: '什么是7zi?', answer: 'AI数字工作室' },
        { question: '提供哪些服务?', answer: '网站开发等' },
      ];
      
      const schema = generateFAQSchema(faqs, 'zh');
      
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]['@type']).toBe('Question');
    });

    it('应处理英文翻译', () => {
      const faqs = [
        { 
          question: '什么是7zi?', 
          questionEn: 'What is 7zi?',
          answer: 'AI数字工作室',
          answerEn: 'AI Digital Studio',
        },
      ];
      
      const zhSchema = generateFAQSchema(faqs, 'zh');
      const enSchema = generateFAQSchema(faqs, 'en');
      
      expect(zhSchema.mainEntity[0].name).toBe('什么是7zi?');
      expect(enSchema.mainEntity[0].name).toBe('What is 7zi?');
    });
  });

  describe('generateServiceSchema', () => {
    it('应生成服务 Schema', () => {
      const service = {
        name: '网站开发',
        nameEn: 'Web Development',
        description: '专业网站开发',
        descriptionEn: 'Professional web development',
        path: '/services/web-dev',
      };
      
      const schema = generateServiceSchema(service, 'zh');
      
      expect(schema['@type']).toBe('Service');
      expect(schema.name).toBe('网站开发');
      expect(schema.description).toBe('专业网站开发');
    });

    it('应根据语言返回正确的翻译', () => {
      const service = {
        name: '网站开发',
        nameEn: 'Web Development',
        description: '专业网站开发',
        descriptionEn: 'Professional web development',
        path: '/services/web-dev',
      };
      
      const zhSchema = generateServiceSchema(service, 'zh');
      const enSchema = generateServiceSchema(service, 'en');
      
      expect(zhSchema.name).toBe('网站开发');
      expect(enSchema.name).toBe('Web Development');
    });
  });

  describe('generateLocalBusinessSchema', () => {
    it('应生成本地业务 Schema', () => {
      const schema = generateLocalBusinessSchema('zh');
      
      expect(schema['@type']).toBe('ProfessionalService');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('priceRange');
    });

    it('应包含 24/7 服务时间', () => {
      const schema = generateLocalBusinessSchema('zh');
      
      expect(schema.openingHours).toBe('Mo-Su 00:00-24:00');
    });
  });

  describe('generatePageSchemas', () => {
    it('应组合多个 Schema', () => {
      const schemas = [
        { type: 'website', data: null },
        { type: 'organization', data: null },
      ];
      
      const result = generatePageSchemas(schemas, 'zh');
      
      expect(result).toHaveLength(2);
      expect(result[0] as any['@type']).toBe('WebSite');
      expect(result[1] as any['@type']).toBe('Organization');
    });
  });

  describe('getAllLanguageAlternates', () => {
    it('应生成所有语言的替代链接', () => {
      const alternates = getAllLanguageAlternates('/about');
      
      expect(alternates).toHaveProperty('zh-CN');
      expect(alternates).toHaveProperty('en-US');
      expect(alternates).toHaveProperty('x-default');
    });

    it('应正确处理路径格式', () => {
      const alternates = getAllLanguageAlternates('blog');
      
      expect(alternates['zh-CN']).toContain('/zh/blog');
    });
  });
});
