// ===========================================================================
// 品牌档案层（单仓双店）
//   szspd.cn  → BRAND=szspd（默认）：非洲/加纳走廊内容开启
//   7zi.com   → BRAND=7zi ：全球中性，前台零非洲/加纳字样
//
// 规则：
//   · 差异只允许出现在品牌档案 + feature flags，禁止复制路由/复制仓库
//   · 前台用法：const brand = getBrand(); if (brand.features.africaCorridor) {...}
//   · 客户端组件也可用（NEXT_PUBLIC_BRAND 构建时内联）；服务端读 BRAND 均可
//   · 默认 szspd —— 环境变量缺失时行为与历史版本完全一致（零扰动）
// ===========================================================================

export type BrandId = 'szspd' | '7zi';

export interface BrandProfile {
  id: BrandId;
  /** 短品牌名（页头/页脚/PWA 标题） */
  shortName: string;
  /** 商店名（SEO title 等场景） */
  siteName: string;
  /** Logo 徽标字符 */
  logoBadge: string;
  /** 站点根 URL（SEO canonical / JSON-LD） */
  baseUrl: string;
  contactEmail: string;
  /** 主联系电话（JSON-LD contactPoint；7zi 用中国号） */
  contactPhone: string;
  contactPhoneHref: string;
  features: {
    /** 非洲/加纳走廊：专题文案、Ghana 联系卡、置顶目的地以 GH 开头 */
    africaCorridor: boolean;
    /** 手动收款指引中的加纳 MoMo 话术 */
    ghanaPayment: boolean;
  };
  /** /shop metadata */
  shopTitle: string;
  shopDescription: string;
  /** 页头 h1 修饰语 */
  headerTagline: string;
  /** /shop 首页 hero 标题 */
  heroTitle: string;
  /** 页脚 About 段落 */
  footerAbout: string;
  /** 页脚 About 下的旗帜行 */
  footerServingLine: string;
  /** 页脚版权行（不含 © 年份前缀） */
  footerCopyright: string;
  /** 结算页置顶常用目的地（按品牌排序） */
  hotCountryCodes: string[];
}

const SZSPD: BrandProfile = {
  id: 'szspd',
  shortName: 'SZSPD',
  siteName: 'SZSPD Store',
  logoBadge: 'SZ',
  baseUrl: 'https://szspd.cn',
  contactEmail: 'support@szspd.cn',
  contactPhone: '+233 24 800 9090',
  contactPhoneHref: 'tel:+233248009090',
  features: { africaCorridor: true, ghanaPayment: true },
  shopTitle: 'SZSPD Store — Quality Products, China to Ghana & Africa',
  shopDescription:
    'SZSPD (SZ) is a cross-border e-commerce platform serving Ghana, Africa and customers worldwide. Quality products sourced from China, one-click dropshipping, tracked delivery to your door.',
  headerTagline: '· Serving Ghana · Africa · Worldwide',
  heroTitle: "Welcome to SZSPD Store — China's best, delivered to Ghana & Africa",
  footerAbout:
    'SZSPD sources quality products from China and delivers them to Ghana, Africa and customers worldwide — with one-click dropshipping, secure payment and tracked shipping.',
  footerServingLine: '🇬🇭 Proudly serving Ghana & Africa · 🌍 Shipping worldwide',
  footerCopyright: 'SZSPD · SZ. All rights reserved. · Quality products from China, delivered across Ghana, Africa & the world.',
  hotCountryCodes: [
    'GH', 'NG', 'KE', 'ZA', 'TZ', 'UG', 'CI', 'SN', 'CM', 'EG',
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'AE', 'IN',
  ],
};

const Z7I: BrandProfile = {
  id: '7zi',
  shortName: '7zi',
  siteName: '7zi Shop',
  logoBadge: '7Z',
  baseUrl: 'https://7zi.com',
  contactEmail: 'support@7zi.com',
  contactPhone: '+86 133 1955 1131',
  contactPhoneHref: 'tel:+8613319551131',
  features: { africaCorridor: false, ghanaPayment: false },
  shopTitle: '7zi Shop — Quality Products from China, Delivered Worldwide',
  shopDescription:
    '7zi Shop is a global cross-border e-commerce store. Quality products sourced from China with one-click dropshipping, secure payment and tracked delivery worldwide.',
  headerTagline: '· Shipping Worldwide',
  heroTitle: "Welcome to 7zi Shop — China's best, delivered worldwide",
  footerAbout:
    '7zi Shop sources quality products from China and delivers them to customers worldwide — with one-click dropshipping, secure payment and tracked shipping.',
  footerServingLine: '🌍 Shipping worldwide',
  footerCopyright: '7zi Shop. All rights reserved. · Quality products from China, delivered worldwide.',
  hotCountryCodes: [
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'ES', 'IT', 'AE',
    'SA', 'SG', 'JP', 'KR', 'IN', 'MX', 'BR', 'PH',
  ],
};

const BRANDS: Record<BrandId, BrandProfile> = {
  szspd: SZSPD,
  '7zi': Z7I,
};

export function getBrandId(): BrandId {
  const raw = (process.env.NEXT_PUBLIC_BRAND || process.env.BRAND || 'szspd')
    .toString()
    .toLowerCase()
    .trim();
  return raw === '7zi' ? '7zi' : 'szspd';
}

export function getBrand(): BrandProfile {
  return BRANDS[getBrandId()];
}
