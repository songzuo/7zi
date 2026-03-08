'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/routing';
import { ThemeToggle } from '@/components/ClientProviders';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SearchModal, SearchButton, useSearchKeyboard } from '@/components/SearchModal';

interface TeamNavigationProps {
  tNav: (key: string) => string;
  locale?: string;
}

export function TeamNavigation({ tNav, locale = 'en' }: TeamNavigationProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useSearchKeyboard(() => setIsSearchOpen(true), isSearchOpen);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">7zi<span className="text-cyan-500">Studio</span></Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-6">
              <SearchButton onClick={() => setIsSearchOpen(true)} locale={locale} />
              <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('about')}</Link>
              <Link href="/team" className="text-cyan-500 font-medium">{tNav('team')}</Link>
              <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('blog')}</Link>
              <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('dashboard')}</Link>
              <ThemeToggle />
              <LanguageSwitcher />
              <Link href="/contact" className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all">{tNav('contact')}</Link>
            </div>
            <div className="flex lg:hidden items-center gap-2">
              <SearchButton onClick={() => setIsSearchOpen(true)} locale={locale} />
              <LanguageSwitcher />
              <ThemeToggle />
              <MobileMenu />
            </div>
          </div>
        </div>
      </nav>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} locale={locale} />
    </>
  );
}