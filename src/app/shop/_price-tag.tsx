'use client';

// 价格标签（多货币）：接收 USD 数字，按用户偏好货币显示
// 用于服务端组件渲染价格的位置（商品列表、相关推荐等）
import { useCurrency } from '@/lib/shop-currency';

export default function PriceTag({
  usd,
  isRange,
  className,
}: {
  /** USD 数字（下界） */
  usd: number;
  /** 是否为区间价（显示 From 前缀） */
  isRange?: boolean;
  className?: string;
}) {
  const { fmt } = useCurrency();
  const v = Number(usd) || 0;
  return <span className={className}>{isRange ? `From ${fmt(v)}` : fmt(v)}</span>;
}
