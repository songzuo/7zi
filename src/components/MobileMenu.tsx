'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/about', label: '关于我们', icon: 'ℹ️' },
  { href: '/team', label: '团队成员', icon: '👥' },
  { href: '/blog', label: '博客', icon: '📝' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/contact', label: '联系我们', icon: '📧' },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors touch-feedback"
        aria-label="Toggle menu"
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
          <span
            className={`w-5 h-0.5 bg-current transition-all duration-300 ${
              isOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`w-5 h-0.5 bg-current transition-all duration-300 ${
              isOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`w-5 h-0.5 bg-current transition-all duration-300 ${
              isOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
          />
        </div>
      </button>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isOpen
            ? 'opacity-100 visible'
            : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[280px] max-w-[80vw] bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <Link
              href="/"
              className="text-2xl font-bold text-zinc-900 dark:text-white"
              onClick={() => setIsOpen(false)}
            >
              7zi<span className="text-cyan-500">Studio</span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-2">
            {NAV_ITEMS.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 touch-feedback ${
                  pathname === item.href
                    ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {pathname === item.href && (
                  <span className="ml-auto w-2 h-2 bg-cyan-500 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Footer CTA */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="https://visa.7zi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 text-center text-sm text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 transition-colors"
            >
              7zi 环球通 (旧项目) ↗
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
