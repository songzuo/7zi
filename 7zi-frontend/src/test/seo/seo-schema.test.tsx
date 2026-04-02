/**
 * 结构化数据 (Schema.org) 验证测试套件
 * 测试 JSON-LD 结构化数据
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  OrganizationJsonLd,
  WebSiteJsonLd,
  BreadcrumbJsonLd,
  SoftwareApplicationJsonLd,
} from '@/components/seo/JsonLd'

describe('SEO - 结构化数据 (Schema.org) 验证', () => {
  describe('Organization JSON-LD', () => {
    it('应正确渲染 Organization 脚本标签', () => {
      const { container } = render(
        <OrganizationJsonLd
          name="7zi Frontend"
          url="https://7zi.com"
          logo="/images/logo.png"
          description="Next.js 最佳实践演示项目"
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      expect(script).toBeDefined()
      expect(script?.innerHTML).toBeDefined()
    })

    it('Organization 应包含必需字段', () => {
      const { container } = render(<OrganizationJsonLd name="7zi Frontend" url="https://7zi.com" />)

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data['@context']).toBe('https://schema.org')
      expect(data['@type']).toBe('Organization')
      expect(data.name).toBe('7zi Frontend')
      expect(data.url).toBe('https://7zi.com')
    })

    it('Organization 应包含可选字段', () => {
      const { container } = render(
        <OrganizationJsonLd
          name="7zi Frontend"
          url="https://7zi.com"
          logo="/images/logo.png"
          description="Next.js 最佳实践演示项目"
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data.logo).toContain('/images/logo.png')
      expect(data.description).toBe('Next.js 最佳实践演示项目')
    })

    it('Organization logo 应使用完整 URL', () => {
      const { container } = render(
        <OrganizationJsonLd name="7zi Frontend" url="https://7zi.com" logo="/images/logo.png" />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data.logo).toBe('https://7zi.com/images/logo.png')
    })
  })

  describe('WebSite JSON-LD', () => {
    it('应正确渲染 WebSite 脚本标签', () => {
      const { container } = render(
        <WebSiteJsonLd
          name="7zi Frontend"
          url="https://7zi.com"
          description="Next.js 最佳实践演示项目"
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      expect(script).toBeDefined()
    })

    it('WebSite 应包含必需字段', () => {
      const { container } = render(<WebSiteJsonLd name="7zi Frontend" url="https://7zi.com" />)

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data['@context']).toBe('https://schema.org')
      expect(data['@type']).toBe('WebSite')
      expect(data.name).toBe('7zi Frontend')
      expect(data.url).toBe('https://7zi.com')
    })

    it('WebSite 可选 searchAction', () => {
      const { container } = render(
        <WebSiteJsonLd
          name="7zi Frontend"
          url="https://7zi.com"
          potentialAction={{
            target: 'https://7zi.com/search?q={search_term_string}',
            queryInput: 'required name=search_term_string',
          }}
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data.potentialAction).toBeDefined()
      expect(data.potentialAction['@type']).toBe('SearchAction')
      expect(data.potentialAction.target).toContain('search')
    })

    it('WebSite 默认 searchAction 配置', () => {
      const { container } = render(
        <WebSiteJsonLd
          name="7zi Frontend"
          url="https://7zi.com"
          potentialAction={{
            target: 'https://7zi.com/search?q={search_term_string}',
          }}
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data.potentialAction['query-input']).toBe('required name=search_term_string')
    })
  })

  describe('BreadcrumbList JSON-LD', () => {
    const breadcrumbItems = [
      { name: '首页', url: 'https://7zi.com' },
      { name: '文档', url: 'https://7zi.com/docs' },
      { name: '设计系统', url: 'https://7zi.com/docs/design-system' },
    ]

    it('应正确渲染 BreadcrumbList 脚本标签', () => {
      const { container } = render(<BreadcrumbJsonLd items={breadcrumbItems} />)

      const script = container.querySelector('script[type="application/ld+json"]')
      expect(script).toBeDefined()
    })

    it('BreadcrumbList 应包含必需字段', () => {
      const { container } = render(<BreadcrumbJsonLd items={breadcrumbItems} />)

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data['@context']).toBe('https://schema.org')
      expect(data['@type']).toBe('BreadcrumbList')
      expect(Array.isArray(data.itemListElement)).toBe(true)
    })

    it('breadcrumb items 应有正确的位置索引', () => {
      const { container } = render(<BreadcrumbJsonLd items={breadcrumbItems} />)

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      data.itemListElement.forEach((item: any, index: number) => {
        expect(item['@type']).toBe('ListItem')
        expect(item.position).toBe(index + 1)
      })
    })

    it('breadcrumb items 应包含 name 和 url', () => {
      const { container } = render(<BreadcrumbJsonLd items={breadcrumbItems} />)

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      breadcrumbItems.forEach((item, index) => {
        const listItem = data.itemListElement[index]
        expect(listItem.name).toBe(item.name)
        expect(listItem.item).toBe(item.url)
      })
    })

    it('应支持空 breadcrumb', () => {
      const { container } = render(<BreadcrumbJsonLd items={[]} />)

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data.itemListElement).toEqual([])
    })
  })

  describe('SoftwareApplication JSON-LD', () => {
    it('应正确渲染 SoftwareApplication 脚本标签', () => {
      const { container } = render(
        <SoftwareApplicationJsonLd
          name="7zi Frontend"
          description="Next.js 最佳实践演示项目"
          url="https://7zi.com"
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      expect(script).toBeDefined()
    })

    it('SoftwareApplication 应包含必需字段', () => {
      const { container } = render(
        <SoftwareApplicationJsonLd
          name="7zi Frontend"
          description="Next.js 最佳实践演示项目"
          url="https://7zi.com"
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data['@context']).toBe('https://schema.org')
      expect(data['@type']).toBe('SoftwareApplication')
      expect(data.name).toBe('7zi Frontend')
      expect(data.description).toBe('Next.js 最佳实践演示项目')
      expect(data.url).toBe('https://7zi.com')
    })

    it('SoftwareApplication 应包含默认值', () => {
      const { container } = render(
        <SoftwareApplicationJsonLd
          name="7zi Frontend"
          description="Next.js 最佳实践演示项目"
          url="https://7zi.com"
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data.applicationCategory).toBe('DeveloperApplication')
      expect(data.operatingSystem).toBe('Any')
      expect(data.offers['@type']).toBe('Offer')
      expect(data.offers.price).toBe('0')
      expect(data.offers.priceCurrency).toBe('USD')
    })

    it('SoftwareApplication 可自定义字段', () => {
      const { container } = render(
        <SoftwareApplicationJsonLd
          name="7zi Frontend"
          description="Next.js 最佳实践演示项目"
          url="https://7zi.com"
          applicationCategory="BusinessApplication"
          operatingSystem="Web"
          offers={{ price: '99', priceCurrency: 'CNY' }}
        />
      )

      const script = container.querySelector('script[type="application/ld+json"]')
      const data = JSON.parse(script!.innerHTML)

      expect(data.applicationCategory).toBe('BusinessApplication')
      expect(data.operatingSystem).toBe('Web')
      expect(data.offers.price).toBe('99')
      expect(data.offers.priceCurrency).toBe('CNY')
    })
  })

  describe('JSON-LD 格式验证', () => {
    it('所有 JSON-LD 应是有效的 JSON', () => {
      const components = [
        <OrganizationJsonLd name="Test" url="https://test.com" />,
        <WebSiteJsonLd name="Test" url="https://test.com" />,
        <BreadcrumbJsonLd items={[{ name: 'Home', url: 'https://test.com' }]} />,
        <SoftwareApplicationJsonLd name="Test" description="Test" url="https://test.com" />,
      ]

      components.forEach(component => {
        const { container } = render(component)
        const script = container.querySelector('script[type="application/ld+json"]')
        expect(() => JSON.parse(script!.innerHTML)).not.toThrow()
      })
    })

    it('所有 JSON-LD 应包含 @context', () => {
      const components = [
        <OrganizationJsonLd name="Test" url="https://test.com" />,
        <WebSiteJsonLd name="Test" url="https://test.com" />,
        <BreadcrumbJsonLd items={[{ name: 'Home', url: 'https://test.com' }]} />,
        <SoftwareApplicationJsonLd name="Test" description="Test" url="https://test.com" />,
      ]

      components.forEach(component => {
        const { container } = render(component)
        const script = container.querySelector('script[type="application/ld+json"]')
        const data = JSON.parse(script!.innerHTML)
        expect(data['@context']).toBe('https://schema.org')
      })
    })

    it('所有 JSON-LD 应包含 @type', () => {
      const expectedTypes = ['Organization', 'WebSite', 'BreadcrumbList', 'SoftwareApplication']
      const components = [
        <OrganizationJsonLd name="Test" url="https://test.com" />,
        <WebSiteJsonLd name="Test" url="https://test.com" />,
        <BreadcrumbJsonLd items={[{ name: 'Home', url: 'https://test.com' }]} />,
        <SoftwareApplicationJsonLd name="Test" description="Test" url="https://test.com" />,
      ]

      components.forEach((component, index) => {
        const { container } = render(component)
        const script = container.querySelector('script[type="application/ld+json"]')
        const data = JSON.parse(script!.innerHTML)
        expect(data['@type']).toBe(expectedTypes[index])
      })
    })
  })
})
