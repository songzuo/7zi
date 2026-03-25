"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SocialLinks } from "./SocialLinks";

const quickLinks = [
  { name: "首页", href: "/" },
  { name: "关于我们", href: "/about" },
  { name: "团队成员", href: "/team" },
  { name: "博客", href: "/blog" },
  { name: "联系我们", href: "/contact" },
  { name: "Dashboard", href: "/dashboard" },
];

const services = [
  { name: "网站开发", href: "#services" },
  { name: "品牌设计", href: "#services" },
  { name: "SEO 优化", href: "#services" },
  { name: "营销推广", href: "#services" },
  { name: "UI/UX 设计", href: "#services" },
  { name: "AI 解决方案", href: "#services" },
];

const contactInfo = [
  { icon: "📧", label: "邮箱", value: "business@7zi.studio", href: "mailto:business@7zi.studio" },
  { icon: "🌐", label: "网站", value: "7zi.studio", href: "https://7zi.studio" },
  { icon: "📍", label: "地址", value: "中国", href: "#" },
];

export function Footer() {
  // Memoize currentYear to prevent recalculation on every render
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="bg-zinc-50 dark:bg-zinc-950 text-zinc-300 dark:text-zinc-400 pb-safe-bottom">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="inline-block">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                7zi<span className="text-cyan-500">Studio</span>
              </h2>
            </Link>
            <p className="text-sm sm:text-base max-w-md">
              由 11 位专业 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务。
            </p>
            <div className="hidden sm:block">
              <h3 className="text-sm font-semibold text-white mb-3">关注我们</h3>
              <SocialLinks variant="horizontal" size="sm" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">快速链接</h3>
            <ul className="space-y-2 sm:space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">服务项目</h3>
            <ul className="space-y-2 sm:space-y-3">
              {services.map((service) => (
                <li key={service.name}>
                  <Link
                    href={service.href}
                    className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">联系方式</h3>
            <ul className="space-y-3 sm:space-y-4">
              {contactInfo.map((info) => (
                <li key={info.label}>
                  <a
                    href={info.href}
                    className="flex items-center gap-2 text-sm py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px]"
                  >
                    <span className="text-lg">{info.icon}</span>
                    <span className="break-all">{info.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile-only Social Links */}
        <div className="mt-8 sm:hidden">
          <h3 className="text-sm font-semibold text-white mb-3">关注我们</h3>
          <SocialLinks variant="grid" size="sm" />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-zinc-800 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-sm text-center sm:text-left">
              <p>© {currentYear} 7zi Studio. All rights reserved.</p>
              <p className="text-xs text-zinc-500 mt-1">
                由 AI 代理团队驱动 · 创新无限可能
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-sm">
              <Link
                href="/privacy"
                className="py-2 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] inline-flex items-center"
              >
                隐私政策
              </Link>
              <Link
                href="/terms"
                className="py-2 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] inline-flex items-center"
              >
                服务条款
              </Link>
              <Link
                href="/cookies"
                className="py-2 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] inline-flex items-center"
              >
                Cookie 政策
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
