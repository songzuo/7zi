"use client";
// 列表曝光埋点：把当前页渲染的商品 SKU 批量上报（type=impression）
// 数据用途：知道"用户看到但未点开"的商品 —— 真实兴趣信号，供热度分析与预热。
import { useEffect } from "react";
import { trackEvent } from "./_tracking";

export default function ImpressionTracker({ skus }: { skus: string[] }) {
  useEffect(() => {
    for (const sku of skus) {
      if (sku) trackEvent(sku, "impression");
    }
  }, [skus]);
  return null;
}
