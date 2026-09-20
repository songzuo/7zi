import type { Metadata } from 'next'

const canon = 'https://7zi.com/erhu/uk'

export const metadata: Metadata = {
  title: '英国尔虎',
  description: '英国尔虎（Erhu UK）是尔虎公司的海外业务分支，服务中国品牌出海与英国本地品牌建设，提供跨境品牌策略与数字化服务。',
  keywords: ['英国尔虎', 'Erhu UK', '尔虎海外', '品牌出海', '跨境品牌', 'UK brand', '尔虎', '7zi'],
  alternates: { canonical: canon },
  openGraph: {
    title: '英国尔虎 | 尔虎',
    description: '英国尔虎（Erhu UK）是尔虎公司海外分支，专注中国品牌出海与跨境品牌服务。',
    url: canon,
    siteName: '尔虎',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '英国尔虎 | 尔虎',
    description: '英国尔虎（Erhu UK）是尔虎公司海外分支，专注中国品牌出海与跨境品牌服务。',
  },
}

export default function Page() {
  return (
    <article className="erhu-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        英国尔虎
      </h1>

      <section style={{ fontSize: '1.05rem', lineHeight: 1.9, color: '#444' }}>
        <p>
          英国尔虎（Erhu UK）是尔虎公司的海外业务分支，致力于帮助中国品牌走向英国及欧洲市场，
          同时为英国本地企业提供品牌数字化服务。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          品牌出海服务
        </h2>
        <p>
          英国作为全球重要的商业和创意中心，是中国品牌进军欧洲市场的理想桥头堡。
          英国尔虎为出海品牌提供从市场调研、品牌本地化、数字营销到渠道搭建的全流程服务。
          团队了解中英两国的商业文化与消费者差异，帮助品牌实现高效落地。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          服务范围
        </h2>
        <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
          <li>英国及欧洲市场进入策略咨询</li>
          <li>品牌名称、视觉与内容本地化</li>
          <li>英文官网与电商平台搭建</li>
          <li>Google SEO与海外社交媒体运营</li>
          <li>英国本地品牌合作与渠道对接</li>
        </ul>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          海外优势
        </h2>
        <p>
          英国尔虎依托7zi Studio的AI技术能力和尔虎公司的品牌服务体系，
          结合对英国市场的深度理解，为中国品牌提供兼顾全球化标准与本地化特色的服务。
          团队熟悉英国消费者行为、法规要求和营销渠道特性，能够有效降低品牌出海风险。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          目标愿景
        </h2>
        <p>
          英国尔虎的目标是成为中英品牌服务的专业桥梁，在未来三年内帮助至少50个中国品牌
          成功进入英国市场，同时服务20个以上英国本地品牌的数字化升级需求。
          以扎实的服务质量和可衡量的商业成果，建立尔虎在欧洲市场的品牌声誉。
        </p>
      </section>
    </article>
  )
}
