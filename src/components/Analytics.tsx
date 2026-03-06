"use client";

import { useEffect } from "react";

/**
 * 网站统计代码组件
 * 
 * 支持的统计服务:
 * - Google Analytics 4
 * - Umami Analytics
 * - Plausible Analytics
 * - 百度统计
 * 
 * 使用方法:
 * 1. 在 .env.local 中配置相应的 ID
 * 2. 组件会自动注入统计代码
 * 
 * 环境变量:
 * - NEXT_PUBLIC_GA_ID: Google Analytics Measurement ID
 * - NEXT_PUBLIC_UMAMI_ID: Umami Website ID
 * - NEXT_PUBLIC_UMAMI_URL: Umami Server URL
 * - NEXT_PUBLIC_PLAUSIBLE_ID: Plausible Domain
 * - NEXT_PUBLIC_BAIDU_ID: 百度统计 ID
 */

export function Analytics() {
  // Google Analytics 4
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  
  // Umami Analytics
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_ID;
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL || "https://analytics.umami.is";
  
  // Plausible Analytics
  const plausibleId = process.env.NEXT_PUBLIC_PLAUSIBLE_ID;
  
  // 百度统计
  const baiduId = process.env.NEXT_PUBLIC_BAIDU_ID;

  useEffect(() => {
    // Google Analytics
    if (gaId) {
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      script.async = true;
      document.head.appendChild(script);

      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }
      gtag("js", new Date());
      gtag("config", gaId, {
        page_path: window.location.pathname,
      });
    }

    // Umami Analytics
    if (umamiId && umamiUrl) {
      const script = document.createElement("script");
      script.src = umamiUrl;
      script.setAttribute("data-website-id", umamiId);
      script.async = true;
      document.head.appendChild(script);
    }

    // Plausible Analytics
    if (plausibleId) {
      const script = document.createElement("script");
      script.defer = true;
      script.dataset.domain = plausibleId;
      script.src = "https://plausible.io/js/script.js";
      document.head.appendChild(script);
    }

    // 百度统计
    if (baiduId) {
      const script = document.createElement("script");
      script.innerHTML = `
        var _hmt = _hmt || [];
        (function() {
          var hm = document.createElement("script");
          hm.src = "https://hm.baidu.com/hm.js?${baiduId}";
          var s = document.getElementsByTagName("script")[0]; 
          s.parentNode.insertBefore(hm, s);
        })();
      `;
      document.head.appendChild(script);
    }
  }, [gaId, umamiId, umamiUrl, plausibleId, baiduId]);

  // 不渲染任何可见内容
  return null;
}

export default Analytics;
