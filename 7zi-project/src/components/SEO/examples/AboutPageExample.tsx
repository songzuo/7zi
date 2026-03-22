import { Metadata } from 'next'
import { OrganizationSchema, BreadcrumbSchema } from '@/components/SEO'

/**
 * 关于页面 Metadata 配置示例
 */
export async function generateAboutMetadata({
  locale = 'zh' as const,
}: {
  locale?: 'zh' | 'en'
}): Promise<Metadata> {
  const title = locale === 'zh' ? '关于我们 - 7zi Studio' : 'About Us - 7zi Studio'
  const description =
    locale === 'zh'
      ? '了解 7zi Studio 的使命、愿景和团队。我们致力于打造现代化的任务管理与协作平台。'
      : 'Learn about 7zi Studio\'s mission, vision, and team. We are dedicated to building modern task management and collaboration platforms.'

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `https://7zi.com/${locale}/about`,
    },
  }
}

/**
 * 关于页面组件示例
 */
export default async function AboutPage({
  params,
}: {
  params: { locale: string }
}) {
  const { locale } = params
  const baseUrl = 'https://7zi.com'

  const breadcrumbs = [
    { name: '首页', nameEn: 'Home', path: '/' },
    { name: '关于我们', nameEn: 'About', path: '/about' },
  ]

  return (
    <>
      {/* 面包屑 Schema */}
      <BreadcrumbSchema
        breadcrumbs={breadcrumbs}
        baseUrl={baseUrl}
        locale={locale as 'zh' | 'en'}
      />

      {/* 组织 Schema */}
      <OrganizationSchema
        name="7zi Studio"
        url="https://7zi.com"
        logo="https://7zi.com/icon-512.png"
        description="现代化任务管理与协作平台"
        sameAs={[
          'https://github.com/songzhuo/openclaw-workspace',
          'https://twitter.com/7zistudio',
          'https://linkedin.com/company/7zistudio',
        ]}
        contactPoint={{
          telephone: '+86-xxx-xxxx-xxxx',
          email: 'contact@7zi.com',
          contactType: 'customer service',
        }}
      />

      {/* 页面内容 */}
      <main>
        <h1>{locale === 'zh' ? '关于我们' : 'About Us'}</h1>
        <p>
          {locale === 'zh'
            ? '7zi Studio 致力于打造现代化的任务管理与协作平台'
            : '7zi Studio is dedicated to building modern task management and collaboration platforms'}
        </p>
      </main>
    </>
  )
}
