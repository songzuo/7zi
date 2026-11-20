import type { Metadata } from 'next'

const canon = 'https://7zi.com/erhu/hunan'

export const metadata: Metadata = {
  title: '湖南尔虎',
  description: '湖南尔虎是尔虎公司在湖南区域的品牌服务分支，深耕湖南市场，为本地企业提供AI品牌策略与数字化解决方案。',
  keywords: ['湖南尔虎', '尔虎湖南', '湖南品牌服务', '长沙品牌设计', '湖南数字营销', '尔虎', '7zi'],
  alternates: { canonical: canon },
  openGraph: {
    title: '湖南尔虎 | 尔虎',
    description: '湖南尔虎是尔虎公司湖南区域分支，深耕湖南市场的AI品牌服务团队。',
    url: canon,
    siteName: '尔虎',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '湖南尔虎 | 尔虎',
    description: '湖南尔虎是尔虎公司湖南区域分支，深耕湖南市场的AI品牌服务团队。',
  },
}

export default function Page() {
  return (
    <article className="erhu-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        湖南尔虎
      </h1>

      <section style={{ fontSize: '1.05rem', lineHeight: 1.9, color: '#444' }}>
        <p>
          湖南尔虎是尔虎公司在湖南省的区域服务分支，致力于为湖南本地企业及品牌提供
          AI驱动的品牌策略、数字营销和技术开发服务。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          区域布局
        </h2>
        <p>
          湖南省作为中部地区经济重镇，拥有长沙、株洲、湘潭等活跃的经济城市。
          湖南在工程机械、文化传媒、新消费品牌等领域具有全国影响力，
          同时培育了大量科技创新企业。湖南尔虎立足长沙，辐射全省，
          为湖南品牌提供专业的数字化转型服务。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          服务能力
        </h2>
        <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
          <li>湖南本土企业品牌策略咨询</li>
          <li>企业官网与电商平台定制开发</li>
          <li>社交媒体与短视频内容运营</li>
          <li>本地化SEO与搜索排名优化</li>
          <li>品牌视觉设计与VI系统搭建</li>
        </ul>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          湖南团队
        </h2>
        <p>
          湖南尔虎团队由熟悉本地市场的品牌策略师、设计师和技术开发人员组成，
          与上海总部保持紧密协作。团队深入理解湖南企业的品牌需求和市场环境，
          能够提供更贴合区域实际的品牌解决方案。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          发展愿景
        </h2>
        <p>
          湖南尔虎致力于成为湖南领先的AI品牌服务商，通过持续的技术投入和服务创新，
          帮助更多湖南品牌在数字化时代获得竞争优势，推动区域品牌经济的升级发展。
        </p>
      </section>
    </article>
  )
}
