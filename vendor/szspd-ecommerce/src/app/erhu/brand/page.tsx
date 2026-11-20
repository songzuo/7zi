import type { Metadata } from 'next'

const canon = 'https://7zi.com/erhu/brand'

export const metadata: Metadata = {
  title: '为尔虎品牌',
  description: '为尔虎是7zi Studio旗下创新品牌，专注AI驱动的数字化品牌建设与全球推广，覆盖品牌策划、视觉设计、数字营销及海外推广服务。',
  keywords: ['为尔虎', '尔虎品牌', 'AI品牌建设', '数字化品牌', '品牌策划', '品牌推广', '7zi'],
  alternates: { canonical: canon },
  openGraph: {
    title: '为尔虎品牌 | 尔虎',
    description: '为尔虎是7zi Studio旗下创新品牌，专注AI驱动的数字化品牌建设与全球推广。',
    url: canon,
    siteName: '尔虎',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '为尔虎品牌 | 尔虎',
    description: '为尔虎是7zi Studio旗下创新品牌，专注AI驱动的数字化品牌建设与全球推广。',
  },
}

export default function Page() {
  return (
    <article className="erhu-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        为尔虎品牌
      </h1>

      <section style={{ fontSize: '1.05rem', lineHeight: 1.9, color: '#444' }}>
        <p>
          为尔虎是 7zi Studio 旗下的创新品牌，致力于以人工智能技术驱动品牌策略，
          为企业在数字化时代建立具有竞争力的品牌体系。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          品牌定位
        </h2>
        <p>
          为尔虎定位为"AI驱动的新一代品牌服务商"，融合创意策略与技术能力，
          帮助品牌在复杂市场环境中找到差异化定位，实现从品牌认知到用户转化的完整闭环。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          核心能力
        </h2>
        <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
          <li>品牌策略与定位研究</li>
          <li>视觉识别系统（VI）设计</li>
          <li>数字营销与内容策略</li>
          <li>海外市场推广与本地化</li>
          <li>AI赋能的品牌数据分析</li>
        </ul>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          服务理念
        </h2>
        <p>
          为尔虎秉承"数据驱动创意、技术赋能品牌"的理念，将AI技术深度融入品牌建设全流程。
          从消费者洞察到创意产出，从渠道策略到效果追踪，每一步都基于真实数据做决策，
          确保品牌投入产生可衡量的商业价值。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          品牌愿景
        </h2>
        <p>
          成为全球领先的AI品牌服务商，让每一个品牌都能借助智能技术实现跨越式增长。
          为尔虎将持续投入AI研发，构建品牌建设领域的智能化工具与标准。
        </p>
      </section>
    </article>
  )
}
