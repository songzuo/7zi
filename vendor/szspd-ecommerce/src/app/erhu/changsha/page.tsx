import type { Metadata } from 'next'

const canon = 'https://7zi.com/erhu/changsha'

export const metadata: Metadata = {
  title: '长沙尔虎',
  description: '长沙尔虎是尔虎公司在长沙的分支机构，聚焦长沙及周边城市的品牌服务需求，提供AI品牌策略与数字化转型方案。',
  keywords: ['长沙尔虎', '尔虎长沙', '长沙品牌设计', '长沙数字营销', '长沙网站开发', '尔虎', '7zi'],
  alternates: { canonical: canon },
  openGraph: {
    title: '长沙尔虎 | 尔虎',
    description: '长沙尔虎是尔虎公司长沙分支，服务长沙及周边城市的AI品牌服务团队。',
    url: canon,
    siteName: '尔虎',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '长沙尔虎 | 尔虎',
    description: '长沙尔虎是尔虎公司长沙分支，服务长沙及周边城市的AI品牌服务团队。',
  },
}

export default function Page() {
  return (
    <article className="erhu-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        长沙尔虎
      </h1>

      <section style={{ fontSize: '1.05rem', lineHeight: 1.9, color: '#444' }}>
        <p>
          长沙尔虎是尔虎公司在湖南省会长沙设立的服务分支，专注于为长沙及周边城市企业
          提供AI品牌策略、数字化营销和技术开发一体化服务。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          长沙市场
        </h2>
        <p>
          长沙作为湖南省会和新一线城市，近年来在新消费品牌、文化创意、智能制造等领域表现突出。
          文和友、茶颜悦色等现象级品牌的崛起见证了长沙的品牌创新活力。
          长沙尔虎深度融入本地商业生态，为长沙品牌的成长与升级提供专业支撑。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          核心服务
        </h2>
        <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
          <li>新消费品牌从0到1的全案策划</li>
          <li>品牌视觉识别系统（VI）设计与落地</li>
          <li>小红书、抖音等社交平台内容营销</li>
          <li>企业官网与小商城定制开发</li>
          <li>本地搜索引擎优化与口碑营销</li>
        </ul>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          团队特色
        </h2>
        <p>
          长沙尔虎团队扎根长沙，深入了解湖南本土文化与消费趋势。
          团队既具备一线城市品牌服务经验，又熟悉长沙及湖南市场的独特节奏。
          这种"全国视野+本土洞察"的组合是长沙尔虎的核心竞争力。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          合作理念
        </h2>
        <p>
          长沙尔虎坚持与客户建立长期合作关系，不止于交付项目，更关注品牌持续成长。
          通过AI数据工具实时追踪品牌表现，帮助客户在快速变化的长沙市场中始终保持竞争优势。
        </p>
      </section>
    </article>
  )
}
