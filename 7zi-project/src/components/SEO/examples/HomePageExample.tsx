import { Metadata } from 'next'
import { generateBaseMetadata, OrganizationSchema, WebsiteSchema } from '@/components/SEO'

/**
 * 首页 Metadata 配置示例
 *
 * 复制此代码到您的实际首页文件中
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = {
    title: '7zi-Frontend - 现代化任务管理与协作平台',
    description: '基于 Next.js 16、React 19 和 TypeScript 构建的现代化任务管理与协作平台。提供可视化仪表盘、实时协作、高级搜索等功能。',
    keywords: [
      '任务管理',
      '协作平台',
      'Next.js',
      'React',
      'TypeScript',
      '团队协作',
      '项目管理',
      '实时同步',
    ],
    locale: 'zh' as const,
  }

  return generateBaseMetadata(config)
}

/**
 * 首页组件示例
 */
export default async function Home() {
  return (
    <>
      {/* 结构化数据 */}
      <WebsiteSchema
        name="7zi-Frontend"
        url="https://7zi.com"
        description="现代化任务管理与协作平台"
        alternateName={['7zi', '7zi Studio']}
        search={{
          target: 'https://7zi.com/zh/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        }}
      />

      <OrganizationSchema
        name="7zi Studio"
        url="https://7zi.com"
        logo="https://7zi.com/icon-512.png"
        description="现代化任务管理与协作平台"
        sameAs={[
          'https://github.com/songzhuo/openclaw-workspace',
          'https://twitter.com/7zistudio',
        ]}
        contactPoint={{
          telephone: '+86-xxx-xxxx-xxxx',
          email: 'contact@7zi.com',
          contactType: 'customer service',
        }}
      />

      {/* 页面内容 */}
      <main>
        <h1>7zi-Frontend</h1>
        <p>现代化任务管理与协作平台</p>
      </main>
    </>
  )
}
