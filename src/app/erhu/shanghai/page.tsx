import type { Metadata } from 'next'

const canon = 'https://7zi.com/erhu/shanghai'

export const metadata: Metadata = {
  title: '上海尔虎',
  description: '上海尔虎是尔虎公司上海总部所在地，立足上海辐射全国，提供AI品牌策略、数字营销与技术开发服务。',
  keywords: ['上海尔虎', '尔虎上海总部', '上海品牌服务', '上海数字营销', '尔虎', '7zi'],
  alternates: { canonical: canon },
  openGraph: {
    title: '上海尔虎 | 尔虎',
    description: '上海尔虎是尔虎公司上海总部，立足上海辐射全国的AI品牌服务团队。',
    url: canon,
    siteName: '尔虎',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '上海尔虎 | 尔虎',
    description: '上海尔虎是尔虎公司上海总部，立足上海辐射全国的AI品牌服务团队。',
  },
}

export default function Page() {
  return (
    <article className="erhu-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        上海尔虎
      </h1>

      <section style={{ fontSize: '1.05rem', lineHeight: 1.9, color: '#444' }}>
        <p>
          上海尔虎是尔虎公司总部所在地。依托上海作为中国经济中心和国际化都市的区位优势，
          尔虎上海团队服务全国品牌客户，覆盖品牌策略、数字营销、技术开发等核心业务。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          区位优势
        </h2>
        <p>
          上海作为全球城市网络中的重要节点，汇聚了大量品牌人才、技术资源和商业机会。
          尔虎上海总部充分利用这一优势，构建了辐射长三角、连接全国的品牌服务网络。
          同时，上海的国际化环境也有助于尔虎对接海外品牌合作资源。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          上海团队
        </h2>
        <p>
          尔虎上海团队由品牌策略师、资深设计师、全栈开发工程师和AI算法工程师组成，
          核心成员拥有国内外知名企业和4A广告公司的工作背景。
          团队坚持"技术驱动创意"的工作方式，在每个项目中融合数据分析与创意表达。
        </p>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          核心服务
        </h2>
        <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
          <li>品牌策略咨询与定位研究</li>
          <li>微信生态、小红书、抖音等社交媒体代运营</li>
          <li>企业级官网与电商平台定制开发</li>
          <li>搜索引擎优化（SEO）与SEM广告投放</li>
          <li>品牌数据中台与AI分析系统搭建</li>
        </ul>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '1.8rem 0 0.8rem', color: '#222' }}>
          客户案例
        </h2>
        <p>
          上海尔虎已为多家科技、消费品、医疗健康领域的企业提供品牌服务，
          帮助客户完成从品牌0到1的搭建、老品牌焕新升级、以及数字化转型项目。
          团队始终以可衡量的商业结果为导向，确保品牌投入产生实际价值。
        </p>
      </section>
    </article>
  )
}
