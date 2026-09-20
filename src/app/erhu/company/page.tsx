import type { Metadata } from 'next'

const canon = 'https://7zi.com/erhu/company'

export const metadata: Metadata = {
  title: '尔虎公司',
  description: '上海尔虎信息技术有限公司（尔虎公司）是7zi Studio旗下专注于AI品牌服务与数字化解决方案的科技企业，总部位于上海。',
  keywords: ['尔虎公司', '上海尔虎信息技术有限公司', 'AI品牌服务', '数字化解决方案', '尔虎', '7zi'],
  alternates: { canonical: canon },
  openGraph: {
    title: '尔虎公司 | 尔虎',
    description: '上海尔虎信息技术有限公司，专注AI品牌服务与数字化解决方案。',
    url: canon,
    siteName: '尔虎',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '尔虎公司 | 尔虎',
    description: '上海尔虎信息技术有限公司，专注AI品牌服务与数字化解决方案。',
  },
}

export default function Page() {
  return (
    <article className="erhu-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        尔虎公司
      </h1>

      <section style={{ fontSize: '1.05rem', lineHeight: 1.9, color: '#444' }}>
        <p>
          上海尔虎信息技术有限公司（简称"尔虎公司"）是 7zi Studio 旗下的科技企业，
          专注为品牌提供AI驱动的数字化解决方案，总部设在上海。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          公司概况
        </h2>
        <p>
          尔虎公司依托7zi Studio的技术积累和AI能力，构建了覆盖品牌策略、创意设计、
          数字营销、技术开发的全链路服务体系。公司核心团队具备丰富的品牌咨询与互联网产品经验，
          致力于用技术手段提升品牌建设效率与效果。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          业务板块
        </h2>
        <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
          <li><strong>品牌咨询</strong>：品牌定位、品牌架构、品牌命名与语词系统</li>
          <li><strong>创意设计</strong>：VI视觉识别、包装设计、空间体验设计</li>
          <li><strong>数字营销</strong>：SEO/SEM优化、社交媒体运营、内容营销</li>
          <li><strong>技术开发</strong>：企业官网、电商平台、小程序与AI应用</li>
          <li><strong>海外拓展</strong>：跨境品牌本地化、海外市场推广</li>
        </ul>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          团队优势
        </h2>
        <p>
          尔虎公司汇聚了品牌策略师、视觉设计师、技术开发者和AI工程师等多领域人才。
          跨学科团队在品牌项目中形成高效协作，确保策略可落地、创意有依据、技术能支撑。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          服务客户
        </h2>
        <p>
          尔虎公司服务的客户涵盖科技、消费品、教育、医疗健康等多个行业，
          包括初创企业从0到1的品牌搭建，也承接成熟品牌的焕新升级项目。
          以结果为导向的服务理念赢得了客户的持续信任。
        </p>
      </section>
    </article>
  )
}
