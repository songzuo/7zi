'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface NavItem {
  href: string;
  icon: string;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    icon: '🏠',
    labelKey: 'home'
  },
  {
    href: '/dashboard',
    icon: '📊',
    labelKey: 'dashboard'
  },
  {
    href: '/tasks',
    icon: '📋',
    labelKey: 'tasks'
  },
  {
    href: '/memory',
    icon: '🧠',
    labelKey: 'memory'
  }
];

interface BottomNavProps {
  locale: string;
}

/**
 * Bottom Navigation Bar (Mobile Only)
 * Shows on screens below 641px (lg breakpoint)
 */
export const BottomNav: React.FC<BottomNavProps> = ({ locale }) => {
  const pathname = usePathname();
  const t = useTranslations('nav');

  // Only show on mobile (screens below lg breakpoint)
  if (typeof window !== 'undefined' && window.innerWidth >= 641) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 md:hidden bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-700 z-40"
      role="navigation"
      aria-label="底部导航"
      style={{
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))'
      }}
    >
      <div className="flex items-stretch h-full">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              className={`
                flex flex-col items-center justify-center
                h-full w-full
                touch-active
                transition-all duration-200
                ${isActive
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                }
              `}
              aria-label={t(item.labelKey)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`
                text-2xl mb-1 transition-transform duration-200
                ${isActive ? 'scale-110' : ''}
              `}>
                {item.icon}
              </span>
              <span className={`
                text-xs font-medium
                ${isActive ? 'font-bold' : 'font-normal'}
              `}>
                {t(item.labelKey)}
              </span>
              {isActive && (
                <span className="absolute top-0 w-12 h-0.5 bg-cyan-500 dark:bg-cyan-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

/**
 * Bottom Nav Wrapper Component
 * Adds bottom padding to content to prevent overlap with bottom nav
 */
export const BottomNavWrapper: React.FC<{
  children: React.ReactNode;
  locale: string;
}> = ({ children, locale }) => {
  const isMobile = typeof window === 'undefined' || window.innerWidth < 641;

  return (
    <>
      {children}
      {isMobile && <BottomNav locale={locale} />}
      {/* Add padding to content on mobile to prevent overlap */}
      <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  );
};
